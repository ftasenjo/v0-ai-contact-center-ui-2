"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  History,
  Copy,
  Check,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

type JobDetail = {
  job: {
    id: string
    status: string
    channel: string
    created_at: string
    campaign_id: string
    payload_redacted: any
  }
  attempts: Array<{
    attempt_no: number
    status: string
    created_at: string
    provider_message_id: string | null
  }>
  audit_tail: Array<{
    event_type: string
    created_at: string
  }>
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

export default function OutboundJobDetailPage() {
  const router = useRouter()
  const { user } = useAuth()
  const role = user?.role
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return MessageSquare
      case "email":
        return Mail
      case "voice":
      case "sms":
        return Phone
      default:
        return Send
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return CheckCircle2
      case "failed":
      case "canceled":
        return XCircle
      case "awaiting_verification":
        return AlertCircle
      case "queued":
        return Clock
      default:
        return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-600 dark:text-green-400"
      case "failed":
      case "canceled":
        return "text-red-600 dark:text-red-400"
      case "awaiting_verification":
        return "text-amber-600 dark:text-amber-400"
      case "queued":
        return "text-blue-600 dark:text-blue-400"
      default:
        return "text-muted-foreground"
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<JobDetail>(`/api/outbound/jobs/${id}`, role)
      setData(res)
    } catch (e: any) {
      setError(e?.message || "Failed to load job detail")
    } finally {
      setLoading(false)
    }
  }, [id, role])

  useEffect(() => {
    if (id) {
      load()
    }
  }, [id, load])

  if (!id) {
    return (
      <div className="p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Invalid job ID. Please navigate from the workflows list.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/workflows")} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Details</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground font-mono text-xs">{id}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(id || "")}
                title="Copy job ID"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading || !id}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {user?.role !== "admin" && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            This page is admin-only. Switch your demo role to admin.
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading job details...</p>
          </CardContent>
        </Card>
      )}

      {data?.job && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {(() => {
                    const ChannelIcon = getChannelIcon(data.job.channel)
                    return <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                  })()}
                  <Badge variant="outline" className="capitalize">
                    {data.job.channel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const StatusIcon = getStatusIcon(data.job.status)
                    const statusColor = getStatusColor(data.job.status)
                    return <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                  })()}
                  <Badge
                    variant={
                      data.job.status === "sent"
                        ? "default"
                        : data.job.status === "awaiting_verification"
                          ? "secondary"
                          : data.job.status === "failed" || data.job.status === "canceled"
                            ? "destructive"
                            : "outline"
                    }
                    className="capitalize"
                  >
                    {data.job.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Created: {new Date(data.job.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm font-medium mb-2">Campaign ID</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{data.job.campaign_id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(data.job.campaign_id)}
                    title="Copy campaign ID"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm font-medium mb-2">Payload (Redacted)</div>
                <div className="relative">
                  <pre className="text-xs bg-muted/50 border rounded-lg p-4 overflow-auto max-h-96 font-mono">
                    {JSON.stringify(data.job.payload_redacted, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => copyToClipboard(JSON.stringify(data.job.payload_redacted, null, 2))}
                    title="Copy payload"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Attempts Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.attempts || []).length > 0 ? (
                (data?.attempts || []).map((a, idx) => (
                  <div key={a.attempt_no} className="relative pl-6 pb-4 last:pb-0">
                    {idx < (data?.attempts || []).length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            #{a.attempt_no}
                          </Badge>
                          <Badge
                            variant={a.status === "sent" ? "default" : a.status === "failed" ? "destructive" : "secondary"}
                            className="capitalize"
                          >
                            {a.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      {a.provider_message_id && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Provider ID</div>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono block truncate">
                            {a.provider_message_id}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Send className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No attempts yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Trail
              <Badge variant="outline" className="ml-auto">
                Last 50
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(data?.audit_tail || []).length > 0 ? (
                (data?.audit_tail || []).map((e, idx) => (
                  <div
                    key={`${e.event_type}:${e.created_at}:${idx}`}
                    className="relative pl-6 pb-3 last:pb-0 border-b last:border-0"
                  >
                    <div className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{e.event_type.replace(/_/g, " ")}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <History className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No audit events found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

