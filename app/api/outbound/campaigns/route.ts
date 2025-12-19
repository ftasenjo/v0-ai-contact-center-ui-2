import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/banking-store';
import { requireOutboundAdmin } from '@/lib/outbound/api-auth';

export async function GET(request: NextRequest) {
  const perm = requireOutboundAdmin(request);
  if (!perm.ok) return perm.res;

  try {
    const { data: campaigns, error } = await supabaseServer
      .from('cc_outbound_campaigns')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({
      items: (campaigns || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        purpose: c.purpose,
        status: c.status,
        allowed_channels: c.allowed_channels,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
    });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.actorId : undefined,
      eventType: 'outbound_campaigns_list_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_CAMPAIGNS_LIST_FAILED',
      errorMessage: error?.message,
    });
    return NextResponse.json({ error: 'Failed to list campaigns', message: error?.message }, { status: 500 });
  }
}

