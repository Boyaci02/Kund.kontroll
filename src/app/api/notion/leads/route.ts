import { Client } from "@notionhq/client"
import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY
  const dbId = process.env.NOTION_DATABASE_ID

  if (!apiKey || apiKey === "secret_REPLACE_ME") {
    return NextResponse.json(
      { error: "NOTION_API_KEY saknas i .env.local" },
      { status: 500 }
    )
  }
  if (!dbId || dbId === "REPLACE_ME") {
    return NextResponse.json(
      { error: "NOTION_DATABASE_ID saknas i .env.local" },
      { status: 500 }
    )
  }

  try {
    const notion = new Client({ auth: apiKey })
    const resp = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    })
    return NextResponse.json(resp.results)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Okänt fel"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
