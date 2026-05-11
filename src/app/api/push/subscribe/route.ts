import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanText, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "push:subscribe");
    if (limited) return limited;

    const subscription = await readJsonBody(req, 16_000);
    const endpoint = cleanText(subscription.endpoint, 2_000);
    const p256dh = cleanText(subscription.keys?.p256dh, 256);
    const authKey = cleanText(subscription.keys?.auth, 256);

    if (!endpoint.startsWith("https://") || !p256dh || !authKey) {
      return safeError("Invalid push subscription");
    }

    const existing = await db.pushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });

    if (existing && existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Subscription already registered" }, { status: 409 });
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth: authKey,
      },
      update: {
        p256dh,
        auth: authKey,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error);
    if (bodyError) return bodyError;

    console.error("Push subscription error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
