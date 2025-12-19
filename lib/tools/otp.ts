/**
 * Step 6.3: OTP Authentication Tools
 * 
 * Tools for starting and verifying OTP via Twilio Verify.
 * All tool calls are wrapped with audit logging via callToolWithAudit.
 */

import { getTwilioClient } from '@/lib/twilio';
import { callToolWithAudit } from './audit-wrapper';
import { supabaseServer } from '@/lib/supabase-server';
import { redactSensitive } from '@/lib/audit-redaction';

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!VERIFY_SERVICE_SID) {
  console.warn('⚠️ TWILIO_VERIFY_SERVICE_SID not set. OTP functionality will not work.');
}

/**
 * Mask phone number for display (e.g., +1234567890 -> +1 *** *** 7890)
 */
function maskPhoneNumber(phone: string): string {
  // Remove whatsapp: prefix if present
  const cleanPhone = phone.replace(/^whatsapp:/, '');
  
  // Extract country code and last 4 digits
  const match = cleanPhone.match(/^(\+\d{1,3})(\d+)(\d{4})$/);
  if (match) {
    const [, countryCode, middle, last4] = match;
    return `${countryCode} *** *** ${last4}`;
  }
  
  // Fallback: mask middle digits
  if (cleanPhone.length > 7) {
    return `${cleanPhone.substring(0, 3)} *** *** ${cleanPhone.substring(cleanPhone.length - 4)}`;
  }
  
  return '*** *** ****';
}

/**
 * Extract E.164 phone number from WhatsApp format
 * Converts whatsapp:+1234567890 -> +1234567890
 */
function extractE164Phone(phone: string): string {
  return phone.replace(/^whatsapp:/, '');
}

/**
 * Step 6.3: Start OTP via SMS
 * 
 * For WhatsApp inbound → send OTP via SMS to phone number
 * 
 * @param e164Phone - E.164 formatted phone number (e.g., +1234567890)
 * @param auditContext - Audit context for logging
 * @returns Verification SID and status
 */
export async function startOtp(
  e164Phone: string,
  auditContext: {
    conversationId: string;
    messageId?: string;
    bankCustomerId?: string;
    channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  }
): Promise<{ sid: string; status: string }> {
  return callToolWithAudit(
    'start_otp',
    { phone: e164Phone },
    async (input) => {
      // Dev/CI escape hatch: allow deterministic OTP without Twilio Verify.
      // Use ONLY for local demos/tests.
      if (process.env.OTP_PROVIDER_MODE === 'mock' || !VERIFY_SERVICE_SID) {
        const sid = `mock-verify-${auditContext.conversationId}-${Date.now()}`;

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await supabaseServer
          .from('cc_auth_sessions')
          .insert({
            conversation_id: auditContext.conversationId,
            bank_customer_id: auditContext.bankCustomerId || null,
            method: 'otp',
            status: 'sent',
            channel: auditContext.channel,
            destination: maskPhoneNumber(input.phone),
            provider: 'mock',
            provider_request_id: sid,
            attempts: 0,
            max_attempts: 3,
            expires_at: expiresAt.toISOString(),
          })
          .select('id')
          .maybeSingle();

        // Code is fixed for mock mode (not stored): 000000
        return { sid, status: 'pending' };
      }

      if (!VERIFY_SERVICE_SID) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured');
      }

      const client = getTwilioClient();
      const cleanPhone = extractE164Phone(input.phone);

      // Start verification via SMS
      const verification = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({
          to: cleanPhone,
          channel: 'sms', // Always use SMS for WhatsApp (as per Step 6.1)
        });

      // Create auth session in DB
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

      const { data: authSession, error } = await supabaseServer
        .from('cc_auth_sessions')
        .insert({
          conversation_id: auditContext.conversationId,
          bank_customer_id: auditContext.bankCustomerId || null,
          method: 'otp',
          status: 'sent',
          channel: auditContext.channel,
          destination: maskPhoneNumber(input.phone), // Masked for privacy
          provider: 'twilio_verify',
          provider_request_id: verification.sid,
          attempts: 0,
          max_attempts: 3,
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating auth session:', error);
        // Don't throw - verification was sent, just DB logging failed
      }

      return {
        sid: verification.sid,
        status: verification.status,
      };
    },
    {
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      bankCustomerId: auditContext.bankCustomerId,
      actorType: 'system',
      context: 'auth',
    }
  );
}

/**
 * Step 6.3: Verify OTP code
 * 
 * @param e164Phone - E.164 formatted phone number
 * @param code - 6-digit OTP code
 * @param auditContext - Audit context for logging
 * @returns Verification result
 */
export async function verifyOtp(
  e164Phone: string,
  code: string,
  auditContext: {
    conversationId: string;
    messageId?: string;
    bankCustomerId?: string;
    channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  }
): Promise<{ status: string; valid: boolean; attemptsRemaining?: number }> {
  return callToolWithAudit(
    'verify_otp',
    { phone: e164Phone, codeLength: code.length }, // Don't log actual code
    async (input) => {
      // Dev/CI escape hatch: deterministic OTP without Twilio Verify.
      if (process.env.OTP_PROVIDER_MODE === 'mock' || !VERIFY_SERVICE_SID) {
        const { data: activeSession } = await supabaseServer
          .from('cc_auth_sessions')
          .select('*')
          .eq('conversation_id', auditContext.conversationId)
          .eq('method', 'otp')
          .eq('status', 'sent')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!activeSession) {
          return { status: 'no_session', valid: false };
        }

        const newAttempts = (activeSession.attempts || 0) + 1;
        const isValid = code === '000000';

        if (isValid) {
          await supabaseServer
            .from('cc_auth_sessions')
            .update({
              status: 'verified',
              verified_at: new Date().toISOString(),
              attempts: newAttempts,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeSession.id);
          return { status: 'verified', valid: true };
        }

        const isMaxAttempts = newAttempts >= (activeSession.max_attempts || 3);
        await supabaseServer
          .from('cc_auth_sessions')
          .update({
            attempts: newAttempts,
            status: isMaxAttempts ? 'failed' : 'sent',
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeSession.id);

        return {
          status: 'invalid',
          valid: false,
          attemptsRemaining: Math.max(0, (activeSession.max_attempts || 3) - newAttempts),
        };
      }

      if (!VERIFY_SERVICE_SID) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured');
      }

      const client = getTwilioClient();
      const cleanPhone = extractE164Phone(e164Phone);

      // Find active auth session for this conversation
      const { data: activeSession } = await supabaseServer
        .from('cc_auth_sessions')
        .select('*')
        .eq('conversation_id', auditContext.conversationId)
        .eq('method', 'otp')
        .eq('status', 'sent')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeSession) {
        return {
          status: 'no_session',
          valid: false,
        };
      }

      // Check if max attempts reached
      if (activeSession.attempts >= activeSession.max_attempts) {
        // Mark as failed
        await supabaseServer
          .from('cc_auth_sessions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeSession.id);

        return {
          status: 'max_attempts_reached',
          valid: false,
          attemptsRemaining: 0,
        };
      }

      // Verify code with Twilio
      const check = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: cleanPhone,
          code,
        });

      const isValid = check.status === 'approved';
      const newAttempts = activeSession.attempts + 1;

      if (isValid) {
        // Mark as verified
        await supabaseServer
          .from('cc_auth_sessions')
          .update({
            status: 'verified',
            verified_at: new Date().toISOString(),
            attempts: newAttempts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeSession.id);

        return {
          status: 'verified',
          valid: true,
        };
      } else {
        // Increment attempts
        const isMaxAttempts = newAttempts >= activeSession.max_attempts;
        await supabaseServer
          .from('cc_auth_sessions')
          .update({
            attempts: newAttempts,
            status: isMaxAttempts ? 'failed' : 'sent', // Keep as 'sent' if not max attempts
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeSession.id);

        return {
          status: check.status,
          valid: false,
          attemptsRemaining: Math.max(0, activeSession.max_attempts - newAttempts),
        };
      }
    },
    {
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      bankCustomerId: auditContext.bankCustomerId,
      actorType: 'system',
      context: 'auth',
    }
  );
}

/**
 * Step 6.3: Get active auth session for conversation
 * 
 * @param conversationId - Conversation ID
 * @returns Active auth session or null
 */
export async function getActiveAuthSession(
  conversationId: string
): Promise<{
  id: string;
  method: string;
  status: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  bank_customer_id: string | null;
} | null> {
  const { data, error } = await supabaseServer
    .from('cc_auth_sessions')
    .select('id, method, status, attempts, max_attempts, expires_at, bank_customer_id')
    .eq('conversation_id', conversationId)
    .eq('method', 'otp')
    .in('status', ['created', 'sent']) // Active statuses
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active auth session:', error);
    return null;
  }

  return data;
}

/**
 * Extract OTP code from message text
 * Matches 6-digit codes
 */
export function extractOtpCode(text: string): string | null {
  const match = text.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

