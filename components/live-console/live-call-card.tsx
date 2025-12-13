"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, AlertTriangle, ThumbsUp, ThumbsDown, Minus } from "lucide-react"

interface LiveCall {
  id: string
  agent: {
    id: string
    name: string
    avatar: string
    status: string
  }
  customer: {
    name: string
    company: string
    tier: string
  }
  duration: string
  sentiment: string
  sentimentScore: number
  topic: string
  riskFlags: string[]
  queue: string
}

interface LiveCallCardProps {
  call: LiveCall
  isSelected: boolean
  onSelect: () => void
}

export function LiveCallCard({ call, isSelected, onSelect }: LiveCallCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        isSelected ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:bg-muted/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={call.agent.avatar || "/placeholder.svg"} alt={call.agent.name} />
            <AvatarFallback>
              {call.agent.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{call.agent.name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {call.duration}
            </div>
          </div>

          <p className="text-xs text-muted-foreground truncate">
            {call.customer.name} • {call.topic}
          </p>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Sentiment */}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0",
                call.sentiment === "positive" && "bg-emerald-500/10 text-emerald-600 border-emerald-200",
                call.sentiment === "neutral" && "bg-blue-500/10 text-blue-600 border-blue-200",
                call.sentiment === "negative" && "bg-red-500/10 text-red-600 border-red-200",
              )}
            >
              {call.sentiment === "positive" && <ThumbsUp className="h-2.5 w-2.5 mr-0.5" />}
              {call.sentiment === "neutral" && <Minus className="h-2.5 w-2.5 mr-0.5" />}
              {call.sentiment === "negative" && <ThumbsDown className="h-2.5 w-2.5 mr-0.5" />}
              {Math.round(call.sentimentScore * 100)}%
            </Badge>

            {/* Risk Flags */}
            {call.riskFlags.includes("escalation-risk") && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-200">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                Risk
              </Badge>
            )}

            {call.riskFlags.includes("vip-customer") && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-200"
              >
                VIP
              </Badge>
            )}

            {call.customer.tier === "enterprise" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Enterprise
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
