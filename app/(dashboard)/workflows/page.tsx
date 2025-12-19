"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Play,
  Search,
  MessageSquare,
  Mail,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PauseCircle,
  Filter,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

type Campaign = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  allowed_channels: any;
  created_at: string;
  updated_at: string;
};

type Job = {
  id: string;
  campaign_id: string;
  channel: string;
  status: string;
  created_at: string;
  to_hint: string;
  attempts_count: number;
  last_attempt_at: string | null;
  last_error_hint: string | null;
};

async function apiGet<T>(path: string, role: string | undefined): Promise<T> {
  const res = await fetch(path, {
    headers: {
      // Demo UI: outbound endpoints are gated by a simple role header.
      "x-user-role": role || "",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function apiPost<T>(path: string, role: string | undefined, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-role": role || "",
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role;
  const [tab, setTab] = useState<"jobs" | "campaigns">("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobStatus, setJobStatus] = useState<string>("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = jobStatus !== "all" ? `&status=${encodeURIComponent(jobStatus)}` : "";
      const [jobsRes, campaignsRes] = await Promise.all([
        apiGet<{ items: Job[]; next_cursor: string | null }>(`/api/outbound/jobs?limit=50${statusParam}`, role),
        apiGet<{ items: Campaign[] }>("/api/outbound/campaigns", role),
      ]);
      setJobs(jobsRes.items || []);
      setNextCursor(jobsRes.next_cursor || null);
      setCampaigns(campaignsRes.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load outbound workflows data");
    } finally {
      setLoading(false);
    }
  }, [jobStatus, role]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const statusParam = jobStatus !== "all" ? `&status=${encodeURIComponent(jobStatus)}` : "";
      const res = await apiGet<{ items: Job[]; next_cursor: string | null }>(
        `/api/outbound/jobs?limit=50${statusParam}&cursor=${encodeURIComponent(nextCursor)}`,
        role
      );
      setJobs((prev) => [...prev, ...(res.items || [])]);
      setNextCursor(res.next_cursor || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load more jobs");
    } finally {
      setLoading(false);
    }
  }, [jobStatus, nextCursor, role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      return (
        j.id.toLowerCase().includes(q) ||
        (j.to_hint || "").toLowerCase().includes(q) ||
        j.channel.toLowerCase().includes(q) ||
        j.status.toLowerCase().includes(q)
      );
    });
  }, [jobs, searchQuery]);

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => c.name.toLowerCase().includes(q) || c.purpose.toLowerCase().includes(q));
  }, [campaigns, searchQuery]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return MessageSquare;
      case "email":
        return Mail;
      case "voice":
      case "sms":
        return Phone;
      default:
        return Send;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return CheckCircle2;
      case "failed":
      case "canceled":
        return XCircle;
      case "awaiting_verification":
        return AlertCircle;
      case "queued":
        return Clock;
      default:
        return PauseCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-600 dark:text-green-400";
      case "failed":
      case "canceled":
        return "text-red-600 dark:text-red-400";
      case "awaiting_verification":
        return "text-amber-600 dark:text-amber-400";
      case "queued":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const stats = useMemo(() => {
    const total = jobs.length;
    const sent = jobs.filter((j) => j.status === "sent").length;
    const queued = jobs.filter((j) => j.status === "queued").length;
    const failed = jobs.filter((j) => j.status === "failed" || j.status === "canceled").length;
    return { total, sent, queued, failed };
  }, [jobs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outbound Workflows</h1>
          <p className="text-muted-foreground mt-1">Manage campaigns and monitor job execution</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            disabled={loading}
            onClick={() => apiPost("/api/outbound/jobs/run", role, { limit: 25 }).then(refresh)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Runner
          </Button>
          <Button variant="outline" disabled={loading} onClick={refresh}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {user?.role !== "admin" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              This page is admin-only. Switch your demo role to admin.
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "jobs" && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Send className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sent</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{stats.sent}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Queued</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.queued}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed/Canceled</p>
                  <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{stats.failed}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by job id, address, channel, status, campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {tab === "jobs" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {["all", "queued", "awaiting_verification", "sent", "failed", "canceled"].map((s) => {
                  const StatusIcon = s !== "all" ? getStatusIcon(s) : null;
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={jobStatus === s ? "default" : "outline"}
                      onClick={() => setJobStatus(s)}
                      className="capitalize"
                    >
                      {StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}
                      {s.replace("_", " ")}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          <div className="space-y-3">
            {filteredJobs.map((j) => {
              const ChannelIcon = getChannelIcon(j.channel);
              const StatusIcon = getStatusIcon(j.status);
              const statusColor = getStatusColor(j.status);
              return (
                <Card
                  key={j.id}
                  className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary"
                  onClick={() => router.push(`/workflows/jobs/${j.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="capitalize">
                              {j.channel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                            <Badge
                              variant={
                                j.status === "sent"
                                  ? "default"
                                  : j.status === "awaiting_verification"
                                  ? "secondary"
                                  : j.status === "failed" || j.status === "canceled"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="capitalize"
                            >
                              {j.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-mono font-medium">{j.to_hint}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Send className="h-3 w-3" />
                              <span>{j.attempts_count} attempt{j.attempts_count !== 1 ? "s" : ""}</span>
                            </div>
                            {j.last_attempt_at && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(j.last_attempt_at).toLocaleString()}</span>
                              </div>
                            )}
                            {j.last_error_hint && (
                              <div className="flex items-center gap-1.5 text-destructive">
                                <XCircle className="h-3 w-3" />
                                <span>{j.last_error_hint}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-1">
                          <span className="font-mono text-xs text-muted-foreground">{j.id}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredJobs.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground">No jobs found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery || jobStatus !== "all"
                      ? "Try adjusting your search or filters"
                      : "Jobs will appear here once created"}
                  </p>
                </CardContent>
              </Card>
            )}
            {loading && filteredJobs.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground mx-auto animate-spin" />
                  <p className="text-sm text-muted-foreground mt-4">Loading jobs...</p>
                </CardContent>
              </Card>
            )}
            {nextCursor && (
              <div className="pt-2 flex justify-center">
                <Button variant="outline" disabled={loading} onClick={loadMore}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <div className="space-y-3">
            {filteredCampaigns.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-all">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg">{c.name}</h3>
                        <Badge variant="outline" className="capitalize">
                          {c.purpose.replace("_", " ")}
                        </Badge>
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>Updated: {new Date(c.updated_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredCampaigns.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground">No campaigns found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? "Try adjusting your search" : "Campaigns will appear here once created"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
