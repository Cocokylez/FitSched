import { db } from "@/lib/db"
import webpush from "web-push"

function getWebpush() {
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) return null
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return webpush
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const wp = getWebpush()
  if (!wp) return

  const subs = await db.pushSubscription.findMany({ where: { userId } })
  if (!subs.length) return

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icon-512.png",
    url: payload.url,
  })

  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data)
      } catch (err: any) {
        // 410 Gone = subscription expired/unsubscribed, clean it up
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(sub.id)
        } else {
          // Surface real delivery failures (e.g. 403 VAPID key mismatch, which
          // is otherwise invisible) so they show up in server logs.
          console.error(`Push send failed (status ${err?.statusCode ?? "?"}):`, err?.body || err?.message || err)
        }
      }
    })
  )

  if (staleIds.length) {
    await db.pushSubscription.deleteMany({ where: { id: { in: staleIds } } }).catch(() => {})
  }
}
