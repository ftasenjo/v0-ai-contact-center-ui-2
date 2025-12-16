/**
 * LangChain tools for agent actions
 * These tools allow the AI agent to perform actions during conversations
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getConversation, updateConversation } from "@/lib/store-adapter";
import { sendEmail } from "@/lib/twilio-client";
import { supabase } from "@/lib/supabase";

/**
 * Tool: Look up customer information
 */
export const lookupCustomerTool = new DynamicStructuredTool({
  name: "lookup_customer",
  description: "Look up customer information by phone number or email",
  schema: z.object({
    identifier: z.string().describe("Phone number or email address"),
  }),
  func: async ({ identifier }) => {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .or(`phone.eq.${identifier},email.eq.${identifier}`)
        .single();

      if (!customer) {
        return `Customer not found with identifier: ${identifier}`;
      }

      return JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        tier: customer.tier,
        company: customer.company,
      });
    } catch (error: any) {
      return `Error looking up customer: ${error.message}`;
    }
  },
});

/**
 * Tool: Create support ticket
 */
export const createTicketTool = new DynamicStructuredTool({
  name: "create_support_ticket",
  description: "Create a support ticket for the customer's issue",
  schema: z.object({
    conversationId: z.string().describe("Conversation ID"),
    title: z.string().describe("Ticket title"),
    description: z.string().describe("Ticket description"),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).describe("Ticket priority"),
  }),
  func: async ({ conversationId, title, description, priority }) => {
    try {
      // In a real implementation, you'd create a ticket in your ticketing system
      // For now, we'll update the conversation with ticket info
      await updateConversation(conversationId, {
        topic: title,
        priority,
        tags: ['ticket-created'],
      });

      return `Support ticket created successfully. Ticket ID: ${conversationId}. Priority: ${priority}`;
    } catch (error: any) {
      return `Error creating ticket: ${error.message}`;
    }
  },
});

/**
 * Tool: Check order status
 */
export const checkOrderStatusTool = new DynamicStructuredTool({
  name: "check_order_status",
  description: "Check the status of a customer's order",
  schema: z.object({
    orderNumber: z.string().describe("Order number or ID"),
  }),
  func: async ({ orderNumber }) => {
    try {
      // In a real implementation, you'd query your order system
      // For now, return a mock response
      return `Order ${orderNumber} status: Processing. Expected delivery: 3-5 business days.`;
    } catch (error: any) {
      return `Error checking order status: ${error.message}`;
    }
  },
});

/**
 * Tool: Schedule callback
 */
export const scheduleCallbackTool = new DynamicStructuredTool({
  name: "schedule_callback",
  description: "Schedule a callback for the customer",
  schema: z.object({
    conversationId: z.string().describe("Conversation ID"),
    phoneNumber: z.string().describe("Customer phone number"),
    preferredTime: z.string().describe("Preferred callback time (e.g., 'tomorrow at 2pm')"),
  }),
  func: async ({ conversationId, phoneNumber, preferredTime }) => {
    try {
      // In a real implementation, you'd schedule this in your system
      await updateConversation(conversationId, {
        tags: ['callback-scheduled'],
        metadata: { callbackTime: preferredTime },
      });

      return `Callback scheduled for ${preferredTime} at ${phoneNumber}. A representative will call you then.`;
    } catch (error: any) {
      return `Error scheduling callback: ${error.message}`;
    }
  },
});

/**
 * Tool: Send follow-up email
 */
export const sendFollowUpEmailTool = new DynamicStructuredTool({
  name: "send_follow_up_email",
  description: "Send a follow-up email to the customer",
  schema: z.object({
    to: z.string().email().describe("Customer email address"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body"),
  }),
  func: async ({ to, subject, body }) => {
    try {
      await sendEmail({
        to,
        subject,
        body,
      });

      return `Follow-up email sent successfully to ${to}`;
    } catch (error: any) {
      return `Error sending email: ${error.message}`;
    }
  },
});

/**
 * Tool: Update conversation tags
 */
export const updateTagsTool = new DynamicStructuredTool({
  name: "update_conversation_tags",
  description: "Add or update tags on a conversation",
  schema: z.object({
    conversationId: z.string().describe("Conversation ID"),
    tags: z.array(z.string()).describe("Tags to add"),
  }),
  func: async ({ conversationId, tags }) => {
    try {
      const conversation = await getConversation(conversationId);
      if (!conversation) {
        return `Conversation ${conversationId} not found`;
      }

      const existingTags = conversation.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];

      await updateConversation(conversationId, {
        tags: newTags,
      });

      return `Tags updated: ${newTags.join(', ')}`;
    } catch (error: any) {
      return `Error updating tags: ${error.message}`;
    }
  },
});

/**
 * Get all available tools
 */
export function getAgentTools() {
  return [
    lookupCustomerTool,
    createTicketTool,
    checkOrderStatusTool,
    scheduleCallbackTool,
    sendFollowUpEmailTool,
    updateTagsTool,
  ];
}



