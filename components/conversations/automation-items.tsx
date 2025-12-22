"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Zap,
  ExternalLink,
  RefreshCw,
  XCircle,
} from "lucide-react"
import type { AdminInboxItemRow, AutomationEventRow } from "@/lib/automation/types"
import { useRouter } from "next/navigation"

interface AutomationItemsProps {
  inboxItems: AdminInboxItemRow[]
  events: AutomationEventRow[]
  conversationId: string
}

export function AutomationItems({ inboxItems, events, conversationId }: AutomationItemsProps) {
  const router = useRouter()

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      acknowledged: "secondary",
      resolved: "default",
      dismissed: "outline",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const getEventStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      sent: "default",
      failed: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const openAutomationCenter = () => {
    router.push("/automation")
  }

  const openInboxItem = (item: AdminInboxItemRow) => {
    router.push(`/automation?inbox=${item.id}`)
  }

  // Filter items by status
  const openItems = inboxItems.filter((i) => i.status === "open")
  const resolvedItems = inboxItems.filter((i) => i.status === "resolved" || i.status === "acknowledged")
  const pendingEvents = events.filter((e) => e.status === "pending")
  const failedEvents = events.filter((e) => e.status === "failed")

  if (inboxItems.length === 0 && events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No automation items or events for this conversation.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Open Action Items */}
      {openItems.length > 0 && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Action Items ({openItems.length})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={openAutomationCenter}
                className="h-7 text-xs"
              >
                View All
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-muted/30 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openInboxItem(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {getSeverityIcon(item.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        {getStatusBadge(item.status)}
                      </div>
                      {item.body && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{item.body}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resolved Items */}
      {resolvedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Resolved Items ({resolvedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolvedItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-2 bg-muted/20 rounded text-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  <div className="truncate">{item.title}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(item.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {resolvedItems.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{resolvedItems.length - 3} more resolved items
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Automation Events Status */}
      {(pendingEvents.length > 0 || failedEvents.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automation Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingEvents.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{pendingEvents.length} pending</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openAutomationCenter}
                  className="h-6 text-xs"
                >
                  View
                </Button>
              </div>
            )}
            {failedEvents.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">{failedEvents.length} failed</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openAutomationCenter}
                  className="h-6 text-xs"
                >
                  View
                </Button>
              </div>
            )}
            {events.filter((e) => e.status === "sent").length > 0 && (
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {events.filter((e) => e.status === "sent").length} completed
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

