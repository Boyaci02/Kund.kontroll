import { NextRequest } from "next/server"

export function validateClaudeKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-claude-api-key")
  const expectedKey = process.env.CLAUDE_API_KEY
  if (!expectedKey || expectedKey === "replace-me") return false
  return apiKey === expectedKey
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
