"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Download, RotateCcw, Sparkles, Send } from "lucide-react"
import { motion } from "framer-motion"

interface ChatWrapUpProps {
  onComplete: () => void
  conversationData: {
    customerName: string
    channel: string
    loyaltyStatus: string
  }
}

export function ChatWrapUpView({ onComplete, conversationData }: ChatWrapUpProps) {
  const customerName = conversationData?.customerName || "Unknown Customer"
  const loyaltyStatus = conversationData?.loyaltyStatus || "Standard"
  const channel = conversationData?.channel || "Chat"

  const [summary, setSummary] = useState(
    `Customer: ${customerName} (${loyaltyStatus})\nChannel: ${channel}\n\nTopics Discussed:\n- Order status inquiry for ORD-2024-1547 (delivery scheduled Dec 24)\n- Router connectivity issues - red lights indicating connection problem\n- Billing invoice review\n- Troubleshooting guidance provided for router configuration\n\nResolution: Customer informed about order delivery timeline. Troubleshooting steps shared for router issue. Follow-up scheduled if problem persists.`,
  )
  const [disposition, setDisposition] = useState("Resolved")

  const handleSyncAndClose = () => {
    // Simulate CRM sync
    setTimeout(() => {
      onComplete()
    }, 500)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background/95 backdrop-blur-sm flex items-center justify-center p-8"
    >
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="max-w-3xl w-full shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">After Call Work (ACW)</CardTitle>
                <CardDescription>Complete conversation wrap-up</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">AI-Generated Summary</h3>
              </div>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Edit the conversation summary..."
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Disposition</h3>
              <select
                value={disposition}
                onChange={(e) => setDisposition(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
              >
                <option value="Resolved">Resolved</option>
                <option value="Scheduled Call">Scheduled Follow-up Call</option>
                <option value="Escalated">Escalated to Supervisor</option>
                <option value="Pending">Pending Customer Response</option>
                <option value="Transferred">Transferred to Department</option>
              </select>
            </div>

            {/* Customer Sentiment */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                <strong className="text-foreground">Customer Sentiment:</strong>
              </p>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Positive</Badge>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start bg-transparent" size="lg">
                  <Send className="w-4 h-4 mr-2" />
                  Send Summary to Customer
                </Button>
                <Button variant="outline" className="justify-start bg-transparent" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Export Transcript (PDF)
                </Button>
              </div>
            </div>

            {/* Complete Session */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1 bg-transparent" size="lg" onClick={onComplete}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Back to Inbox
              </Button>
              <Button className="flex-1" size="lg" onClick={handleSyncAndClose}>
                Sync with CRM & Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
