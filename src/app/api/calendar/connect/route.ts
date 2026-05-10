import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = new URL(req.url).origin;
    const state = crypto.randomUUID();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      `${origin}/api/calendar/callback`
    );

    const scopes = ["https://www.googleapis.com/auth/calendar.readonly"];
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state,
    });

    const response = NextResponse.json({ url });
    response.cookies.set("fitsched_calendar_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
