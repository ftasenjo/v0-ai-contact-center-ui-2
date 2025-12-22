"use client"

import { Phone, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ChannelSelectionProps {
  onSelectVoice: () => void
  onSelectChat: () => void
}

export function ChannelSelection({ onSelectVoice, onSelectChat }: ChannelSelectionProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-foreground">Agent Desktop</h1>
          <p className="text-lg text-muted-foreground">Select your channel to begin</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer hover:border-primary transition-all duration-200 group"
            onClick={onSelectVoice}
          >
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Phone className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-foreground">Voice Channel</h2>
              <p className="text-muted-foreground">Handle incoming voice calls with real-time assistance</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-all duration-200 group"
            onClick={onSelectChat}
          >
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-foreground">Chat Channel</h2>
              <p className="text-muted-foreground">Manage text conversations with customers</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
