import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireOutboundAdmin } from "@/lib/outbound/api-auth"

const STATUSES = ["queued", "awaiting_verification", "sent", "failed", "cancelled"] as const

export async function GET(request: NextRequest) {
  const perm = requireOutboundAdmin(request)
  if (!perm.ok) return perm.res

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Supabase JS doesn't support GROUP BY cleanly; keep it small + parallel.
  const results = await Promise.all(
    STATUSES.map(async (status) => {
      const { count, error } = await supabaseServer
        .from("cc_outbound_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("status", status)

      if (error) throw error
      return [status, count || 0] as const
    }),
  )

  const counts: Record<string, number> = {}
  for (const [status, count] of results) counts[status === "cancelled" ? "canceled" : status] = count

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return NextResponse.json({
    window_hours: 24,
    since,
    total,
    counts,
  })
}

