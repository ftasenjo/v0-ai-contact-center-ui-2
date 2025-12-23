"use client"

import "reactflow/dist/style.css"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "reactflow"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Blocks, BookOpen, Cpu, DatabaseZap, Loader2, MessageSquareText, Play, Save, Send, Upload } from "lucide-react"

import type { AgentFlowGraph, AgentFlowNode } from "@/lib/agent-builder/types"

type FlowMeta = {
  id: string
  name: string
  description: string | null
  status: string
  active_version_id: string | null
}

type VersionMeta = {
  id: string
  version: number
  label: string | null
  status: string
  created_at: string
  published_at: string | null
}

const FETCH_OPERATION_PRESETS: Record<
  string,
  { key: string; label: string; path: string; method?: string; queryJson?: string; headersJson?: string; bodyJson?: string; storeAs?: string }[]
> = {
  salesforce: [
    {
      key: "sf_contact_by_email",
      label: "Find Contact by Email",
      path: "/services/data/v59.0/query",
      method: "GET",
      queryJson: "{\"q\":\"SELECT Id, Name, Email FROM Contact WHERE Email = '{{customer.email}}' LIMIT 1\"}",
      storeAs: "sf_contact",
    },
    {
      key: "sf_cases_for_contact",
      label: "List Cases for ContactId",
      path: "/services/data/v59.0/query",
      method: "GET",
      queryJson:
        "{\"q\":\"SELECT Id, CaseNumber, Status, Subject FROM Case WHERE ContactId = '{{vars.sf_contact.data.records.0.Id}}' LIMIT 5\"}",
      storeAs: "sf_cases",
    },
  ],
  hubspot: [
    {
      key: "hs_contact_by_email",
      label: "Get Contact by Email",
      path: "/crm/v3/objects/contacts/search",
      method: "POST",
      headersJson: "{\"Content-Type\":\"application/json\"}",
      bodyJson:
        "{\"filterGroups\":[{\"filters\":[{\"propertyName\":\"email\",\"operator\":\"EQ\",\"value\":\"{{customer.email}}\"}]}],\"properties\":[\"email\",\"firstname\",\"lastname\"],\"limit\":1}",
      storeAs: "hs_contact",
    },
  ],
}

function defaultGraph(): AgentFlowGraph {
  return {
    schemaVersion: 1,
    nodes: [
      { id: "start-1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      {
        id: "llm-1",
        type: "llm",
        position: { x: 250, y: 0 },
        data: {
          label: "LLM",
          promptTemplate:
            "Customer message: {{message}}\n\nCustomer:\n- name: {{customer.name}}\n- email: {{customer.email}}\n- phone: {{customer.phone}}\n- tier: {{customer.tier}}\n\nReply as a banking support agent.",
          model: "gpt-4o-mini",
          temperature: 0.4,
        },
      },
      { id: "end-1", type: "end", position: { x: 520, y: 0 }, data: { label: "End" } },
    ],
    edges: [
      { id: "e-start-llm", source: "start-1", target: "llm-1" },
      { id: "e-llm-end", source: "llm-1", target: "end-1" },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

export default function AgentBuilderEditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const flowId = params?.id as string

  const { user } = useAuth()
  const role = user?.role

  const [flow, setFlow] = useState<FlowMeta | null>(null)
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [simulateMessage, setSimulateMessage] = useState("Hi, I lost my card. What should I do?")
  const [simulateResult, setSimulateResult] = useState<any>(null)
  const [simulating, setSimulating] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [integrations, setIntegrations] = useState<{ id: string; name: string; provider: string }[]>([])
  const [blockSearch, setBlockSearch] = useState("")

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (role !== "admin" && role !== "supervisor") {
      router.push("/inbox")
    }
  }, [user, role, router])

  const toGraph = useCallback((): AgentFlowGraph => {
    const graphNodes: AgentFlowNode[] = nodes.map((n) => ({
      id: n.id,
      // ReactFlow uses string, we constrain in editor to our node types
      type: n.type as any,
      position: n.position,
      data: n.data as any,
    }))
    return {
      schemaVersion: 1,
      nodes: graphNodes,
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: (e as any).label })),
    }
  }, [nodes, edges])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agent-flows/${flowId}`)
      const json = await res.json()
      if (json?.success) {
        setFlow(json.flow)
        setVersions(json.versions || [])
      }

      // Load graph: active version if available; else latest version; else default
      const verRes = await fetch(`/api/agent-flows/${flowId}/versions`)
      const verJson = await verRes.json()
      const versionsWithGraph = (verJson?.versions || []) as any[]
      const activeId = json?.flow?.active_version_id
      const active = activeId ? versionsWithGraph.find((v) => v.id === activeId) : null
      const latest = versionsWithGraph[0] || null
      const graph: AgentFlowGraph = (active?.graph_json || latest?.graph_json || defaultGraph()) as any

      setNodes(graph.nodes as any)
      setEdges(graph.edges as any)

      const intRes = await fetch(`/api/integrations`)
      const intJson = await intRes.json().catch(() => ({}))
      if (intJson?.success) setIntegrations(intJson.integrations || [])
    } finally {
      setLoading(false)
    }
  }, [flowId, setNodes, setEdges])

  useEffect(() => {
    if (!flowId) return
    load()
  }, [flowId, load])

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: "default" }, eds)),
    [setEdges],
  )

  const addNode = (type: AgentFlowNode["type"]) => {
    const id = `${type}-${Date.now()}`
    const base: any = {
      id,
      type,
      position: { x: 80, y: 80 },
      data: { label: type.toUpperCase() },
    }
    if (type === "fetch") {
      base.data = {
        label: "Fetch (CRM/ERP)",
        integrationId: "",
        method: "GET",
        path: "/",
        queryJson: "{}",
        headersJson: "{}",
        bodyJson: "",
        storeAs: "crm",
        preferJson: true,
      }
    }
    if (type === "kb_search") {
      base.data = {
        label: "KB Search",
        queryTemplate: "{{message}}",
        category: "",
        limit: 5,
        includeContent: false,
        storeAs: "kb",
      }
    }
    if (type === "send") {
      base.data = {
        label: "Send",
        channel: "whatsapp",
        toTemplate: "{{customer.phone}}",
        subjectTemplate: "Notification",
        bodyTemplate: "{{last_output}}",
        htmlTemplate: "",
        purpose: "service_notice",
        sensitive: false,
        executeNow: false,
        storeAs: "send",
      }
    }
    if (type === "llm") {
      base.data = {
        label: "LLM",
        promptTemplate: "Customer message: {{message}}\n\nReply helpfully.",
        model: "gpt-4o-mini",
        temperature: 0.4,
      }
    }
    if (type === "condition") {
      base.data = { label: "Condition", when: "message", op: "contains", value: "fraud" }
    }
    setNodes((ns) => [...ns, base])
    setSelectedNodeId(id)
  }

  const saveDraftVersion = async () => {
    setSaving(true)
    try {
      const graph = toGraph()
      const res = await fetch(`/api/agent-flows/${flowId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Draft ${new Date().toLocaleString()}`, graph }),
      })
      const json = await res.json()
      if (json?.success) {
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  const publishLatest = async () => {
    const latest = versions[0]
    if (!latest?.id) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/agent-flows/${flowId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: latest.id }),
      })
      const json = await res.json()
      if (json?.success) await load()
    } finally {
      setPublishing(false)
    }
  }

  const simulate = async () => {
    setSimulating(true)
    setSimulateResult(null)
    try {
      const res = await fetch(`/api/agent-flows/${flowId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            message: simulateMessage,
            customer: { name: "Demo Customer", tier: "standard", phone: "+1234567890", email: "demo@bank.com" },
          },
        }),
      })
      const json = await res.json()
      setSimulateResult(json)
    } finally {
      setSimulating(false)
    }
  }

  const updateSelectedNodeData = (patch: any) => {
    if (!selectedNodeId) return
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== selectedNodeId) return n
        return { ...n, data: { ...(n.data as any), ...patch } }
      }),
    )
  }

  const applyFetchPreset = (presetKey: string) => {
    if (!selectedNode || selectedNode.type !== "fetch") return
    const integrationId = String((selectedNode.data as any)?.integrationId || "")
    const integration = integrations.find((i) => i.id === integrationId)
    const provider = integration?.provider || ""
    const presets = FETCH_OPERATION_PRESETS[provider] || []
    const preset = presets.find((p) => p.key === presetKey)
    if (!preset) return
    updateSelectedNodeData({
      method: preset.method || (selectedNode.data as any)?.method || "GET",
      path: preset.path,
      queryJson: preset.queryJson ?? (selectedNode.data as any)?.queryJson ?? "{}",
      headersJson: preset.headersJson ?? (selectedNode.data as any)?.headersJson ?? "{}",
      bodyJson: preset.bodyJson ?? (selectedNode.data as any)?.bodyJson ?? "",
      storeAs: preset.storeAs ?? (selectedNode.data as any)?.storeAs ?? "crm",
      label: `Fetch: ${preset.label}`,
    })
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Agent Builder</div>
          <div className="font-semibold truncate">{flow?.name || flowId}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={saveDraftVersion} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save version
          </Button>
          <Button
            variant="secondary"
            onClick={publishLatest}
            disabled={publishing || versions.length === 0}
            className="gap-2"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Publish latest
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_360px]">
        {/* Left palette */}
        <div className="border-r bg-muted/10 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Blocks className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium">Blocks</div>
          </div>
          <Input
            value={blockSearch}
            onChange={(e) => setBlockSearch(e.target.value)}
            placeholder="Search blocks…"
            className="mb-4"
          />

          <div className="space-y-4">
            {[
              {
                title: "Core",
                icon: Cpu,
                items: [
                  { key: "start", label: "Start", desc: "Entry point", onClick: () => addNode("start") },
                  { key: "condition", label: "Condition", desc: "Route based on text match", onClick: () => addNode("condition") },
                  { key: "end", label: "End", desc: "Stop execution", onClick: () => addNode("end") },
                ],
              },
              {
                title: "AI",
                icon: DatabaseZap,
                items: [{ key: "llm", label: "LLM", desc: "Generate response", onClick: () => addNode("llm") }],
              },
              {
                title: "Knowledge",
                icon: BookOpen,
                items: [{ key: "kb_search", label: "KB Search", desc: "Search knowledge base", onClick: () => addNode("kb_search") }],
              },
              {
                title: "Integrations",
                icon: DatabaseZap,
                items: [{ key: "fetch", label: "Fetch (CRM/ERP)", desc: "Call CRM/ERP API", onClick: () => addNode("fetch") }],
              },
              {
                title: "Channels",
                icon: MessageSquareText,
                items: [{ key: "send", label: "Send", desc: "WhatsApp / Email / SMS / Voice", onClick: () => addNode("send") }],
              },
            ]
              .map((g) => ({
                ...g,
                items: g.items.filter((it) => {
                  const q = blockSearch.trim().toLowerCase()
                  if (!q) return true
                  return (it.label + " " + it.desc).toLowerCase().includes(q)
                }),
              }))
              .filter((g) => g.items.length > 0)
              .map((group) => {
                const Icon = group.icon
                return (
                  <div key={group.title} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {group.items.map((it) => (
                        <button
                          key={it.key}
                          onClick={it.onClick}
                          className="w-full text-left rounded-lg border bg-background hover:bg-muted/50 transition-colors px-3 py-2"
                        >
                          <div className="text-sm font-medium">{it.label}</div>
                          <div className="text-xs text-muted-foreground">{it.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

            <Card className="p-3">
              <div className="text-xs text-muted-foreground">
                Tip: Use <span className="font-mono">KB Search → LLM → Send</span> to answer with citations and follow up on WhatsApp/email.
              </div>
            </Card>
          </div>
        </div>

        {/* Canvas */}
        <div className="h-[calc(100vh-64px)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right panel */}
        <div className="border-l bg-muted/10 p-4 space-y-4 overflow-y-auto">
          <Card className="p-4 space-y-3">
            <div className="font-medium text-sm">Node properties</div>
            {!selectedNode ? (
              <div className="text-sm text-muted-foreground">Select a node to edit.</div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Input value={String(selectedNode.type)} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Label</Label>
                  <Input
                    value={String((selectedNode.data as any)?.label || "")}
                    onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
                  />
                </div>

                {selectedNode.type === "llm" ? (
                  <>
                    <div className="space-y-1">
                      <Label>Model</Label>
                      <Input
                        value={String((selectedNode.data as any)?.model || "")}
                        onChange={(e) => updateSelectedNodeData({ model: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Temperature</Label>
                      <Input
                        value={String((selectedNode.data as any)?.temperature ?? 0.4)}
                        onChange={(e) => updateSelectedNodeData({ temperature: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Prompt template</Label>
                      <Textarea
                        value={String((selectedNode.data as any)?.promptTemplate || "")}
                        onChange={(e) => updateSelectedNodeData({ promptTemplate: e.target.value })}
                        className="min-h-[160px]"
                      />
                      <div className="text-xs text-muted-foreground">
                        Placeholders: {"{{message}}"}, {"{{customer.name}}"}, {"{{customer.email}}"}, {"{{customer.phone}}"}, {"{{customer.tier}}"}
                        , {"{{vars.<key>}}"} (e.g. {"{{vars.crm}}"})
                      </div>
                    </div>
                  </>
                ) : null}

                {selectedNode.type === "fetch" ? (
                  <>
                    <div className="space-y-1">
                      <Label>Integration</Label>
                      {integrations.length > 0 ? (
                        <Select
                          value={String((selectedNode.data as any)?.integrationId || "")}
                          onValueChange={(v) => updateSelectedNodeData({ integrationId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select integration…" />
                          </SelectTrigger>
                          <SelectContent>
                            {integrations.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} ({i.provider})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={String((selectedNode.data as any)?.integrationId || "")}
                          onChange={(e) => updateSelectedNodeData({ integrationId: e.target.value })}
                          placeholder="Integration id (cc_integrations.id)"
                        />
                      )}
                      <div className="text-xs text-muted-foreground">
                        The connection is stored in <span className="font-mono">cc_integrations</span>. Secrets are read from
                        env vars referenced by the integration.
                      </div>
                    </div>

                    {(() => {
                      const integrationId = String((selectedNode.data as any)?.integrationId || "")
                      const integration = integrations.find((i) => i.id === integrationId)
                      const provider = integration?.provider || ""
                      const presets = FETCH_OPERATION_PRESETS[provider] || []
                      if (!integrationId || presets.length === 0) return null
                      return (
                        <div className="space-y-1">
                          <Label>Operation preset (optional)</Label>
                          <Select value="" onValueChange={(v) => applyFetchPreset(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={`Choose ${provider} operation…`} />
                            </SelectTrigger>
                            <SelectContent>
                              {presets.map((p) => (
                                <SelectItem key={p.key} value={p.key}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-muted-foreground">
                            This auto-fills path/query/body for common CRM lookups so you only edit the minimum info.
                          </div>
                        </div>
                      )
                    })()}
                    <div className="space-y-1">
                      <Label>Method</Label>
                      <Input
                        value={String((selectedNode.data as any)?.method || "GET")}
                        onChange={(e) => updateSelectedNodeData({ method: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Path</Label>
                      <Input
                        value={String((selectedNode.data as any)?.path || "/")}
                        onChange={(e) => updateSelectedNodeData({ path: e.target.value })}
                        placeholder="/api/v1/customers"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Query JSON</Label>
                      <Textarea
                        value={String((selectedNode.data as any)?.queryJson || "")}
                        onChange={(e) => updateSelectedNodeData({ queryJson: e.target.value })}
                        className="min-h-[90px]"
                      />
                      <div className="text-xs text-muted-foreground">Supports placeholders like {"{{customer.email}}"}.</div>
                    </div>
                    <div className="space-y-1">
                      <Label>Headers JSON</Label>
                      <Textarea
                        value={String((selectedNode.data as any)?.headersJson || "")}
                        onChange={(e) => updateSelectedNodeData({ headersJson: e.target.value })}
                        className="min-h-[70px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Body JSON</Label>
                      <Textarea
                        value={String((selectedNode.data as any)?.bodyJson || "")}
                        onChange={(e) => updateSelectedNodeData({ bodyJson: e.target.value })}
                        className="min-h-[90px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Store as (vars key)</Label>
                      <Input
                        value={String((selectedNode.data as any)?.storeAs || "")}
                        onChange={(e) => updateSelectedNodeData({ storeAs: e.target.value })}
                        placeholder="crm"
                      />
                      <div className="text-xs text-muted-foreground">
                        LLM prompts can reference {"{{vars.<key>}}"} and {"{{vars.<key>.data}}"}.
                      </div>
                    </div>
                  </>
                ) : null}

                {selectedNode.type === "kb_search" ? (
                  <>
                    <div className="space-y-1">
                      <Label>Query template</Label>
                      <Textarea
                        value={String((selectedNode.data as any)?.queryTemplate || "")}
                        onChange={(e) => updateSelectedNodeData({ queryTemplate: e.target.value })}
                        className="min-h-[80px]"
                      />
                      <div className="text-xs text-muted-foreground">
                        If empty, returns top published articles. Supports {"{{message}}"} and {"{{customer.*}}"}.
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Category (optional)</Label>
                      <Input
                        value={String((selectedNode.data as any)?.category || "")}
                        onChange={(e) => updateSelectedNodeData({ category: e.target.value })}
                        placeholder="cards, fraud_security, payments…"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Limit</Label>
                      <Input
                        value={String((selectedNode.data as any)?.limit ?? 5)}
                        onChange={(e) => updateSelectedNodeData({ limit: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Store as (vars key)</Label>
                      <Input
                        value={String((selectedNode.data as any)?.storeAs || "kb")}
                        onChange={(e) => updateSelectedNodeData({ storeAs: e.target.value })}
                      />
                      <div className="text-xs text-muted-foreground">
                        Access in prompts as {"{{vars.kb}}"} or {"{{vars.kb.articles}}"}.
                      </div>
                    </div>
                  </>
                ) : null}

                {selectedNode.type === "send" ? (
                  <>
                    <div className="space-y-1">
                      <Label>Channel</Label>
                      <Select
                        value={String((selectedNode.data as any)?.channel || "whatsapp")}
                        onValueChange={(v) => updateSelectedNodeData({ channel: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="voice">Voice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>To</Label>
                      <Input
                        value={String((selectedNode.data as any)?.toTemplate || "")}
                        onChange={(e) => updateSelectedNodeData({ toTemplate: e.target.value })}
                        placeholder="{{customer.phone}} or {{customer.email}}"
                      />
                    </div>
                    {String((selectedNode.data as any)?.channel || "whatsapp") === "email" ? (
                      <>
                        <div className="space-y-1">
                          <Label>Subject</Label>
                          <Input
                            value={String((selectedNode.data as any)?.subjectTemplate || "")}
                            onChange={(e) => updateSelectedNodeData({ subjectTemplate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>HTML (optional)</Label>
                          <Textarea
                            value={String((selectedNode.data as any)?.htmlTemplate || "")}
                            onChange={(e) => updateSelectedNodeData({ htmlTemplate: e.target.value })}
                            className="min-h-[70px]"
                          />
                        </div>
                      </>
                    ) : null}
                    <div className="space-y-1">
                      <Label>Body</Label>
                      <Textarea
                        value={String((selectedNode.data as any)?.bodyTemplate || "")}
                        onChange={(e) => updateSelectedNodeData({ bodyTemplate: e.target.value })}
                        className="min-h-[120px]"
                      />
                      <div className="text-xs text-muted-foreground">
                        Tip: use {"{{last_output}}"} to send the previous node output.
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Purpose</Label>
                      <Input
                        value={String((selectedNode.data as any)?.purpose || "service_notice")}
                        onChange={(e) => updateSelectedNodeData({ purpose: e.target.value })}
                        placeholder="service_notice"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Execute now</Label>
                      <Input
                        value={String(Boolean((selectedNode.data as any)?.executeNow))}
                        onChange={(e) => updateSelectedNodeData({ executeNow: e.target.value === "true" })}
                        placeholder="true/false"
                      />
                      <div className="text-xs text-muted-foreground">
                        If false, it only queues an outbound job in <span className="font-mono">cc_outbound_jobs</span>.
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Store as (vars key)</Label>
                      <Input
                        value={String((selectedNode.data as any)?.storeAs || "send")}
                        onChange={(e) => updateSelectedNodeData({ storeAs: e.target.value })}
                      />
                    </div>
                  </>
                ) : null}

                {selectedNode.type === "condition" ? (
                  <>
                    <div className="space-y-1">
                      <Label>When</Label>
                      <Input
                        value={String((selectedNode.data as any)?.when || "message")}
                        onChange={(e) => updateSelectedNodeData({ when: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Operator</Label>
                      <Input
                        value={String((selectedNode.data as any)?.op || "contains")}
                        onChange={(e) => updateSelectedNodeData({ op: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Value</Label>
                      <Input
                        value={String((selectedNode.data as any)?.value || "")}
                        onChange={(e) => updateSelectedNodeData({ value: e.target.value })}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Add edges labeled <span className="font-mono">true</span> and <span className="font-mono">false</span> from this node.
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="font-medium text-sm">Simulator</div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={simulateMessage} onChange={(e) => setSimulateMessage(e.target.value)} className="min-h-[90px]" />
              <Button onClick={simulate} disabled={simulating} className="gap-2">
                {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run
              </Button>
            </div>
            {simulateResult ? (
              <div className="space-y-2 pt-2">
                <div className="text-xs text-muted-foreground">Output</div>
                <div className="text-sm whitespace-pre-wrap rounded-md border bg-background p-3">
                  {simulateResult?.result?.outputText ||
                    simulateResult?.result?.error ||
                    simulateResult?.error ||
                    "—"}
                </div>
                <div className="text-xs text-muted-foreground">Logs</div>
                <div className="text-xs font-mono whitespace-pre-wrap rounded-md border bg-background p-3 max-h-64 overflow-y-auto">
                  {JSON.stringify(simulateResult?.result?.logs || [], null, 2)}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-4 space-y-2">
            <div className="font-medium text-sm">Versions</div>
            {versions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No versions yet. Save a version.</div>
            ) : (
              <div className="space-y-2">
                {versions.slice(0, 10).map((v) => (
                  <div key={v.id} className="text-sm flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate">
                        v{v.version} • {v.status}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{v.label || v.id}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setSimulating(true)
                        try {
                          const res = await fetch(`/api/agent-flows/${flowId}/simulate`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              versionId: v.id,
                              context: {
                                message: simulateMessage,
                                customer: { name: "Demo Customer", tier: "standard" },
                              },
                            }),
                          })
                          const json = await res.json()
                          setSimulateResult(json)
                        } finally {
                          setSimulating(false)
                        }
                      }}
                    >
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

