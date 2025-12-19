import crypto from "crypto"
import { supabaseServer } from "@/lib/supabase-server"
import { redactError, redactSensitive } from "@/lib/audit-redaction"

export type ObservabilitySeverity = "debug" | "info" | "warn" | "error" | "critical"
export type ObservabilitySource = "twilio" | "vapi" | "sendgrid" | "whatsapp" | "supabase" | "n8n" | "app"
export type WebhookProvider = "twilio" | "sendgrid" | "meta" | "n8n" | "vapi" | "app"

function sha1Hex(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex")
}

function toPlainObjectHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

function redactWebhookHeaders(headers: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = { ...headers }
  const blocklist = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "x-twilio-signature",
    "x-sendgrid-signature",
    "x-sendgrid-signature-timestamp",
  ])

  for (const k of Object.keys(out)) {
    if (blocklist.has(k.toLowerCase())) {
      out[k] = "[REDACTED]"
    }
  }

  return redactSensitive(out, "webhook")
}

function redactTextValue(value: string): { preview: string; length: number; sha1: string } {
  return {
    preview: value.slice(0, 20),
    length: value.length,
    sha1: sha1Hex(value),
  }
}

/**
 * Extra redaction for "message body"-like fields:
 * - keep deterministic correlation (sha1) and size
 * - avoid logging raw long content
 */
function compactLikelyMessageBodies(input: any): any {
  if (input === null || input === undefined) return input
  if (typeof input === "string") return input.length > 64 ? redactTextValue(input) : input
  if (typeof input === "number" || typeof input === "boolean") return input
  if (Array.isArray(input)) return input.map(compactLikelyMessageBodies)
  if (typeof input === "object") {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      const lk = k.toLowerCase()
      const isBodyLike =
        lk === "body" ||
        lk === "text" ||
        lk === "content" ||
        lk === "message" ||
        lk.endsWith("_body") ||
        lk.endsWith("_text") ||
        lk.includes("messagebody") ||
        lk.includes("smsbody")

      if (isBodyLike && typeof v === "string") {
        out[k] = redactTextValue(v)
        continue
      }
      out[k] = compactLikelyMessageBodies(v)
    }
    return out
  }
  return input
}

export function computeFingerprint(params: {
  source: ObservabilitySource
  eventType: string
  endpoint?: string | null
  errorCode?: string | null
}): string {
  const normalizedEndpoint = (params.endpoint || "").trim().toLowerCase()
  const normalizedErrorCode = (params.errorCode || "").trim().toLowerCase()
  return sha1Hex([params.source, params.eventType, normalizedErrorCode, normalizedEndpoint].join("|"))
}

export async function writeWebhookReceipt(params: {
  provider: WebhookProvider
  endpoint: string
  method: string
  correlationId?: string | null
  signatureValid?: boolean | null
  dedupeKey?: string | null
  requestHeaders: Headers | Record<string, string>
  requestBody: any
  responseStatus: number
  responseBody?: any
  durationMs: number
  errorText?: string | null
}): Promise<void> {
  const requestHeadersPlain =
    params.requestHeaders instanceof Headers ? toPlainObjectHeaders(params.requestHeaders) : params.requestHeaders

  const request_headers_redacted = redactWebhookHeaders(requestHeadersPlain)
  const request_body_redacted = redactSensitive(compactLikelyMessageBodies(params.requestBody), "webhook")
  const response_body_redacted =
    params.responseBody === undefined ? null : redactSensitive(compactLikelyMessageBodies(params.responseBody), "webhook")

  const { error } = await supabaseServer.from("cc_webhook_receipts").insert({
    provider: params.provider,
    endpoint: params.endpoint,
    method: params.method,
    correlation_id: params.correlationId ?? null,
    signature_valid: params.signatureValid ?? null,
    dedupe_key: params.dedupeKey ?? null,
    request_headers_redacted,
    request_body_redacted,
    response_status: params.responseStatus,
    response_body_redacted,
    duration_ms: Math.max(0, Math.round(params.durationMs)),
    error_text: params.errorText ?? null,
  })

  if (error) {
    // If the table isn't deployed in this Supabase project yet, fail silently.
    // PostgREST uses PGRST205 for "table not found in schema cache".
    if ((error as any)?.code === "PGRST205") return
    // Never throw from observability logging; we don't want to break primary flow.
    console.warn("writeWebhookReceipt failed:", redactError(error))
  }
}

export async function writeObservabilityEvent(params: {
  severity: ObservabilitySeverity
  source: ObservabilitySource
  eventType: string
  summary: string
  details?: any
  correlationId?: string | null
  requestId?: string | null
  httpStatus?: number | null
  durationMs?: number | null
  fingerprint?: string | null
}): Promise<void> {
  const fingerprint =
    params.fingerprint ||
    computeFingerprint({
      source: params.source,
      eventType: params.eventType,
      endpoint: (params.details as any)?.endpoint ?? null,
      errorCode: (params.details as any)?.error_code ?? null,
    })

  const details_redacted = redactSensitive(compactLikelyMessageBodies(params.details ?? {}), "webhook")

  const { error } = await supabaseServer.from("cc_observability_events").insert({
    severity: params.severity,
    source: params.source,
    event_type: params.eventType,
    correlation_id: params.correlationId ?? null,
    request_id: params.requestId ?? null,
    http_status: params.httpStatus ?? null,
    duration_ms: params.durationMs ?? null,
    summary: params.summary,
    details_redacted,
    fingerprint,
    count: 1,
  })

  if (error) {
    if ((error as any)?.code === "PGRST205") return
    console.warn("writeObservabilityEvent failed:", redactError(error))
  }
}

