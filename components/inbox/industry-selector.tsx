"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Building2, ShoppingCart, CreditCard, Code } from "lucide-react"
import { Industry } from "@/lib/sample-data"

interface IndustrySelectorProps {
  selectedIndustry: Industry
  onIndustryChange: (industry: Industry) => void
}

const industries = [
  {
    id: "healthcare" as Industry,
    label: "Healthcare",
    icon: Building2,
    color: "bg-blue-500",
  },
  {
    id: "ecommerce" as Industry,
    label: "E-commerce",
    icon: ShoppingCart,
    color: "bg-green-500",
  },
  {
    id: "banking" as Industry,
    label: "Banking",
    icon: CreditCard,
    color: "bg-purple-500",
  },
  {
    id: "saas" as Industry,
    label: "SaaS/Tech",
    icon: Code,
    color: "bg-orange-500",
  },
]

export function IndustrySelector({ selectedIndustry, onIndustryChange }: IndustrySelectorProps) {
  const selected = industries.find((ind) => ind.id === selectedIndustry) || industries[0]
  const Icon = selected.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Icon className="h-4 w-4" />
          <span>{selected.label}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {industries.map((industry) => {
          const IndustryIcon = industry.icon
          return (
            <DropdownMenuItem
              key={industry.id}
              onClick={() => onIndustryChange(industry.id)}
              className="gap-2 cursor-pointer"
            >
              <IndustryIcon className="h-4 w-4" />
              <span>{industry.label}</span>
              {selectedIndustry === industry.id && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

