"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  RefreshCw,
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  User,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart3,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { CallAnalysisDisplay } from "@/components/calls/call-analysis-display"
import { ConversationSummary } from "@/components/conversations/conversation-summary"
import type {
  CallAnalysisRow,
  AdminInboxItemRow,
  AutomationEventRow,
} from "@/lib/automation/types"
import type { Conversation } from "@/lib/sample-data"

const channelIcons = {
  voice: Phone,
  chat: MessageSquare,
  email: Mail,
  whatsapp: MessageCircle,
}

// API helper functions (same pattern as other detail pages)
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

export default function ConversationDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const role = user?.role
  const conversationId = params?.id

  // Get tab from URL search params, default to 'messages' (conversation view)
  const defaultTab = searchParams?.get('tab') || 'messages'

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [callAnalysis, setCallAnalysis] = useState<CallAnalysisRow | null>(null)
  const [inboxItems, setInboxItems] = useState<AdminInboxItemRow[]>([])
  const [automationEvents, setAutomationEvents] = useState<AutomationEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    setError(null)
    try {
      // Load conversation
      const convRes = await apiGet<{ conversation: Conversation }>(`/api/conversations/${conversationId}`, role)
      const loadedConv = convRes.conversation
      setConversation(loadedConv)

      // Load call analysis if voice call
      if (loadedConv?.channel === 'voice') {
        try {
          const analysisRes = await apiGet<{ items: CallAnalysisRow[] }>(
            `/api/calls/analysis?conversation_id=${conversationId}`,
            role
          )
          if (analysisRes.items && analysisRes.items.length > 0) {
            setCallAnalysis(analysisRes.items[0])
          }
        } catch (e) {
          // Non-fatal: analysis might not exist yet
          console.warn("[conversation-detail] Failed to load call analysis:", e)
        }
      }

      // Load automation items and events
      try {
        const automationRes = await apiGet<{
          inboxItems: AdminInboxItemRow[]
          events: AutomationEventRow[]
        }>(`/api/conversations/${conversationId}/automation`, role)
        setInboxItems(automationRes.inboxItems || [])
        setAutomationEvents(automationRes.events || [])
      } catch (e) {
        // Non-fatal: automation data might not be available
        console.warn("[conversation-detail] Failed to load automation data:", e)
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load conversation")
    } finally {
      setLoading(false)
    }
  }, [conversationId, role])

  useEffect(() => {
    load()
  }, [load])

  if (!conversation && !loading) {
    return (
      <div className="p-6">
        <Button variant="outline" size="sm" onClick={() => router.push("/inbox")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inbox
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            Conversation not found
          </CardContent>
        </Card>
      </div>
    )
  }

  const ChannelIcon = conversation?.channel ? channelIcons[conversation.channel as keyof typeof channelIcons] || MessageSquare : MessageSquare

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/inbox")} disabled={loading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <ChannelIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Conversation Details</h1>
                <p className="text-sm text-muted-foreground font-mono">{conversationId}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4">
          <Card className="border-destructive/40">
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        </div>
      )}

      {conversation && (
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue={defaultTab} className="h-full flex flex-col" key={conversation.id}>
            <div className="border-b px-6">
              <TabsList className="h-auto bg-transparent">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Messages
                </TabsTrigger>
                {callAnalysis && (
                  <TabsTrigger value="analysis" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Call Analysis
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Conversation Summary */}
                  <ConversationSummary
                    conversation={conversation}
                    callAnalysis={callAnalysis}
                    inboxItems={inboxItems}
                    automationEvents={automationEvents}
                  />

                  {/* Customer Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={conversation.customer.avatar} />
                          <AvatarFallback>{conversation.customer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{conversation.customer.name}</div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {conversation.customer.email && <div>📧 {conversation.customer.email}</div>}
                            {conversation.customer.phone && <div>📱 {conversation.customer.phone}</div>}
                            <div>🏷️ Tier: {conversation.customer.tier}</div>
                            <div>🌐 Language: {conversation.customer.language}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conversation Metadata */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Conversation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Channel</div>
                          <Badge variant="outline" className="gap-1">
                            <ChannelIcon className="h-3 w-3" />
                            {conversation.channel}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Status</div>
                          <Badge variant={conversation.status === "active" ? "default" : "secondary"}>
                            {conversation.status}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Priority</div>
                          <Badge
                            variant={
                              conversation.priority === "urgent"
                                ? "destructive"
                                : conversation.priority === "high"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {conversation.priority}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Queue</div>
                          <div className="text-sm font-medium">{conversation.queue}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Started</div>
                          <div className="text-sm font-medium">
                            {new Date(conversation.startTime).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Last Message</div>
                          <div className="text-sm font-medium">
                            {new Date(conversation.lastMessageTime).toLocaleString()}
                          </div>
                        </div>
                        {conversation.sentiment && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                            <div className="flex items-center gap-1">
                              {conversation.sentiment === "positive" ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : conversation.sentiment === "negative" ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : null}
                              <span className="text-sm font-medium capitalize">{conversation.sentiment}</span>
                            </div>
                          </div>
                        )}
                        {conversation.sentimentScore !== undefined && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Sentiment Score</div>
                            <div className="text-sm font-medium">
                              {(conversation.sentimentScore * 100).toFixed(0)}%
                            </div>
                          </div>
                        )}
                      </div>
                      {conversation.topic && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-xs text-muted-foreground mb-1">Topic</div>
                          <div className="text-sm">{conversation.topic}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Conversation Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Response Time</div>
                          <div className="text-sm font-medium">
                            {conversation.messages.length > 1
                              ? `${Math.round(
                                  (new Date(conversation.lastMessageTime).getTime() -
                                    new Date(conversation.startTime).getTime()) /
                                    (conversation.messages.length * 1000)
                                )}s avg`
                              : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">AI Confidence</div>
                          <div className="text-sm font-medium">
                            {Math.round(conversation.aiConfidence * 100)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Escalation Risk</div>
                          <div className="flex items-center gap-1">
                            {conversation.escalationRisk ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-600">High</span>
                              </>
                            ) : (
                              <span className="text-sm font-medium text-green-600">Low</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">SLA Status</div>
                          <Badge
                            variant={
                              conversation.sla.status === "healthy"
                                ? "default"
                                : conversation.sla.status === "warning"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {conversation.sla.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Call Analysis Summary (if available) */}
                  {callAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Call Analysis Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {callAnalysis.quality_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Quality Score</div>
                              <div className="text-2xl font-bold">
                                {callAnalysis.quality_score}
                                <span className="text-sm text-muted-foreground font-normal">/10</span>
                              </div>
                            </div>
                          )}
                          {callAnalysis.customer_sentiment && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                              <div className="flex items-center gap-1">
                                {callAnalysis.customer_sentiment.includes("positive") ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : callAnalysis.customer_sentiment.includes("negative") || callAnalysis.customer_sentiment.includes("frustrated") ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : null}
                                <span className="text-sm font-medium capitalize">{callAnalysis.customer_sentiment}</span>
                              </div>
                            </div>
                          )}
                          {callAnalysis.issue_type && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Issue Type</div>
                              <Badge variant="outline">{callAnalysis.issue_type}</Badge>
                            </div>
                          )}
                          {callAnalysis.issue_resolved !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Resolved</div>
                              <div className="flex items-center gap-1">
                                {callAnalysis.issue_resolved ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-600">Yes</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-600">No</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {callAnalysis.escalation_required && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span className="text-sm font-medium text-red-600">Escalation Required</span>
                          </div>
                        )}
                        {callAnalysis.compliance_verified === false && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-600" />
                            <span className="text-sm font-medium text-red-600">Compliance Review Required</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages" className="mt-0">
                  <div className="space-y-4">
                    {/* Message Statistics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Message Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Total Messages</div>
                            <div className="text-2xl font-bold">{conversation.messages.length}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Customer Messages</div>
                            <div className="text-2xl font-bold">
                              {conversation.messages.filter((m) => m.type === "customer").length}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Agent/AI Messages</div>
                            <div className="text-2xl font-bold">
                              {conversation.messages.filter((m) => m.type !== "customer").length}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Duration</div>
                            <div className="text-sm font-medium">
                              {conversation.messages.length > 0
                                ? `${Math.round(
                                    (new Date(conversation.lastMessageTime).getTime() -
                                      new Date(conversation.startTime).getTime()) /
                                      60000
                                  )} min`
                                : "N/A"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Messages Timeline */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Conversation Timeline ({conversation.messages.length} messages)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {conversation.messages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No messages in this conversation yet.
                            </div>
                          ) : (
                            conversation.messages.map((msg, idx) => (
                              <div
                                key={msg.id || idx}
                                className={`flex gap-3 ${msg.type === "customer" ? "flex-row" : "flex-row-reverse"}`}
                              >
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback>
                                    {msg.type === "customer" ? (
                                      <User className="h-4 w-4" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`rounded-lg p-3 ${
                                      msg.type === "customer"
                                        ? "bg-muted"
                                        : "bg-primary text-primary-foreground"
                                    }`}
                                  >
                                    <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      <div
                                        className={`text-xs ${
                                          msg.type === "customer"
                                            ? "text-muted-foreground"
                                            : "text-primary-foreground/70"
                                        }`}
                                      >
                                        {new Date(msg.timestamp).toLocaleString()}
                                      </div>
                                      {msg.isTranscript && (
                                        <Badge variant="outline" className="text-xs">
                                          Transcript
                                        </Badge>
                                      )}
                                      {msg.sentiment && (
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {msg.sentiment}
                                        </Badge>
                                      )}
                                      {msg.confidence !== undefined && (
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round(msg.confidence * 100)}% confidence
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Call Analysis Tab */}
                {callAnalysis && (
                  <TabsContent value="analysis" className="mt-0">
                    <CallAnalysisDisplay analysis={callAnalysis} />
                    
                    {/* Additional Analysis Details */}
                    {callAnalysis.raw_analysis_json && (
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Raw Analysis Data
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xs font-mono bg-muted/30 p-3 rounded-lg overflow-auto max-h-64">
                            <pre>{JSON.stringify(callAnalysis.raw_analysis_json, null, 2)}</pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      )}
    </div>
  )
}

