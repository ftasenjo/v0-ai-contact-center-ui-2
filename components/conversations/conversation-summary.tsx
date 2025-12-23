"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, MessageSquare, Phone, Mail, MessageCircle, Sparkles } from "lucide-react"
import type { Conversation } from "@/lib/sample-data"
import type { CallAnalysisRow, AdminInboxItemRow, AutomationEventRow } from "@/lib/automation/types"
import { AutomationItems } from "./automation-items"

interface ConversationSummaryProps {
  conversation: Conversation
  callAnalysis?: CallAnalysisRow | null
  inboxItems?: AdminInboxItemRow[]
  automationEvents?: AutomationEventRow[]
}

export function ConversationSummary({
  conversation,
  callAnalysis,
  inboxItems = [],
  automationEvents = [],
}: ConversationSummaryProps) {
  // Priority: Use call analysis summary if available, otherwise generate from messages
  const summary = callAnalysis?.call_summary || generateSummaryFromMessages(conversation)

  const channelIcons = {
    voice: Phone,
    chat: MessageSquare,
    email: Mail,
    whatsapp: MessageCircle,
  }

  const ChannelIcon = channelIcons[conversation.channel] || MessageSquare

  return (
    <>
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Conversation Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Text */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {summary || "No summary available for this conversation."}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Channel</div>
            <div className="flex items-center gap-1">
              <ChannelIcon className="h-3 w-3" />
              <span className="text-sm font-medium capitalize">{conversation.channel}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Messages</div>
            <div className="text-sm font-medium">{conversation.messages.length}</div>
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
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Badge variant={conversation.status === "resolved" ? "secondary" : "default"}>
              {conversation.status}
            </Badge>
          </div>
        </div>

        {/* Source Indicator */}
        {callAnalysis?.call_summary && (
          <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Summary generated from AI call analysis
          </div>
        )}
        {!callAnalysis?.call_summary && summary && (
          <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Summary generated from conversation messages
          </div>
        )}
      </CardContent>
    </Card>

    {/* Automation & Action Items */}
    {(inboxItems.length > 0 || automationEvents.length > 0) && (
      <AutomationItems
        inboxItems={inboxItems}
        events={automationEvents}
        conversationId={conversation.id}
      />
    )}
    </>
  )
}

/**
 * Generate a summary from conversation messages
 * This is a simple heuristic-based summary - in production, you'd use AI
 */
function generateSummaryFromMessages(conversation: Conversation): string | null {
  if (!conversation.messages || conversation.messages.length === 0) {
    return null
  }

  const messages = conversation.messages
  const customerMessages = messages.filter((m) => m.type === "customer")
  const agentMessages = messages.filter((m) => m.type !== "customer")

  if (customerMessages.length === 0) {
    return null
  }

  // Extract key information
  const firstCustomerMessage = customerMessages[0]?.content || ""
  const lastCustomerMessage = customerMessages[customerMessages.length - 1]?.content || ""
  const topic = conversation.topic || "general inquiry"

  // Build a simple summary
  const parts: string[] = []

  // Opening context
  if (firstCustomerMessage.length > 0) {
    const opening = firstCustomerMessage.length > 150 
      ? firstCustomerMessage.substring(0, 150) + "..."
      : firstCustomerMessage
    parts.push(`Customer initiated conversation about: "${opening}"`)
  }

  // Resolution status
  if (conversation.status === "resolved") {
    parts.push("Issue was successfully resolved.")
  } else if (conversation.status === "escalated") {
    parts.push("Conversation was escalated for further assistance.")
  } else {
    parts.push("Conversation is still in progress.")
  }

  // Message count context
  if (messages.length > 10) {
    parts.push(`Extended conversation with ${messages.length} total messages exchanged.`)
  } else if (messages.length > 5) {
    parts.push(`Moderate conversation with ${messages.length} messages.`)
  }

  // Sentiment context
  if (conversation.sentiment === "negative") {
    parts.push("Customer showed negative sentiment during the interaction.")
  } else if (conversation.sentiment === "positive") {
    parts.push("Customer interaction was positive.")
  }

  // Priority context
  if (conversation.priority === "urgent" || conversation.priority === "high") {
    parts.push(`High priority ${conversation.priority} issue.`)
  }

  return parts.join(" ")
}

