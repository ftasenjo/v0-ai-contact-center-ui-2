"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Mail,
  Phone,
  Globe,
  Building,
  FileText,
  ShoppingCart,
  Activity,
  Shield,
  Tag,
  Plus,
  X,
  ThumbsDown,
} from "lucide-react"
import type { Conversation } from "@/lib/sample-data"

interface ConversationDrawerProps {
  conversation: Conversation | null
  open: boolean
  onClose: () => void
}

const recentTickets = [
  { id: "TKT-1842", subject: "Password reset issue", status: "resolved", date: "Nov 28" },
  { id: "TKT-1756", subject: "API rate limiting question", status: "resolved", date: "Nov 15" },
  { id: "TKT-1698", subject: "Invoice clarification", status: "resolved", date: "Oct 30" },
]

const recentOrders = [
  { id: "ORD-9284", product: "Enterprise Plan", amount: "$2,499/mo", date: "Dec 1" },
  { id: "ORD-8756", product: "API Add-on", amount: "$499/mo", date: "Nov 15" },
]

const sentimentTimeline = [
  { time: "45m", score: 0.7, label: "positive" },
  { time: "35m", score: 0.5, label: "neutral" },
  { time: "25m", score: 0.3, label: "negative" },
  { time: "15m", score: 0.2, label: "negative" },
  { time: "5m", score: 0.25, label: "negative" },
]

export function ConversationDrawer({ conversation, open, onClose }: ConversationDrawerProps) {
  if (!conversation) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[450px] sm:max-w-[450px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Customer Details</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="profile" className="h-full">
          <TabsList className="w-full justify-start px-6 border-b rounded-none h-auto py-0">
            <TabsTrigger
              value="profile"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="context"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Context
            </TabsTrigger>
            <TabsTrigger
              value="sentiment"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Sentiment
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Compliance
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Notes
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-140px)]">
            {/* Profile Tab */}
            <TabsContent value="profile" className="m-0 p-6 space-y-6">
              {/* Customer Info */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={conversation.customer.avatar || "/placeholder.svg"}
                    alt={conversation.customer.name}
                  />
                  <AvatarFallback className="text-lg">
                    {conversation.customer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{conversation.customer.name}</h3>
                  <Badge variant="outline" className="capitalize mt-1">
                    {conversation.customer.tier}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Contact Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{conversation.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{conversation.customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{conversation.customer.language}</span>
                    <Badge variant="outline" className="text-xs uppercase">
                      {conversation.customer.preferredLanguage}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>TechCorp Inc.</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Account Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Customer Since</p>
                    <p className="font-medium">March 2022</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Lifetime Value</p>
                    <p className="font-medium">$45,720</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total Tickets</p>
                    <p className="font-medium">23</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Avg. CSAT</p>
                    <p className="font-medium">4.6 / 5.0</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Context Tab */}
            <TabsContent value="context" className="m-0 p-6 space-y-6">
              {/* Recent Tickets */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Recent Tickets
                </h4>
                <div className="space-y-2">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{ticket.id}</p>
                        <p className="text-xs text-muted-foreground">{ticket.subject}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600">
                          {ticket.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{ticket.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recent Orders */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Recent Orders
                </h4>
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{order.id}</p>
                        <p className="text-xs text-muted-foreground">{order.product}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{order.amount}</p>
                        <p className="text-xs text-muted-foreground">{order.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Product Usage */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Product Usage
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Calls (30d)</span>
                    <span className="text-sm font-medium">1.2M</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="text-sm font-medium">47</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage Used</span>
                    <span className="text-sm font-medium">256 GB / 500 GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Login</span>
                    <span className="text-sm font-medium">2 hours ago</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Sentiment Tab */}
            <TabsContent value="sentiment" className="m-0 p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Sentiment Timeline</h4>

                {/* Sentiment Chart Placeholder */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-end gap-2 h-32">
                    {sentimentTimeline.map((point, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "w-full rounded-t",
                            point.label === "positive" && "bg-emerald-500",
                            point.label === "neutral" && "bg-blue-500",
                            point.label === "negative" && "bg-red-500",
                          )}
                          style={{ height: `${point.score * 100}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{point.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Sentiment */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Current Sentiment</span>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-600">Negative</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(conversation.sentimentScore * 100)}%
                    </Badge>
                  </div>
                </div>

                {/* Emotion Tags */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Detected Emotions</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-red-500/10 text-red-600">
                      Frustrated
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                      Impatient
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                      Concerned
                    </Badge>
                  </div>
                </div>

                {/* Triggers */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Trigger Keywords</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">"unacceptable"</Badge>
                    <Badge variant="outline">"down for 2 hours"</Badge>
                    <Badge variant="outline">"entire team"</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="m-0 p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy & Compliance
                </h4>

                {/* Consent Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Marketing Consent</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                      Granted
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Data Processing</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                      Granted
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Recording Consent</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                      Granted
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* PII Redaction */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">PII Redaction Flags</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                      Email detected (masked)
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                      Phone detected (masked)
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Retention */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Data Retention</h5>
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Retention Policy</span>
                      <span className="font-medium">Enterprise (7 years)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Auto-delete Date</span>
                      <span className="font-medium">Dec 2031</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="m-0 p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {conversation.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button variant="outline" size="sm" className="h-6 px-2 gap-1 bg-transparent">
                    <Plus className="h-3 w-3" />
                    Add tag
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Internal Notes</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Sarah Chen</span>
                      <span className="text-xs text-muted-foreground">10 min ago</span>
                    </div>
                    <p className="text-sm">
                      Customer is a key account - flagging for priority handling. Their SLA includes 4-hour response
                      guarantee.
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">AI System</span>
                      <span className="text-xs text-muted-foreground">25 min ago</span>
                    </div>
                    <p className="text-sm">
                      Detected elevated frustration. Recommend empathetic response and escalation path offer.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add a note..." className="flex-1" />
                  <Button size="sm">Add</Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
