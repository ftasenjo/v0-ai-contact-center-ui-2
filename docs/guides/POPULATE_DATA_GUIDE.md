# 📊 Populate Demo Data Guide

## ✅ What Was Created

The script just created **100 conversations** with:
- ✅ Multiple customers (30 unique names)
- ✅ All channels: WhatsApp, Email, Chat, Voice
- ✅ All industries: Healthcare, E-commerce, Banking, SaaS
- ✅ Various statuses: Active, Waiting, Resolved, Escalated
- ✅ Different priorities: Low, Medium, High, Urgent
- ✅ Mixed sentiments: Positive, Neutral, Negative
- ✅ 2-6 messages per conversation
- ✅ Realistic timestamps (spread over last 7 days)

## 🚀 How to Run Again

### Option 1: Use the Script (Recommended)

```bash
node scripts/populate-demo-data.js
```

This will create **100 more conversations** (adds to existing data).

### Option 2: Modify the Script

Edit `scripts/populate-demo-data.js` and change:

```javascript
const conversationsToCreate = 100; // Change this number
```

Then run:
```bash
node scripts/populate-demo-data.js
```

## 📈 Create More Data

### Create 500 Conversations

```bash
# Edit scripts/populate-demo-data.js
# Change: const conversationsToCreate = 500;
node scripts/populate-demo-data.js
```

### Create 1000 Conversations

```bash
# Edit scripts/populate-demo-data.js
# Change: const conversationsToCreate = 1000;
node scripts/populate-demo-data.js
```

## 🗑️ Clear Existing Data

If you want to start fresh:

```sql
-- Run in Supabase SQL Editor
DELETE FROM messages;
DELETE FROM channel_messages;
DELETE FROM conversations;
DELETE FROM customers;
```

Then run the populate script again.

## 📊 What You'll See

After running the script, refresh your inbox (`/inbox`) and you'll see:

- **100+ conversations** across all industries
- **Mixed channels** (WhatsApp, Email, Chat, Voice)
- **Various statuses** and priorities
- **Realistic message threads** with customer and AI responses
- **Different sentiment scores** and escalation risks

## 🎯 Data Distribution

The script creates conversations with:
- **Random distribution** across industries
- **Random distribution** across channels
- **Random distribution** across statuses/priorities
- **Realistic message patterns** (customer → AI → customer → AI)

## 💡 Tips

1. **Run multiple times** to add more data (it won't duplicate customers)
2. **Check different industries** using the industry selector
3. **Filter by status** to see active vs resolved conversations
4. **View conversation details** to see full message threads

---

**Your database is now populated with realistic demo data!** 🎉



