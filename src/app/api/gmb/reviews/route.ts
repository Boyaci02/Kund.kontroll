import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !rawKey) return null
  return new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/business.manage"],
  })
}

// GET /api/gmb/reviews?locationId=locations/123456789
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const locationId = searchParams.get("locationId")

  if (!locationId) {
    return NextResponse.json({ error: "locationId saknas" }, { status: 400 })
  }

  const auth = getAuth()
  if (!auth) {
    return NextResponse.json({ error: "Google-autentisering ej konfigurerad" }, { status: 503 })
  }

  try {
    await auth.authorize()
    const accessToken = auth.credentials.access_token

    const url = `https://mybusiness.googleapis.com/v4/${locationId}/reviews?pageSize=50`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("GMB reviews API error:", res.status, errText)
      return NextResponse.json({ error: `GMB API svarade ${res.status}` }, { status: res.status })
    }

    const data = await res.json() as {
      reviews?: Array<{
        reviewId: string
        reviewer?: { displayName?: string }
        starRating?: string
        comment?: string
        createTime?: string
        updateTime?: string
      }>
    }

    const STAR_MAP: Record<string, 1 | 2 | 3 | 4 | 5> = {
      ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    }

    const reviews = (data.reviews ?? []).map((r) => ({
      reviewId: r.reviewId,
      reviewer: r.reviewer?.displayName ?? "Anonym",
      rating: STAR_MAP[r.starRating ?? "FIVE"] ?? 5,
      comment: r.comment ?? "",
      createTime: r.createTime ?? new Date().toISOString(),
      updateTime: r.updateTime ?? new Date().toISOString(),
    }))

    return NextResponse.json({ reviews })
  } catch (err) {
    console.error("GMB reviews GET error:", err)
    return NextResponse.json({ error: "Kunde inte hämta recensioner" }, { status: 500 })
  }
}
