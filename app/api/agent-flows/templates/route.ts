import { NextResponse } from "next/server"
import { AGENT_FLOW_TEMPLATES } from "@/lib/agent-builder/templates"

export async function GET() {
  return NextResponse.json({
    success: true,
    templates: AGENT_FLOW_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
    })),
  })
}

