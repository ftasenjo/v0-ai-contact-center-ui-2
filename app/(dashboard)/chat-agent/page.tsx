"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatAgentDesktop } from "@/components/chat-agent-desktop"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function ChatAgentPage() {
  const { user } = useAuth()
  const role = user?.role
  const router = useRouter()
  const [agentStatus, setAgentStatus] = useState<"ready" | "busy" | "break" | "offline">("ready")
  const [autoAccept, setAutoAccept] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
      }
    } catch (error) {
      console.error("Failed to fetch agent status:", error)
    }
  }, [user])

  useEffect(() => {
    // Check if user is authenticated and has chat agent permissions
    if (!user) {
      router.push("/login")
      return
    }

    // Only chat agents can access this page
    if (role !== "agent") {
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

  const handleCloseChat = () => {
    // When closing chat, stay on chat agent page (don't navigate away)
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
    <ChatAgentDesktop
      onCloseChat={handleCloseChat}
      agentStatus={agentStatus}
      onStatusChange={handleStatusChange}
      autoAccept={autoAccept}
      onAutoAcceptToggle={handleAutoAcceptToggle}
    />
  )
}

