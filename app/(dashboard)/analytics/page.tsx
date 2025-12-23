"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Phone,
  Mail,
  Download,
  Calendar,
  Filter,
  ChevronDown,
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { VolumeChart } from "@/components/analytics/volume-chart"
import { SentimentChart } from "@/components/analytics/sentiment-chart"
import { TopicsChart } from "@/components/analytics/topics-chart"
import { EscalationsChart } from "@/components/analytics/escalations-chart"
import { Skeleton } from "@/components/ui/skeleton"

const kpiData = [
  {
    title: "Avg Handle Time",
    value: "8m 24s",
    change: -12,
    trend: "down",
    icon: Clock,
    description: "vs last period",
  },
  {
    title: "First Contact Resolution",
    value: "78.4%",
    change: 5.2,
    trend: "up",
    icon: CheckCircle,
    description: "vs last period",
  },
  {
    title: "CSAT Proxy",
    value: "4.6",
    change: 0.3,
    trend: "up",
    icon: TrendingUp,
    description: "out of 5.0",
  },
  {
    title: "AI Containment",
    value: "64.2%",
    change: 8.7,
    trend: "up",
    icon: MessageSquare,
    description: "handled by AI",
  },
  {
    title: "Handover Rate",
    value: "35.8%",
    change: -8.7,
    trend: "down",
    icon: Users,
    description: "transferred to human",
  },
  {
    title: "SLA Compliance",
    value: "94.2%",
    change: 1.8,
    trend: "up",
    icon: Clock,
    description: "within target",
  },
  {
    title: "Backlog",
    value: "127",
    change: 23,
    trend: "up",
    icon: AlertTriangle,
    description: "pending conversations",
    negative: true,
  },
  {
    title: "Active Agents",
    value: "24",
    change: 0,
    trend: "neutral",
    icon: Users,
    description: "online now",
  },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d")
  const [channel, setChannel] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1500)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor contact center performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Schedule Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Tabs value={dateRange} onValueChange={setDateRange}>
                <TabsList>
                  <TabsTrigger value="24h">24h</TabsTrigger>
                  <TabsTrigger value="7d">7 days</TabsTrigger>
                  <TabsTrigger value="30d">30 days</TabsTrigger>
                  <TabsTrigger value="90d">90 days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Queue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Queues</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="na">North America</SelectItem>
                  <SelectItem value="eu">Europe</SelectItem>
                  <SelectItem value="apac">APAC</SelectItem>
                  <SelectItem value="latam">LATAM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{kpi.title}</span>
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    {kpi.change !== 0 && (
                      <Badge
                        variant="outline"
                        className={
                          (kpi.trend === "up" && !kpi.negative) || (kpi.trend === "down" && kpi.negative)
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            : kpi.trend === "neutral"
                              ? ""
                              : "bg-red-500/10 text-red-600 border-red-200"
                        }
                      >
                        {kpi.trend === "up" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : kpi.trend === "down" ? (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        ) : null}
                        {kpi.change > 0 ? "+" : ""}
                        {kpi.change}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Volume by Channel</CardTitle>
                <CardDescription>Conversation distribution over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Phone className="h-3 w-3" /> Voice
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <MessageSquare className="h-3 w-3" /> Chat
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-[300px] w-full" /> : <VolumeChart />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sentiment Distribution</CardTitle>
                <CardDescription>Customer sentiment across conversations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-[300px] w-full" /> : <SentimentChart />}</CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Top Intents & Topics</CardTitle>
                <CardDescription>Most common customer inquiries</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-[300px] w-full" /> : <TopicsChart />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Escalations & Reasons</CardTitle>
                <CardDescription>Handover and escalation patterns</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-[300px] w-full" /> : <EscalationsChart />}</CardContent>
        </Card>
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Scheduled Reports</CardTitle>
              <CardDescription>Automated report delivery</CardDescription>
            </div>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: "Weekly Performance Summary",
                schedule: "Every Monday, 9:00 AM",
                recipients: "team-leads@majlisconnect.com",
                lastSent: "Dec 9, 2024",
              },
              {
                name: "Daily SLA Report",
                schedule: "Daily, 6:00 PM",
                recipients: "ops@majlisconnect.com",
                lastSent: "Dec 12, 2024",
              },
              {
                name: "Monthly Executive Dashboard",
                schedule: "1st of month, 8:00 AM",
                recipients: "executives@majlisconnect.com",
                lastSent: "Dec 1, 2024",
              },
            ].map((report) => (
              <div
                key={report.name}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.schedule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{report.recipients}</p>
                    <p className="text-xs text-muted-foreground">Last sent: {report.lastSent}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
