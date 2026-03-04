const BASE_URL = "https://api.airtable.com/v0"

function airtableHeaders() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
    "Content-Type": "application/json",
  }
}

// GET /api/airtable?tableId=tbl...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tableId = searchParams.get("tableId")
  if (!tableId) return Response.json({ error: "Missing tableId" }, { status: 400 })

  const baseId = process.env.AIRTABLE_BASE_ID
  let url = `${BASE_URL}/${baseId}/${tableId}?pageSize=100`

  const allRecords: unknown[] = []

  // Paginate through all records
  while (url) {
    const res = await fetch(url, { headers: airtableHeaders() })
    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: err }, { status: res.status })
    }
    const data = await res.json() as { records: unknown[]; offset?: string }
    allRecords.push(...(data.records ?? []))
    url = data.offset
      ? `${BASE_URL}/${baseId}/${tableId}?pageSize=100&offset=${data.offset}`
      : ""
  }

  return Response.json({ records: allRecords })
}

// PATCH /api/airtable — update a record's fields
export async function PATCH(req: Request) {
  const { tableId, recordId, fields } = await req.json()
  if (!tableId || !recordId) return Response.json({ error: "Missing params" }, { status: 400 })

  const baseId = process.env.AIRTABLE_BASE_ID
  const res = await fetch(`${BASE_URL}/${baseId}/${tableId}/${recordId}`, {
    method: "PATCH",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields }),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/airtable — create a new record
export async function POST(req: Request) {
  const { tableId, fields } = await req.json()
  if (!tableId) return Response.json({ error: "Missing tableId" }, { status: 400 })

  const baseId = process.env.AIRTABLE_BASE_ID
  const res = await fetch(`${BASE_URL}/${baseId}/${tableId}`, {
    method: "POST",
    headers: airtableHeaders(),
    body: JSON.stringify({ records: [{ fields }] }),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/airtable — delete a record
export async function DELETE(req: Request) {
  const { tableId, recordId } = await req.json()
  if (!tableId || !recordId) return Response.json({ error: "Missing params" }, { status: 400 })

  const baseId = process.env.AIRTABLE_BASE_ID
  const res = await fetch(`${BASE_URL}/${baseId}/${tableId}/${recordId}`, {
    method: "DELETE",
    headers: airtableHeaders(),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
