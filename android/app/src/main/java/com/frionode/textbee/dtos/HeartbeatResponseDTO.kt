package com.frionode.textbee.dtos

class HeartbeatResponseDTO {
    @JvmField var success: Boolean = false
    @JvmField var fcmTokenUpdated: Boolean = false
    @JvmField var lastHeartbeat: Long = 0
    @JvmField var name: String? = null
}
