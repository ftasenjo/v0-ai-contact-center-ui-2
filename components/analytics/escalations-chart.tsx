"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const data = [
  { reason: "Complex Issue", aiHandover: 89, agentEscalation: 34 },
  { reason: "Customer Request", aiHandover: 67, agentEscalation: 45 },
  { reason: "Sentiment Drop", aiHandover: 54, agentEscalation: 12 },
  { reason: "Low Confidence", aiHandover: 43, agentEscalation: 8 },
  { reason: "Billing Dispute", aiHandover: 32, agentEscalation: 28 },
  { reason: "VIP Customer", aiHandover: 28, agentEscalation: 15 },
]

export function EscalationsChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="reason" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} angle={-15} textAnchor="end" />
        <YAxis tick={{ fill: "var(--muted-foreground)" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="aiHandover" name="AI Handover" fill="oklch(0.55 0.2 250)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="agentEscalation" name="Agent Escalation" fill="oklch(0.7 0.15 45)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
