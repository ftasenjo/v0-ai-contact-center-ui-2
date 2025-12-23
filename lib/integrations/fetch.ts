import { supabaseServer } from "@/lib/supabase-server"
import type { IntegrationFetchRequest, IntegrationFetchResponse, IntegrationRow } from "./types"

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "")
}

function normalizePath(path: string) {
  if (!path) return "/"
  return path.startsWith("/") ? path : `/${path}`
}

function toQueryString(query: Record<string, any> | undefined) {
  if (!query) return ""
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

function headersToObject(headers: Headers) {
  const out: Record<string, string> = {}
  headers.forEach((v, k) => {
    out[k] = v
  })
  return out
}

export async function integrationFetch(req: IntegrationFetchRequest): Promise<IntegrationFetchResponse> {
  const { data: integration, error } = await supabaseServer
    .from("cc_integrations")
    .select("id,name,provider,base_url,status,auth_type,auth_env_key,auth_config")
    .eq("id", req.integrationId)
    .single()

  if (error) throw new Error(error.message)
  if (!integration) throw new Error("Integration not found")

  const row = integration as unknown as IntegrationRow
  if (row.status !== "active") throw new Error("Integration is disabled")

  const url = `${normalizeBaseUrl(row.base_url)}${normalizePath(req.path)}${toQueryString(req.query)}`

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(req.headers || {}),
  }

  if (row.auth_type === "bearer_env") {
    if (!row.auth_env_key) throw new Error("Integration auth_env_key is missing")
    const token = process.env[row.auth_env_key]
    if (!token) throw new Error(`Missing integration secret env var: ${row.auth_env_key}`)
    headers.Authorization = `Bearer ${token}`
  } else if (row.auth_type === "api_key_env") {
    if (!row.auth_env_key) throw new Error("Integration auth_env_key is missing")
    const key = process.env[row.auth_env_key]
    if (!key) throw new Error(`Missing integration secret env var: ${row.auth_env_key}`)
    const headerName =
      typeof row.auth_config?.headerName === "string" && row.auth_config.headerName.trim()
        ? row.auth_config.headerName.trim()
        : "X-API-Key"
    headers[headerName] = key
  }

  const method = req.method || "GET"
  const init: RequestInit = { method, headers }

  if (req.bodyJson !== undefined && method !== "GET") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json"
    init.body = JSON.stringify(req.bodyJson)
  }

  const res = await fetch(url, init)
  const bodyText = await res.text()
  let bodyJson: any = null
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null
  } catch {
    bodyJson = null
  }

  return {
    status: res.status,
    ok: res.ok,
    headers: headersToObject(res.headers),
    bodyText,
    bodyJson,
  }
}

