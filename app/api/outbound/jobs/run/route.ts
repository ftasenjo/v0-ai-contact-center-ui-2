import { NextRequest, NextResponse } from 'next/server';
import { runDueOutboundJobs } from '@/lib/outbound/outbound-runner';
import { writeAuditLog } from '@/lib/banking-store';
import { requireOutboundAdmin } from '@/lib/outbound/api-auth';
import { runAutomationDispatcher } from '@/lib/automation/dispatcher';

/**
 * POST /api/outbound/jobs/run
 * Body: { limit?: number }
 *
 * Intended for cron invocation later (Vercel Cron).
 */
export async function POST(request: NextRequest) {
  const perm = requireOutboundAdmin(request);
  if (!perm.ok) return perm.res;

  const now = new Date();
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? body.limit : 25;

    const result = await runDueOutboundJobs({ limit, now });

    // Step 11: Automatically run dispatcher after outbound runner (piggyback)
    // This ensures automation events are processed promptly without separate cron
    let dispatcherResult = null;
    try {
      dispatcherResult = await runAutomationDispatcher({ limit: 50, now });
    } catch (dispatcherError: any) {
      // Non-fatal: log but don't fail the outbound runner
      console.warn('[outbound/run] Dispatcher failed (non-fatal):', dispatcherError?.message);
    }

    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.actorId,
      eventType: 'outbound_runner_invoked',
      eventVersion: 1,
      context: 'outbound',
      inputRedacted: { limit, now: now.toISOString() },
      outputRedacted: { 
        processed: result.processed,
        dispatcher_ran: dispatcherResult !== null,
        dispatcher_sent: dispatcherResult?.sent || 0,
      },
      success: true,
    });

    return NextResponse.json({ 
      success: true, 
      ...result,
      dispatcher: dispatcherResult,
    });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.actorId : undefined,
      eventType: 'outbound_runner_invoke_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_RUN_FAILED',
      errorMessage: error?.message,
    });
    return NextResponse.json({ error: 'Failed to run outbound jobs', message: error?.message }, { status: 500 });
  }
}

