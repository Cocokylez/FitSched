import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const origin = new URL(req.url).origin;
      return NextResponse.redirect(`${origin}/login`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = req.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("fitsched_calendar_oauth_state="))
      ?.split("=")[1];

    const origin = new URL(req.url).origin;

    if (!code || !state || !storedState || state !== decodeURIComponent(storedState)) {
      return NextResponse.redirect(
        `${origin}/settings?error=invalid_state`
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      `${origin}/api/calendar/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${origin}/settings?error=missing_tokens`
      );
    }

    const expiry = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600000);

    await db.calendarConnection.upsert({
      where: {
        userId_calendarId: {
          userId: session.user.id,
          calendarId: "primary",
        },
      },
      create: {
        userId: session.user.id,
        googleToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: expiry,
        calendarId: "primary",
      },
      update: {
        googleToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: expiry,
      },
    });

    const response = NextResponse.redirect(
      `${origin}/schedule?connected=true`
    );
    response.cookies.delete("fitsched_calendar_oauth_state");

    return response;
  } catch (error) {
    console.error("Calendar callback error:", error);
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(
      `${origin}/settings?error=auth_failed`
    );
  }
}
