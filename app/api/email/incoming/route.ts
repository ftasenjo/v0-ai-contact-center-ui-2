import { NextRequest, NextResponse } from 'next/server';
import { storeMessage, createConversationFromMessage, getConversation, updateConversation } from '@/lib/store-adapter';

/**
 * Webhook endpoint for incoming emails
 * POST /api/email/incoming
 * 
 * This can be configured with SendGrid, Resend, or other email providers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle different email provider formats
    // SendGrid format
    const emailData = Array.isArray(body) ? body[0] : body;
    
    const from = emailData.from || emailData.sender_email || '';
    const to = emailData.to || emailData.recipient_email || '';
    const subject = emailData.subject || '';
    const textBody = emailData.text || emailData.body || '';
    const htmlBody = emailData.html || '';
    const messageId = emailData.message_id || emailData['message-id'] || `email-${Date.now()}`;

    console.log('Incoming email:', {
      from,
      to,
      subject,
      messageId,
    });

    // Store the incoming email
    const storedMessage = {
      messageSid: messageId,
      from: from.replace(/^.*<(.+)>.*$/, '$1') || from, // Extract email from "Name <email@domain.com>"
      to: to.replace(/^.*<(.+)>.*$/, '$1') || to,
      body: textBody || htmlBody.replace(/<[^>]*>/g, ''), // Strip HTML if no text
      channel: 'email' as const,
      status: 'received',
      timestamp: new Date(),
      direction: 'inbound' as const,
      customerEmail: from.replace(/^.*<(.+)>.*$/, '$1') || from,
    };

    await storeMessage(storedMessage);

    // Create conversation from email
    const conversationId = await createConversationFromMessage(storedMessage);

    // Process email through LangGraph AI agent workflow
    let aiResponse = 'Thank you for your email! Our team will get back to you shortly.';
    let intent: string | null = null;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let requiresEscalation = false;

    try {
      const useLangGraph = process.env.USE_LANGGRAPH !== 'false'; // Default to true

      if (useLangGraph && conversationId) {
        const { processMessage } = await import('@/lib/agents/langgraph-workflow');
        
        // Get conversation to extract customer info
        const conversation = await getConversation(conversationId);

        if (conversation) {
          // Process through LangGraph workflow
          const messageContent = `${subject}\n\n${textBody || htmlBody.replace(/<[^>]*>/g, '')}`;
          
          const result = await processMessage(
            conversationId,
            messageContent,
            {
              id: conversation.customer.id,
              name: conversation.customer.name,
              phone: conversation.customer.phone,
              email: conversation.customer.email,
              tier: conversation.customer.tier,
            }
          );

          aiResponse = result.response;
          intent = result.intent;
          sentiment = result.sentiment;
          requiresEscalation = result.requiresEscalation;

          // Store AI response as a message
          await storeMessage({
            messageSid: `ai-email-${Date.now()}`,
            from: to.replace(/^.*<(.+)>.*$/, '$1') || to,
            to: from.replace(/^.*<(.+)>.*$/, '$1') || from,
            body: aiResponse,
            channel: 'email' as const,
            status: 'sent',
            timestamp: new Date(),
            direction: 'outbound' as const,
            customerEmail: from.replace(/^.*<(.+)>.*$/, '$1') || from,
          });

          // Update conversation with AI insights
          await updateConversation(conversationId, {
            sentiment: result.sentiment,
            sentimentScore: result.sentiment === 'positive' ? 0.8 : result.sentiment === 'negative' ? 0.2 : 0.5,
            topic: result.intent || subject || conversation.topic,
            priority: result.requiresEscalation ? 'high' : conversation.priority,
            escalationRisk: result.requiresEscalation,
            lastMessage: aiResponse,
            lastMessageTime: new Date(),
          });

          console.log('✅ LangGraph processed email:', {
            intent,
            sentiment,
            requiresEscalation,
          });

          // Send auto-reply email (if configured)
          const sendAutoReply = process.env.EMAIL_AUTO_REPLY !== 'false';
          if (sendAutoReply) {
            try {
              const { sendEmail } = await import('@/lib/twilio-client');
              await sendEmail({
                to: from.replace(/^.*<(.+)>.*$/, '$1') || from,
                subject: `Re: ${subject}`,
                body: aiResponse,
              });
              console.log('✅ Auto-reply email sent');
            } catch (emailError: any) {
              console.error('Error sending auto-reply email:', emailError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error processing email through LangGraph:', error);
      // Fallback to default response if LangGraph fails
      aiResponse = 'Thank you for your email! Our team will get back to you shortly.';
    }

    return NextResponse.json({
      success: true,
      message: 'Email processed',
      aiResponse,
      intent,
      sentiment,
      requiresEscalation,
    });
  } catch (error: any) {
    console.error('Error handling incoming email:', error);
    return NextResponse.json(
      {
        error: 'Failed to process email',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



