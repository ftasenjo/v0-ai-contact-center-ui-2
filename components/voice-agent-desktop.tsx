"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Target, Mail, ImageIcon, Copy, Check } from "lucide-react"
import { AgentHeader } from "@/components/agent-header"
import { TranscriptView } from "@/components/transcript-view"
import { AIAssistant } from "@/components/ai-assistant"
import { SentimentIndicator } from "@/components/sentiment-indicator"
import { SMSModal } from "@/components/sms-modal"
import { MediaGalleryModal } from "@/components/media-gallery-modal"
import { motion } from "framer-motion"
// Role switching is handled via the left sidebar user menu (demo)

interface VoiceAgentDesktopProps {
  onEndCall: () => void
  onSwitchToChat?: () => void
  agentStatus: "ready" | "busy" | "break" | "offline"
  onStatusChange: (status: "ready" | "busy" | "break" | "offline") => void
  autoAccept: boolean
  onAutoAcceptToggle: () => void
  callsInQueue?: number
  chatsInQueue?: number
  customerData?: {
    name: string
    dni: string
    loyaltyStatus: string
    reason: string
    orderId: string
  }
}

export function VoiceAgentDesktop({
  onEndCall,
  onSwitchToChat,
  agentStatus,
  onStatusChange,
  autoAccept,
  onAutoAcceptToggle,
  callsInQueue = 0,
  chatsInQueue = 0,
  customerData,
}: VoiceAgentDesktopProps) {
  const [callDuration, setCallDuration] = useState(0)
  const [status, setStatus] = useState<"available" | "busy">("busy")
  const [showSMSModal, setShowSMSModal] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [copiedDNI, setCopiedDNI] = useState(false)

  const handleSwitchToChat = onSwitchToChat || (() => {})
  const [copiedProductId, setCopiedProductId] = useState(false)
  const [showPulse, setShowPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (agentStatus === "ready") {
      setShowPulse(true)
      setTimeout(() => setShowPulse(false), 2000)
    }
  }, [agentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const copyToClipboard = (text: string, type: "dni" | "product") => {
    navigator.clipboard.writeText(text)
    if (type === "dni") {
      setCopiedDNI(true)
      setTimeout(() => setCopiedDNI(false), 2000)
    } else {
      setCopiedProductId(true)
      setTimeout(() => setCopiedProductId(false), 2000)
    }
  }

  const customer = customerData || {
    name: "Maria Gonzalez",
    dni: "45.678.912",
    loyaltyStatus: "Gold Member",
    reason: "Order Status Inquiry",
    orderId: "ORD-2024-1547",
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {showPulse && (
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className="fixed inset-0 bg-primary/10 pointer-events-none z-40"
        />
      )}

      <AgentHeader
        status={status}
        callDuration={formatTime(callDuration)}
        onEndCall={onEndCall}
        onSwitchToChat={handleSwitchToChat} // optional
        agentStatus={agentStatus}
        onStatusChange={onStatusChange}
        callsInQueue={callsInQueue || 0}
        chatsInQueue={chatsInQueue || 0}
        autoAccept={autoAccept}
        onAutoAcceptToggle={onAutoAcceptToggle}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6 max-w-[1920px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Customer Profile</CardTitle>
                    <CardDescription>Pre-authenticated via IVR</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                    <p className="font-semibold text-foreground">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">DNI / ID</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{customer.dni}</p>
                      <button
                        onClick={() => copyToClipboard(customer.dni.replace(/\./g, ""), "dni")}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedDNI ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Loyalty Status</p>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {customer.loyaltyStatus}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Contracted Products</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">Premium Fiber 1Gb</p>
                          <button
                            onClick={() => copyToClipboard("FIB-1GB-2024", "product")}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Product ID"
                          >
                            {copiedProductId ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">Renewal: March 15, 2025</p>
                      </div>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-1">TV Premium Package</p>
                        <p className="text-xs text-muted-foreground">Renewal: January 8, 2025</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10">
                        Expiring
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Call History</h3>
                  <div className="relative space-y-4 pl-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">Dec 18, 2024</p>
                          <Badge variant="outline" className="text-xs">
                            Voice
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Billing inquiry resolved - payment plan setup</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-muted-foreground border-2 border-background" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">Dec 10, 2024</p>
                          <Badge variant="outline" className="text-xs">
                            Chat
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Technical support - router configuration</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-muted-foreground border-2 border-background" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">Nov 28, 2024</p>
                          <Badge variant="outline" className="text-xs">
                            Voice
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Service upgrade to 1Gb plan completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intent & Routing Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Intent & Routing</CardTitle>
                    <CardDescription>Identified by AI bot</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reason for Call</p>
                    <p className="font-semibold text-lg text-foreground">{customer.reason}</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Priority: Medium</Badge>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Order #{customer.orderId} • Estimated Delivery: Dec 24, 2024
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Live Transcript Card */}
            <TranscriptView />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Sentiment Analysis Card */}
            <SentimentIndicator />

            {/* AI Assistant Card */}
            <AIAssistant />

            {/* Omnichannel Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Omnichannel Actions</CardTitle>
                <CardDescription>Quick customer touchpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  size="lg"
                  onClick={() => setShowSMSModal(true)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send SMS Update
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  size="lg"
                  onClick={() => setShowMediaModal(true)}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  View Received Media
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <SMSModal open={showSMSModal} onClose={() => setShowSMSModal(false)} />
      <MediaGalleryModal open={showMediaModal} onClose={() => setShowMediaModal(false)} />
    </div>
  )
}
