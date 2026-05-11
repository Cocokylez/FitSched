import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanText, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security";
import { NextResponse } from "next/server";
import webpush from "web-push";

function getWebpush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return null;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return webpush;
}

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.strictWrite, "push:send");
    if (limited) return limited;

    const requestBody = await readJsonBody(req, 8_000);
    const title = cleanText(requestBody.title, 80);
    const body = cleanText(requestBody.body, 240);
    const requestedIcon = cleanText(requestBody.icon, 120);
    const icon = requestedIcon.startsWith("/") || requestedIcon.startsWith("https://")
      ? requestedIcon
      : "/icon-512.png";

    if (!title || !body) return safeError("Notification title and body required");

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: session.user.id },
    });

    const payload = JSON.stringify({
      title,
      body,
      icon,
    });

    const wp = getWebpush();
    if (!wp) {
      return NextResponse.json({ error: "Push not configured" }, { status: 500 });
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        wp.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0 && failed.length === subscriptions.length) {
      return NextResponse.json(
        { error: "Failed to send notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: results.filter((r) => r.status === "fulfilled").length,
    });
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error);
    if (bodyError) return bodyError;

    console.error("Push send error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
