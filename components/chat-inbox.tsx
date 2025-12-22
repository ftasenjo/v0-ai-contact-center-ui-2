"use client"

import { Badge } from "@/components/ui/badge"
import { MessageCircle, Instagram } from "lucide-react"
import { cn } from "@/lib/utils"

const conversations = [
  {
    id: 1,
    channel: "whatsapp",
    customerName: "Maria Gonzalez",
    lastMessage: "When will my order arrive?",
    timeInQueue: "2m 15s",
  },
  {
    id: 2,
    channel: "instagram",
    customerName: "Carlos Rodriguez",
    lastMessage: "I need help with my bill",
    timeInQueue: "5m 42s",
  },
  {
    id: 3,
    channel: "webchat",
    customerName: "Sofia Martinez",
    lastMessage: "Technical support needed",
    timeInQueue: "8m 10s",
  },
  {
    id: 4,
    channel: "whatsapp",
    customerName: "Juan Perez",
    lastMessage: "Can I upgrade my plan?",
    timeInQueue: "12m 33s",
  },
]

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "whatsapp":
      return <MessageCircle className="w-4 h-4 text-green-600" />
    case "instagram":
      return <Instagram className="w-4 h-4 text-pink-600" />
    case "webchat":
      return <MessageCircle className="w-4 h-4 text-blue-600" />
    default:
      return <MessageCircle className="w-4 h-4" />
  }
}

const getChannelBg = (channel: string) => {
  switch (channel) {
    case "whatsapp":
      return "bg-green-500/10"
    case "instagram":
      return "bg-pink-500/10"
    case "webchat":
      return "bg-blue-500/10"
    default:
      return "bg-muted"
  }
}

interface ChatInboxProps {
  activeConversationId: number
  onConversationSelect: (id: number) => void
  embedded?: boolean
}

export function ChatInbox({ activeConversationId, onConversationSelect, embedded = false }: ChatInboxProps) {
  // Embedded mode renders only the scrollable list (so parent can provide its own header/container)
  if (embedded) {
    return (
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onConversationSelect(conv.id)}
            className={cn(
              "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors",
              activeConversationId === conv.id && "bg-primary/5 border-l-4 border-l-primary",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  getChannelBg(conv.channel),
                )}
              >
                {getChannelIcon(conv.channel)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-foreground truncate">{conv.customerName}</p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {conv.timeInQueue}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
      <div className="bg-card border-b border-border px-4 py-3">
        <h2 className="font-semibold text-sm text-foreground">Omni-channel Inbox</h2>
        <p className="text-xs text-muted-foreground">{conversations.length} active conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onConversationSelect(conv.id)}
            className={cn(
              "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors",
              activeConversationId === conv.id && "bg-primary/5 border-l-4 border-l-primary",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  getChannelBg(conv.channel),
                )}
              >
                {getChannelIcon(conv.channel)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-foreground truncate">{conv.customerName}</p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {conv.timeInQueue}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
