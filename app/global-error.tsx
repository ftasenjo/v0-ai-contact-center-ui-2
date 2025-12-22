"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Global application error:", error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Critical Error</CardTitle>
              </div>
              <CardDescription>
                A critical error occurred that prevented the application from loading. Please refresh the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={reset} variant="default" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload page
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = "/"
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

