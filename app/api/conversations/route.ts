import { NextRequest, NextResponse } from 'next/server';
import { getAllConversations } from '@/lib/store-adapter';
import { getConversationsByIndustry, type Industry } from '@/lib/sample-data';

/**
 * API endpoint to get all conversations
 * GET /api/conversations?industry=healthcare
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry') as Industry | null;

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    // Get stored conversations from data store (Supabase or in-memory)
    // If using Supabase and industry is specified, filter at database level
    // If industry is null/undefined, get all conversations (including those without industry)
    const storedConversations = await getAllConversations(industry || undefined);

    // If using Supabase, we already have the data from database (including demo data seeded)
    // If using in-memory, merge with demo data
    let conversations = storedConversations;
    
    if (!useSupabase) {
      // Only merge demo data if NOT using Supabase (in-memory mode)
      if (industry) {
        const industryConversations = getConversationsByIndustry(industry);
        conversations = [...storedConversations, ...industryConversations];
      } else {
        // Include all industry demo data for "all" view
        const allIndustryConversations = getConversationsByIndustry('healthcare')
          .concat(getConversationsByIndustry('ecommerce'))
          .concat(getConversationsByIndustry('banking'))
          .concat(getConversationsByIndustry('saas'));
        conversations = [...storedConversations, ...allIndustryConversations];
      }
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length,
      storedCount: storedConversations.length,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch conversations',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

