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

// POST /api/gmb/reply
// Body: { locationId, reviewId, replyText }
export async function POST(req: NextRequest) {
  const auth = getAuth()
  if (!auth) {
    return NextResponse.json({ error: "Google-autentisering ej konfigurerad" }, { status: 503 })
  }

  let body: { locationId?: string; reviewId?: string; replyText?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 })
  }

  const { locationId, reviewId, replyText } = body
  if (!locationId || !reviewId || !replyText?.trim()) {
    return NextResponse.json({ error: "locationId, reviewId och replyText krävs" }, { status: 400 })
  }

  try {
    await auth.authorize()
    const accessToken = auth.credentials.access_token

    const url = `https://mybusiness.googleapis.com/v4/${locationId}/reviews/${reviewId}/reply`
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyText }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("GMB reply API error:", res.status, errText)
      return NextResponse.json({ error: `GMB API svarade ${res.status}` }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("GMB reply POST error:", err)
    return NextResponse.json({ error: "Kunde inte skicka svar" }, { status: 500 })
  }
}
