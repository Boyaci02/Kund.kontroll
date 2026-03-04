import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !rawKey) return null

  const key = rawKey.replace(/\\n/g, "\n")

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  })
}

// GET /api/calendar?timeMin=...&timeMax=...
export async function GET(req: NextRequest) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const auth = getAuth()

  if (!calendarId || !auth) {
    return NextResponse.json({ events: [] })
  }

  const { searchParams } = req.nextUrl
  const timeMin =
    searchParams.get("timeMin") ?? new Date().toISOString()
  const timeMax =
    searchParams.get("timeMax") ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const calendar = google.calendar({ version: "v3", auth })
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    })

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id ?? "",
      summary: e.summary ?? "",
      start: e.start?.date ?? e.start?.dateTime ?? "",
      end: e.end?.date ?? e.end?.dateTime ?? "",
      description: e.description ?? "",
    }))

    return NextResponse.json({ events })
  } catch (err) {
    console.error("Google Calendar GET error:", err)
    return NextResponse.json({ events: [] })
  }
}

// POST /api/calendar
// Body: { summary, start, end, description? }
export async function POST(req: NextRequest) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const auth = getAuth()

  if (!calendarId || !auth) {
    return NextResponse.json(
      { error: "Google Calendar inte konfigurerat" },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { summary, start, end, description } = body as {
      summary: string
      start: string
      end: string
      description?: string
    }

    const calendar = google.calendar({ version: "v3", auth })
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description: description ?? "",
        start: { date: start },
        end: { date: end },
      },
    })

    return NextResponse.json({ event: res.data })
  } catch (err) {
    console.error("Google Calendar POST error:", err)
    return NextResponse.json(
      { error: "Kunde inte skapa händelse" },
      { status: 500 }
    )
  }
}
