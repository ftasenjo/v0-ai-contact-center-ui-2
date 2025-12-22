"use client"

import { useState, useEffect, useCallback } from "react"
import { VoiceAgentDesktop } from "@/components/voice-agent-desktop"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function CallAgentPage() {
  const { user } = useAuth()
  const role = user?.role
  const router = useRouter()
  const [agentStatus, setAgentStatus] = useState<"ready" | "busy" | "break" | "offline">("ready")
  const [autoAccept, setAutoAccept] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [callsInQueue, setCallsInQueue] = useState(0)
  const [chatsInQueue, setChatsInQueue] = useState(0)

  const fetchAgentStatus = useCallback(async () => {
    if (!user) return
    
    try {
      const agentId = user.id || "1"
      const response = await fetch(`/api/agents/status?agentId=${agentId}`)
      if (response.ok) {
        const data = await response.json()
        const statusMap: Record<string, "ready" | "busy" | "break" | "offline"> = {
          online: "ready",
          busy: "busy",
          away: "break",
          offline: "offline",
        }
        setAgentStatus(statusMap[data.agent?.status] || "ready")
        setCallsInQueue(data.queues?.calls || 0)
        setChatsInQueue(data.queues?.chats || 0)
      }
    } catch (error) {
      console.error("Failed to fetch agent status:", error)
    }
  }, [user])

  useEffect(() => {
    // Check if user is authenticated and has call agent permissions
    if (!user) {
      router.push("/login")
      return
    }

    // Only call agents (and agents for demo) can access this page
    if (role !== "call_agent" && role !== "agent") {
      router.push("/inbox")
      return
    }

    setIsLoading(false)
    fetchAgentStatus()

    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchAgentStatus, 30000)
    return () => clearInterval(interval)
  }, [user, role, router, fetchAgentStatus])

  const handleStatusChange = async (newStatus: "ready" | "busy" | "break" | "offline") => {
    setAgentStatus(newStatus)
    try {
      const agentId = user?.id || "1"
      await fetch("/api/agents/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, status: newStatus }),
      })
    } catch (error) {
      console.error("Failed to update agent status:", error)
    }
  }

  const handleAutoAcceptToggle = () => {
    setAutoAccept(!autoAccept)
  }

  const handleEndCall = () => {
    // When ending call, stay on call agent page (don't navigate away)
    setAgentStatus("ready")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <VoiceAgentDesktop
      onEndCall={handleEndCall}
      agentStatus={agentStatus}
      onStatusChange={handleStatusChange}
      autoAccept={autoAccept}
      onAutoAcceptToggle={handleAutoAcceptToggle}
      callsInQueue={callsInQueue}
      chatsInQueue={chatsInQueue}
    />
  )
}

