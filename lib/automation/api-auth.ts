import { NextRequest, NextResponse } from "next/server"

type UserRole = "agent" | "supervisor" | "admin" | "analyst"

/**
 * Minimal authz guard for Step 11 admin automation endpoints.
 *
 * - Allows internal calls when `x-internal-key` matches `AUTOMATION_INTERNAL_KEY`.
 * - Otherwise requires `x-user-role: admin` (demo UI header).
 *
 * Note: This repo's UI is demo-auth; replace with real auth/JWT later.
 */
export function requireAutomationAdmin(
  request: NextRequest,
): { ok: true; actorId: string } | { ok: false; res: NextResponse } {
  const internalKey = request.headers.get("x-internal-key")
  const expectedInternal = process.env.AUTOMATION_INTERNAL_KEY

  if (expectedInternal && internalKey && internalKey === expectedInternal) {
    return { ok: true, actorId: "internal" }
  }

  const role = (request.headers.get("x-user-role") || "").toLowerCase() as UserRole
  if (!role) {
    return { ok: false, res: NextResponse.json({ error: "Missing x-user-role header" }, { status: 401 }) }
  }
  if (role !== "admin") {
    return { ok: false, res: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) }
  }

  return { ok: true, actorId: role }
}


