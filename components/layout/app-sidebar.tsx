"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Inbox,
  BarChart3,
  Settings,
  Headphones,
  PhoneCall,
  Award,
  Users,
  ChevronDown,
  LogOut,
  FileText,
  BookOpen,
  Zap,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { canAccessRoute } from "@/lib/permissions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Live Console", href: "/live-console", icon: PhoneCall },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Quality", href: "/quality", icon: Award },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Workflows", href: "/workflows", icon: Zap },
  { name: "Automation", href: "/automation", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
]

const roleColors: Record<UserRole, string> = {
  agent: "bg-blue-500/10 text-blue-600",
  supervisor: "bg-amber-500/10 text-amber-600",
  admin: "bg-red-500/10 text-red-600",
  analyst: "bg-emerald-500/10 text-emerald-600",
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, switchRole, logout } = useAuth()

  if (!user) return null

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link href="/inbox" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Headphones className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">OmniCare</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const hasAccess = canAccessRoute(user.role, item.href)

          if (!hasAccess) return null

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              {item.name === "Inbox" && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  12
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <Badge variant="outline" className={cn("text-[10px] capitalize px-1.5 py-0", roleColors[user.role])}>
                  {user.role}
                </Badge>
              </div>
              <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Users className="mr-2 h-4 w-4" />
                Switch Role (Demo)
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(["agent", "supervisor", "admin", "analyst"] as UserRole[]).map((role) => (
                  <DropdownMenuItem key={role} onClick={() => switchRole(role)} className="capitalize">
                    <Badge variant="outline" className={cn("mr-2", roleColors[role])}>
                      {role.slice(0, 1).toUpperCase()}
                    </Badge>
                    {role}
                    {user.role === role && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
