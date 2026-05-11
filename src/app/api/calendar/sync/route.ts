import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/fieldEncryption";
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.strictWrite, "calendar:sync");
    if (limited) return limited;

    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID || !process.env.GOOGLE_CALENDAR_CLIENT_SECRET) {
      return NextResponse.json({ error: "Calendar integration is not configured" }, { status: 503 });
    }

    const connection = await db.calendarConnection.findFirst({
      where: { userId: session.user.id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "No calendar connection" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: decryptSecret(connection.googleToken),
      refresh_token: decryptSecret(connection.refreshToken),
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    const response = await calendar.events.list({
      calendarId: connection.calendarId,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    await db.$transaction(async (tx) => {
      await tx.calendarEvent.deleteMany({
        where: { connectionId: connection.id },
      });

      await tx.calendarEvent.createMany({
        data: events
          .filter((e) => e.summary && (e.start?.dateTime || e.start?.date))
          .map((e) => {
            const startTime = e.start?.dateTime
              ? new Date(e.start.dateTime)
              : new Date(e.start!.date!);
            const endTime = e.end?.dateTime
              ? new Date(e.end.dateTime)
              : new Date(e.end!.date!);
            const isAllDay = !e.start?.dateTime;

            return {
              connectionId: connection.id,
              googleEventId: e.id || `manual-${Date.now()}`,
              summary: e.summary!,
              startTime,
              endTime,
              isAllDay,
            };
          }),
      });

      await tx.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      count: events.length,
    });
  } catch (error: any) {
    console.error("Calendar sync error:", error);

    if (error?.response?.status === 401) {
      return NextResponse.json(
        { error: "Token expired, reconnect needed" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.strictWrite, "calendar:disconnect");
    if (limited) return limited;

    await db.calendarConnection.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.read, "calendar:get");
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (date && Number.isNaN(new Date(date).getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const connection = await db.calendarConnection.findFirst({
      where: { userId: session.user.id },
      include: {
        events: date
          ? {
              where: {
                startTime: {
                  gte: new Date(date),
                  lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
                },
              },
              orderBy: { startTime: "asc" },
            }
          : {
              orderBy: { startTime: "asc" },
              take: 50,
            },
      },
    });

    return NextResponse.json({
      connected: !!connection,
      events: connection?.events || [],
      lastSyncedAt: connection?.lastSyncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 }
    );
  }
}
