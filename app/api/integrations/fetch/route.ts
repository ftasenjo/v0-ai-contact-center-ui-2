import { NextRequest, NextResponse } from "next/server"
import { integrationFetch } from "@/lib/integrations/fetch"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const integrationId = typeof body?.integrationId === "string" ? body.integrationId : ""
    const path = typeof body?.path === "string" ? body.path : ""
    const method = typeof body?.method === "string" ? body.method : "GET"
    const query = typeof body?.query === "object" && body.query ? body.query : undefined
    const headers = typeof body?.headers === "object" && body.headers ? body.headers : undefined
    const bodyJson = body?.bodyJson

    if (!integrationId || !path) {
      return NextResponse.json(
        { success: false, error: "integrationId and path are required" },
        { status: 400 },
      )
    }

    const result = await integrationFetch({
      integrationId,
      path,
      method,
      query,
      headers,
      bodyJson,
    } as any)

    return NextResponse.json({
      success: result.ok,
      error: result.ok ? null : `Integration call failed (HTTP ${result.status})`,
      result,
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Integration call failed" },
      { status: 500 },
    )
  }
}

