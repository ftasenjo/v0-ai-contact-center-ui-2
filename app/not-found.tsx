import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">404 - Page Not Found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>You might be looking for:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <Link href="/inbox" className="text-primary hover:underline">
                  Inbox
                </Link>
                {" "}- View conversations
              </li>
              <li>
                <Link href="/automation" className="text-primary hover:underline">
                  Automation Center
                </Link>
                {" "}- Manage automations
              </li>
              <li>
                <Link href="/knowledge" className="text-primary hover:underline">
                  Knowledge Base
                </Link>
                {" "}- Browse articles
              </li>
              <li>
                <Link href="/quality" className="text-primary hover:underline">
                  Quality Dashboard
                </Link>
                {" "}- View agent performance
              </li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="default" className="flex-1">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/inbox">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to inbox
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

