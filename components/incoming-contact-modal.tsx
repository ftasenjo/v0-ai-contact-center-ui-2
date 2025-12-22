"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, MessageSquare, User, Clock } from "lucide-react"
import { motion } from "framer-motion"

interface IncomingContactModalProps {
  type: "voice" | "chat"
  customerName: string
  priority: "high" | "medium" | "low"
  waitTime: string
  onAccept: () => void
  onDecline: () => void
}

export function IncomingContactModal({
  type,
  customerName,
  priority,
  waitTime,
  onAccept,
  onDecline,
}: IncomingContactModalProps) {
  const Icon = type === "voice" ? Phone : MessageSquare
  const priorityColors = {
    high: "bg-red-500/10 text-red-600 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20">
          <CardContent className="pt-6">
            {/* Pulsing Icon */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <Icon className="w-10 h-10 text-primary" />
            </motion.div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center mb-2 text-foreground">
              Incoming {type === "voice" ? "Call" : "Chat"}
            </h2>
            <p className="text-center text-muted-foreground mb-6">New contact ready to be connected</p>

            {/* Customer Info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold text-foreground">{customerName}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Wait Time</p>
                    <p className="font-semibold text-sm text-foreground">{waitTime}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className={priorityColors[priority]} variant="outline">
                    {priority.toUpperCase()} Priority
                  </Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" size="lg" onClick={onDecline}>
                Decline
              </Button>
              <Button className="flex-1" size="lg" onClick={onAccept}>
                Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
