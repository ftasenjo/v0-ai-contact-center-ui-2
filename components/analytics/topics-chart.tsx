"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { topic: "Billing Inquiry", count: 324, percentage: 18 },
  { topic: "Technical Support", count: 287, percentage: 16 },
  { topic: "Account Setup", count: 245, percentage: 14 },
  { topic: "Password Reset", count: 198, percentage: 11 },
  { topic: "Service Outage", count: 176, percentage: 10 },
  { topic: "Upgrade Request", count: 156, percentage: 9 },
  { topic: "Refund Request", count: 134, percentage: 7 },
  { topic: "Feature Question", count: 112, percentage: 6 },
]

export function TopicsChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fill: "var(--muted-foreground)" }} />
        <YAxis dataKey="topic" type="category" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} width={90} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [`${value} conversations`, "Count"]}
        />
        <Bar dataKey="count" fill="oklch(0.55 0.2 250)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
