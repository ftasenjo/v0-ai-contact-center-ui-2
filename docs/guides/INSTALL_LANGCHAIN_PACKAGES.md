# Install LangChain Packages

## Build Error Fix

You're getting build errors because the LangChain packages aren't installed yet. Here's how to fix it:

## Option 1: Using npm (Recommended)

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai
```

If you get authentication errors, try:
```bash
npm install @langchain/langgraph @langchain/core @langchain/openai --legacy-peer-deps
```

## Option 2: Using pnpm (If you're using pnpm)

```bash
pnpm install @langchain/langgraph @langchain/core @langchain/openai
```

## Option 3: Manual Installation

Add to `package.json` dependencies:
```json
{
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/core": "^0.3.0",
    "@langchain/openai": "^0.3.0"
  }
}
```

Then run:
```bash
npm install
# or
pnpm install
```

## Verify Installation

After installing, check:
```bash
npm list @langchain/langgraph @langchain/core @langchain/openai
```

## Then Build

```bash
npm run build
```

The build should now succeed! ✅



