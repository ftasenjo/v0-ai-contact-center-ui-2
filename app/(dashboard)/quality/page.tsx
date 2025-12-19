"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Award,
  Search,
  Filter,
  MessageSquare,
  Phone,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BarChart3,
} from "lucide-react"
import { QAReviewPanel } from "@/components/quality/qa-review-panel"
import { AgentPerformanceDashboard } from "@/components/quality/agent-performance-dashboard"

const reviewQueue = [
  {
    id: "review-001",
    conversationId: "conv-001",
    agent: {
      name: "Sarah Chen",
      avatar: "/professional-woman-sarah-agent.jpg",
    },
    customer: "Emily Richardson",
    channel: "voice",
    topic: "Service Outage",
    duration: "45:23",
    sentiment: "negative",
    aiScore: 72,
    status: "pending",
    priority: "high",
    date: "Dec 12, 2024",
  },
  {
    id: "review-002",
    conversationId: "conv-002",
    agent: {
      name: "David Park",
      avatar: "/professional-man-david-agent.jpg",
    },
    customer: "Marcus Johnson",
    channel: "chat",
    topic: "Pricing Inquiry",
    duration: "15:10",
    sentiment: "positive",
    aiScore: 94,
    status: "pending",
    priority: "normal",
    date: "Dec 12, 2024",
  },
  {
    id: "review-003",
    conversationId: "conv-003",
    agent: {
      name: "Maria Garcia",
      avatar: "/professional-woman-maria-agent.jpg",
    },
    customer: "James Chen",
    channel: "voice",
    topic: "Billing Dispute",
    duration: "32:45",
    sentiment: "negative",
    aiScore: 65,
    status: "flagged",
    priority: "urgent",
    date: "Dec 11, 2024",
  },
  {
    id: "review-004",
    conversationId: "conv-004",
    agent: {
      name: "Alex Thompson",
      avatar: "/professional-person-alex-agent.jpg",
    },
    customer: "Rachel Thompson",
    channel: "chat",
    topic: "API Integration",
    duration: "25:30",
    sentiment: "positive",
    aiScore: 91,
    status: "completed",
    priority: "normal",
    date: "Dec 10, 2024",
  },
]

const coachingNotes = [
  {
    id: "coaching-001",
    agent: "Sarah Chen",
    avatar: "/professional-woman-sarah-agent.jpg",
    topic: "Empathy in Escalated Calls",
    date: "Dec 11, 2024",
    aiGenerated: true,
    summary:
      "Consider leading with acknowledgment of customer impact before moving to solutions. Use phrases like 'I understand how frustrating this must be for your team.'",
    status: "delivered",
  },
  {
    id: "coaching-002",
    agent: "David Park",
    avatar: "/professional-man-david-agent.jpg",
    topic: "Upselling Opportunities",
    date: "Dec 10, 2024",
    aiGenerated: true,
    summary:
      "Great job identifying upgrade opportunities! Try transitioning more naturally by connecting features to customer pain points mentioned earlier.",
    status: "pending",
  },
  {
    id: "coaching-003",
    agent: "Maria Garcia",
    avatar: "/professional-woman-maria-agent.jpg",
    topic: "Handling Billing Disputes",
    date: "Dec 9, 2024",
    aiGenerated: false,
    summary:
      "Review the billing dispute resolution flowchart. Remember to verify account details before discussing specific charges.",
    status: "acknowledged",
  },
]

export default function QualityPage() {
  const [selectedReview, setSelectedReview] = useState(reviewQueue[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"reviews" | "performance">("reviews")

  const filteredQueue = reviewQueue.filter((review) => {
    const matchesSearch =
      review.agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.topic.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || review.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    pendingReviews: reviewQueue.filter((r) => r.status === "pending").length,
    completedToday: 12,
    avgScore: 82,
    flaggedIssues: reviewQueue.filter((r) => r.status === "flagged").length,
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Tabs */}
      <div className="border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-6 py-3">
            <TabsList>
              <TabsTrigger value="reviews">
                <Award className="h-4 w-4 mr-2" />
                QA Reviews
              </TabsTrigger>
              <TabsTrigger value="performance">
                <BarChart3 className="h-4 w-4 mr-2" />
                Agent Performance
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Content */}
      {activeTab === "reviews" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Review Queue */}
          <div className="w-96 border-r border-border bg-card flex flex-col">
            <Tabs defaultValue="reviews" className="flex-1 flex flex-col">
              <div className="p-4 border-b border-border">
                <TabsList className="w-full">
                  <TabsTrigger value="reviews" className="flex-1">
                    <Award className="h-4 w-4 mr-2" />
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger value="coaching" className="flex-1">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Coaching
                  </TabsTrigger>
                </TabsList>
              </div>

          <TabsContent value="reviews" className="flex-1 flex flex-col m-0">
            {/* Stats */}
            <div className="p-4 border-b border-border">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{stats.pendingReviews}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{stats.completedToday}</p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{stats.avgScore}%</p>
                  <p className="text-[10px] text-muted-foreground">Avg Score</p>
                </div>
                <div className="text-center p-2 bg-red-500/10 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{stats.flaggedIssues}</p>
                  <p className="text-[10px] text-muted-foreground">Flagged</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 border-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 h-8">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Review List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {filteredQueue.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedReview?.id === review.id
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={review.agent.avatar || "/placeholder.svg"} alt={review.agent.name} />
                        <AvatarFallback>
                          {review.agent.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{review.agent.name}</span>
                          <span className="text-xs text-muted-foreground">{review.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {review.customer} • {review.topic}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {/* Channel */}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {review.channel === "voice" ? (
                              <Phone className="h-2.5 w-2.5 mr-0.5" />
                            ) : (
                              <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                            )}
                            {review.duration}
                          </Badge>

                          {/* AI Score */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              review.aiScore >= 80
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                : review.aiScore >= 60
                                  ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                  : "bg-red-500/10 text-red-600 border-red-200"
                            }`}
                          >
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                            {review.aiScore}%
                          </Badge>

                          {/* Sentiment */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              review.sentiment === "positive"
                                ? "text-emerald-600"
                                : review.sentiment === "negative"
                                  ? "text-red-600"
                                  : "text-blue-600"
                            }`}
                          >
                            {review.sentiment === "positive" && <ThumbsUp className="h-2.5 w-2.5" />}
                            {review.sentiment === "neutral" && <Minus className="h-2.5 w-2.5" />}
                            {review.sentiment === "negative" && <ThumbsDown className="h-2.5 w-2.5" />}
                          </Badge>

                          {/* Status */}
                          {review.status === "flagged" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-200"
                            >
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              Flagged
                            </Badge>
                          )}
                          {review.status === "completed" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            >
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                              Done
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="coaching" className="flex-1 flex flex-col m-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">AI Coaching Notes</h3>
                <Button size="sm">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {coachingNotes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={note.avatar || "/placeholder.svg"} alt={note.agent} />
                            <AvatarFallback>
                              {note.agent
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm">{note.agent}</CardTitle>
                            <CardDescription className="text-xs">{note.date}</CardDescription>
                          </div>
                        </div>
                        {note.aiGenerated && (
                          <Badge variant="outline" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium mb-1">{note.topic}</p>
                      <p className="text-sm text-muted-foreground">{note.summary}</p>
                      <div className="flex items-center justify-between mt-3">
                        <Badge
                          variant="outline"
                          className={
                            note.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : note.status === "acknowledged"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-amber-500/10 text-amber-600"
                          }
                        >
                          {note.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

          {/* Right Panel - Review Details */}
          <div className="flex-1">
            {selectedReview ? (
              <QAReviewPanel review={selectedReview} />
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                  <Award className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No review selected</h3>
                  <p className="text-sm text-muted-foreground/70">Select a conversation to review</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <AgentPerformanceDashboard />
        </div>
      )}
    </div>
  )
}
