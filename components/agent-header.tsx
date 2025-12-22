"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PhoneOff, Clock, MessageSquare, ChevronDown, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentHeaderProps {
  status: "available" | "busy"
  callDuration: string
  onEndCall: () => void
  onSwitchToChat?: () => void
  agentStatus?: "ready" | "busy" | "break" | "offline"
  onStatusChange?: (status: "ready" | "busy" | "break" | "offline") => void
  callsInQueue?: number
  chatsInQueue?: number
  autoAccept?: boolean
  onAutoAcceptToggle?: () => void
}

export function AgentHeader({
  status,
  callDuration,
  onEndCall,
  onSwitchToChat,
  agentStatus = "busy",
  onStatusChange,
  callsInQueue = 5,
  chatsInQueue = 3,
  autoAccept = true,
  onAutoAcceptToggle,
}: AgentHeaderProps) {
  const [statusTimer, setStatusTimer] = useState(0)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusTimer((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [agentStatus])

  // Reset timer when status changes
  useEffect(() => {
    setStatusTimer(0)
  }, [agentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const statusConfig = {
    ready: { label: "Ready", color: "bg-green-500", indicator: "🟢", description: "Available" },
    busy: { label: "Busy", color: "bg-red-500", indicator: "🔴", description: "In Call/Chat" },
    break: { label: "Break", color: "bg-amber-500", indicator: "🟡", description: "On Break/Meal" },
    offline: { label: "Offline", color: "bg-slate-400", indicator: "⚪", description: "Not Available" },
  }

  const currentStatus = statusConfig[agentStatus]

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-foreground">Agent Desktop</h1>

          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <span className="text-lg">{currentStatus.indicator}</span>
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground">{currentStatus.label}</div>
                <div className="text-xs text-muted-foreground">{currentStatus.description}</div>
              </div>
              <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
            </button>

            {showStatusDropdown && (
              <div className="absolute top-full mt-2 left-0 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onStatusChange?.(key as typeof agentStatus)
                      setShowStatusDropdown(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors",
                      key === agentStatus && "bg-muted",
                    )}
                  >
                    <span className="text-lg">{config.indicator}</span>
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium text-foreground">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Time in {currentStatus.label}: </span>
              <span className="font-mono font-semibold text-foreground">{formatTime(statusTimer)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2 bg-background">
              <span className="text-xs text-muted-foreground">Calls in Queue:</span>
              <span className="font-bold text-foreground">{callsInQueue}</span>
            </Badge>
            <Badge variant="outline" className="gap-2 bg-background">
              <span className="text-xs text-muted-foreground">Chats in Queue:</span>
              <span className="font-bold text-foreground">{chatsInQueue}</span>
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {onAutoAcceptToggle && (
            <button
              onClick={onAutoAcceptToggle}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              title="Toggle auto-accept next contact"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Auto-accept:</span>
              <Badge variant={autoAccept ? "default" : "secondary"}>{autoAccept ? "ON" : "OFF"}</Badge>
            </button>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{callDuration}</span>
          </div>
          {onSwitchToChat && (
            <Button variant="outline" onClick={onSwitchToChat} size="lg">
              <MessageSquare className="w-4 h-4 mr-2" />
              Switch to Chat
            </Button>
          )}
          <Button variant="destructive" onClick={onEndCall} size="lg">
            <PhoneOff className="w-4 h-4 mr-2" />
            End Call
          </Button>
        </div>
      </div>
    </header>
  )
}
