"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, Sparkles, Wand2 } from "lucide-react"

type FlowRow = {
  id: string
  name: string
  description: string | null
  status: "draft" | "published" | "archived"
  active_version_id: string | null
  created_at: string
  updated_at: string
}

export default function AgentBuilderIndexPage() {
  const router = useRouter()
  const { user } = useAuth()
  const role = user?.role

  const [flows, setFlows] = useState<FlowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [templateLoadingKey, setTemplateLoadingKey] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [templates, setTemplates] = useState<{ key: string; name: string; description: string }[]>([])

  // Restrict to admin/supervisor for now
  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (role !== "admin" && role !== "supervisor") {
      router.push("/inbox")
    }
  }, [user, role, router])

  const filtered = useMemo(() => flows, [flows])

  const fetchFlows = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/agent-flows")
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setLoadError(json?.error || `Failed to load flows (HTTP ${res.status})`)
        setFlows([])
        return
      }
      setFlows(json.flows || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlows()
    ;(async () => {
      try {
        const res = await fetch("/api/agent-flows/templates")
        const json = await res.json().catch(() => ({}))
        if (json?.success) setTemplates(json.templates || [])
      } catch {
        // ignore
      }
    })()
  }, [])

  const createFlow = async () => {
    if (!newName.trim()) return
    setCreating(true)
    setActionError(null)
    try {
      const res = await fetch("/api/agent-flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setActionError(json?.error || `Failed to create flow (HTTP ${res.status})`)
        return
      }
      const id = json?.flow?.id
      if (id) {
        router.push(`/agent-builder/${id}`)
      } else {
        setActionError("Flow created but response was missing flow.id")
      }
    } finally {
      setCreating(false)
    }
  }

  const createFromTemplate = async (templateKey: string) => {
    setTemplateLoadingKey(templateKey)
    setActionError(null)
    try {
      const res = await fetch("/api/agent-flows/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setActionError(json?.error || `Failed to create from template (HTTP ${res.status})`)
        return
      }
      const id = json?.flow?.id
      if (id) {
        router.push(`/agent-builder/${id}`)
      } else {
        setActionError("Template created but response was missing flow.id")
      }
    } finally {
      setTemplateLoadingKey(null)
    }
  }

  return (
    <div className="h-full p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agent Builder</h1>
          <p className="text-sm text-muted-foreground">
            Build and publish agent flows (v2). Use the simulator to test safely before publishing.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New flow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new flow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">Name</Label>
                <Input
                  id="flow-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Banking support v2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flow-desc">Description</Label>
                <Input
                  id="flow-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Routes intents, calls LLM prompts, escalates when needed"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={createFlow} disabled={creating || !newName.trim()} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading flows…
        </div>
      ) : loadError ? (
        <Card className="p-6">
          <div className="text-sm font-medium">Agent Builder is not ready</div>
          <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{loadError}</div>
          {loadError.includes("Missing DB tables") || loadError.includes("013_agent_builder") ? (
            <div className="text-xs text-muted-foreground mt-3">
              If you just pulled code, make sure you ran the Supabase migration:{" "}
              <span className="font-mono">supabase/migrations/013_agent_builder.sql</span>
            </div>
          ) : null}
        </Card>
      ) : actionError ? (
        <Card className="p-6 border-destructive/30">
          <div className="text-sm font-medium text-destructive">Couldn’t complete the action</div>
          <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{actionError}</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">No flows yet. Create one to start building.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.name}</div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.description || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-3">
                    Status: <span className="font-medium text-foreground">{f.status}</span>
                    {f.active_version_id ? (
                      <>
                        {" "}
                        • Active version: <span className="font-mono">{f.active_version_id.slice(0, 8)}…</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/agent-builder/${f.id}`}>Open</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {templates.length > 0 ? (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium">Pre-built agents (templates)</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((t) => (
              <Card key={t.key} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                  </div>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => createFromTemplate(t.key)}
                    disabled={templateLoadingKey === t.key}
                  >
                    {templateLoadingKey === t.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Use
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

