# Supabase Database Setup Guide

## Overview

This guide will help you set up a Supabase database for your contact center application with all the necessary tables and demo data.

## Step 1: Create Supabase Project

1. **Go to Supabase**: https://supabase.com
2. **Sign up/Login** to your account
3. **Create a new project**:
   - Click "New Project"
   - Choose your organization
   - Enter project name (e.g., "contact-center-ai")
   - Set a database password (save this!)
   - Choose a region
   - Click "Create new project"

4. **Wait for project to initialize** (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. **Go to Project Settings**:
   - Click on your project
   - Go to Settings → API

2. **Copy your credentials**:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

3. **Add to `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Run Database Migrations

### Option A: Using Supabase SQL Editor (Easiest)

1. **Open SQL Editor** in Supabase dashboard
2. **Run migrations in order**:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

3. **Seed demo data**:
   - Copy contents of `supabase/migrations/002_seed_demo_data.sql`
   - Paste into SQL Editor
   - Click "Run"

4. **Seed conversations**:
   - Copy contents of `supabase/migrations/003_seed_conversations.sql`
   - Paste into SQL Editor
   - Click "Run"

### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Step 4: Verify Tables Created

1. **Go to Table Editor** in Supabase dashboard
2. **You should see these tables**:
   - ✅ `customers`
   - ✅ `agents`
   - ✅ `conversations`
   - ✅ `messages`
   - ✅ `calls`
   - ✅ `channel_messages`
   - ✅ `call_transcripts`

## Step 5: Update Your Application

The application is already set up to use Supabase! Just make sure:

1. **Environment variables are set** in `.env.local`
2. **Restart your Next.js server**:
   ```bash
   pnpm dev
   ```

## Step 6: Switch to Supabase Store (Optional)

By default, the app uses in-memory storage. To switch to Supabase:

1. **Update webhook handlers** to use Supabase store:
   - Edit `app/api/twilio/webhook/route.ts`
   - Replace `@/lib/data-store` imports with `@/lib/supabase-store`

2. **Update API routes**:
   - Edit `app/api/conversations/route.ts`
   - Edit `app/api/calls/active/route.ts`
   - Use `getAllConversations` and `getActiveCalls` from `@/lib/supabase-store`

## Database Schema

### Tables Created:

1. **customers** - Customer information
2. **agents** - Agent profiles and status
3. **conversations** - All conversations across channels
4. **messages** - Individual messages in conversations
5. **calls** - Voice call records
6. **channel_messages** - WhatsApp, Email, SMS messages
7. **call_transcripts** - Call transcript lines

### Relationships:

- `conversations.customer_id` → `customers.id`
- `conversations.assigned_to` → `agents.id`
- `messages.conversation_id` → `conversations.id`
- `calls.conversation_id` → `conversations.id`
- `calls.customer_id` → `customers.id`
- `channel_messages.conversation_id` → `conversations.id`

## Features

- ✅ **Automatic timestamps** - `created_at` and `updated_at` auto-update
- ✅ **Indexes** - Optimized for common queries
- ✅ **Foreign keys** - Data integrity enforced
- ✅ **UUID primary keys** - Unique identifiers
- ✅ **Array support** - Tags stored as arrays
- ✅ **JSON support** - Flexible data storage

## Next Steps

1. **Enable Row Level Security (RLS)** for production
2. **Set up database backups**
3. **Configure real-time subscriptions** for live updates
4. **Add database functions** for complex queries

## Troubleshooting

### "relation does not exist" error
- Make sure you ran all migrations in order
- Check table names match exactly (case-sensitive)

### Connection errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check your Supabase project is active
- Ensure network access is allowed

### Migration errors
- Check for syntax errors in SQL
- Ensure extensions are enabled
- Verify you have proper permissions

---

**Your Supabase database is ready!** All your application data will now persist across server restarts.



