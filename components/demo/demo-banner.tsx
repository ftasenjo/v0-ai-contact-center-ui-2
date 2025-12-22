"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { DEMO_CONFIG } from "@/lib/demo-config"

export function DemoBanner() {
  if (!DEMO_CONFIG.ui.showDemoBanner) {
    return null
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        {DEMO_CONFIG.ui.demoBannerMessage}
      </AlertDescription>
    </Alert>
  )
}

