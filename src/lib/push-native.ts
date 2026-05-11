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

    PushNotifications.addListener("pushNotificationReceived", () => {
      // Avoid logging notification payloads because they can include personal data.
    })

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url
      if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) {
        window.location.href = url
      }
    })

    return true
  } catch {
    return null
  }
}
