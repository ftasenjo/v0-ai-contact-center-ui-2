import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCall } from "@/lib/store-adapter";

/**
 * Fetch canonical voice transcript turns for a call.
 *
 * Source of truth: `cc_call_transcripts` (provider_call_id = Twilio CallSid).
 *
 * GET /api/calls/:callSid/transcript?after=<ISO>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;
    if (!callSid) {
      return NextResponse.json({ success: false, error: "Missing callSid" }, { status: 400 });
    }

    const after = request.nextUrl.searchParams.get("after");

    let q = supabaseServer
      .from("cc_call_transcripts")
      .select("id,speaker,text,occurred_at,provider,provider_turn_id,is_final,confidence,start_ms,end_ms")
      .eq("provider_call_id", callSid)
      .order("occurred_at", { ascending: true })
      .limit(500);

    if (after) {
      // Accept either ISO timestamps or numeric milliseconds.
      const afterDate = /^\d+$/.test(after) ? new Date(Number(after)) : new Date(after);
      if (!Number.isNaN(afterDate.getTime())) {
        q = q.gt("occurred_at", afterDate.toISOString());
      }
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch transcript", message: error.message },
        { status: 500 }
      );
    }

    // Best-effort call status (legacy `calls` store). If missing, infer ended from system events.
    const call = await getCall(callSid);
    const status = call?.status ?? null;

    const endedBySystemEvent = (data || []).some((t: any) => t?.speaker === "system" && t?.text === "call_completed");
    const endedByStatus =
      typeof status === "string" ? ["completed", "ended"].includes(status.toLowerCase().trim()) : false;

    return NextResponse.json({
      success: true,
      callSid,
      status,
      ended: endedByStatus || endedBySystemEvent,
      transcript:
        (data || []).map((t: any) => ({
          id: t.id,
          speaker: t.speaker,
          text: t.text,
          occurredAt: t.occurred_at,
          provider: t.provider,
          providerTurnId: t.provider_turn_id,
          isFinal: t.is_final,
          confidence: t.confidence,
          startMs: t.start_ms,
          endMs: t.end_ms,
        })) ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch transcript", message: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

