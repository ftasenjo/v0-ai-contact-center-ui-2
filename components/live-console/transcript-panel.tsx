"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThumbsUp, ThumbsDown, Minus, Bot, User } from "lucide-react"

interface LiveCall {
  id: string
  callSid?: string
  status?: string
  agent: {
    name: string
  }
  customer: {
    name: string
  }
}

interface TranscriptLine {
  id: string
  speaker: "customer" | "agent" | "ai" | "system"
  text: string
  timestamp: string
  sentiment?: "positive" | "neutral" | "negative"
}

interface TranscriptPanelProps {
  call: LiveCall
}

function isCallActive(status: string | undefined | null): boolean {
  const s = (status || "").toLowerCase().trim()
  return s === "in-progress" || s === "answered" || s === "ringing" || s === "initiated" || s === "queued"
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function TranscriptPanel({ call }: TranscriptPanelProps) {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [ended, setEnded] = useState(false)
  const lastOccurredAtRef = useRef<string | null>(null)
  const endedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    const callSid = (call.callSid || call.id || "").trim()
    if (!callSid) return

    const fetchTranscript = async (mode: "full" | "delta") => {
      const after = lastOccurredAtRef.current
      const qs = mode === "delta" && after ? `?after=${encodeURIComponent(after)}` : ""

      const res = await fetch(`/api/calls/${encodeURIComponent(callSid)}/transcript${qs}`)
      const data = await res.json()

      if (cancelled) return
      if (!data?.success) {
        setIsLoading(false)
        return
      }

      const rows: any[] = Array.isArray(data.transcript) ? data.transcript : []
      const mapped: TranscriptLine[] = rows.map((t) => ({
        id: String(t.id),
        speaker: t.speaker,
        text: t.text,
        timestamp: formatTime(t.occurredAt),
      }))

      if (mode === "full") {
        setTranscript(mapped)
      } else if (mapped.length > 0) {
        setTranscript((prev) => [...prev, ...mapped])
      }

      const last = rows.length > 0 ? rows[rows.length - 1]?.occurredAt : null
      if (typeof last === "string" && last.length > 0) {
        lastOccurredAtRef.current = last
      }

      setEnded(Boolean(data.ended))
      endedRef.current = Boolean(data.ended)
      setIsLoading(false)
    }

    // Reset state when call changes
    setTranscript([])
    setEnded(false)
    endedRef.current = false
    lastOccurredAtRef.current = null
    setIsLoading(true)

    fetchTranscript("full").catch(() => setIsLoading(false))

    // Poll only while call is active and not ended
    if (isCallActive(call.status)) {
      interval = setInterval(() => {
        if (endedRef.current) {
          if (interval) clearInterval(interval)
          interval = null
          return
        }
        fetchTranscript("delta").catch(() => {
          /* ignore */
        })
      }, 2000)
    }

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [call.id, call.callSid, call.status])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  const showListening = !ended && isCallActive(call.status) && !isLoading

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {isLoading && transcript.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading transcript…</div>
        )}

        {transcript.map((line) => (
          <div
            key={line.id}
            className={cn(
              "flex gap-3",
              line.speaker === "agent" && "flex-row-reverse",
              (line.speaker === "ai" || line.speaker === "system") && "px-4",
            )}
          >
            {line.speaker !== "ai" && line.speaker !== "system" && (
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
                (line.speaker === "ai" || line.speaker === "system") && "max-w-full",
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
              ) : line.speaker === "system" ? (
                <div className="bg-muted/60 border border-border rounded-lg px-4 py-2 w-full">
                  <p className="text-xs text-muted-foreground">System: {line.text}</p>
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
                  (line.speaker === "ai" || line.speaker === "system") && "justify-start",
                )}
              >
                <span className="text-xs text-muted-foreground">{line.timestamp}</span>
                <span className="text-xs text-muted-foreground">
                  {line.speaker === "customer"
                    ? call.customer.name
                    : line.speaker === "agent"
                      ? call.agent.name
                      : ""}
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

        {/* Live indicator (only while call is active) */}
        {showListening && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Listening…
          </div>
        )}

        {ended && (
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            Call ended.
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
