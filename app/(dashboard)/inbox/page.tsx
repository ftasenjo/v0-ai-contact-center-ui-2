"use client"

import { useState } from "react"
import { ConversationList } from "@/components/inbox/conversation-list"
import { ConversationPanel } from "@/components/inbox/conversation-panel"
import { QueueSidebar } from "@/components/inbox/queue-sidebar"
import { ConversationDrawer } from "@/components/inbox/conversation-drawer"
import { sampleConversations, type Conversation } from "@/lib/sample-data"

export default function InboxPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(sampleConversations[0])
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-full">
      {/* Queue Sidebar */}
      <QueueSidebar />

      {/* Conversation List */}
      <ConversationList
        conversations={sampleConversations}
        selectedId={selectedConversation?.id}
        onSelect={(conv) => setSelectedConversation(conv)}
      />

      {/* Conversation Panel */}
      <ConversationPanel conversation={selectedConversation} onOpenDrawer={() => setDrawerOpen(true)} />

      {/* Customer Detail Drawer */}
      <ConversationDrawer conversation={selectedConversation} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
