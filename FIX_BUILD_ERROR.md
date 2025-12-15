# Fix Build Error - Module Not Found

## The Issue

You're getting an error about `@langchain/anthropic` even though the code has been fixed.

## Solution

The file is correct, but Next.js/Turbopack has cached the old code. Here's how to fix it:

### Step 1: Stop the Dev Server

If you have `npm run dev` running, stop it (Ctrl+C).

### Step 2: Clear All Caches

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules cache (if exists)
rm -rf node_modules/.cache

# Clear Turbo cache (if exists)
rm -rf .turbo
```

### Step 3: Verify the File is Correct

The file `lib/agents/langgraph-workflow.ts` should only have OpenAI code (lines 38-55). Check:

```bash
cat lib/agents/langgraph-workflow.ts | grep -A 20 "function getAgentLLM"
```

Should show:
```typescript
function getAgentLLM() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error(...);
  }
  return new ChatOpenAI({...});
}
```

**No `require('@langchain/anthropic')` should appear!**

### Step 4: Rebuild

```bash
npm run build
```

Should show: `✓ Compiled successfully`

### Step 5: Start Fresh

```bash
npm run dev
```

## If Still Getting Errors

1. **Restart your IDE** - Sometimes IDEs cache files
2. **Check for multiple files** - Make sure there's only one `langgraph-workflow.ts`
3. **Verify packages installed**:
   ```bash
   npm list @langchain/langgraph @langchain/core @langchain/openai
   ```

## Current File Status

✅ File is correct - only uses OpenAI
✅ No optional providers
✅ Packages installed
✅ Build should work after clearing cache

---

**The error is from cached code. Clear caches and rebuild!**

