import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/agents/langgraph-workflow';

/**
 * Process a message through the LangGraph agent workflow
 * POST /api/agents/process
 * 
 * This endpoint is idempotent - can be called multiple times with same messageId
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message, messageId, customerInfo, channel, metadata } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'conversationId and message are required' },
        { status: 400 }
      );
    }

    // Try to get conversation from banking store first
    let conversation = null;
    let customer = customerInfo;

    try {
      const { getBankingConversation } = await import('@/lib/banking-store');
      conversation = await getBankingConversation(conversationId);
    } catch (error) {
      // Fallback to old store adapter
      try {
        const { getConversation } = await import('@/lib/store-adapter');
        conversation = await getConversation(conversationId);
      } catch (e) {
        console.warn('Could not fetch conversation from either store');
      }
    }

    // Extract customer info
    if (!customer && conversation) {
      customer = {
        id: conversation.customer.id,
        name: conversation.customer.name,
        phone: conversation.customer.phone,
        email: conversation.customer.email,
        tier: conversation.customer.tier,
      };
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer info not found' },
        { status: 404 }
      );
    }

    // Process message through LangGraph workflow
    // This is idempotent - processMessage handles duplicate calls gracefully
    // Step 4: Pass channel/address metadata and messageId for comprehensive state
    const result = await processMessage(
      conversationId,
      message,
      customer,
      {
        channel: channel as 'whatsapp' | 'email' | 'voice' | 'sms',
        fromAddress: metadata?.fromAddress,
        messageId: messageId || `msg-${Date.now()}`,
      }
    );

    return NextResponse.json({
      success: true,
      response: result.response,
      intent: result.intent,
      sentiment: result.sentiment,
      requiresEscalation: result.requiresEscalation,
      resolved: result.resolved,
    });
  } catch (error: any) {
    console.error('Error processing message through agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



