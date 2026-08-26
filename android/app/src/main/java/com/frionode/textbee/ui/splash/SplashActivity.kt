package com.frionode.textbee.ui.splash

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.frionode.textbee.R
import com.frionode.textbee.AppConstants
import com.frionode.textbee.activities.MainActivity
import com.frionode.textbee.helpers.SharedPreferenceHelper
import com.frionode.textbee.ui.main.NewMainActivity
import com.frionode.textbee.ui.onboarding.OnboardingActivity
import com.frionode.textbee.ui.theme.TextbeeTheme

class SplashActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TextbeeTheme {
                SplashContent()
            }
        }
        Handler(Looper.getMainLooper()).postDelayed({ route() }, 400)
    }

    private fun route() {
        val useNewUi = SharedPreferenceHelper.getSharedPreferenceBoolean(
            this, AppConstants.SHARED_PREFS_USE_NEW_UI_KEY, true
        )
        val deviceId = SharedPreferenceHelper.getSharedPreferenceString(
            this, AppConstants.SHARED_PREFS_DEVICE_ID_KEY, ""
        )
        val target = when {
            !useNewUi -> Intent(this, MainActivity::class.java)
            deviceId.isNullOrEmpty() -> Intent(this, OnboardingActivity::class.java)
            else -> Intent(this, NewMainActivity::class.java)
        }
        startActivity(target)
        finish()
    }
}

@Composable
private fun SplashContent() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(id = R.drawable.ic_app_logo),
                contentDescription = null,
                modifier = Modifier.size(96.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Cloudtext",
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "SMS Gateway",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.8f)
            )
        }
    }
}
