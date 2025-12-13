"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThumbsUp, ThumbsDown, Minus, Bot, User } from "lucide-react"

interface LiveCall {
  id: string
  agent: {
    name: string
  }
  customer: {
    name: string
  }
}

interface TranscriptLine {
  id: string
  speaker: "customer" | "agent" | "ai"
  text: string
  timestamp: string
  sentiment?: "positive" | "neutral" | "negative"
}

const initialTranscript: TranscriptLine[] = [
  {
    id: "1",
    speaker: "customer",
    text: "Hi, I need to speak with someone about the service outage affecting our team.",
    timestamp: "12:22:15",
    sentiment: "neutral",
  },
  {
    id: "2",
    speaker: "agent",
    text: "Hello! Thank you for calling OmniCare support. I understand you're experiencing issues with our service. I'm here to help. Can you tell me more about what you're seeing?",
    timestamp: "12:22:28",
  },
  {
    id: "3",
    speaker: "customer",
    text: "Our entire platform has been down since 10 AM this morning. We have 47 people who can't work right now. This is completely unacceptable!",
    timestamp: "12:22:45",
    sentiment: "negative",
  },
  {
    id: "4",
    speaker: "agent",
    text: "I completely understand your frustration, and I sincerely apologize for the impact this is having on your team. Let me check the current status of the incident and see what our engineering team is doing to resolve this.",
    timestamp: "12:23:02",
  },
  {
    id: "5",
    speaker: "ai",
    text: "[AI Note: Customer sentiment has dropped. Consider offering escalation path and service credit information.]",
    timestamp: "12:23:15",
  },
  {
    id: "6",
    speaker: "customer",
    text: "We pay for enterprise support with guaranteed uptime. Two hours of downtime is not acceptable. I want to know what compensation we'll be receiving.",
    timestamp: "12:23:32",
    sentiment: "negative",
  },
]

interface TranscriptPanelProps {
  call: LiveCall
}

export function TranscriptPanel({ call }: TranscriptPanelProps) {
  const [transcript, setTranscript] = useState<TranscriptLine[]>(initialTranscript)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Simulate live transcript updates
  useEffect(() => {
    const newLines: TranscriptLine[] = [
      {
        id: "7",
        speaker: "agent",
        text: "Absolutely, and you're right to expect better. I can see from your account that you're on our Enterprise plan with the 99.9% uptime SLA. For any outage exceeding one hour, you're entitled to service credits...",
        timestamp: "12:23:48",
      },
      {
        id: "8",
        speaker: "customer",
        text: "That's good to know, but credits don't help us get our work done today. Is there any workaround or ETA on when this will be fixed?",
        timestamp: "12:24:05",
        sentiment: "neutral",
      },
    ]

    const timeout1 = setTimeout(() => {
      setTranscript((prev) => [...prev, newLines[0]])
    }, 3000)

    const timeout2 = setTimeout(() => {
      setTranscript((prev) => [...prev, newLines[1]])
    }, 6000)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {transcript.map((line) => (
          <div
            key={line.id}
            className={cn(
              "flex gap-3",
              line.speaker === "agent" && "flex-row-reverse",
              line.speaker === "ai" && "px-4",
            )}
          >
            {line.speaker !== "ai" && (
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  line.speaker === "customer" ? "bg-muted" : "bg-primary/10",
                )}
              >
                <User className={cn("h-4 w-4", line.speaker === "agent" && "text-primary")} />
              </div>
            )}

            <div
              className={cn(
                "flex-1 max-w-[80%]",
                line.speaker === "agent" && "flex flex-col items-end",
                line.speaker === "ai" && "max-w-full",
              )}
            >
              {line.speaker === "ai" ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-600">AI Assistant</span>
                  </div>
                  <p className="text-sm text-amber-800">{line.text}</p>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-lg px-4 py-2.5",
                    line.speaker === "customer" ? "bg-muted" : "bg-primary text-primary-foreground",
                  )}
                >
                  <p className="text-sm">{line.text}</p>
                </div>
              )}

              <div
                className={cn(
                  "flex items-center gap-2 mt-1",
                  line.speaker === "agent" && "flex-row-reverse",
                  line.speaker === "ai" && "justify-start",
                )}
              >
                <span className="text-xs text-muted-foreground">{line.timestamp}</span>
                <span className="text-xs text-muted-foreground">
                  {line.speaker === "customer" ? call.customer.name : line.speaker === "agent" ? call.agent.name : ""}
                </span>
                {line.sentiment && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1 py-0",
                      line.sentiment === "positive" && "text-emerald-500",
                      line.sentiment === "neutral" && "text-blue-500",
                      line.sentiment === "negative" && "text-red-500",
                    )}
                  >
                    {line.sentiment === "positive" && <ThumbsUp className="h-2.5 w-2.5" />}
                    {line.sentiment === "neutral" && <Minus className="h-2.5 w-2.5" />}
                    {line.sentiment === "negative" && <ThumbsDown className="h-2.5 w-2.5" />}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="bg-muted rounded-lg px-4 py-2.5">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
              <span
                className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <span
                className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
