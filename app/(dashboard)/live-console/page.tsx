"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  Mic,
  Volume2,
  Users,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  Search,
  Radio,
  Headphones,
} from "lucide-react"
import { LiveCallCard } from "@/components/live-console/live-call-card"
import { TranscriptPanel } from "@/components/live-console/transcript-panel"
import { WaveformVisualizer } from "@/components/live-console/waveform-visualizer"

interface LiveCall {
  id: string;
  callSid: string;
  agent: {
    id: string;
    name: string;
    avatar: string;
    status: string;
  };
  customer: {
    name: string;
    company: string;
    tier: string;
  };
  duration: string;
  sentiment: string;
  sentimentScore: number;
  topic: string;
  riskFlags: string[];
  queue: string;
  from: string;
  to: string;
  status: string;
  startTime: Date;
}

export default function LiveConsolePage() {
  const [liveCallsData, setLiveCallsData] = useState<LiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isWhispering, setIsWhispering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active calls from API
  useEffect(() => {
    const fetchActiveCalls = async () => {
      try {
        const response = await fetch('/api/calls/active');
        const data = await response.json();
        
        if (data.success) {
          // Only show real calls - no demo data
          setLiveCallsData(data.calls || []);

          // Update selected call (functional form to avoid stale closure)
          setSelectedCall((prev) => {
            const calls: LiveCall[] = data.calls || [];
            if (calls.length === 0) return null;
            if (!prev) return calls[0];
            const updated = calls.find((c) => c.id === prev.id);
            return updated || calls[0];
          });
        } else {
          // No calls or error - show empty
          setLiveCallsData([]);
          setSelectedCall(null);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching active calls:', error);
        // On error, show empty state - no demo data
        setLiveCallsData([]);
        setSelectedCall(null);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchActiveCalls();

    // Poll for updates every 2 seconds for real-time feel
    const interval = setInterval(fetchActiveCalls, 2000);

    return () => clearInterval(interval);
  }, []);

  const filteredCalls = liveCallsData.filter(
    (call) =>
      call.agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.topic.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = {
    activeCalls: liveCallsData.length,
    avgDuration: "8:23", // TODO: Calculate from real data
    negativeSentiment: liveCallsData.filter((c) => c.sentiment === "negative").length,
    atRisk: liveCallsData.filter((c) => c.riskFlags.length > 0).length,
  }

  // Selection is maintained inside the polling fetch; avoid duplicate selection effects.

  return (
    <div className="flex h-full">
      {/* Call List */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500 animate-pulse" />
              <h2 className="font-semibold">Live Calls</h2>
              <Badge variant="secondary">{stats.activeCalls}</Badge>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold">{stats.activeCalls}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold">{stats.avgDuration}</p>
              <p className="text-[10px] text-muted-foreground">Avg Time</p>
            </div>
            <div className="text-center p-2 bg-red-500/10 rounded-lg">
              <p className="text-lg font-bold text-red-600">{stats.negativeSentiment}</p>
              <p className="text-[10px] text-muted-foreground">Negative</p>
            </div>
            <div className="text-center p-2 bg-amber-500/10 rounded-lg">
              <p className="text-lg font-bold text-amber-600">{stats.atRisk}</p>
              <p className="text-[10px] text-muted-foreground">At Risk</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* Call List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredCalls.map((call) => (
              <LiveCallCard
                key={call.id}
                call={call}
                isSelected={selectedCall?.id === call.id}
                onSelect={() => setSelectedCall(call)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-medium text-muted-foreground">Loading calls...</h3>
              <p className="text-sm text-muted-foreground/70">Fetching active calls from Twilio</p>
            </div>
          </div>
        ) : selectedCall ? (
          <>
            {/* Call Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={selectedCall.agent.avatar || "/placeholder.svg"}
                        alt={selectedCall.agent.name}
                      />
                      <AvatarFallback>
                        {selectedCall.agent.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{selectedCall.agent.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {selectedCall.queue}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Speaking with {selectedCall.customer.name} • {selectedCall.customer.company}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Call Duration */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-medium">{selectedCall.duration}</span>
                  </div>

                  {/* Sentiment Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                    {selectedCall.sentiment === "positive" && <ThumbsUp className="h-4 w-4 text-emerald-500" />}
                    {selectedCall.sentiment === "neutral" && <Minus className="h-4 w-4 text-blue-500" />}
                    {selectedCall.sentiment === "negative" && <ThumbsDown className="h-4 w-4 text-red-500" />}
                    <span className="text-sm capitalize">{selectedCall.sentiment}</span>
                  </div>

                  {/* Risk Flags */}
                  {selectedCall.riskFlags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {selectedCall.riskFlags.includes("escalation-risk") && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Escalation Risk
                        </Badge>
                      )}
                      {selectedCall.riskFlags.includes("sla-breached") && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                          SLA Breached
                        </Badge>
                      )}
                      {selectedCall.riskFlags.includes("vip-customer") && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                          VIP
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Waveform and Controls */}
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-4">
                {/* Waveform */}
                <div className="flex-1">
                  <WaveformVisualizer />
                </div>

                {/* Supervisor Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={isWhispering ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsWhispering(!isWhispering)}
                    className="gap-2"
                  >
                    <Headphones className="h-4 w-4" />
                    {isWhispering ? "Whispering..." : "Whisper"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Volume2 className="h-4 w-4" />
                    Barge-in
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Take Over
                  </Button>
                </div>
              </div>

              {isWhispering && (
                <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Whisper Mode Active</span>
                    <span className="text-xs text-muted-foreground">Only the agent can hear you</span>
                  </div>
                  <Input placeholder="Type or speak to whisper to the agent..." className="mt-2" />
                </div>
              )}
            </div>

            {/* Transcript Area */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="transcript" className="h-full flex flex-col">
                <div className="px-4 border-b border-border">
                  <TabsList className="h-auto py-0 bg-transparent">
                    <TabsTrigger
                      value="transcript"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Live Transcript
                    </TabsTrigger>
                    <TabsTrigger
                      value="suggestions"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      AI Suggestions
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="transcript" className="flex-1 m-0 overflow-hidden">
                  <TranscriptPanel call={selectedCall} />
                </TabsContent>
                <TabsContent value="suggestions" className="flex-1 m-0 p-4">
                  <div className="space-y-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Suggested Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          "I completely understand your frustration, and I want to assure you that resolving this is my
                          top priority. Let me check the latest status on our engineering team's progress..."
                        </p>
                        <Badge variant="outline" className="mt-2">
                          92% relevance
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Knowledge Base Article</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium">Enterprise SLA Compensation Policy</p>
                        <p className="text-sm text-muted-foreground">
                          For outages exceeding 1 hour, enterprise customers are entitled to...
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Coaching Tip
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Consider acknowledging the customer's time impact more directly. Use phrases like "I
                          understand your team has lost valuable working hours..."
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {liveCallsData.length === 0 ? "No active calls" : "No call selected"}
              </h3>
              <p className="text-sm text-muted-foreground/70">
                {liveCallsData.length === 0 
                  ? "Call your Twilio number (+17623162272) to see it here!"
                  : "Select a live call from the list to monitor"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
