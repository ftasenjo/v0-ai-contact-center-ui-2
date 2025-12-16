"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Bot, AlertTriangle, UserCheck, Filter } from "lucide-react"
import { HandlingStatus, getHandlingLabel, getHandlingColor } from "@/lib/conversation-handling"

interface HandlingStatusFilterProps {
  selectedStatus: HandlingStatus | 'all'
  onStatusChange: (status: HandlingStatus | 'all') => void
}

export function HandlingStatusFilter({ selectedStatus, onStatusChange }: HandlingStatusFilterProps) {
  const statuses: Array<{ value: HandlingStatus | 'all'; label: string; icon: typeof Bot }> = [
    { value: 'all', label: 'All Conversations', icon: Filter },
    { value: 'ai-handled', label: 'AI Handled', icon: Bot },
    { value: 'human-handling-needed', label: 'Needs Human', icon: AlertTriangle },
    { value: 'human-handled', label: 'Human Handled', icon: UserCheck },
  ]

  const selectedStatusData = statuses.find(s => s.value === selectedStatus) || statuses[0]
  const SelectedIcon = selectedStatusData.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SelectedIcon className="h-4 w-4" />
          <span>{selectedStatusData.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statuses.map((status) => {
          const StatusIcon = status.icon
          return (
            <DropdownMenuItem
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className="gap-2"
            >
              <StatusIcon className="h-4 w-4" />
              <span>{status.label}</span>
              {selectedStatus === status.value && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}



