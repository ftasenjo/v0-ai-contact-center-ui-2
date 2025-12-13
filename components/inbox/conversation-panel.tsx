"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  User,
  Sparkles,
  Send,
  RefreshCw,
  Minus,
  Heart,
  ArrowUpRight,
  CheckCircle,
  Tag,
  MoreHorizontal,
  Bot,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  BookOpen,
  Lightbulb,
} from "lucide-react"
import type { Conversation, Message } from "@/lib/sample-data"
import { HandoverModal } from "./handover-modal"
import { knowledgeBaseSuggestions } from "@/lib/sample-data"

const channelIcons = {
  voice: Phone,
  chat: MessageSquare,
  email: Mail,
  whatsapp: MessageCircle,
}

interface ConversationPanelProps {
  conversation: Conversation | null
  onOpenDrawer: () => void
}

export function ConversationPanel({ conversation, onOpenDrawer }: ConversationPanelProps) {
  const [message, setMessage] = useState("")
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [aiSuggestion] = useState(
    "I understand this is frustrating, and I sincerely apologize for the inconvenience. Our engineering team has identified the issue and is actively working on restoring service. I can confirm your account will receive a service credit for the downtime. Would you like me to set up a direct escalation path for updates?",
  )

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No conversation selected</h3>
          <p className="text-sm text-muted-foreground/70">Select a conversation from the list to start</p>
        </div>
      </div>
    )
  }

  const ChannelIcon = channelIcons[conversation.channel]

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderMessage = (msg: Message) => {
    if (msg.type === "system") {
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{msg.content}</span>
        </div>
      )
    }

    const isCustomer = msg.type === "customer"
    const isAI = msg.type === "ai"

    return (
      <div key={msg.id} className={cn("flex gap-3 mb-4", !isCustomer && "flex-row-reverse")}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          {isCustomer ? (
            <>
              <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} alt={conversation.customer.name} />
              <AvatarFallback>
                {conversation.customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarFallback className={isAI ? "bg-primary" : "bg-muted"}>
                {isAI ? <Bot className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4" />}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div className={cn("flex-1 max-w-[75%]", !isCustomer && "flex flex-col items-end")}>
          <div
            className={cn(
              "rounded-lg px-4 py-2.5",
              isCustomer
                ? "bg-muted text-foreground"
                : isAI
                  ? "bg-primary/10 text-foreground border border-primary/20"
                  : "bg-primary text-primary-foreground",
            )}
          >
            {isAI && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">AI Response</span>
                {msg.confidence && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                    {Math.round(msg.confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
            )}
            {msg.isTranscript && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Voice Transcript</span>
              </div>
            )}
            <p className="text-sm">{msg.content}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
            {msg.sentiment && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1 py-0",
                  msg.sentiment === "positive" && "text-emerald-500",
                  msg.sentiment === "neutral" && "text-blue-500",
                  msg.sentiment === "negative" && "text-red-500",
                )}
              >
                {msg.sentiment === "positive" && <ThumbsUp className="h-2.5 w-2.5" />}
                {msg.sentiment === "neutral" && <Minus className="h-2.5 w-2.5" />}
                {msg.sentiment === "negative" && <ThumbsDown className="h-2.5 w-2.5" />}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} alt={conversation.customer.name} />
              <AvatarFallback>
                {conversation.customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{conversation.customer.name}</h2>
                <Badge variant="outline" className="text-xs capitalize">
                  {conversation.customer.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChannelIcon className="h-3.5 w-3.5" />
                <span className="capitalize">{conversation.channel}</span>
                <span>•</span>
                <span>{conversation.topic}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sentiment Meter */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Sentiment</span>
              <div className="flex items-center gap-1">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      conversation.sentimentScore >= 0.6 && "bg-emerald-500",
                      conversation.sentimentScore >= 0.4 && conversation.sentimentScore < 0.6 && "bg-amber-500",
                      conversation.sentimentScore < 0.4 && "bg-red-500",
                    )}
                    style={{ width: `${conversation.sentimentScore * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{Math.round(conversation.sentimentScore * 100)}%</span>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={onOpenDrawer}>
              <User className="h-4 w-4 mr-1" />
              Profile
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Add to favorites</DropdownMenuItem>
                <DropdownMenuItem>Export conversation</DropdownMenuItem>
                <DropdownMenuItem>View full history</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">{conversation.messages.map(renderMessage)}</div>

        {/* AI Suggestion */}
        <div className="px-6 pb-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Suggested Response</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {Math.round(conversation.aiConfidence * 100)}% match
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{aiSuggestion}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setMessage(aiSuggestion)}>
                Insert
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm">
                <Minus className="h-3.5 w-3.5 mr-1" />
                Shorten
              </Button>
              <Button variant="outline" size="sm">
                <Heart className="h-3.5 w-3.5 mr-1" />
                More empathetic
              </Button>
            </div>
          </div>
        </div>

        {/* Knowledge Base Suggestions */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Knowledge Base</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {knowledgeBaseSuggestions.map((kb) => (
              <Button key={kb.id} variant="outline" size="sm" className="flex-shrink-0 gap-1.5 text-xs bg-transparent">
                <Lightbulb className="h-3 w-3" />
                {kb.title}
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {Math.round(kb.relevance * 100)}%
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-4">
            <div className="flex-1">
              <Textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setHandoverOpen(true)}>
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Human Handover
              </Button>
              <Button variant="outline" size="sm">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Escalate
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Tag className="h-4 w-4 mr-1" />
                    Disposition
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Resolved - First Contact</DropdownMenuItem>
                  <DropdownMenuItem>Resolved - Follow-up</DropdownMenuItem>
                  <DropdownMenuItem>Transferred</DropdownMenuItem>
                  <DropdownMenuItem>Escalated</DropdownMenuItem>
                  <DropdownMenuItem>No Resolution Needed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Wrap-up
              </Button>
              <Button size="sm">
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      <HandoverModal open={handoverOpen} onClose={() => setHandoverOpen(false)} conversation={conversation} />
    </>
  )
}
