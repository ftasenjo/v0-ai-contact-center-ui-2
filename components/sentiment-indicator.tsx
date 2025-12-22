"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Smile, Meh, Frown } from "lucide-react"

export function SentimentIndicator() {
  const [sentiment, setSentiment] = useState(65)

  const getSentimentDetails = (value: number) => {
    if (value >= 70) return { label: "Positive", color: "text-green-600", Icon: Smile, bgColor: "bg-green-600" }
    if (value >= 40) return { label: "Neutral", color: "text-yellow-600", Icon: Meh, bgColor: "bg-yellow-600" }
    return { label: "Negative", color: "text-red-600", Icon: Frown, bgColor: "bg-red-600" }
  }

  const details = getSentimentDetails(sentiment)
  const Icon = details.Icon

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Analysis</CardTitle>
        <CardDescription>Real-time customer mood</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${details.bgColor}/10 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${details.color}`} />
            </div>
            <div>
              <p className={`font-semibold text-lg ${details.color}`}>{details.label}</p>
              <p className="text-sm text-muted-foreground">{sentiment}% confidence</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={sentiment} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Negative</span>
            <span>Neutral</span>
            <span>Positive</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
