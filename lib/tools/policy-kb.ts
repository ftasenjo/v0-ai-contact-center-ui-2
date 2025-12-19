/**
 * Policy/Knowledge Base Tool
 * 
 * Provides access to banking policies, FAQs, and knowledge base.
 * Connected to cc_knowledge_base database table.
 */

export interface PolicyKBResult {
  answer: string;
  sources?: string[];
  articleId?: string;
  title?: string;
}

/**
 * Search the policy/knowledge base for information
 * 
 * @param query - The customer's question or query
 * @returns Answer and optional sources
 */
export async function searchPolicyKB(query: string): Promise<PolicyKBResult> {
  try {
    // Try to search the database knowledge base
    const { supabaseServer } = await import("@/lib/supabase-server")
    
    const { data, error } = await supabaseServer.rpc("search_knowledge_base", {
      search_query: query,
    })

    if (!error && data && data.length > 0) {
      const topResult = data[0]
      // Fetch full article content
      const { data: article } = await supabaseServer
        .from("cc_knowledge_base")
        .select("content, title, summary")
        .eq("id", topResult.id)
        .single()

      if (article) {
        // Track view
        await supabaseServer
          .from("cc_knowledge_base")
          .update({
            view_count: (topResult.view_count || 0) + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq("id", topResult.id)

        return {
          answer: article.content || article.summary || "",
          sources: [`${article.title} (KB Article)`],
          articleId: topResult.id,
          title: article.title,
        }
      }
    }
  } catch (error) {
    console.warn("[policy-kb] Database search failed, using fallback:", error)
  }

  // Fallback to keyword-based responses if database search fails
  const normalizedQuery = query.toLowerCase();
  
  // Simple keyword-based responses (will be replaced with RAG later)
  if (normalizedQuery.includes("hours") || normalizedQuery.includes("open") || normalizedQuery.includes("close") || normalizedQuery.includes("branch")) {
    return {
      answer: "Our branches are open Monday through Friday from 9:00 AM to 5:00 PM, and Saturday from 9:00 AM to 1:00 PM. We're closed on Sundays and federal holidays. You can also access many services 24/7 through our online banking or mobile app.",
      sources: ["branch_hours_policy.pdf"],
    };
  }
  
  if (normalizedQuery.includes("delivery") || normalizedQuery.includes("arrive") || normalizedQuery.includes("card replacement") || normalizedQuery.includes("new card")) {
    return {
      answer: "New and replacement cards typically arrive within 7-10 business days via standard mail. For urgent requests, we offer expedited shipping (2-3 business days) for a $15 fee. You'll receive tracking information once your card ships.",
      sources: ["card_delivery_policy.pdf"],
    };
  }
  
  if (normalizedQuery.includes("fee") || normalizedQuery.includes("charges") || normalizedQuery.includes("pricing") || normalizedQuery.includes("cost")) {
    return {
      answer: "Our standard checking account has no monthly maintenance fee if you maintain a minimum balance of $1,500 or have at least one direct deposit per month. ATM fees are waived at our network ATMs. Overdraft fees are $35 per transaction. For a complete fee schedule, visit our website or ask for a detailed breakdown.",
      sources: ["fee_schedule.pdf"],
    };
  }
  
  if (normalizedQuery.includes("dispute") || normalizedQuery.includes("chargeback") || normalizedQuery.includes("refund process")) {
    return {
      answer: "To dispute a transaction, contact us within 60 days of the statement date. We'll investigate and may issue a temporary credit while we review. The process typically takes 10-45 business days. You'll need to provide details about the transaction and why you're disputing it.",
      sources: ["dispute_process.pdf"],
    };
  }
  
  if (normalizedQuery.includes("fraud") || normalizedQuery.includes("scam") || normalizedQuery.includes("unauthorised") || normalizedQuery.includes("unauthorized")) {
    return {
      answer: "If you notice unauthorized transactions, contact us immediately. We'll freeze your card and investigate. You're protected by our zero-liability fraud policy. We'll work with you to resolve the issue and issue a replacement card if needed. For your security, never share your card details, PIN, or online banking credentials.",
      sources: ["fraud_protection_policy.pdf"],
    };
  }
  
  // Default general response
  return {
    answer:
      "I can help with general banking questions like fees, card delivery timelines, fraud/dispute steps, and branch hours. " +
      "Ask me what you need and I'll explain the process.",
    sources: [],
  };
}

