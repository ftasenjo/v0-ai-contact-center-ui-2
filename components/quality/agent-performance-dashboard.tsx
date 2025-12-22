"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
  Award,
  Target,
  BarChart3,
  Users,
} from "lucide-react"

interface AgentPerformance {
  id: string
  name: string
  email: string
  avatar: string | null
  status: string
  role: string
  totalConversations: number
  resolvedConversations: number
  resolutionRate: number
  avgHandleTime: number
  avgHandleTimeFormatted: string
  avgQualityScore: number | null
  csat: number
  avgSentimentScore: number
  positiveCount: number
  negativeCount: number
  escalationRate: number
  issueResolutionRate: number
  frustrationRate: number
  channelCounts: {
    voice: number
    chat: number
    email: number
    whatsapp: number
  }
  priorityCounts: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  performanceScore: number
  activeConversations: number
}

export function AgentPerformanceDashboard() {
  const [agents, setAgents] = useState<AgentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"performance" | "resolution" | "quality" | "handleTime">("performance")

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/agents/performance")
        const data = await response.json()
        if (data.agents) {
          setAgents(data.agents)
        }
      } catch (error) {
        console.error("Failed to fetch agent performance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPerformance()
    // Refresh every 30 seconds
    const interval = setInterval(fetchPerformance, 30000)
    return () => clearInterval(interval)
  }, [])

  const sortedAgents = [...agents].sort((a, b) => {
    switch (sortBy) {
      case "resolution":
        return b.resolutionRate - a.resolutionRate
      case "quality":
        return (b.avgQualityScore || 0) - (a.avgQualityScore || 0)
      case "handleTime":
        return a.avgHandleTime - b.avgHandleTime
      default:
        return b.performanceScore - a.performanceScore
    }
  })

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />
    return <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "busy":
        return "bg-orange-500"
      default:
        return "bg-gray-400"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading agent performance data...</div>
        </CardContent>
      </Card>
    )
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No agent performance data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {agents.filter((a) => a.status === "online").length} online
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((agents.reduce((sum, a) => sum + a.performanceScore, 0) / agents.length) * 10) / 10}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Across all agents</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((agents.reduce((sum, a) => sum + a.resolutionRate, 0) / agents.length) * 10) / 10}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">First contact resolution</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Handle Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(agents.reduce((sum, a) => sum + a.avgHandleTime, 0) / agents.length / 60)}m
            </div>
            <div className="text-xs text-muted-foreground mt-1">Average across agents</div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Agent Performance Ranking
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="performance">Performance Score</option>
                <option value="resolution">Resolution Rate</option>
                <option value="quality">Quality Score</option>
                <option value="handleTime">Handle Time</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedAgents.map((agent, index) => (
              <div
                key={agent.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 h-12 shrink-0">
                    {getRankIcon(index)}
                  </div>

                  {/* Agent Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={agent.avatar || "/placeholder-user.jpg"} alt={agent.name} />
                        <AvatarFallback>
                          {agent.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(agent.status)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{agent.name}</h3>
                        {agent.role === "supervisor" && (
                          <Badge variant="outline" className="text-xs">
                            Supervisor
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{agent.email}</div>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="text-center shrink-0">
                    <div className={`text-2xl font-bold ${getPerformanceColor(agent.performanceScore)}`}>
                      {agent.performanceScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Resolution Rate</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress value={agent.resolutionRate} className="h-2" />
                      </div>
                      <span className="text-sm font-medium">{agent.resolutionRate}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {agent.resolvedConversations}/{agent.totalConversations} resolved
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Quality Score</div>
                    <div className="flex items-center gap-2">
                      {agent.avgQualityScore !== null ? (
                        <>
                          <div className="flex-1">
                            <Progress value={(agent.avgQualityScore / 10) * 100} className="h-2" />
                          </div>
                          <span className="text-sm font-medium">{agent.avgQualityScore}/10</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Avg from reviews</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Avg Handle Time</div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{agent.avgHandleTimeFormatted}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {agent.totalConversations} conversations
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">CSAT / Sentiment</div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{agent.csat.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {agent.positiveCount} positive, {agent.negativeCount} negative
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Issue Resolution</div>
                    <div className="text-sm font-medium">{agent.issueResolutionRate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Escalation Rate</div>
                    <div className="text-sm font-medium text-red-600">{agent.escalationRate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Frustration Rate</div>
                    <div className="text-sm font-medium text-orange-600">{agent.frustrationRate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Active Conversations</div>
                    <div className="text-sm font-medium">{agent.activeConversations}</div>
                  </div>
                </div>

                {/* Channel Distribution */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Channel Distribution</div>
                  <div className="flex items-center gap-4">
                    {agent.channelCounts.voice > 0 && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-blue-500" />
                        <span className="text-xs">{agent.channelCounts.voice} voice</span>
                      </div>
                    )}
                    {agent.channelCounts.chat > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-green-500" />
                        <span className="text-xs">{agent.channelCounts.chat} chat</span>
                      </div>
                    )}
                    {agent.channelCounts.email > 0 && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-amber-500" />
                        <span className="text-xs">{agent.channelCounts.email} email</span>
                      </div>
                    )}
                    {agent.channelCounts.whatsapp > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs">{agent.channelCounts.whatsapp} WhatsApp</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

