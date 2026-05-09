import { PushNotifications } from "@capacitor/push-notifications"

export async function registerNativePush() {
  try {
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== "granted") return null

    await PushNotifications.register()

    PushNotifications.addListener("registration", (token) => {
      fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fcm",
          token: token.value,
          platform: navigator.userAgent.includes("Android") ? "android" : "ios",
        }),
      })
    })

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received:", notification)
    })

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      if (action.notification.data?.url) {
        window.location.href = action.notification.data.url
      }
    })

    return true
  } catch {
    return null
  }
}
