import { NextRequest, NextResponse } from 'next/server';
import { deleteConversation } from '@/lib/store-adapter';

/**
 * API endpoint to delete a conversation
 * DELETE /api/conversations/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    await deleteConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete conversation',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

