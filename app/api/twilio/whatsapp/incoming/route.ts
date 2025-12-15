import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * Twilio webhook endpoint for incoming WhatsApp messages
 * POST /api/twilio/whatsapp/incoming
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string; // WhatsApp number (e.g., whatsapp:+1234567890)
    const to = formData.get('To') as string; // Your Twilio WhatsApp number
    const body = formData.get('Body') as string; // Message content
    const messageSid = formData.get('MessageSid') as string;
    const numMedia = formData.get('NumMedia') as string;

    console.log('Incoming WhatsApp message:', {
      from,
      to,
      body,
      messageSid,
      numMedia,
    });

    // Store the incoming message
    const { storeMessage, createConversationFromMessage } = await import('@/lib/store-adapter');
    
    // Handle media attachments if any
    const mediaUrls: string[] = [];
    if (parseInt(numMedia) > 0) {
      for (let i = 0; i < parseInt(numMedia); i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string;
        if (mediaUrl) mediaUrls.push(mediaUrl);
      }
    }

    // Store the message
    const storedMessage = {
      messageSid,
      from: from.replace('whatsapp:', ''),
      to: to.replace('whatsapp:', ''),
      body,
      channel: 'whatsapp' as const,
      status: 'received',
      timestamp: new Date(),
      direction: 'inbound' as const,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    };
    
    await storeMessage(storedMessage);
    
    // Create conversation from message
    let conversationId: string | null = null;
    try {
      conversationId = await createConversationFromMessage(storedMessage);
      console.log('✅ Conversation created:', conversationId);
    } catch (error: any) {
      console.error('❌ Error creating conversation:', error);
      console.error('Error details:', error?.message, error?.stack);
    }
    
    if (!conversationId) {
      console.error('Failed to create conversation from message');
      // Still send a response even if conversation creation failed
      const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
      twiml.message('Thank you for your message! Our team will get back to you shortly.');
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Process message through LangGraph AI agent workflow
    let aiResponse = 'Thank you for your message! Our team will get back to you shortly.';
    let intent: string | null = null;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let requiresEscalation = false;

    try {
      const useLangGraph = process.env.USE_LANGGRAPH !== 'false'; // Default to true
      console.log('🔧 LangGraph enabled:', useLangGraph, 'conversationId:', conversationId);
      
      if (useLangGraph && conversationId) {
        console.log('📦 Importing LangGraph modules...');
        const { processMessage } = await import('@/lib/agents/langgraph-workflow');
        const { getConversation, updateConversation } = await import('@/lib/store-adapter');
        console.log('✅ Modules imported');
        
        // Get conversation to extract customer info
        console.log('🔍 Getting conversation:', conversationId);
        const conversation = await getConversation(conversationId);
        console.log('📋 Conversation retrieved:', conversation ? 'Found' : 'Not found');
        
        if (conversation) {
          console.log('👤 Customer info:', {
            id: conversation.customer.id,
            name: conversation.customer.name,
            phone: conversation.customer.phone,
          });
          
          // Process through LangGraph workflow
          console.log('🚀 Calling processMessage...');
          const result = await processMessage(
            conversationId,
            body,
            {
              id: conversation.customer.id,
              name: conversation.customer.name,
              phone: conversation.customer.phone,
              email: conversation.customer.email,
              tier: conversation.customer.tier,
            }
          );
          console.log('✅ processMessage completed:', { 
            responseLength: result.response.length,
            intent: result.intent,
            sentiment: result.sentiment,
          });

          aiResponse = result.response;
          intent = result.intent;
          sentiment = result.sentiment;
          requiresEscalation = result.requiresEscalation;

          // Store AI response as a message in channel_messages
          const aiMessageSid = `ai-${Date.now()}`;
          const { storeMessage: storeMsg } = await import('@/lib/store-adapter');
          await storeMsg({
            messageSid: aiMessageSid,
            from: to.replace('whatsapp:', ''),
            to: from.replace('whatsapp:', ''),
            body: aiResponse,
            channel: 'whatsapp' as const,
            status: 'sent',
            timestamp: new Date(),
            direction: 'outbound' as const,
          });

          // Link channel_message to conversation
          const { supabase } = await import('@/lib/supabase');
          await supabase
            .from('channel_messages')
            .update({ conversation_id: conversationId })
            .eq('message_sid', aiMessageSid);

          // Also store AI response in messages table so it appears in conversation panel
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              type: 'ai',
              content: aiResponse,
              timestamp: new Date().toISOString(),
              confidence: conversation.aiConfidence || 0.85,
            });

          // Update conversation with AI insights
          // If escalation is needed, mark for human handling
          await updateConversation(conversationId, {
            sentiment: result.sentiment,
            sentimentScore: result.sentiment === 'positive' ? 0.8 : result.sentiment === 'negative' ? 0.2 : 0.5,
            topic: result.intent || conversation.topic,
            priority: result.requiresEscalation ? 'high' : conversation.priority,
            escalationRisk: result.requiresEscalation,
            status: result.requiresEscalation ? 'escalated' : conversation.status,
            lastMessage: aiResponse,
            lastMessageTime: new Date(),
          });

          console.log('✅ LangGraph processed message:', {
            intent,
            sentiment,
            requiresEscalation,
          });
        } else {
          console.warn('⚠️ Conversation not found, skipping LangGraph processing');
        }
      } else {
        console.log('⚠️ LangGraph disabled or no conversationId');
      }
    } catch (error: any) {
      console.error('❌ Error processing message through LangGraph:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      // Fallback to default response if LangGraph fails
      aiResponse = 'Thank you for your message! Our team will get back to you shortly. For urgent matters, please call us.';
    }

    // Send AI-generated response via WhatsApp
    const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
    twiml.message(aiResponse);

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling incoming WhatsApp message:', error);
    return new NextResponse('Error processing WhatsApp message', { status: 500 });
  }
}

