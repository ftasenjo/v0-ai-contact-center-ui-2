# 🚀 Quick Migration Guide - 3 Simple Steps

## ✅ Your Supabase is Ready!

Your credentials are configured:
- **URL**: `https://plcjfyftcnmkrffpvukz.supabase.co`
- **Status**: Ready to migrate

## 📋 Step-by-Step Migration (Takes 2 minutes)

### Step 1: Open Supabase SQL Editor
👉 **Click here**: https://supabase.com/dashboard/project/plcjfyftcnmkrffpvukz/sql/new

(Or go to: Dashboard → SQL Editor → New Query)

### Step 2: Run Migration 1 (Schema)
1. **Open this file**: `supabase/migrations/001_initial_schema.sql`
2. **Copy ALL contents** (Cmd+A, Cmd+C)
3. **Paste into SQL Editor**
4. **Click "Run"** (or press Cmd+Enter)
5. ✅ Wait for "Success" message

### Step 3: Run Migration 2 (Demo Data)
1. **Open this file**: `supabase/migrations/002_seed_demo_data.sql`
2. **Copy ALL contents** (Cmd+A, Cmd+C)
3. **Paste into SQL Editor** (clear previous SQL first)
4. **Click "Run"**
5. ✅ Wait for "Success" message

### Step 4: Run Migration 3 (Conversations)
1. **Open this file**: `supabase/migrations/003_seed_conversations.sql`
2. **Copy ALL contents** (Cmd+A, Cmd+C)
3. **Paste into SQL Editor** (clear previous SQL first)
4. **Click "Run"**
5. ✅ Wait for "Success" message

## ✅ Verify It Worked

1. **Go to Table Editor** in Supabase dashboard
2. **Check these tables exist**:
   - ✅ `customers` (should have 12 rows)
   - ✅ `agents` (should have 8 rows)
   - ✅ `conversations` (should have 12 rows)
   - ✅ `messages` (should have multiple rows)

## 🎉 Done!

**Restart your server:**
```bash
pnpm dev
```

**Test it:**
- Visit: http://localhost:3000/inbox
- Should show conversations from Supabase!

---

## 🆘 Need Help?

**Quick Links:**
- SQL Editor: https://supabase.com/dashboard/project/plcjfyftcnmkrffpvukz/sql/new
- Table Editor: https://supabase.com/dashboard/project/plcjfyftcnmkrffpvukz/editor

**Migration Files Location:**
```
supabase/migrations/
  ├── 001_initial_schema.sql
  ├── 002_seed_demo_data.sql
  └── 003_seed_conversations.sql
```

---

**That's it! Your database will be ready in 2 minutes! 🚀**

