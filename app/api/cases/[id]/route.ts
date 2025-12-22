import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  const { id } = await context.params
  const { data, error } = await supabaseServer
    .from("cc_cases")
    .select("id,type,status,priority,bank_customer_id,conversation_id,case_number,description,amount,currency,created_at,updated_at,resolved_at,resolved_by")
    .eq("id", id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ case: data })
}


