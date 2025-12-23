import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * GET /api/agents/performance
 * Fetch agent performance metrics from conversations and calls
 */
export async function GET(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabaseServer
      .from("agents")
      .select("*")
      .order("name")

    if (agentsError) {
      console.error("[agents/performance] Failed to fetch agents:", agentsError)
      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ agents: [] })
    }

    // Get conversations assigned to agents (from both tables)
    const { data: conversations, error: convError } = await supabaseServer
      .from("conversations")
      .select("id, assigned_to, status, priority, sentiment, sentiment_score, start_time, last_message_time, channel")
      .not("assigned_to", "is", null)

    // Also get from cc_conversations
    const { data: ccConversations, error: ccConvError } = await supabaseServer
      .from("cc_conversations")
      .select("id, assigned_agent_id, status, priority, sentiment, opened_at, channel")
      .not("assigned_agent_id", "is", null)

    // Get call analysis data for quality scores
    const { data: callAnalysis, error: analysisError } = await supabaseServer
      .from("cc_call_analysis")
      .select("conversation_id, quality_score, issue_resolved, escalation_required, customer_frustrated")

    // Get calls data for handle time
    const { data: calls, error: callsError } = await supabaseServer
      .from("calls")
      .select("agent_id, duration, start_time, end_time, sentiment, sentiment_score")

    // Calculate performance metrics for each agent
    const agentPerformance = agents.map((agent) => {
      const agentId = agent.id

      // Get conversations for this agent (from both tables)
      const agentConversations = [
        ...(conversations || []).filter((c) => c.assigned_to === agentId),
        ...(ccConversations || []).filter((c) => c.assigned_agent_id === agentId),
      ]

      // Get calls for this agent
      const agentCalls = (calls || []).filter((c) => c.agent_id === agentId)

      // Calculate metrics
      const totalConversations = agentConversations.length
      const resolvedConversations = agentConversations.filter(
        (c) => c.status === "resolved" || c.status === "closed"
      ).length
      const resolutionRate = totalConversations > 0 ? (resolvedConversations / totalConversations) * 100 : 0

      // Calculate average handle time from calls
      const callDurations = agentCalls
        .filter((c) => c.duration && c.duration > 0)
        .map((c) => c.duration || 0)
      const avgHandleTime =
        callDurations.length > 0
          ? callDurations.reduce((sum, d) => sum + d, 0) / callDurations.length
          : agent.avg_handle_time || 0

      // Calculate sentiment scores
      const sentimentScores = [
        ...agentConversations
          .map((c: any) => ("sentiment_score" in c ? c.sentiment_score : null))
          .filter((s: any) => typeof s === "number" && !Number.isNaN(s)),
        ...agentCalls
          .map((c: any) => c.sentiment_score ?? null)
          .filter((s: any) => typeof s === "number" && !Number.isNaN(s)),
      ] as number[]
      const avgSentimentScore =
        sentimentScores.length > 0
          ? sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length
          : 0.5

      // Calculate positive/negative sentiment counts
      const positiveCount = [
        ...agentConversations.filter((c) => c.sentiment === "positive"),
        ...agentCalls.filter((c) => c.sentiment === "positive"),
      ].length
      const negativeCount = [
        ...agentConversations.filter((c) => c.sentiment === "negative"),
        ...agentCalls.filter((c) => c.sentiment === "negative"),
      ].length

      // Get quality scores from call analysis
      const agentConversationIds = agentConversations.map((c) => c.id)
      const agentCallAnalysis = (callAnalysis || []).filter((a) =>
        agentConversationIds.includes(a.conversation_id)
      )
      const qualityScores = agentCallAnalysis
        .filter((a) => a.quality_score !== null)
        .map((a) => a.quality_score || 0)
      const avgQualityScore =
        qualityScores.length > 0
          ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
          : null

      // Calculate escalation rate
      const escalationCount = agentCallAnalysis.filter((a) => a.escalation_required === true).length
      const escalationRate =
        agentCallAnalysis.length > 0 ? (escalationCount / agentCallAnalysis.length) * 100 : 0

      // Calculate issue resolution rate
      const resolvedIssues = agentCallAnalysis.filter((a) => a.issue_resolved === true).length
      const issueResolutionRate =
        agentCallAnalysis.length > 0 ? (resolvedIssues / agentCallAnalysis.length) * 100 : 0

      // Calculate customer frustration rate
      const frustratedCount = agentCallAnalysis.filter((a) => a.customer_frustrated === true).length
      const frustrationRate =
        agentCallAnalysis.length > 0 ? (frustratedCount / agentCallAnalysis.length) * 100 : 0

      // Calculate channel distribution
      const channelCounts = {
        voice: agentConversations.filter((c) => c.channel === "voice").length,
        chat: agentConversations.filter((c) => c.channel === "chat").length,
        email: agentConversations.filter((c) => c.channel === "email").length,
        whatsapp: agentConversations.filter((c) => c.channel === "whatsapp").length,
      }

      // Calculate priority distribution
      const priorityCounts = {
        urgent: agentConversations.filter((c) => c.priority === "urgent").length,
        high: agentConversations.filter((c) => c.priority === "high").length,
        medium: agentConversations.filter((c) => c.priority === "medium").length,
        low: agentConversations.filter((c) => c.priority === "low").length,
      }

      // Calculate overall performance score (weighted)
      const performanceScore =
        (resolutionRate * 0.3 +
          (avgQualityScore || 0) * 10 * 0.3 +
          avgSentimentScore * 100 * 0.2 +
          (100 - escalationRate) * 0.1 +
          issueResolutionRate * 0.1) /
        1.0

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar,
        status: agent.status,
        role: agent.role,
        // Core metrics
        totalConversations,
        resolvedConversations,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        avgHandleTime: Math.round(avgHandleTime),
        avgHandleTimeFormatted: formatDuration(avgHandleTime),
        // Quality metrics
        avgQualityScore: avgQualityScore ? Math.round(avgQualityScore * 10) / 10 : null,
        csat: agent.csat || Math.round(avgSentimentScore * 100) / 100,
        // Sentiment metrics
        avgSentimentScore: Math.round(avgSentimentScore * 100) / 100,
        positiveCount,
        negativeCount,
        // Operational metrics
        escalationRate: Math.round(escalationRate * 10) / 10,
        issueResolutionRate: Math.round(issueResolutionRate * 10) / 10,
        frustrationRate: Math.round(frustrationRate * 10) / 10,
        // Distribution
        channelCounts,
        priorityCounts,
        // Overall score
        performanceScore: Math.round(performanceScore * 10) / 10,
        // Active conversations
        activeConversations: agent.active_conversations || 0,
      }
    })

    // Sort by performance score (descending)
    agentPerformance.sort((a, b) => b.performanceScore - a.performanceScore)

    return NextResponse.json({ agents: agentPerformance })
  } catch (e: any) {
    console.error("[agents/performance] Error:", e)
    return NextResponse.json({ error: e?.message || "Failed to fetch agent performance" }, { status: 500 })
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return "0m"
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${remainingSeconds}s`
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

