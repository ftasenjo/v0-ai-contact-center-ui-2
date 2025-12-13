"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

const data = [
  { date: "Dec 6", voice: 145, chat: 234, email: 89, whatsapp: 67 },
  { date: "Dec 7", voice: 132, chat: 256, email: 102, whatsapp: 78 },
  { date: "Dec 8", voice: 167, chat: 289, email: 95, whatsapp: 82 },
  { date: "Dec 9", voice: 178, chat: 312, email: 87, whatsapp: 91 },
  { date: "Dec 10", voice: 156, chat: 278, email: 112, whatsapp: 73 },
  { date: "Dec 11", voice: 189, chat: 345, email: 98, whatsapp: 88 },
  { date: "Dec 12", voice: 201, chat: 367, email: 105, whatsapp: 95 },
]

export function VolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVoice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.55 0.2 250)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.55 0.2 250)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorChat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorEmail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.7 0.15 45)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.7 0.15 45)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorWhatsapp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
        <YAxis className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="voice"
          stackId="1"
          stroke="oklch(0.55 0.2 250)"
          fill="url(#colorVoice)"
          name="Voice"
        />
        <Area
          type="monotone"
          dataKey="chat"
          stackId="1"
          stroke="oklch(0.65 0.18 160)"
          fill="url(#colorChat)"
          name="Chat"
        />
        <Area
          type="monotone"
          dataKey="email"
          stackId="1"
          stroke="oklch(0.7 0.15 45)"
          fill="url(#colorEmail)"
          name="Email"
        />
        <Area
          type="monotone"
          dataKey="whatsapp"
          stackId="1"
          stroke="oklch(0.65 0.18 145)"
          fill="url(#colorWhatsapp)"
          name="WhatsApp"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
