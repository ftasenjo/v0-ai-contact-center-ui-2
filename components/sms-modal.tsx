"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send } from "lucide-react"

interface SMSModalProps {
  open: boolean
  onClose: () => void
}

export function SMSModal({ open, onClose }: SMSModalProps) {
  const [message, setMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAIMessage = () => {
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setMessage(
        "Hi Maria, your order #ORD-2024-1547 is on track for delivery on Dec 24, 2024. We'll send you tracking details soon. Thank you for your patience!",
      )
      setIsGenerating(false)
    }, 1000)
  }

  const handleSend = () => {
    // Handle send logic here
    console.log("[v0] Sending SMS:", message)
    onClose()
    setMessage("")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send SMS Update</DialogTitle>
          <DialogDescription>Compose and send an SMS to the customer</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Message</label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{message.length} / 160 characters</p>
          </div>
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={generateAIMessage}
            disabled={isGenerating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate with AI"}
          </Button>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!message.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Send SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
