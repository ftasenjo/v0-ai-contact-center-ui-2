#!/bin/bash

# Automated Supabase Migration Script
# This script helps you run migrations quickly

echo "🚀 Supabase Auto-Migration Helper"
echo "=================================="
echo ""

# Check if Supabase URL is set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "📝 Loading environment variables..."
    export $(cat .env.local | grep -v '^#' | xargs)
fi

PROJECT_ID=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')
SQL_EDITOR_URL="https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new"

echo "📍 Project: $NEXT_PUBLIC_SUPABASE_URL"
echo "🔗 SQL Editor: $SQL_EDITOR_URL"
echo ""
echo "📋 Migration Files:"
echo "─────────────────────────────────────────"

MIGRATIONS=(
    "supabase/migrations/001_initial_schema.sql"
    "supabase/migrations/002_seed_demo_data.sql"
    "supabase/migrations/003_seed_conversations.sql"
    "supabase/migrations/004_banking_schema.sql"
    "supabase/migrations/005_banking_demo_data.sql"
    "supabase/migrations/006_add_missing_cc_step1.sql"
    "supabase/migrations/007_cc_voice_transcripts.sql"
    "supabase/migrations/008_outbound_workflows.sql"
)

for i in "${!MIGRATIONS[@]}"; do
    FILE="${MIGRATIONS[$i]}"
    NUM=$((i+1))
    if [ -f "$FILE" ]; then
        SIZE=$(wc -c < "$FILE" | xargs)
        echo "$NUM. ✅ $FILE ($(numfmt --to=iec-i --suffix=B $SIZE))"
    else
        echo "$NUM. ❌ $FILE (not found)"
    fi
done

echo ""
echo "📝 Instructions:"
echo "─────────────────────────────────────────"
echo "1. Open SQL Editor: $SQL_EDITOR_URL"
echo "2. Copy and paste each migration file in order"
echo "3. Click 'Run' after each migration"
echo ""
echo "💡 Tip: You can open all files at once:"
for FILE in "${MIGRATIONS[@]}"; do
    echo "   - $FILE"
done

# Try to open browser (macOS)
if command -v open &> /dev/null; then
    echo ""
    read -p "🌐 Open SQL Editor in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$SQL_EDITOR_URL"
        echo "✅ Opened SQL Editor in your browser!"
    fi
fi

echo ""
echo "✨ After running migrations, restart your server: pnpm dev"



