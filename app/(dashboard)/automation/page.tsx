"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { RefreshCw, Play, Search } from "lucide-react"

type InboxItem = {
  id: string
  type: string
  severity: "info" | "warn" | "error"
  title: string
  body: string | null
  link_ref: any | null
  status: "open" | "acknowledged" | "resolved" | "dismissed"
  created_at: string
  updated_at: string
}

type AutomationEvent = {
  id: string
  event_type: string
  status: "pending" | "sent" | "failed"
  attempts: number
  next_attempt_at: string | null
  last_error: string | null
  dedupe_key: string
  created_at: string
  updated_at: string
}

async function apiGet<T>(path: string, role: string | undefined): Promise<T> {
  const res = await fetch(path, {
    headers: { "x-user-role": role || "" },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

async function apiPost<T>(path: string, role: string | undefined, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-role": role || "",
    },
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

function severityBadgeVariant(sev: InboxItem["severity"]) {
  if (sev === "error") return "destructive"
  if (sev === "warn") return "secondary"
  return "outline"
}

function eventBadgeVariant(status: AutomationEvent["status"]) {
  if (status === "failed") return "destructive"
  if (status === "pending") return "secondary"
  return "outline"
}

export default function AutomationCenterPage() {
  const router = useRouter()
  const { user } = useAuth()
  const role = user?.role

  const [tab, setTab] = useState<"inbox" | "events">("inbox")
  const [search, setSearch] = useState("")

  const [inboxStatus, setInboxStatus] = useState<string>("open")
  const [eventStatus, setEventStatus] = useState<string>("all") // Default: show all events (pending, sent, failed)

  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [events, setEvents] = useState<AutomationEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const inboxStatusParam = inboxStatus && inboxStatus !== "all" ? `?status=${encodeURIComponent(inboxStatus)}` : ""
      const eventsStatusParam = eventStatus && eventStatus !== "all" ? `?status=${encodeURIComponent(eventStatus)}` : ""

      const [inboxRes, eventsRes] = await Promise.all([
        apiGet<{ items: InboxItem[] }>(`/api/automation/inbox${inboxStatusParam}`, role).catch((e) => {
          console.error("[AutomationCenter] Failed to fetch inbox:", e)
          return { items: [] }
        }),
        apiGet<{ items: AutomationEvent[] }>(`/api/automation/events${eventsStatusParam}`, role).catch((e) => {
          console.error("[AutomationCenter] Failed to fetch events:", e)
          return { items: [] }
        }),
      ])

      setInboxItems(inboxRes.items || [])
      setEvents(eventsRes.items || [])
      
      // Debug: log what we got
      if (eventsRes.items && eventsRes.items.length > 0) {
        console.log(`[AutomationCenter] Loaded ${eventsRes.items.length} events:`, {
          pending: eventsRes.items.filter((e) => e.status === "pending").length,
          sent: eventsRes.items.filter((e) => e.status === "sent").length,
          failed: eventsRes.items.filter((e) => e.status === "failed").length,
          events: eventsRes.items.map((e) => ({ id: e.id, type: e.event_type, status: e.status })),
        })
      } else {
        console.log(`[AutomationCenter] No events loaded (items: ${eventsRes.items?.length || 0})`)
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load automation center data")
      setInboxItems([])
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [eventStatus, inboxStatus, role])

  const runDispatcher = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiPost<{ success: boolean; sent: number; failed: number; picked: number }>(
        "/api/automation/dispatch",
        role,
        { limit: 50 }
      )
      await refresh()
      if (result.success) {
        // Show success message briefly
        console.log(`Dispatcher ran: ${result.sent} sent, ${result.failed} failed, ${result.picked} picked`)
      }
    } catch (e: any) {
      setError(e?.message || "Failed to run dispatcher")
      setLoading(false)
    }
  }, [refresh, role])

  const actOnInbox = useCallback(
    async (id: string, action: "acknowledge" | "resolve" | "dismiss") => {
      setLoading(true)
      setError(null)
      try {
        await apiPost(`/api/automation/inbox/${id}`, role, { action })
        await refresh()
      } catch (e: any) {
        setError(e?.message || "Failed to update inbox item")
        setLoading(false)
      }
    },
    [refresh, role],
  )

  const retryEvent = useCallback(
    async (id: string) => {
      setLoading(true)
      setError(null)
      try {
        await apiPost(`/api/automation/events/${id}/retry`, role, {})
        await refresh()
      } catch (e: any) {
        setError(e?.message || "Failed to retry event")
        setLoading(false)
      }
    },
    [refresh, role],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredInbox = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return inboxItems
    return inboxItems.filter((i) => {
      const hay = `${i.id} ${i.type} ${i.status} ${i.severity} ${i.title} ${i.body || ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [inboxItems, search])

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      console.log(`[AutomationCenter] filteredEvents: returning all ${events.length} events (no search query)`)
      return events
    }
    const filtered = events.filter((e) => {
      const hay = `${e.id} ${e.event_type} ${e.status} ${e.dedupe_key} ${e.last_error || ""}`.toLowerCase()
      return hay.includes(q)
    })
    console.log(`[AutomationCenter] filteredEvents: filtered ${events.length} events to ${filtered.length} (search: "${q}")`)
    return filtered
  }, [events, search])

  const openLinked = useCallback(
    (item: InboxItem) => {
      try {
        const link = item.link_ref
        if (!link || typeof link !== "object" || !link.kind) return
        if (link.kind === "outbound_job" && link.id && typeof link.id === "string") {
          router.push(`/workflows/jobs/${link.id}`)
        } else if (link.kind === "case" && link.id && typeof link.id === "string") {
          router.push(`/cases/${link.id}`)
        }
      } catch (e) {
        console.error("Failed to open linked item:", e)
      }
    },
    [router],
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automation Center</h1>
          <p className="text-muted-foreground">Ops inbox + automation events (Step 11)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={loading} onClick={runDispatcher}>
            <Play className="h-4 w-4 mr-2" />
            Run dispatcher
          </Button>
          <Button variant="outline" disabled={loading} onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {events.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {events.filter((e) => e.status === "pending").length} pending,{" "}
              {events.filter((e) => e.status === "sent").length} sent,{" "}
              {events.filter((e) => e.status === "failed").length} failed
            </div>
          )}
        </div>
      </div>

      {user?.role !== "admin" && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            This page is admin-only. Switch your demo role to admin.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by id, type, status, error..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {tab === "inbox" ? (
              <div className="flex items-center gap-2">
                {["open", "acknowledged", "resolved", "dismissed", "all"].map((s) => (
                  <Button key={s} size="sm" variant={inboxStatus === s ? "default" : "outline"} onClick={() => setInboxStatus(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {["pending", "failed", "sent", "all"].map((s) => (
                  <Button key={s} size="sm" variant={eventStatus === s ? "default" : "outline"} onClick={() => setEventStatus(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4">
            <div className="text-sm text-destructive font-medium mb-2">Error loading automation center</div>
            <div className="text-sm text-muted-foreground">{error}</div>
            {error.toLowerCase().includes("permission") || error.toLowerCase().includes("401") || error.toLowerCase().includes("403") ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Make sure you're logged in as an admin user.
              </div>
            ) : error.toLowerCase().includes("relation") || error.toLowerCase().includes("does not exist") ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Database tables not found. Please run migration 010_cc_automation_center.sql in Supabase.
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => {
        console.log(`[AutomationCenter] Tab changed: ${tab} -> ${v}`)
        setTab(v as any)
      }}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="events">Automation events</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <div className="space-y-2">
            {filteredInbox.map((i) => (
              <Card
                key={i.id}
                className="cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => openLinked(i)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{i.title}</span>
                        <Badge variant={severityBadgeVariant(i.severity)}>{i.severity}</Badge>
                        <Badge variant="outline">{i.status}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{i.type}</span>
                      </div>
                      {i.body && <div className="mt-1 text-sm text-muted-foreground">{i.body}</div>}
                      {i.created_at && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Created: {new Date(i.created_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {i.status === "open" && (
                        <Button size="sm" variant="outline" disabled={loading} onClick={() => actOnInbox(i.id, "acknowledge")}>
                          Acknowledge
                        </Button>
                      )}
                      {i.status !== "resolved" && (
                        <Button size="sm" variant="outline" disabled={loading} onClick={() => actOnInbox(i.id, "resolve")}>
                          Resolve
                        </Button>
                      )}
                      {i.status !== "dismissed" && (
                        <Button size="sm" variant="outline" disabled={loading} onClick={() => actOnInbox(i.id, "dismiss")}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredInbox.length === 0 && !loading && (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">No inbox items.</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {events.length > 0 && (
            <div className="mb-4 p-3 bg-muted/30 rounded-lg text-sm">
              <div className="font-medium mb-1">Event Summary</div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Total: {events.length}</span>
                <span>Pending: {events.filter((e) => e.status === "pending").length}</span>
                <span>Sent: {events.filter((e) => e.status === "sent").length}</span>
                <span>Failed: {events.filter((e) => e.status === "failed").length}</span>
              </div>
            </div>
          )}
          {filteredEvents.length > 0 && (
            <div className="mb-2 text-xs text-muted-foreground">
              Showing {filteredEvents.length} of {events.length} events
            </div>
          )}
          <div className="space-y-2">
            {filteredEvents.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={eventBadgeVariant(e.status)}>{e.status}</Badge>
                        <span className="font-semibold">{e.event_type}</span>
                        <span className="font-mono text-xs text-muted-foreground">{e.id}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>Attempts: {e.attempts ?? 0}</span>
                        {e.next_attempt_at && (
                          <span>Next: {new Date(e.next_attempt_at).toLocaleString()}</span>
                        )}
                        {e.last_error && <span className="text-destructive">Last error: {e.last_error}</span>}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground font-mono break-all">{e.dedupe_key}</div>
                    </div>
                    <div className="shrink-0">
                      {(e.status === "failed" || e.status === "pending") && (
                        <Button size="sm" variant="outline" disabled={loading} onClick={() => retryEvent(e.id)}>
                          Retry now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredEvents.length === 0 && !loading && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-sm text-muted-foreground mb-2">No automation events found.</div>
                  {eventStatus !== "all" ? (
                    <div className="text-xs text-muted-foreground">
                      Try selecting "all" to see all events (including sent ones).
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No events in database yet. Events are created when:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Fraud cases are created</li>
                        <li>Outbound jobs reach max attempts</li>
                        <li>OTP verifications get stuck</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Filtered out all events. Try a different status filter.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


