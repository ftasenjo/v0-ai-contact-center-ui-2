/**
 * Step 5.3: Redaction Middleware
 * 
 * Centralized redaction function to sanitize sensitive data before logging.
 * Used by webhook logging, tool call logging, supervisor decision logging,
 * agent output logging, and error logging.
 * 
 * Minimum redactions:
 * - OTP codes (4-8 digit sequences in auth contexts)
 * - Card numbers / PAN patterns (even partial)
 * - CVV
 * - SSN/NIF/NIE/national IDs
 * - Full email addresses (mask user part)
 * - Phone numbers (mask middle digits)
 * - Addresses (if present)
 * - Tokens/keys/secrets (Authorization, Bearer, API keys)
 */

/**
 * Redact sensitive information from data before logging
 * 
 * @param data - The data to redact (can be any type)
 * @param context - Optional context (e.g., 'auth', 'webhook', 'tool_call')
 * @returns Redacted data (same structure, with sensitive values replaced)
 */
export function redactSensitive(data: any, context?: string): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data === 'string') {
    return redactString(data, context);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => redactSensitive(item, context));
  }

  // Handle objects
  if (typeof data === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip certain keys that are safe to log
      if (key === 'id' || key === 'created_at' || key === 'updated_at' || key === 'timestamp') {
        redacted[key] = value;
        continue;
      }

      // Redact based on key name
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('key') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('auth_token') ||
        lowerKey.includes('access_token') ||
        lowerKey.includes('refresh_token')
      ) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // Recursively redact nested objects
      redacted[key] = redactSensitive(value, context);
    }
    return redacted;
  }

  return data;
}

/**
 * Redact sensitive patterns in strings
 */
function redactString(str: string, context?: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }

  let redacted = str;

  // OTP codes (4-8 digits, especially in auth contexts)
  if (context === 'auth' || context?.includes('otp') || context?.includes('verification')) {
    redacted = redacted.replace(/\b\d{4,8}\b/g, '[OTP_REDACTED]');
  }

  // Card numbers (PAN patterns: 13-19 digits, may have spaces/dashes)
  // Match: 4111 1111 1111 1111, 4111-1111-1111-1111, 4111111111111111
  redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g, '[CARD_REDACTED]');
  // Also match partial card numbers (last 4 digits visible: ****1234)
  redacted = redacted.replace(/\*{4,}\d{4}\b/g, '[CARD_REDACTED]');

  // CVV (3-4 digits, often preceded by "CVV", "CVC", "security code")
  redacted = redacted.replace(/\b(?:cvv|cvc|security\s+code)[\s:]*\d{3,4}\b/gi, '[CVV_REDACTED]');
  redacted = redacted.replace(/\b\d{3,4}\b(?=\s*(?:cvv|cvc|security\s+code))/gi, '[CVV_REDACTED]');

  // SSN/NIF/NIE patterns (varies by country, but common patterns)
  // US SSN: XXX-XX-XXXX or XXXXXXXXX
  redacted = redacted.replace(/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, '[SSN_REDACTED]');
  // Spanish NIF/NIE: X1234567X or similar
  redacted = redacted.replace(/\b[A-Z]?\d{7,8}[A-Z]?\b/gi, (match) => {
    // Only redact if it looks like an ID (has letters and numbers)
    if (/[A-Z]/i.test(match) && /\d/.test(match)) {
      return '[ID_REDACTED]';
    }
    return match;
  });

  // Email addresses (mask user part, keep domain)
  // Match: user@domain.com -> [REDACTED]@domain.com
  redacted = redacted.replace(/\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, '[REDACTED]@$2');

  // Phone numbers (mask middle digits)
  // Match: +1 234 567 8900 -> +1 [REDACTED] 8900
  // Match: +34628764918 -> +34 [REDACTED] 4918
  redacted = redacted.replace(/\b(\+?\d{1,3})[\s-]?(\d{1,4})[\s-]?(\d{2,4})[\s-]?(\d{2,4})\b/g, (match, country, part1, part2, part3) => {
    // Only redact if it looks like a phone number (has country code and multiple parts)
    if (country && part1 && part2 && part3) {
      return `${country} [REDACTED] ${part3}`;
    }
    return match;
  });

  // Addresses (common patterns)
  // Match: "123 Main St", "123 Main Street", "Apt 4B", "Suite 100"
  redacted = redacted.replace(/\b\d+\s+[A-Z][a-z]+(?:\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Pl|Place|Way|Cir|Circle|Pkwy|Parkway))(?:\s+(?:Apt|Apartment|Suite|Unit|#)\s*[A-Z0-9]+)?/gi, '[ADDRESS_REDACTED]');

  // API keys / tokens in headers or body
  // Match: "Authorization: Bearer xyz123..." or "api_key=xyz123"
  redacted = redacted.replace(/\b(?:authorization|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token)[\s:=]+([a-zA-Z0-9_\-]{20,})/gi, (match, token) => {
    return match.replace(token, '[TOKEN_REDACTED]');
  });

  // Twilio/API secrets (long alphanumeric strings)
  //
  // IMPORTANT:
  // Twilio resource SIDs (AccountSid, CallSid, MessageSid, etc.) are identifiers, not secrets.
  // We intentionally DO NOT redact them because they are required for deterministic DB-only
  // debugging (e.g. proving `twilio_stream_connected` for a specific CallSid).
  //
  // If you truly need to redact secrets, prefer redacting by key name (token/key/secret)
  // or by known secret formats rather than blanket 2-letter prefixes.
  const looksLikeTwilioSid = /^(?:AC|CA|SM|PN|MG|CH|AP|AL|BK|CJ|CL|CR|CS|CV|DC|DJ|DU|EH|EM|ES|FK|FO|FT|FW|HF|HP|HS|IM|IV|KI|KS|LT|MB|ME|MK|MM|MR|MS|NE|NH|NO|NT|NV|OC|PC|PM|QR|RD|RE|RG|RM|RN|RT|SA|SC|SE|SL|SP|ST|SV|TC|TS|VE|VP|WA|WS)[0-9a-f]{32}$/i;
  if (!looksLikeTwilioSid.test(redacted)) {
    // Conservative fallback: redact very long opaque strings that are unlikely to be user content.
    redacted = redacted.replace(/\b[a-zA-Z0-9_\-]{48,}\b/g, '[API_SECRET_REDACTED]');
  }

  // Credit card expiry (MM/YY or MM/YYYY)
  redacted = redacted.replace(/\b(0[1-9]|1[0-2])\/(\d{2,4})\b/g, '[EXPIRY_REDACTED]');

  // Bank account numbers (long numeric strings, often 8-17 digits)
  // Be careful not to redact legitimate numbers (like message IDs)
  // Only redact if context suggests it's financial
  if (context?.includes('bank') || context?.includes('account') || context?.includes('financial')) {
    redacted = redacted.replace(/\b\d{8,17}\b/g, (match) => {
      // Don't redact if it looks like a timestamp or message ID
      if (match.length <= 10 && parseInt(match) > 1000000000) {
        // Likely a Unix timestamp
        return match;
      }
      return '[ACCOUNT_REDACTED]';
    });
  }

  return redacted;
}

/**
 * Redact error stack traces (remove file paths, line numbers, but keep error messages)
 */
export function redactError(error: any): any {
  if (!error) {
    return error;
  }

  const redacted: any = {
    name: error.name,
    message: redactSensitive(error.message),
  };

  if (error.code) {
    redacted.code = error.code;
  }

  if (error.status) {
    redacted.status = error.status;
  }

  // Redact stack trace - keep structure but remove file paths
  if (error.stack) {
    redacted.stack = error.stack
      .split('\n')
      .map((line: string) => {
        // Remove file paths but keep function names
        return line.replace(/\([^)]+\)/g, '(...)').replace(/at\s+[^\s]+\s+\(/g, 'at (...)');
      })
      .join('\n');
  }

  return redacted;
}

