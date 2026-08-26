package com.frionode.textbee.ui.onboarding

import android.content.Context
import android.os.Build
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import com.frionode.textbee.ApiManagerKt
import com.frionode.textbee.AppConstants
import com.frionode.textbee.BuildConfig
import com.frionode.textbee.TextbeeUtils
import com.frionode.textbee.dtos.RegisterDeviceInputDTO
import com.frionode.textbee.dtos.SimInfoCollectionDTO
import com.frionode.textbee.helpers.HeartbeatManager
import com.frionode.textbee.helpers.SharedPreferenceHelper
import com.frionode.textbee.helpers.serverErrorMessage
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

data class OnboardingState(
    val apiKey: String = "",
    val deviceId: String = "",
    val deviceName: String = "${Build.BRAND} ${Build.MODEL}",
    val isReturningUser: Boolean = false,
    val useExistingDeviceId: Boolean = false,
    val isQrScanned: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val registeredDeviceId: String? = null,
    val registeredDeviceName: String? = null
)

class OnboardingViewModel : ViewModel() {

    private val _state = MutableStateFlow(OnboardingState())
    val state: StateFlow<OnboardingState> = _state.asStateFlow()

    private val _registrationSuccess = Channel<Unit>(Channel.CONFLATED)
    val registrationSuccess = _registrationSuccess.receiveAsFlow()

    fun setApiKey(key: String) {
        _state.update { it.copy(apiKey = key.trim(), errorMessage = null, isQrScanned = false) }
    }

    fun onQrScanned(key: String) {
        _state.update { it.copy(apiKey = key.trim(), errorMessage = null, isQrScanned = true) }
    }

    fun setDeviceId(id: String) {
        _state.update { it.copy(deviceId = id.trim(), errorMessage = null) }
    }

    fun setDeviceName(name: String) {
        _state.update { it.copy(deviceName = name) }
    }

    fun setReturningUser(returning: Boolean) {
        _state.update { it.copy(isReturningUser = returning, useExistingDeviceId = returning) }
    }

    fun setUseExistingDeviceId(use: Boolean) {
        _state.update { it.copy(useExistingDeviceId = use, deviceId = if (!use) "" else it.deviceId) }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    fun registerOrUpdateDevice(context: Context) {
        val current = _state.value
        val apiKey = current.apiKey
        val deviceId = current.deviceId
        val shouldUpdate = current.isReturningUser || (current.useExistingDeviceId && deviceId.isNotEmpty())

        if (apiKey.isEmpty()) {
            _state.update { it.copy(errorMessage = "Please enter your API key.") }
            return
        }
        if ((current.isReturningUser || current.useExistingDeviceId) && deviceId.isEmpty()) {
            _state.update { it.copy(errorMessage = "Please enter your Device ID.") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val fcmToken = getFcmToken()
                val collectedSimInfo = SimInfoCollectionDTO().apply {
                    lastUpdated = System.currentTimeMillis()
                    sims = TextbeeUtils.collectSimInfo(context)
                }
                val input = RegisterDeviceInputDTO().apply {
                    this.fcmToken = fcmToken
                    enabled = true
                    brand = Build.BRAND
                    manufacturer = Build.MANUFACTURER
                    model = Build.MODEL
                    buildId = Build.ID
                    os = "Android"
                    osVersion = Build.VERSION.RELEASE
                    osApiLevel = Build.VERSION.SDK_INT
                    osBuildFingerprint = Build.VERSION.BASE_OS
                    appVersionCode = BuildConfig.VERSION_CODE
                    appVersionName = BuildConfig.VERSION_NAME
                    name = current.deviceName.ifEmpty { "${Build.BRAND} ${Build.MODEL}" }
                    simInfo = collectedSimInfo
                }

                val response = if (shouldUpdate) {
                    ApiManagerKt.getApiService().updateDevice(deviceId, apiKey, input)
                } else {
                    ApiManagerKt.getApiService().registerDevice(apiKey, input)
                }

                if (response.isSuccessful) {
                    val data = response.body()?.data
                        ?: throw IllegalStateException("missing_response")
                    val registeredId = data["_id"] as? String
                        ?: throw IllegalStateException("missing_id")
                    val heartbeatInterval = (data["heartbeatIntervalMinutes"] as? Double)?.toInt() ?: 30
                    val name = data["name"] as? String ?: ""

                    SharedPreferenceHelper.setSharedPreferenceString(
                        context, AppConstants.SHARED_PREFS_DEVICE_ID_KEY, registeredId
                    )
                    SharedPreferenceHelper.setSharedPreferenceString(
                        context, AppConstants.SHARED_PREFS_API_KEY_KEY, apiKey
                    )
                    SharedPreferenceHelper.setSharedPreferenceInt(
                        context, AppConstants.SHARED_PREFS_HEARTBEAT_INTERVAL_MINUTES_KEY, heartbeatInterval
                    )
                    val resolvedName = name.ifEmpty { current.deviceName }
                    SharedPreferenceHelper.setSharedPreferenceString(
                        context, AppConstants.SHARED_PREFS_DEVICE_NAME_KEY, resolvedName
                    )
                    SharedPreferenceHelper.setSharedPreferenceBoolean(
                        context, AppConstants.SHARED_PREFS_GATEWAY_ENABLED_KEY, true
                    )
                    HeartbeatManager.scheduleHeartbeat(context)

                    _state.update {
                        it.copy(
                            isLoading = false,
                            registeredDeviceId = registeredId,
                            registeredDeviceName = resolvedName
                        )
                    }
                    _registrationSuccess.send(Unit)
                } else {
                    Log.e(
                        TAG,
                        "Device registration rejected: code=${response.code()}, body=${response.errorBody()?.string()}"
                    )
                    _state.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = when (response.code()) {
                                401 -> "Invalid API key. Go back and check your key."
                                404 -> "Device ID not found. Verify it in your dashboard."
                                429 -> response.serverErrorMessage()
                                    ?: "You've reached your plan's device limit. Disable or remove another device, or upgrade your plan."
                                in 500..599 -> "Server error. Please try again in a moment."
                                else -> "Request failed (${response.code()}). Please try again."
                            }
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Device registration request failed", e)
                val message = when {
                    e.message == "missing_response" -> "The server returned an empty response. Please try again."
                    e.message == "missing_id" -> "Unexpected server response. Please try again."
                    e.message?.contains("Unable to resolve host") == true ||
                    e.message?.contains("timeout") == true ||
                    e.message?.contains("connect") == true ->
                        "No internet connection. Check your network and retry."
                    else -> "Something went wrong. Please try again."
                }
                _state.update { it.copy(isLoading = false, errorMessage = message) }
                TextbeeUtils.logException(e, "Onboarding device registration failed")
            }
        }
    }

    private suspend fun getFcmToken(): String = suspendCoroutine { cont ->
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token -> cont.resume(token) }
                .addOnFailureListener { error ->
                    Log.w(TAG, "FCM token unavailable; continuing registration", error)
                    cont.resume("")
                }
        } catch (error: Exception) {
            Log.w(TAG, "Firebase unavailable; continuing registration", error)
            cont.resume("")
        }
    }

    private companion object {
        const val TAG = "OnboardingViewModel"
    }
}
