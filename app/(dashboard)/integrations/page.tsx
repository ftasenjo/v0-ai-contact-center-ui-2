"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, PlugZap, Search, Store, TestTube2 } from "lucide-react"
import { siHubspot, siZendesk, siSap, siShopify, siStripe } from "simple-icons"

type IntegrationListRow = {
  id: string
  name: string
  provider: string
  base_url: string
  status: "active" | "disabled"
  auth_type: string
}

const PROVIDER_PRESETS = [
  {
    key: "salesforce",
    name: "Salesforce",
    provider: "salesforce",
    auth_type: "bearer_env",
    auth_env_key: "SALESFORCE_ACCESS_TOKEN",
    base_url_placeholder: "https://YOUR_INSTANCE.my.salesforce.com",
    note: "Create a Salesforce Connected App / token and set SALESFORCE_ACCESS_TOKEN in .env.local (server-side).",
  },
  {
    key: "hubspot",
    name: "HubSpot",
    provider: "hubspot",
    auth_type: "bearer_env",
    auth_env_key: "HUBSPOT_PRIVATE_APP_TOKEN",
    base_url_placeholder: "https://api.hubapi.com",
    note: "Create a HubSpot Private App token and set HUBSPOT_PRIVATE_APP_TOKEN in .env.local.",
  },
  {
    key: "custom",
    name: "Custom REST API",
    provider: "custom",
    auth_type: "api_key_env",
    auth_env_key: "CUSTOM_API_KEY",
    base_url_placeholder: "https://api.yourcompany.com",
    note: "Set CUSTOM_API_KEY in .env.local (or switch auth type).",
  },
] as const

type MarketplaceCategory = "CRM" | "Helpdesk" | "ERP" | "Commerce" | "Payments" | "Other"

type MarketplaceApp = {
  key: string
  name: string
  provider: string
  category: MarketplaceCategory
  icon?: { title: string; hex: string; path: string }
  monogram?: { text: string; bg: string; fg: string }
  blurb: string
  presetKey?: (typeof PROVIDER_PRESETS)[number]["key"]
  base_url_placeholder: string
  auth_type: string
  auth_env_key: string
  comingSoon?: boolean
}

const MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    key: "salesforce",
    name: "Salesforce",
    provider: "salesforce",
    category: "CRM",
    monogram: { text: "SF", bg: "#00A1E0", fg: "#ffffff" },
    blurb: "Contacts, cases, opportunities. Use Fetch presets in flows.",
    presetKey: "salesforce",
    base_url_placeholder: "https://YOUR_INSTANCE.my.salesforce.com",
    auth_type: "bearer_env",
    auth_env_key: "SALESFORCE_ACCESS_TOKEN",
  },
  {
    key: "hubspot",
    name: "HubSpot",
    provider: "hubspot",
    category: "CRM",
    icon: siHubspot,
    blurb: "Contacts and companies via Private App token.",
    presetKey: "hubspot",
    base_url_placeholder: "https://api.hubapi.com",
    auth_type: "bearer_env",
    auth_env_key: "HUBSPOT_PRIVATE_APP_TOKEN",
  },
  {
    key: "zendesk",
    name: "Zendesk",
    provider: "zendesk",
    category: "Helpdesk",
    icon: siZendesk,
    blurb: "Tickets, users, orgs (preset scaffolding ready).",
    base_url_placeholder: "https://YOUR_SUBDOMAIN.zendesk.com",
    auth_type: "bearer_env",
    auth_env_key: "ZENDESK_API_TOKEN",
    comingSoon: true,
  },
  {
    key: "dynamics",
    name: "Dynamics 365",
    provider: "dynamics",
    category: "CRM",
    monogram: { text: "D365", bg: "#5B2DAA", fg: "#ffffff" },
    blurb: "Accounts, cases, activities (connect and fetch).",
    base_url_placeholder: "https://YOURORG.api.crm.dynamics.com",
    auth_type: "bearer_env",
    auth_env_key: "DYNAMICS_ACCESS_TOKEN",
    comingSoon: true,
  },
  {
    key: "sap",
    name: "SAP",
    provider: "sap",
    category: "ERP",
    icon: siSap,
    blurb: "ERP data via OData / REST APIs.",
    base_url_placeholder: "https://YOUR_SAP_HOST",
    auth_type: "bearer_env",
    auth_env_key: "SAP_ACCESS_TOKEN",
    comingSoon: true,
  },
  {
    key: "netsuite",
    name: "NetSuite (Oracle)",
    provider: "netsuite",
    category: "ERP",
    monogram: { text: "NS", bg: "#000000", fg: "#ffffff" },
    blurb: "ERP/finance objects (connector scaffold).",
    base_url_placeholder: "https://YOUR_ACCOUNT.suitetalk.api.netsuite.com",
    auth_type: "bearer_env",
    auth_env_key: "NETSUITE_ACCESS_TOKEN",
    comingSoon: true,
  },
  {
    key: "servicenow",
    name: "ServiceNow",
    provider: "servicenow",
    category: "Helpdesk",
    monogram: { text: "SN", bg: "#81B441", fg: "#0b1b0f" },
    blurb: "Incidents, users, CMDB (connector scaffold).",
    base_url_placeholder: "https://YOUR_INSTANCE.service-now.com",
    auth_type: "bearer_env",
    auth_env_key: "SERVICENOW_ACCESS_TOKEN",
    comingSoon: true,
  },
  {
    key: "shopify",
    name: "Shopify",
    provider: "shopify",
    category: "Commerce",
    icon: siShopify,
    blurb: "Orders, customers, fulfillment (connector scaffold).",
    base_url_placeholder: "https://YOUR_SHOP.myshopify.com",
    auth_type: "bearer_env",
    auth_env_key: "SHOPIFY_ACCESS_TOKEN",
    comingSoon: true,
  },
  {
    key: "stripe",
    name: "Stripe",
    provider: "stripe",
    category: "Payments",
    icon: siStripe,
    blurb: "Payments, customers, disputes (connector scaffold).",
    base_url_placeholder: "https://api.stripe.com",
    auth_type: "bearer_env",
    auth_env_key: "STRIPE_API_KEY",
    comingSoon: true,
  },
  {
    key: "custom",
    name: "Custom REST API",
    provider: "custom",
    category: "Other",
    blurb: "Bring your own API. Works with API key or bearer tokens.",
    presetKey: "custom",
    base_url_placeholder: "https://api.yourcompany.com",
    auth_type: "api_key_env",
    auth_env_key: "CUSTOM_API_KEY",
  },
]

function BrandIcon(props: {
  icon?: { title: string; hex: string; path: string }
  monogram?: { text: string; bg: string; fg: string }
  className?: string
}) {
  if (props.monogram) {
    return (
      <div className={props.className}>
        <div
          className="h-6 min-w-6 px-1 rounded-md flex items-center justify-center text-[10px] font-semibold"
          style={{ backgroundColor: props.monogram.bg, color: props.monogram.fg }}
        >
          {props.monogram.text}
        </div>
      </div>
    )
  }
  if (!props.icon) {
    return (
      <div className={props.className}>
        <PlugZap className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }
  const color = `#${props.icon.hex}`
  return (
    <div className={props.className}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-label={props.icon.title}>
        <path d={props.icon.path} fill={color} />
      </svg>
    </div>
  )
}

export default function IntegrationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const role = user?.role

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationListRow[]>([])

  const [presetKey, setPresetKey] = useState<(typeof PROVIDER_PRESETS)[number]["key"]>("salesforce")
  const preset = useMemo(() => PROVIDER_PRESETS.find((p) => p.key === presetKey)!, [presetKey])

  const [name, setName] = useState<string>(preset.name)
  const [provider, setProvider] = useState<string>(preset.provider)
  const [baseUrl, setBaseUrl] = useState("")
  const [authType, setAuthType] = useState<string>(preset.auth_type)
  const [authEnvKey, setAuthEnvKey] = useState<string>(preset.auth_env_key)
  const [authConfigJson, setAuthConfigJson] = useState("{}")

  const [testPath, setTestPath] = useState("/services/data/v59.0/")
  const [testResult, setTestResult] = useState<any>(null)
  const [marketplaceQuery, setMarketplaceQuery] = useState("")
  const [marketplaceCategory, setMarketplaceCategory] = useState<MarketplaceCategory | "All">("All")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (role !== "admin" && role !== "supervisor") {
      router.push("/inbox")
    }
  }, [user, role, router])

  useEffect(() => {
    // when preset changes, prefill fields
    setName(preset.name)
    setProvider(preset.provider)
    setAuthType(preset.auth_type)
    setAuthEnvKey(preset.auth_env_key)
    setBaseUrl("")
    setAuthConfigJson("{}")
    setTestPath(preset.provider === "salesforce" ? "/services/data/v59.0/" : "/")
  }, [preset])

  const marketplaceFiltered = useMemo(() => {
    const q = marketplaceQuery.trim().toLowerCase()
    return MARKETPLACE_APPS.filter((a) => {
      if (marketplaceCategory !== "All" && a.category !== marketplaceCategory) return false
      if (!q) return true
      return (a.name + " " + a.provider + " " + a.category + " " + a.blurb).toLowerCase().includes(q)
    })
  }, [marketplaceQuery, marketplaceCategory])

  const connectFromMarketplace = (app: MarketplaceApp) => {
    // If we have an internal presetKey, use it (keeps existing notes).
    if (app.presetKey) {
      setPresetKey(app.presetKey)
    } else {
      // Otherwise prefill fields directly.
      setName(app.name)
      setProvider(app.provider)
      setAuthType(app.auth_type)
      setAuthEnvKey(app.auth_env_key)
      setBaseUrl("")
      setAuthConfigJson("{}")
      setTestPath("/")
    }
    // Also fill base url placeholder as hint; user will paste actual value.
    setBaseUrl("")
    setError(null)
    setTestResult(null)
    // Scroll to create section
    document.getElementById("create-integration")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const fetchIntegrations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/integrations")
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setError(json?.error || `Failed to load integrations (HTTP ${res.status})`)
        setIntegrations([])
        return
      }
      setIntegrations(json.integrations || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const createIntegration = async () => {
    setCreating(true)
    setError(null)
    setTestResult(null)
    try {
      let auth_config: any = {}
      try {
        auth_config = authConfigJson.trim() ? JSON.parse(authConfigJson) : {}
      } catch {
        setError("auth_config JSON is invalid")
        return
      }

      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          provider,
          base_url: baseUrl,
          auth_type: authType,
          auth_env_key: authEnvKey,
          auth_config,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setError(json?.error || `Failed to create integration (HTTP ${res.status})`)
        return
      }
      await fetchIntegrations()
    } finally {
      setCreating(false)
    }
  }

  const testIntegration = async (integrationId: string) => {
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const res = await fetch("/api/integrations/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId, method: "GET", path: testPath }),
      })
      const json = await res.json().catch(() => ({}))
      setTestResult(json)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="h-full p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Create CRM/ERP connectors used by the <span className="font-mono">Fetch (CRM/ERP)</span> block. Secrets are never stored in DB.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/agent-builder")}>
          Back to Agent Builder
        </Button>
      </div>

      {error ? (
        <Card className="p-4 border-destructive/30">
          <div className="text-sm font-medium text-destructive">Error</div>
          <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{error}</div>
        </Card>
      ) : null}

      {/* Marketplace */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <div className="font-medium">Marketplace</div>
            <div className="text-xs text-muted-foreground">Pick an app to connect</div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-2 mt-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={marketplaceQuery}
              onChange={(e) => setMarketplaceQuery(e.target.value)}
              placeholder="Search Salesforce, SAP, Zendesk…"
              className="pl-9"
            />
          </div>
          <Select value={marketplaceCategory} onValueChange={(v) => setMarketplaceCategory(v as any)}>
            <SelectTrigger className="lg:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              <SelectItem value="CRM">CRM</SelectItem>
              <SelectItem value="Helpdesk">Helpdesk</SelectItem>
              <SelectItem value="ERP">ERP</SelectItem>
              <SelectItem value="Commerce">Commerce</SelectItem>
              <SelectItem value="Payments">Payments</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {marketplaceFiltered.map((app) => (
            <button
              key={app.key}
              onClick={() => connectFromMarketplace(app)}
              className="text-left rounded-xl border bg-background hover:bg-muted/30 transition-colors p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandIcon icon={app.icon} monogram={app.monogram} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{app.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.category}</div>
                  </div>
                </div>
                {app.comingSoon ? (
                  <div className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">Coming soon</div>
                ) : (
                  <div className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">Ready</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-3 line-clamp-2">{app.blurb}</div>
              <div className="text-xs text-muted-foreground mt-3 font-mono">{app.auth_env_key}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <Card id="create-integration" className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-muted-foreground" />
            <div className="font-medium">Create integration</div>
          </div>

          <div className="space-y-2">
            <Label>Preset</Label>
            <Select value={presetKey} onValueChange={(v) => setPresetKey(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">{preset.note}</div>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={preset.base_url_placeholder} />
          </div>
          <div className="space-y-2">
            <Label>Auth type</Label>
            <Select value={authType} onValueChange={(v) => setAuthType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bearer_env">Bearer token (env var)</SelectItem>
                <SelectItem value="api_key_env">API key header (env var)</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Secret env var key</Label>
            <Input value={authEnvKey || ""} onChange={(e) => setAuthEnvKey(e.target.value)} placeholder="SALESFORCE_ACCESS_TOKEN" />
            <div className="text-xs text-muted-foreground">
              You must set this in <span className="font-mono">.env.local</span> (server-side). We never store secrets in the DB.
            </div>
          </div>
          <div className="space-y-2">
            <Label>Auth config (JSON)</Label>
            <Textarea value={authConfigJson} onChange={(e) => setAuthConfigJson(e.target.value)} className="min-h-[90px]" />
            <div className="text-xs text-muted-foreground">
              For <span className="font-mono">api_key_env</span> you can set {"{ \"headerName\": \"X-API-Key\" }"}.
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={createIntegration} disabled={creating || !name.trim() || !provider.trim() || !baseUrl.trim()} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="font-medium">Existing integrations</div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-sm text-muted-foreground">No integrations yet.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label>Test path</Label>
                  <Input value={testPath} onChange={(e) => setTestPath(e.target.value)} placeholder="/services/data/v59.0/" />
                </div>
              </div>

              {integrations.map((i) => (
                <div key={i.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {i.provider} • {i.auth_type} • {i.base_url}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 font-mono">{i.id}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => testIntegration(i.id)} disabled={testing} className="gap-2">
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                      Test
                    </Button>
                  </div>
                </div>
              ))}

              {testResult ? (
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground mb-2">Test result</div>
                  <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(testResult, null, 2)}</pre>
                </Card>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

