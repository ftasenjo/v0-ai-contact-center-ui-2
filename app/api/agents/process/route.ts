import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/agents/langgraph-workflow';
import { getConversation } from '@/lib/store-adapter';

/**
 * Process a message through the LangGraph agent workflow
 * POST /api/agents/process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message, customerInfo } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'conversationId and message are required' },
        { status: 400 }
      );
    }

    // Get conversation to extract customer info if not provided
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const customer = customerInfo || {
      id: conversation.customer.id,
      name: conversation.customer.name,
      phone: conversation.customer.phone,
      email: conversation.customer.email,
      tier: conversation.customer.tier,
    };

    // Process message through LangGraph workflow
    const result = await processMessage(
      conversationId,
      message,
      customer
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



