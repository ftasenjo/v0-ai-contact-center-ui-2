"use client"

import { useState, useEffect } from "react"
import { ConversationList } from "@/components/inbox/conversation-list"
import { ConversationPanel } from "@/components/inbox/conversation-panel"
import { QueueSidebar } from "@/components/inbox/queue-sidebar"
import { ConversationDrawer } from "@/components/inbox/conversation-drawer"
import { IndustrySelector } from "@/components/inbox/industry-selector"
import { HandlingStatusFilter } from "@/components/inbox/handling-status-filter"
import { 
  sampleConversations, 
  getConversationsByIndustry,
  type Conversation,
  type Industry 
} from "@/lib/sample-data"
import { filterByHandlingStatus, getHandlingLabel, type HandlingStatus } from "@/lib/conversation-handling"

export default function InboxPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>("banking")
  const [selectedHandlingStatus, setSelectedHandlingStatus] = useState<HandlingStatus | 'all'>('all')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/conversations?industry=${selectedIndustry}`);
        
        // Check if response is OK
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        // Get response as text first to check if it's valid JSON
        const responseText = await response.text();
        console.log('API response text (first 500 chars):', responseText.substring(0, 500));
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError: any) {
          console.error('JSON parse error:', parseError);
          console.error('Response text:', responseText);
          throw new Error(`Failed to parse JSON: ${parseError.message}`);
        }
        
        if (data.success) {
          const allConversations = (data.conversations || []).map((conv: any) => ({
            ...conv,
            // Convert date strings back to Date objects
            lastMessageTime: new Date(conv.lastMessageTime),
            startTime: new Date(conv.startTime),
            sla: {
              ...conv.sla,
              deadline: new Date(conv.sla.deadline),
            },
            messages: conv.messages?.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })) || [],
          }));
          
          // Filter by handling status
          const filteredConversations = filterByHandlingStatus(allConversations, selectedHandlingStatus);
          setConversations(filteredConversations);
          
          // Update selected conversation
          if (filteredConversations.length > 0) {
            if (!selectedConversation || !filteredConversations.find(c => c.id === selectedConversation.id)) {
              setSelectedConversation(filteredConversations[0]);
            } else {
              // Update existing selected conversation
              const updated = filteredConversations.find(c => c.id === selectedConversation.id);
              if (updated) setSelectedConversation(updated);
            }
          } else {
            setSelectedConversation(null);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        // Fallback to demo data
        const demoConversations = getConversationsByIndustry(selectedIndustry);
        setConversations(demoConversations);
        setSelectedConversation(demoConversations[0] || null);
        setIsLoading(false);
      }
    };

    fetchConversations();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchConversations, 5000);

    return () => clearInterval(interval);
  }, [selectedIndustry, selectedHandlingStatus])

  return (
    <div className="flex h-full flex-col">
      {/* Industry Selector Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Conversations</h2>
            <p className="text-sm text-muted-foreground">
              {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'} 
              {` in ${selectedIndustry}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HandlingStatusFilter
              selectedStatus={selectedHandlingStatus}
              onStatusChange={setSelectedHandlingStatus}
            />
            <IndustrySelector 
              selectedIndustry={selectedIndustry} 
              onIndustryChange={setSelectedIndustry} 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Queue Sidebar */}
        <QueueSidebar />

      {/* Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation?.id}
        onSelect={(conv) => setSelectedConversation(conv)}
      />

      {/* Conversation Panel */}
      <ConversationPanel 
        conversation={selectedConversation} 
        onOpenDrawer={() => setDrawerOpen(true)}
        onDelete={(conversationId) => {
          // Remove from list and clear selection
          setConversations(conversations.filter(c => c.id !== conversationId));
          if (selectedConversation?.id === conversationId) {
            setSelectedConversation(null);
          }
        }}
      />

      {/* Customer Detail Drawer */}
      <ConversationDrawer conversation={selectedConversation} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </div>
  )
}
