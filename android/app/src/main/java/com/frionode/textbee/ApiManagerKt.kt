package com.frionode.textbee

import com.frionode.textbee.services.GatewayApiServiceKt
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiManagerKt {
    @Volatile
    private var instance: GatewayApiServiceKt? = null

    fun getApiService(): GatewayApiServiceKt =
        instance ?: synchronized(this) {
            instance ?: Retrofit.Builder()
                .baseUrl(AppConstants.API_BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(GatewayApiServiceKt::class.java)
                .also { instance = it }
        }
}
