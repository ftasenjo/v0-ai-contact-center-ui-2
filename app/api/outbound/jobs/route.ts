import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/banking-store';
import { requireOutboundAdmin } from '@/lib/outbound/api-auth';

function normalizeJobStatusForDb(status: string): string {
  // DB uses "cancelled"; API accepts both.
  if (status === "canceled") return "cancelled";
  return status;
}

function normalizeJobStatusForApi(status: string): string {
  if (status === "cancelled") return "canceled";
  return status;
}

function toHint(targetAddress: string): string {
  const raw = (targetAddress || "").trim();
  const lower = raw.toLowerCase();
  const value = lower.includes(":") ? lower.split(":").slice(1).join(":") : lower;

  // Email-ish
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    const u = user || "";
    const prefix = u.slice(0, 1);
    return `${prefix}•••@${domain || ""}`;
  }

  // Phone-ish: keep country-ish prefix (+34) and last 2 digits
  const digits = value.replace(/[^\d+]/g, "");
  const last2 = digits.replace(/[^\d]/g, "").slice(-2);
  const country = digits.startsWith("+") ? digits.slice(0, 3) : digits.slice(0, 2);
  return `${country}•••${last2}`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const perm = requireOutboundAdmin(request);
  if (!perm.ok) return perm.res;

  const statusRaw = (url.searchParams.get('status') || '').trim(); // queued|awaiting_verification|sent|failed|canceled
  const status = statusRaw ? normalizeJobStatusForDb(statusRaw) : null;
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(200, Math.max(1, Number(limitRaw || 50) || 50));
  const cursorRaw = (url.searchParams.get('cursor') || '').trim();
  const cursorParts = cursorRaw ? cursorRaw.split('|') : [];
  const cursorCreatedAt = cursorParts.length === 2 ? cursorParts[0] : null;
  const cursorId = cursorParts.length === 2 ? cursorParts[1] : null;

  try {
    let query = supabaseServer
      .from('cc_outbound_jobs')
      .select(
        `
        id,
        created_at,
        status,
        channel,
        target_address,
        campaign_id,
        attempt_count,
        last_error_code
      `
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (status) {
      query = query.eq('status', status);
    }

    // Stable cursor pagination (created_at, id) for descending order.
    if (cursorCreatedAt && cursorId) {
      query = query.or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    const rows = jobs || [];
    const pageRows = rows.slice(0, limit);

    // Attach last attempt timestamp (best effort)
    const jobIds = pageRows.map((j: any) => j.id).filter(Boolean);
    let lastAttemptsByJob: Record<string, any> = {};
    if (jobIds.length > 0) {
      const { data: attempts, error: attemptsError } = await supabaseServer
        .from('cc_outbound_attempts')
        .select('outbound_job_id,attempt_number,created_at')
        .in('outbound_job_id', jobIds)
        .order('outbound_job_id', { ascending: true })
        .order('attempt_number', { ascending: false });

      if (!attemptsError && attempts) {
        for (const a of attempts) {
          if (!lastAttemptsByJob[a.outbound_job_id]) {
            lastAttemptsByJob[a.outbound_job_id] = a;
          }
        }
      }
    }

    const items = pageRows.map((j: any) => {
      const lastAttempt = lastAttemptsByJob[j.id] || null;
      return {
        id: j.id,
        created_at: j.created_at,
        status: normalizeJobStatusForApi(j.status),
        channel: j.channel,
        to_hint: toHint(j.target_address),
        campaign_id: j.campaign_id,
        attempts_count: j.attempt_count ?? 0,
        last_attempt_at: lastAttempt?.created_at ?? null,
        last_error_hint: j.last_error_code ?? null,
      };
    });

    const hasMore = rows.length > limit;
    const tail = pageRows[pageRows.length - 1];
    const next_cursor = hasMore && tail ? `${tail.created_at}|${tail.id}` : null;

    return NextResponse.json({ items, next_cursor });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.actorId : undefined,
      eventType: 'outbound_jobs_list_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_JOBS_LIST_FAILED',
      errorMessage: error?.message,
    });
    return NextResponse.json({ error: 'Failed to list outbound jobs', message: error?.message }, { status: 500 });
  }
}

