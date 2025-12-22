"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw } from "lucide-react"

type CaseRow = {
  id: string
  type: string
  status: string
  priority: string
  bank_customer_id: string | null
  conversation_id: string | null
  case_number: string | null
  description: string | null
  amount: number | null
  currency: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolved_by: string | null
}

async function apiGet<T>(path: string, role: string | undefined): Promise<T> {
  const res = await fetch(path, {
    headers: { "x-user-role": role || "" },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export default function CaseDetailPage() {
  const router = useRouter()
  const { user } = useAuth()
  const role = user?.role
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = useState<CaseRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ case: CaseRow }>(`/api/cases/${id}`, role)
      setData(res.case)
    } catch (e: any) {
      setError(e?.message || "Failed to load case")
    } finally {
      setLoading(false)
    }
  }, [id, role])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/automation")} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Case detail</h1>
            <p className="text-muted-foreground font-mono text-xs">{id}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {user?.role !== "admin" && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            This page is admin-only. Switch your demo role to admin.
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{data.type}</Badge>
              <Badge variant="outline">{data.status}</Badge>
              <Badge variant={data.priority === "urgent" ? "destructive" : data.priority === "high" ? "secondary" : "outline"}>
                {data.priority}
              </Badge>
              {data.case_number && <span className="text-sm font-semibold">{data.case_number}</span>}
            </div>

            {data.description && <div className="text-sm text-muted-foreground">{data.description}</div>}

            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Created: <span className="font-mono">{new Date(data.created_at).toLocaleString()}</span>
              </span>
              <span>
                Updated: <span className="font-mono">{new Date(data.updated_at).toLocaleString()}</span>
              </span>
              {data.conversation_id && (
                <span>
                  Conversation: <span className="font-mono">{data.conversation_id}</span>
                </span>
              )}
              {data.bank_customer_id && (
                <span>
                  Customer: <span className="font-mono">{data.bank_customer_id}</span>
                </span>
              )}
              {data.amount != null && (
                <span>
                  Amount:{" "}
                  <span className="font-mono">
                    {data.currency || "USD"} {data.amount}
                  </span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


