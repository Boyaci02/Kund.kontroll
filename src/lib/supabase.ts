import { createClient } from "@supabase/supabase-js"

// Fallback to placeholder so build doesn't crash when env vars aren't set (e.g. Vercel preview).
// Actual queries will fail gracefully — handled with try/catch in auth.ts.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

export const supabase = createClient(supabaseUrl, supabaseKey)
