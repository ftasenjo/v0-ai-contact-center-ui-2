"use client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const messages = [
  {
    id: 1,
    sender: "customer",
    type: "text",
    content: "Hi! I wanted to check on my order status.",
    timestamp: "10:32 AM",
  },
  {
    id: 2,
    sender: "agent",
    type: "text",
    content: "Hello Maria! I'd be happy to help you with that. Let me check your order details.",
    timestamp: "10:32 AM",
  },
  {
    id: 3,
    sender: "customer",
    type: "text",
    content: "Thank you! Order number is ORD-2024-1547",
    timestamp: "10:33 AM",
  },
  {
    id: 4,
    sender: "customer",
    type: "image",
    content: "/broken-router-with-red-lights.jpg",
    caption: "Also, my router has been showing red lights",
    timestamp: "10:33 AM",
  },
  {
    id: 5,
    sender: "agent",
    type: "text",
    content:
      "I can see your order is currently in transit and scheduled for delivery by December 24th. Regarding the router issue, the red lights typically indicate a connection problem. Let me guide you through some troubleshooting steps.",
    timestamp: "10:34 AM",
  },
  {
    id: 6,
    sender: "customer",
    type: "image",
    content: "/billing-invoice-statement-document.jpg",
    caption: "I also received this invoice",
    timestamp: "10:35 AM",
  },
]

export function ChatMessages() {
  return (
    <div className="p-6 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className={cn("flex", msg.sender === "agent" ? "justify-start" : "justify-end")}>
          <div className={cn("max-w-[70%]", msg.sender === "agent" ? "items-start" : "items-end")}>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5",
                msg.sender === "agent"
                  ? "bg-muted text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm",
              )}
            >
              {msg.type === "text" ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-2">
                  <img
                    src={msg.content || "/placeholder.svg"}
                    alt="Sent media"
                    className="rounded-lg max-w-full h-auto"
                  />
                  {msg.caption && <p className="text-sm leading-relaxed">{msg.caption}</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <p className="text-xs text-muted-foreground">{msg.timestamp}</p>
              {msg.sender === "customer" && (
                <Badge variant="outline" className="text-xs">
                  Customer
                </Badge>
              )}
              {msg.sender === "agent" && (
                <Badge variant="outline" className="text-xs">
                  You
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
