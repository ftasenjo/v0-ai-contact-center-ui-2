"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  Plus,
  Search,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  Settings,
  Copy,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const workflows = [
  {
    id: "wf-001",
    name: "Auto-Route High Priority",
    description: "Automatically route VIP and urgent conversations to senior agents",
    trigger: "New conversation",
    actions: 3,
    status: "active",
    executions: 1247,
    successRate: 98.4,
  },
  {
    id: "wf-002",
    name: "SLA Breach Alert",
    description: "Send notifications when conversations approach SLA limits",
    trigger: "Time-based",
    actions: 2,
    status: "active",
    executions: 456,
    successRate: 100,
  },
  {
    id: "wf-003",
    name: "Post-Call Survey",
    description: "Send CSAT survey after each completed conversation",
    trigger: "Conversation closed",
    actions: 4,
    status: "active",
    executions: 2891,
    successRate: 95.7,
  },
  {
    id: "wf-004",
    name: "Escalation Notification",
    description: "Notify supervisors when AI hands over to human agent",
    trigger: "Handover event",
    actions: 2,
    status: "active",
    executions: 634,
    successRate: 99.2,
  },
  {
    id: "wf-005",
    name: "Knowledge Gap Detection",
    description: "Flag conversations where AI lacks relevant knowledge",
    trigger: "Low confidence",
    actions: 3,
    status: "paused",
    executions: 123,
    successRate: 87.8,
  },
  {
    id: "wf-006",
    name: "After-Hours Routing",
    description: "Route conversations to on-call team outside business hours",
    trigger: "Time-based",
    actions: 2,
    status: "active",
    executions: 789,
    successRate: 96.5,
  },
]

export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalWorkflows: workflows.length,
    active: workflows.filter((w) => w.status === "active").length,
    totalExecutions: workflows.reduce((sum, w) => sum + w.executions, 0),
    avgSuccessRate: (workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length).toFixed(1),
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation Workflows</h1>
          <p className="text-muted-foreground">Automate repetitive tasks and routing logic</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.totalWorkflows}</p>
                <p className="text-xs text-muted-foreground">Total Workflows</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <Play className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Executions</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.avgSuccessRate}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "paused" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paused")}
              >
                Paused
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <div className="space-y-3">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{workflow.name}</h3>
                      <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                        {workflow.status === "active" ? (
                          <Play className="h-3 w-3 mr-1" />
                        ) : (
                          <Pause className="h-3 w-3 mr-1" />
                        )}
                        {workflow.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>
                    <div className="flex items-center gap-6 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        <span>Trigger: {workflow.trigger}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Settings className="h-3 w-3" />
                        <span>{workflow.actions} actions</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="h-3 w-3" />
                        <span>{workflow.executions.toLocaleString()} executions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={workflow.successRate >= 95 ? "text-emerald-600" : "text-amber-600"}>
                          {workflow.successRate}% success
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {workflow.status === "active" ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Logs</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
