# 🎯 Conversation Handling Status Guide

## Overview

The system now automatically tracks and displays the handling status of each conversation, making it easy to see which conversations are handled by AI, need human attention, or are already handled by humans.

## Three Handling Statuses

### 1. 🤖 AI Handled (Blue Badge)
- **Criteria**: Not assigned to an agent AND no escalation risk
- **Meaning**: The AI agent is successfully handling the conversation
- **Color**: Blue badge

### 2. ⚠️ Needs Human (Amber Badge)
- **Criteria**: Has escalation risk OR status is 'escalated'
- **Meaning**: Requires human agent attention
- **Color**: Amber/Orange badge

### 3. ✅ Human Handled (Green Badge)
- **Criteria**: Assigned to an agent (`assignedTo` is not null)
- **Meaning**: A human agent is handling or has handled the conversation
- **Color**: Green badge

## How It Works

### Automatic Detection

The system automatically determines handling status based on:
- `assignedTo`: If set, conversation is "Human Handled"
- `escalationRisk`: If true, conversation "Needs Human"
- `status`: If 'escalated', conversation "Needs Human"
- Default: If none of above, conversation is "AI Handled"

### When Status Changes

1. **AI → Needs Human**: 
   - When LangGraph detects escalation risk
   - When conversation status is set to 'escalated'
   - When priority becomes 'urgent' with negative sentiment

2. **Needs Human → Human Handled**:
   - When an agent is assigned (`assignedTo` is set)
   - Can be done manually via the UI

3. **AI → Human Handled**:
   - When an agent directly takes over a conversation

## UI Features

### 1. Filter Dropdown
- Located in the inbox header (next to Industry Selector)
- Filter by: All, AI Handled, Needs Human, Human Handled
- Updates conversation list in real-time

### 2. Status Badges
- **In Conversation List**: Small badge showing handling status
- **In Conversation Panel**: Larger badge in the header
- Color-coded for quick identification

### 3. Visual Indicators
- 🤖 Bot icon = AI Handled
- ⚠️ Alert icon = Needs Human
- ✅ UserCheck icon = Human Handled

## Usage Examples

### Filter for Conversations Needing Human Attention

1. Open inbox (`/inbox`)
2. Click "Handling Status" dropdown
3. Select "Needs Human"
4. See only conversations requiring agent attention

### View AI-Handled Conversations

1. Select "AI Handled" from dropdown
2. See all conversations successfully handled by AI
3. Monitor AI performance

### Check Human-Handled Conversations

1. Select "Human Handled" from dropdown
2. See all conversations with assigned agents
3. Track agent workload

## Technical Details

### Status Determination Logic

```typescript
if (conversation.assignedTo) {
  return 'human-handled';
}
if (conversation.escalationRisk || conversation.status === 'escalated') {
  return 'human-handling-needed';
}
return 'ai-handled';
```

### Database Fields Used

- `assigned_to`: Agent ID (null = not assigned)
- `escalation_risk`: Boolean flag
- `status`: 'active' | 'waiting' | 'resolved' | 'escalated'

## Benefits

✅ **Clear Visibility**: Instantly see which conversations need attention  
✅ **Better Prioritization**: Focus on "Needs Human" conversations first  
✅ **AI Performance Tracking**: Monitor how many conversations AI handles successfully  
✅ **Workload Management**: See agent assignments at a glance  
✅ **Automatic Escalation**: System automatically flags conversations needing human help

---

**The handling status system is now live! Use the filter dropdown to organize your conversations.** 🎉



