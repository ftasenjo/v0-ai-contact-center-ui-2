"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Bot,
  Users,
  Shield,
  Bell,
  Globe,
  Database,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  Upload,
  Download,
  RotateCcw,
  Save,
  MessageSquare,
  Phone,
  Mail,
  Hash,
} from "lucide-react"

type TwilioConnectivityStatus = {
  success: boolean
  env: Record<string, boolean>
  webhooks: Record<string, string>
  metaVerification: {
    dbEnabled: boolean
    error?: string
    recentCodes: string[]
    recentSms: Array<{
      id: string
      created_at: string
      from_address: string | null
      to_address: string | null
      body_preview: string
      provider: string | null
      provider_message_id: string | null
      codes: string[]
    }>
  }
}

const teamMembers = [
  {
    id: 1,
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    role: "admin",
    status: "active",
    avatar: "/professional-woman-avatar.png",
  },
  {
    id: 2,
    name: "Marcus Johnson",
    email: "marcus.j@company.com",
    role: "supervisor",
    status: "active",
    avatar: "/professional-man-avatar.png",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.r@company.com",
    role: "agent",
    status: "active",
    avatar: "/professional-woman-avatar.png",
  },
  {
    id: 4,
    name: "David Kim",
    email: "david.k@company.com",
    role: "agent",
    status: "inactive",
    avatar: "/asian-man-avatar.png",
  },
  {
    id: 5,
    name: "Lisa Wang",
    email: "lisa.w@company.com",
    role: "analyst",
    status: "active",
    avatar: "/professional-asian-woman.png",
  },
]

const apiKeys = [
  {
    id: 1,
    name: "Production API Key",
    key: "sk_live_***********************",
    created: "2024-01-15",
    lastUsed: "2 hours ago",
    status: "active",
  },
  {
    id: 2,
    name: "Staging API Key",
    key: "sk_test_***********************",
    created: "2024-02-01",
    lastUsed: "1 day ago",
    status: "active",
  },
  {
    id: 3,
    name: "Development Key",
    key: "sk_dev_***********************",
    created: "2024-03-10",
    lastUsed: "Never",
    status: "inactive",
  },
]

const webhooks = [
  {
    id: 1,
    url: "https://api.company.com/webhooks/majlis-connect",
    events: ["conversation.created", "conversation.resolved"],
    status: "active",
  },
  { id: 2, url: "https://analytics.company.com/ingest", events: ["call.ended", "sentiment.alert"], status: "active" },
]

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState<number | null>(null)
  const [aiConfidence, setAiConfidence] = useState([75])
  const [escalationThreshold, setEscalationThreshold] = useState([3])
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("ai")

  const [twilioStatus, setTwilioStatus] = useState<TwilioConnectivityStatus | null>(null)
  const [twilioLoading, setTwilioLoading] = useState(false)
  const [twilioError, setTwilioError] = useState<string | null>(null)

  const refreshTwilioStatus = async () => {
    setTwilioLoading(true)
    setTwilioError(null)
    try {
      const res = await fetch("/api/connectivity/twilio")
      const json = (await res.json().catch(() => null)) as TwilioConnectivityStatus | null
      if (!res.ok || !json?.success) {
        setTwilioError(`Failed to load Twilio connectivity (HTTP ${res.status})`)
        setTwilioStatus(null)
        return
      }
      setTwilioStatus(json)
    } catch (e: any) {
      setTwilioError(e?.message || "Failed to load Twilio connectivity")
      setTwilioStatus(null)
    } finally {
      setTwilioLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "channels") {
      refreshTwilioStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // no-op
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your contact center configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Config</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Channels</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Configuration Tab */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Behavior</CardTitle>
              <CardDescription>Configure how the AI assistant handles conversations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>AI Persona Name</Label>
                  <Input defaultValue="Majlis Connect Assistant" />
                </div>
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  className="min-h-[120px]"
                  defaultValue="You are Majlis Connect Assistant, a helpful and professional customer service AI. Always be polite, empathetic, and solution-oriented. If you cannot resolve an issue, offer to connect the customer with a human agent."
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Confidence Threshold for Auto-Response</Label>
                    <span className="text-sm font-medium">{aiConfidence[0]}%</span>
                  </div>
                  <Slider
                    value={aiConfidence}
                    onValueChange={setAiConfidence}
                    max={100}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    AI will only auto-respond when confidence is above this threshold
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Escalation After N Failed Attempts</Label>
                    <span className="text-sm font-medium">{escalationThreshold[0]} attempts</span>
                  </div>
                  <Slider
                    value={escalationThreshold}
                    onValueChange={setEscalationThreshold}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>AI Features</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">Sentiment Analysis</div>
                      <div className="text-sm text-muted-foreground">Real-time emotion detection</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">Smart Suggestions</div>
                      <div className="text-sm text-muted-foreground">AI-powered response recommendations</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">Auto-Summarization</div>
                      <div className="text-sm text-muted-foreground">Generate conversation summaries</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">PII Redaction</div>
                      <div className="text-sm text-muted-foreground">Automatically mask sensitive data</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Manage AI training data and knowledge sources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-dashed p-6">
                <div className="space-y-1">
                  <div className="font-medium">Upload Knowledge Documents</div>
                  <div className="text-sm text-muted-foreground">PDF, DOCX, TXT, or CSV files</div>
                </div>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  Upload Files
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Connected Knowledge Sources</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Help Center Articles</div>
                        <div className="text-xs text-muted-foreground">1,247 articles indexed</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                      Synced
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Product Documentation</div>
                        <div className="text-xs text-muted-foreground">324 pages indexed</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                      Synced
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <RotateCcw className="h-4 w-4" />
                  Re-index All
                </Button>
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="team" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage users and their roles</CardDescription>
              </div>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>Send an invitation to join your contact center team</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input placeholder="colleague@company.com" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select defaultValue="agent">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Team (Optional)</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setInviteDialogOpen(false)}>Send Invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            member.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>Configure what each role can access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Admin", "Supervisor", "Agent", "Analyst"].map((role) => (
                  <div key={role} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="font-medium">{role}</div>
                      <div className="text-sm text-muted-foreground">
                        {role === "Admin" && "Full system access"}
                        {role === "Supervisor" && "Team management and monitoring"}
                        {role === "Agent" && "Handle conversations"}
                        {role === "Analyst" && "View analytics and reports"}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Twilio + Meta Connectivity</CardTitle>
                  <CardDescription>
                    Confirm webhook URLs, environment configuration, and find Meta verification codes (sent via SMS).
                  </CardDescription>
                </div>
                <Button variant="outline" className="gap-2 bg-transparent" onClick={refreshTwilioStatus} disabled={twilioLoading}>
                  <RotateCcw className={`h-4 w-4 ${twilioLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {twilioError ? (
                <div className="text-sm text-destructive">{twilioError}</div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Environment</div>
                  <div className="text-sm text-muted-foreground mt-1">Server-side variables (presence only)</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {twilioStatus ? (
                      Object.entries(twilioStatus.env).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3">
                          <span className="font-mono">{k}</span>
                          <Badge
                            variant="outline"
                            className={v ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}
                          >
                            {v ? "Set" : "Missing"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">{twilioLoading ? "Loading…" : "Not loaded yet"}</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="font-medium">Webhook URLs</div>
                  <div className="text-sm text-muted-foreground mt-1">Paste these into Twilio Console</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {twilioStatus ? (
                      Object.entries(twilioStatus.webhooks).map(([k, url]) => (
                        <div key={k} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">{k.replaceAll("_", " ")}</div>
                            <div className="font-mono text-xs break-all">{url}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => copyToClipboard(url)}
                            aria-label={`Copy ${k} URL`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">{twilioLoading ? "Loading…" : "Not loaded yet"}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">Meta verification codes (SMS)</div>
                    <div className="text-sm text-muted-foreground">
                      When you click “Send code” in WhatsApp Manager, the SMS lands on your Twilio number. We detect 4–8 digit
                      tokens from recent inbound SMS.
                    </div>
                  </div>
                  {twilioStatus?.metaVerification?.recentCodes?.length ? (
                    <Button
                      variant="outline"
                      className="gap-2 bg-transparent shrink-0"
                      onClick={() => copyToClipboard(twilioStatus.metaVerification.recentCodes[0])}
                    >
                      <Copy className="h-4 w-4" />
                      Copy latest
                    </Button>
                  ) : null}
                </div>

                {twilioStatus ? (
                  <div className="mt-3 space-y-3">
                    {!twilioStatus.metaVerification.dbEnabled ? (
                      <div className="text-sm text-muted-foreground">
                        Database lookup disabled (missing Supabase server credentials). You can still use Vercel logs to find the
                        code.
                      </div>
                    ) : twilioStatus.metaVerification.error ? (
                      <div className="text-sm text-muted-foreground">
                        Couldn’t query SMS messages: <span className="font-mono">{twilioStatus.metaVerification.error}</span>
                      </div>
                    ) : twilioStatus.metaVerification.recentCodes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No verification-like codes found in the last 25 SMS.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {twilioStatus.metaVerification.recentCodes.map((c) => (
                          <Button key={c} variant="outline" className="gap-2 bg-transparent" onClick={() => copyToClipboard(c)}>
                            <span className="font-mono">{c}</span>
                            <Copy className="h-4 w-4" />
                          </Button>
                        ))}
                      </div>
                    )}

                    {twilioStatus.metaVerification.recentSms?.length ? (
                      <div className="pt-2">
                        <div className="text-xs text-muted-foreground mb-2">Recent SMS (masked)</div>
                        <div className="space-y-2">
                          {twilioStatus.metaVerification.recentSms.slice(0, 8).map((m) => (
                            <div key={m.id} className="rounded-lg bg-muted/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-muted-foreground font-mono">
                                  {m.from_address} → {m.to_address}
                                </div>
                                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                              <div className="text-sm mt-2">{m.body_preview}</div>
                              {m.codes?.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {m.codes.map((c) => (
                                    <Button
                                      key={c}
                                      size="sm"
                                      variant="outline"
                                      className="gap-2 bg-transparent"
                                      onClick={() => copyToClipboard(c)}
                                    >
                                      <span className="font-mono">{c}</span>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-muted-foreground">{twilioLoading ? "Loading…" : "Not loaded yet"}</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Web Chat</CardTitle>
                    <CardDescription>Website chat widget</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Response</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Business Hours Only</span>
                  <Switch />
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Configure Widget
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Hash className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">WhatsApp</CardTitle>
                    <CardDescription>WhatsApp Business API</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Phone Number</span>
                  <span className="text-sm font-medium">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Template Messages</span>
                  <span className="text-sm font-medium">12 approved</span>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Manage Templates
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <Phone className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Voice</CardTitle>
                    <CardDescription>Telephony integration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Provider</span>
                  <span className="text-sm font-medium">Twilio</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Phone Number</span>
                  <span className="text-sm font-medium">+17623162272</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Assistant (Vapi)</span>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Configure Voice Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <Mail className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Email</CardTitle>
                    <CardDescription>Email support channel</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Support Email</span>
                  <span className="text-sm font-medium">support@company.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Categorize</span>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Email Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Routing Rules</CardTitle>
              <CardDescription>Configure how conversations are assigned to agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Routing Method</Label>
                <Select defaultValue="skills">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                    <SelectItem value="skills">Skills-Based</SelectItem>
                    <SelectItem value="least-busy">Least Busy Agent</SelectItem>
                    <SelectItem value="priority">Priority Queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">AI Pre-Routing</div>
                  <div className="text-sm text-muted-foreground">Use AI to categorize and route before assignment</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">VIP Detection</div>
                  <div className="text-sm text-muted-foreground">Automatically prioritize high-value customers</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API access to your contact center</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">
                            {showApiKey === key.id ? "sk_live_abc123xyz789def456" : key.key}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                          >
                            {showApiKey === key.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{key.created}</TableCell>
                      <TableCell>{key.lastUsed}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            key.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {key.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Generate New Key
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Configure event notifications to external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <code className="text-sm">{webhook.url}</code>
                    <div className="flex gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                      {webhook.status}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure authentication and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-muted-foreground">Require 2FA for all users</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">SSO Only</div>
                  <div className="text-sm text-muted-foreground">Disable password login</div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">IP Allowlist</div>
                  <div className="text-sm text-muted-foreground">Restrict access to specific IPs</div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">Session Timeout</div>
                  <div className="text-sm text-muted-foreground">Auto-logout after inactivity</div>
                </div>
                <Select defaultValue="60">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Vapi", description: "AI Voice Assistant", status: "available", icon: "V" },
              { name: "Salesforce", description: "CRM integration", status: "connected", icon: "S" },
              { name: "Zendesk", description: "Ticketing system", status: "connected", icon: "Z" },
              { name: "Slack", description: "Team notifications", status: "connected", icon: "S" },
              { name: "HubSpot", description: "Marketing automation", status: "available", icon: "H" },
              { name: "Intercom", description: "Customer messaging", status: "available", icon: "I" },
              { name: "Jira", description: "Issue tracking", status: "available", icon: "J" },
            ].map((integration) => (
              <Card key={integration.name}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg font-semibold">
                      {integration.icon}
                    </div>
                    <div>
                      <div className="font-medium">{integration.name}</div>
                      <div className="text-sm text-muted-foreground">{integration.description}</div>
                    </div>
                  </div>
                  {integration.status === "connected" ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-600">Connected</span>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Export your data for backup or migration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Export Conversations</div>
                  <div className="text-sm text-muted-foreground">All conversation history and transcripts</div>
                </div>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Export Analytics</div>
                  <div className="text-sm text-muted-foreground">Performance metrics and reports</div>
                </div>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Export User Data</div>
                  <div className="text-sm text-muted-foreground">Team member information</div>
                </div>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
              <CardDescription>Configure when and how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">SLA Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">SLA Warning</div>
                      <div className="text-sm text-muted-foreground">Alert when SLA is 80% consumed</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">SLA Breach</div>
                      <div className="text-sm text-muted-foreground">Alert when SLA is breached</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Sentiment Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">Negative Sentiment Spike</div>
                      <div className="text-sm text-muted-foreground">Alert on sudden negative sentiment</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">Escalation Required</div>
                      <div className="text-sm text-muted-foreground">Alert when AI requests human handover</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Queue Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">High Queue Volume</div>
                      <div className="text-sm text-muted-foreground">Alert when queue exceeds threshold</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input type="number" defaultValue="50" className="w-20" />
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">Long Wait Time</div>
                      <div className="text-sm text-muted-foreground">Alert when avg wait exceeds threshold</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select defaultValue="5">
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 min</SelectItem>
                          <SelectItem value="5">5 min</SelectItem>
                          <SelectItem value="10">10 min</SelectItem>
                        </SelectContent>
                      </Select>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">In-App Notifications</div>
                    <div className="text-sm text-muted-foreground">Show alerts in the application</div>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">Send alerts via email</div>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Slack Notifications</div>
                    <div className="text-sm text-muted-foreground">Send alerts to Slack channel</div>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">SMS Notifications</div>
                    <div className="text-sm text-muted-foreground">Critical alerts via SMS</div>
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
