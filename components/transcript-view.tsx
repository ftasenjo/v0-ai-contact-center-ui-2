"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

const mockTranscript = [
  { speaker: "Customer", message: "Hello, I need help with my order.", timestamp: "14:23:12" },
  {
    speaker: "Bot",
    message: "Hello Maria! I can help you with that. Let me pull up your order information.",
    timestamp: "14:23:15",
  },
  {
    speaker: "Customer",
    message: "Thank you. I ordered last week and haven't received any updates.",
    timestamp: "14:23:22",
  },
  {
    speaker: "Bot",
    message: "I see your order #ORD-2024-1547. Let me connect you with an agent who can provide more details.",
    timestamp: "14:23:28",
  },
  {
    speaker: "Agent",
    message:
      "Hi Maria, I'm here to help. I can see your order is currently in transit and should arrive by December 24th.",
    timestamp: "14:23:35",
  },
  { speaker: "Customer", message: "That's great! Can you send me a tracking link?", timestamp: "14:23:42" },
]

export function TranscriptView() {
  const [transcript, setTranscript] = useState(mockTranscript)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Live Transcript</CardTitle>
            <CardDescription>Real-time conversation</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto space-y-4 pr-2">
          {transcript.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold ${
                    item.speaker === "Customer"
                      ? "text-primary"
                      : item.speaker === "Bot"
                        ? "text-muted-foreground"
                        : "text-foreground"
                  }`}
                >
                  {item.speaker}
                </span>
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
              </div>
              <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">{item.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
