"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send } from "lucide-react"

const quickActions = ["Check order status", "Return policy", "Shipping options", "Product availability"]

export function AIAssistant() {
  const [query, setQuery] = useState("")
  const [responses, setResponses] = useState<Array<{ query: string; response: string }>>([])

  const handleQuickAction = (action: string) => {
    const mockResponses: Record<string, string> = {
      "Check order status": "Order #ORD-2024-1547 is in transit. Expected delivery: Dec 24, 2024.",
      "Return policy": "Returns accepted within 30 days. Free return shipping for all items.",
      "Shipping options": "Standard (5-7 days), Express (2-3 days), Next-day available.",
      "Product availability": "Item is in stock at 3 nearby warehouses. Can ship today.",
    }
    setResponses([...responses, { query: action, response: mockResponses[action] || "Information retrieved." }])
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>Knowledge base & quick actions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex-1 overflow-y-auto space-y-3 pb-3">
          {responses.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="bg-primary/10 text-primary p-3 rounded-md text-sm">{item.query}</div>
              <div className="bg-muted p-3 rounded-md text-sm text-foreground">{item.response}</div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="text-xs h-auto py-2"
              >
                {action}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ask AI assistant..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  handleQuickAction(query)
                  setQuery("")
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => {
                if (query.trim()) {
                  handleQuickAction(query)
                  setQuery("")
                }
              }}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
