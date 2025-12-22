import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

/**
 * GET /api/knowledge/search?q=query&category=category
 * Search knowledge base articles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const category = searchParams.get("category")

    if (!query && !category) {
      // Return all published articles if no query
      let q = supabaseServer
        .from("cc_knowledge_base")
        .select("*")
        .eq("status", "published")
        .order("priority", { ascending: false })
        .order("view_count", { ascending: false })
        .limit(50)

      if (category) {
        q = q.eq("category", category)
      }

      const { data, error } = await q

      if (error) {
        console.error("[knowledge/search] Failed to fetch articles:", error)
        // Check if table doesn't exist
        if (error.message?.includes("relation") && error.message?.includes("does not exist") ||
            error.message?.includes("does not exist") ||
            error.code === "42P01") {
          return NextResponse.json({ 
            error: "Knowledge base table not found. Please run migration 012_banking_knowledge_base.sql in your Supabase SQL Editor.",
            articles: [],
            needsMigration: true
          }, { status: 200 }) // Return 200 with empty array so UI doesn't break
        }
        return NextResponse.json({ error: error.message, articles: [] }, { status: 500 })
      }

      return NextResponse.json({ articles: data || [] })
    }

    // Use full-text search if query provided
    if (query) {
      const { data, error } = await supabaseServer.rpc("search_knowledge_base", {
        search_query: query,
      })

      if (error) {
        console.error("[knowledge/search] Search failed:", error)
        // Fallback to simple search
        let q = supabaseServer
          .from("cc_knowledge_base")
          .select("*")
          .eq("status", "published")
          .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)

        if (category) {
          q = q.eq("category", category)
        }

        const { data: fallbackData, error: fallbackError } = await q
          .order("priority", { ascending: false })
          .limit(20)

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 })
        }

        return NextResponse.json({ articles: fallbackData || [] })
      }

      // Fetch full article details for search results
      if (data && data.length > 0) {
        const ids = data.map((r: any) => r.id)
        const { data: articles, error: articlesError } = await supabaseServer
          .from("cc_knowledge_base")
          .select("*")
          .in("id", ids)
          .eq("status", "published")

        if (articlesError) {
          return NextResponse.json({ error: articlesError.message }, { status: 500 })
        }

        // Sort by relevance from search results
        const sortedArticles = articles?.sort((a, b) => {
          const aRelevance = data.find((r: any) => r.id === a.id)?.relevance || 0
          const bRelevance = data.find((r: any) => r.id === b.id)?.relevance || 0
          return bRelevance - aRelevance
        })

        return NextResponse.json({ articles: sortedArticles || [] })
      }
    }

    return NextResponse.json({ articles: [] })
  } catch (e: any) {
    console.error("[knowledge/search] Error:", e)
    return NextResponse.json({ error: e?.message || "Failed to search knowledge base" }, { status: 500 })
  }
}

/**
 * POST /api/knowledge/search
 * Track article view/helpfulness
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleId, action } = body // action: 'view', 'helpful', 'not_helpful'

    if (!articleId || !action) {
      return NextResponse.json({ error: "articleId and action required" }, { status: 400 })
    }

    // Fetch current article to get current counts
    const { data: article, error: fetchError } = await supabaseServer
      .from("cc_knowledge_base")
      .select("view_count, helpful_count, not_helpful_count")
      .eq("id", articleId)
      .single()

    if (fetchError || !article) {
      console.error("[knowledge/search] Failed to fetch article:", fetchError)
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      last_accessed_at: new Date().toISOString(),
    }

    if (action === "view") {
      updateData.view_count = (article.view_count || 0) + 1
    } else if (action === "helpful") {
      updateData.helpful_count = (article.helpful_count || 0) + 1
    } else if (action === "not_helpful") {
      updateData.not_helpful_count = (article.not_helpful_count || 0) + 1
    }

    // Update the article
    const { error: updateError } = await supabaseServer
      .from("cc_knowledge_base")
      .update(updateData)
      .eq("id", articleId)

    if (updateError) {
      console.error("[knowledge/search] Failed to update:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[knowledge/search] Error:", e)
    return NextResponse.json({ error: e?.message || "Failed to track action" }, { status: 500 })
  }
}

