"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { Shield, BarChart3, Users, Loader2, PhoneCall, Headphones } from "lucide-react"
import { MajlisConnectLogo } from "@/components/brand/majlis-connect-logo"

const roleInfo: Record<UserRole, { icon: React.ElementType; description: string }> = {
  agent: {
    icon: Headphones,
    description: "Handle conversations and customer requests",
  },
  call_agent: {
    icon: PhoneCall,
    description: "Handle inbound & outbound voice calls",
  },
  supervisor: {
    icon: Users,
    description: "Monitor team, coach agents, manage escalations",
  },
  admin: {
    icon: Shield,
    description: "Full system access, user and AI configuration",
  },
  analyst: {
    icon: BarChart3,
    description: "Analytics dashboards and reports",
  },
}

export default function LoginPage() {
  const [email, setEmail] = useState("demo@majlisconnect.com")
  const [password, setPassword] = useState("demo123")
  const [selectedRole, setSelectedRole] = useState<UserRole>("agent")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await login(email, password, selectedRole)
      router.push(selectedRole === "call_agent" ? "/call-agent" : selectedRole === "agent" ? "/chat-agent" : "/inbox")
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSSO = async () => {
    setIsLoading(true)
    try {
      await login("sso@majlisconnect.com", "", selectedRole)
      router.push(selectedRole === "call_agent" ? "/call-agent" : selectedRole === "agent" ? "/chat-agent" : "/inbox")
    } catch (error) {
      console.error("SSO login failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <MajlisConnectLogo className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Majlis Connect</span>
          </div>
          <p className="text-muted-foreground">AI-powered omnichannel engagement</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SSO Button */}
            <Button variant="outline" className="w-full h-11 bg-transparent" onClick={handleSSO} disabled={isLoading}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google SSO
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Demo Role Selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Demo Role</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                  className="grid grid-cols-2 gap-2"
                >
                  {(Object.keys(roleInfo) as UserRole[]).map((role) => {
                    const { icon: Icon, description } = roleInfo[role]
                    return (
                      <div key={role}>
                        <RadioGroupItem value={role} id={role} className="peer sr-only" />
                        <Label
                          htmlFor={role}
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                        >
                          <Icon className="mb-1.5 h-5 w-5" />
                          <span className="text-sm font-medium capitalize">{role}</span>
                          <span className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">
                            {description}
                          </span>
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Need help?{" "}
          <a href="#" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
