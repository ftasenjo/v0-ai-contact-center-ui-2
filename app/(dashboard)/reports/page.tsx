"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Send,
  Plus,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Filter,
  ChevronRight,
} from "lucide-react"

const reportTemplates = [
  {
    id: "agent-performance",
    name: "Agent Performance Report",
    description: "Individual and team performance metrics",
    category: "Performance",
    icon: Users,
    lastGenerated: "2 hours ago",
    frequency: "Daily",
  },
  {
    id: "conversation-analytics",
    name: "Conversation Analytics",
    description: "Volume, sentiment, topics, and trends",
    category: "Analytics",
    icon: MessageSquare,
    lastGenerated: "Yesterday",
    frequency: "Weekly",
  },
  {
    id: "sla-compliance",
    name: "SLA Compliance Report",
    description: "Response times and SLA adherence",
    category: "Operations",
    icon: Clock,
    lastGenerated: "3 hours ago",
    frequency: "Daily",
  },
  {
    id: "quality-scorecard",
    name: "Quality Scorecard",
    description: "QA scores and coaching insights",
    category: "Quality",
    icon: TrendingUp,
    lastGenerated: "4 days ago",
    frequency: "Weekly",
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level KPIs and business impact",
    category: "Executive",
    icon: BarChart3,
    lastGenerated: "Dec 1, 2024",
    frequency: "Monthly",
  },
  {
    id: "customer-satisfaction",
    name: "Customer Satisfaction",
    description: "CSAT, NPS, and customer feedback analysis",
    category: "Quality",
    icon: TrendingUp,
    lastGenerated: "Yesterday",
    frequency: "Weekly",
  },
]

const scheduledReports = [
  {
    id: "schedule-001",
    template: "Agent Performance Report",
    schedule: "Daily at 9:00 AM",
    recipients: ["team-leads@majlisconnect.com", "ops@majlisconnect.com"],
    format: "PDF + CSV",
    status: "active",
  },
  {
    id: "schedule-002",
    template: "Executive Summary",
    schedule: "1st of month at 8:00 AM",
    recipients: ["executives@majlisconnect.com"],
    format: "PDF",
    status: "active",
  },
  {
    id: "schedule-003",
    template: "SLA Compliance Report",
    schedule: "Daily at 6:00 PM",
    recipients: ["ops@majlisconnect.com"],
    format: "Excel",
    status: "active",
  },
  {
    id: "schedule-004",
    template: "Quality Scorecard",
    schedule: "Every Monday at 10:00 AM",
    recipients: ["qa-team@majlisconnect.com"],
    format: "PDF",
    status: "paused",
  },
]

export default function ReportsPage() {
  const [category, setCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = reportTemplates.filter((template) => {
    const matchesCategory = category === "all" || template.category === category
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories = ["all", ...Array.from(new Set(reportTemplates.map((t) => t.category)))]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Insights</h1>
          <p className="text-muted-foreground">Generate and schedule automated reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search report templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Tabs value={category} onValueChange={setCategory}>
              <TabsList>
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="capitalize">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <template.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-sm">{template.description}</CardDescription>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {template.lastGenerated}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {template.frequency}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="flex-1">
                  <Download className="h-3 w-3 mr-1" />
                  Generate
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Send className="h-3 w-3 mr-1" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Automated report delivery</CardDescription>
            </div>
            <Select defaultValue="active">
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scheduledReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{report.template}</p>
                      <Badge variant={report.status === "active" ? "default" : "secondary"} className="text-xs">
                        {report.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.schedule}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.recipients.length} recipient{report.recipients.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{report.format}</p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">24</p>
              <p className="text-xs text-muted-foreground">Reports This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">4</p>
              <p className="text-xs text-muted-foreground">Active Schedules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Recipients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">98%</p>
              <p className="text-xs text-muted-foreground">Delivery Success</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
