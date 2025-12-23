export type IntegrationAuthType = "none" | "bearer_env" | "api_key_env"

export type IntegrationProvider =
  | "salesforce"
  | "hubspot"
  | "zendesk"
  | "dynamics"
  | "sap"
  | "netsuite"
  | "custom"

export type IntegrationRow = {
  id: string
  name: string
  provider: IntegrationProvider | string
  base_url: string
  status: "active" | "disabled"
  auth_type: IntegrationAuthType
  auth_env_key: string | null
  auth_config: Record<string, any> | null
}

export type IntegrationFetchRequest = {
  integrationId: string
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  bodyJson?: any
}

export type IntegrationFetchResponse = {
  status: number
  ok: boolean
  headers: Record<string, string>
  bodyText: string
  bodyJson: any | null
}

