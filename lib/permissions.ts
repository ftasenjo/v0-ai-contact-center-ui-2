import type { UserRole } from "@/contexts/auth-context"

export const rolePermissions: Record<UserRole, string[]> = {
  agent: [
    "inbox:view",
    "inbox:respond",
    "conversations:view",
    "conversations:respond",
    "handover:request",
    "knowledge-base:view",
  ],
  supervisor: [
    "inbox:view",
    "inbox:respond",
    "inbox:team",
    "conversations:view",
    "conversations:respond",
    "conversations:monitor",
    "handover:manage",
    "live-console:view",
    "live-console:whisper",
    "live-console:barge",
    "analytics:view",
    "quality:view",
    "quality:evaluate",
    "coaching:view",
    "coaching:create",
    "escalation:manage",
    "reports:view",
    "knowledge-base:view",
    "knowledge-base:edit",
    "workflows:view",
  ],
  admin: [
    "inbox:view",
    "inbox:respond",
    "inbox:team",
    "conversations:view",
    "conversations:respond",
    "users:manage",
    "roles:manage",
    "channels:manage",
    "ai-config:manage",
    "security:manage",
    "compliance:manage",
    "audit-log:view",
    "settings:all",
    "analytics:view",
    "reports:view",
    "reports:schedule",
    "knowledge-base:view",
    "knowledge-base:edit",
    "knowledge-base:manage",
    "workflows:view",
    "workflows:manage",
    "automation:manage",
    "quality:view",
    "live-console:view",
  ],
  analyst: [
    "analytics:view",
    "analytics:export",
    "reports:view",
    "reports:schedule",
    "quality:view",
    "inbox:view-readonly",
    "knowledge-base:view",
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, string[]> = {
    "/inbox": ["inbox:view", "inbox:view-readonly"],
    "/live-console": ["live-console:view"],
    "/analytics": ["analytics:view"],
    "/quality": ["quality:view"],
    "/settings": ["users:manage", "settings:all"],
    "/reports": ["reports:view"],
    "/knowledge": ["knowledge-base:view"],
    "/workflows": ["workflows:view"],
    "/automation": ["automation:manage"],
  }

  const requiredPermissions = routePermissions[route]
  if (!requiredPermissions) return true

  return requiredPermissions.some((p) => hasPermission(role, p))
}
