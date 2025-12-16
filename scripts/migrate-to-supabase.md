# Migration Guide: In-Memory to Supabase

## Quick Migration Steps

### 1. Set Up Supabase
Follow the instructions in `SUPABASE_SETUP.md` to:
- Create a Supabase project
- Run the migrations
- Get your credentials

### 2. Add Environment Variables
Add to your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
USE_SUPABASE=true
```

### 3. Update API Routes (Optional)
The app will automatically use Supabase when `USE_SUPABASE=true` is set.

If you want to manually update routes, change imports from:
```typescript
import { getAllConversations } from '@/lib/data-store';
```

To:
```typescript
import { getAllConversations } from '@/lib/store-adapter';
```

### 4. Restart Your Server
```bash
pnpm dev
```

## What Gets Migrated?

### Automatically Migrated:
- ✅ New calls from Twilio webhooks
- ✅ New messages from Twilio webhooks
- ✅ New conversations created from calls/messages

### Demo Data:
- ✅ Already seeded via SQL migrations
- ✅ All 4 industries included
- ✅ 12 conversations with messages
- ✅ 8 agents
- ✅ 12 customers

### Existing In-Memory Data:
- ⚠️ In-memory data is NOT automatically migrated
- ⚠️ You'll need to manually trigger calls/messages to populate Supabase
- ⚠️ Or use the demo data that's already seeded

## Testing

1. **Check Supabase Dashboard**:
   - Go to Table Editor
   - Verify data exists in tables

2. **Test API Endpoints**:
   - `/api/conversations` - Should return conversations from Supabase
   - `/api/calls/active` - Should return calls from Supabase

3. **Test Webhooks**:
   - Make a test call to your Twilio number
   - Check if it appears in Supabase `calls` table
   - Check if conversation is created

## Rollback

To switch back to in-memory storage:
```env
USE_SUPABASE=false
```

Or remove the `USE_SUPABASE` variable entirely.

---

**Migration complete!** Your app now uses Supabase for persistent storage.



