"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Positive", value: 45, color: "oklch(0.65 0.18 145)" },
  { name: "Neutral", value: 35, color: "oklch(0.55 0.2 250)" },
  { name: "Negative", value: 20, color: "oklch(0.55 0.22 25)" },
]

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={14}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function SentimentChart() {
  return (
    <div className="flex items-center gap-8">
      <ResponsiveContainer width="60%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={120}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-2xl font-bold">{item.value}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
