"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  MessageSquare,
  Phone,
  Star,
  Send,
  Lightbulb,
  CheckCircle,
} from "lucide-react"

interface Review {
  id: string
  conversationId: string
  agent: {
    name: string
    avatar: string
  }
  customer: string
  channel: string
  topic: string
  duration: string
  sentiment: string
  aiScore: number
  status: string
  priority: string
  date: string
}

interface QAReviewPanelProps {
  review: Review
}

const scorecardItems = [
  {
    category: "Opening & Greeting",
    items: [
      { id: "greeting", label: "Professional greeting and introduction", checked: true },
      { id: "verification", label: "Customer verification completed", checked: true },
      { id: "issue-capture", label: "Issue captured accurately", checked: true },
    ],
  },
  {
    category: "Problem Resolution",
    items: [
      { id: "understanding", label: "Demonstrated understanding of issue", checked: true },
      { id: "solution", label: "Provided appropriate solution", checked: false },
      { id: "alternatives", label: "Offered alternatives when needed", checked: true },
    ],
  },
  {
    category: "Communication",
    items: [
      { id: "empathy", label: "Showed empathy and understanding", checked: false },
      { id: "clarity", label: "Clear and concise communication", checked: true },
      { id: "professional", label: "Maintained professional tone", checked: true },
    ],
  },
  {
    category: "Closing",
    items: [
      { id: "summary", label: "Summarized resolution", checked: true },
      { id: "follow-up", label: "Set expectations for follow-up", checked: false },
      { id: "satisfaction", label: "Confirmed customer satisfaction", checked: true },
    ],
  },
]

const aiCoachingSuggestions = [
  {
    area: "Empathy",
    suggestion:
      "When the customer expressed frustration about the outage, consider acknowledging their specific impact first. For example: 'I understand your team of 47 people has been unable to work for 2 hours - that's a significant impact.'",
    priority: "high",
  },
  {
    area: "Solution Timing",
    suggestion:
      "The solution was provided after 8 minutes of conversation. Consider leading with the status update earlier while still acknowledging emotions.",
    priority: "medium",
  },
  {
    area: "Proactive Communication",
    suggestion:
      "Offer to set up proactive status updates before the customer asks. This shows initiative and reduces customer anxiety.",
    priority: "low",
  },
]

export function QAReviewPanel({ review }: QAReviewPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [scores, setScores] = useState({
    empathy: 65,
    resolution: 80,
    communication: 85,
    overall: 72,
  })
  const [comments, setComments] = useState("")

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.agent.avatar || "/placeholder.svg"} alt={review.agent.name} />
              <AvatarFallback>
                {review.agent.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{review.agent.name}</h3>
                <Badge variant="outline">
                  {review.channel === "voice" ? (
                    <Phone className="h-3 w-3 mr-1" />
                  ) : (
                    <MessageSquare className="h-3 w-3 mr-1" />
                  )}
                  {review.channel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {review.customer} • {review.topic} • {review.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium">AI Score: {review.aiScore}%</span>
            </div>
            <Button>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Review
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Audio/Chat Player */}
          {review.channel === "voice" && (
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-primary rounded-full" />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>15:08</span>
                    <span>{review.duration}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="scorecard" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 border-b border-border">
              <TabsList className="h-auto py-0 bg-transparent">
                <TabsTrigger
                  value="scorecard"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Scorecard
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  Transcript
                </TabsTrigger>
                <TabsTrigger
                  value="coaching"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  AI Coaching
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="scorecard" className="flex-1 overflow-auto m-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Score Sliders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quality Scores</CardTitle>
                      <CardDescription>Adjust scores based on your evaluation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(scores).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="capitalize">{key}</Label>
                            <span className="text-sm font-medium">{value}%</span>
                          </div>
                          <Slider
                            value={[value]}
                            onValueChange={(v) => setScores((prev) => ({ ...prev, [key]: v[0] }))}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Checklist */}
                  {scorecardItems.map((category) => (
                    <Card key={category.category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{category.category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {category.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <Checkbox id={item.id} defaultChecked={item.checked} />
                            <Label htmlFor={item.id} className="text-sm font-normal cursor-pointer">
                              {item.label}
                            </Label>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Comments */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Reviewer Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Add your evaluation comments..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transcript" className="flex-1 overflow-auto m-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {[
                    {
                      speaker: "Agent",
                      time: "00:00",
                      text: "Thank you for calling Majlis Connect support, this is Sarah speaking. How may I assist you today?",
                    },
                    {
                      speaker: "Customer",
                      time: "00:08",
                      text: "Hi Sarah, I'm Emily Richardson from TechCorp. Our entire platform has been down since 10 AM this morning.",
                    },
                    {
                      speaker: "Agent",
                      time: "00:18",
                      text: "I understand, Ms. Richardson. Let me pull up your account and check the current status of any incidents affecting your service.",
                    },
                    {
                      speaker: "Customer",
                      time: "00:28",
                      text: "This is really urgent. We have 47 people who can't work right now. This is completely unacceptable!",
                    },
                    {
                      speaker: "Agent",
                      time: "00:38",
                      text: "I completely understand your frustration, and I sincerely apologize for the impact this is having on your team...",
                    },
                  ].map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-xs text-muted-foreground w-12 flex-shrink-0">{line.time}</span>
                      <div className="flex-1">
                        <span
                          className={`text-sm font-medium ${line.speaker === "Agent" ? "text-primary" : "text-foreground"}`}
                        >
                          {line.speaker}:
                        </span>
                        <p className="text-sm text-muted-foreground">{line.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="coaching" className="flex-1 overflow-auto m-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">AI-Generated Coaching Notes</CardTitle>
                      </div>
                      <CardDescription>Based on conversation analysis and best practices</CardDescription>
                    </CardHeader>
                  </Card>

                  {aiCoachingSuggestions.map((suggestion, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{suggestion.area}</CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              suggestion.priority === "high"
                                ? "bg-red-500/10 text-red-600"
                                : suggestion.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-blue-500/10 text-blue-600"
                            }
                          >
                            {suggestion.priority} priority
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Edit Notes
                    </Button>
                    <Button className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Send to Agent
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
