import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse(null, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q) return new NextResponse(null, { status: 400 })

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return new NextResponse(null, { status: 503 })

  const mapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap")
  mapUrl.searchParams.set("center", q)
  mapUrl.searchParams.set("zoom", "13")
  mapUrl.searchParams.set("size", "400x180")
  mapUrl.searchParams.set("maptype", "terrain")
  mapUrl.searchParams.set("markers", `color:0x6bbfb8|${q}`)
  mapUrl.searchParams.set("key", apiKey)

  const upstream = await fetch(mapUrl.toString())
  if (!upstream.ok) return new NextResponse(null, { status: 502 })

  const buf = await upstream.arrayBuffer()
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  })
}
