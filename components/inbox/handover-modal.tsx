"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Clock, User, Users } from "lucide-react"
import type { Conversation } from "@/lib/sample-data"
import { sampleAgents } from "@/lib/sample-data"

interface HandoverModalProps {
  open: boolean
  onClose: () => void
  conversation: Conversation | null
}

const reasons = [
  { value: "complex", label: "Complex issue requiring human expertise" },
  { value: "escalation", label: "Customer requested escalation" },
  { value: "sensitive", label: "Sensitive topic (billing, complaint)" },
  { value: "ai-limit", label: "AI confidence below threshold" },
  { value: "other", label: "Other" },
]

const auditLog = [
  {
    time: "2 min ago",
    action: "AI flagged conversation for potential handover",
    user: "System",
  },
  {
    time: "5 min ago",
    action: "Sentiment dropped to negative (-0.25)",
    user: "System",
  },
  {
    time: "8 min ago",
    action: "Customer mentioned 'escalate' keyword",
    user: "System",
  },
  {
    time: "12 min ago",
    action: "Conversation started",
    user: "AI Assistant",
  },
]

export function HandoverModal({ open, onClose, conversation }: HandoverModalProps) {
  const [reason, setReason] = useState("")
  const [urgency, setUrgency] = useState("medium")
  const [assignTo, setAssignTo] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = () => {
    // Handle handover submission
    console.log({ reason, urgency, assignTo, notes })
    onClose()
  }

  if (!conversation) return null

  const availableAgents = sampleAgents.filter((agent) => agent.status === "online" || agent.status === "busy")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Request Human Handover
          </DialogTitle>
          <DialogDescription>Transfer this conversation to a human agent for continued assistance.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Customer Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{conversation.customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {conversation.topic} • {conversation.channel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    conversation.sentiment === "negative"
                      ? "bg-red-500/10 text-red-600"
                      : conversation.sentiment === "positive"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : ""
                  }
                >
                  {conversation.sentiment}
                </Badge>
                {conversation.escalationRisk && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Handover</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Urgency Level</Label>
            <RadioGroup value={urgency} onValueChange={setUrgency} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="font-normal cursor-pointer">
                  Low
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal cursor-pointer">
                  Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="font-normal cursor-pointer">
                  High
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="font-normal cursor-pointer text-red-600">
                  Urgent
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent or team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Auto-assign (Next available)
                  </span>
                </SelectItem>
                <SelectItem value="enterprise-team">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Enterprise Support Team
                  </span>
                </SelectItem>
                <Separator className="my-1" />
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <span className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          agent.status === "online" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {agent.name}
                      <span className="text-muted-foreground text-xs">({agent.activeConversations} active)</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Add context or instructions for the receiving agent..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Audit Log Preview */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </Label>
            <ScrollArea className="h-32 rounded-md border">
              <div className="p-3 space-y-2">
                {auditLog.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-xs text-muted-foreground whitespace-nowrap w-16">{log.time}</span>
                    <span className="text-muted-foreground">{log.action}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reason}>
            Request Handover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
