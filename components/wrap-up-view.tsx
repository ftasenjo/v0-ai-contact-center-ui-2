"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Send, Save } from "lucide-react"

interface WrapUpViewProps {
  onComplete: () => void
}

export function WrapUpView({ onComplete }: WrapUpViewProps) {
  const [summary] =
    useState(`Customer Maria Gonzalez called regarding order #ORD-2024-1547. Customer was concerned about delivery status as they hadn't received updates since placing the order last week.

Agent confirmed the order is currently in transit with expected delivery by December 24, 2024. Customer requested a tracking link which was provided via SMS.

Customer sentiment remained positive throughout the interaction. Issue resolved successfully.`)

  const [note, setNote] = useState("")
  const [sent, setSent] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-600/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Call Ended</h1>
          <p className="text-muted-foreground">Complete the wrap-up to finish</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Summary</CardTitle>
            <CardDescription>Interaction overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{summary}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
            <CardDescription>Add private notes to CRM (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional notes for the CRM..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-transparent"
            onClick={() => {
              setSent(true)
              setTimeout(() => setSent(false), 2000)
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            {sent ? "Sent!" : "Send Summary to Customer"}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              setSaved(true)
              setTimeout(() => {
                onComplete()
              }, 1000)
            }}
            disabled={saved}
          >
            <Save className="w-4 h-4 mr-2" />
            {saved ? "Saved!" : "Save & Complete"}
          </Button>
        </div>
      </div>
    </div>
  )
}
