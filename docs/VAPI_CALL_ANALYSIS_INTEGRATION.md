# Vapi Call Analysis Integration

## Overview

This integration automatically extracts and stores Vapi's structured output (success evaluation, customer sentiment, CSAT) from the `end-of-call-report` webhook and converts it into our call analysis system.

## How It Works

### 1. Vapi Webhook Flow

When a Vapi call ends, Vapi sends an `end-of-call-report` webhook to `/api/vapi/webhook` containing:

- **Structured Output** (from `analysisPlan.structuredDataSchema`):
  - `CSAT` or `csat` - Customer Satisfaction Score (1-10 or 1-5)
  - `customerSentiment` or `customer_sentiment` - Sentiment string
  - `success` or `successEvaluation` - Success boolean/string
  - `summary` or `callSummary` - Call summary text
  - Any other fields you define in your structured output schema

- **Call Metadata**:
  - `call.id` - Vapi call ID
  - `call.transcript` - Full transcript
  - `call.sentiment` - Sentiment (if provided separately)
  - `call.duration` - Call duration

### 2. Automatic Processing

The `handleEndOfCallReport` function:

1. **Extracts structured data** from multiple possible locations:
   - `call.analysis`
   - `call.structuredData`
   - `call.structured_output`
   - `call.analysisPlan.structuredData`

2. **Maps Vapi fields to our schema**:
   - **CSAT** → `quality_score` (normalized to 1-10 scale)
   - **customerSentiment** → `customer_sentiment` (normalized: positive/neutral/negative/frustrated)
   - **success** → `issue_resolved` (boolean)
   - **summary** → `call_summary` (text)

3. **Infers additional fields**:
   - **Issue type**: Analyzes transcript for keywords (fraud, card, login, dispute, payments)
   - **Issue severity**: Based on quality score (≤4 = high, ≤6 = medium, >6 = low)
   - **Customer frustrated**: Based on sentiment and quality score
   - **Escalation required**: Low quality (≤3) + frustrated customer
   - **Supervisor review**: Quality score ≤ 5
   - **Compliance verified**: Assumes verified unless explicitly failed

4. **Stores analysis** in `cc_call_analysis` table

5. **Triggers automation**:
   - Creates inbox items for actionable flags
   - Emits `call_analysis_ready` event

## Vapi Configuration

### Required: Structured Output Schema

In your Vapi assistant configuration, add an `analysisPlan` with structured outputs:

```json
{
  "analysisPlan": {
    "structuredDataPrompt": "After the call ends, evaluate the call and extract the following metrics:",
    "structuredDataSchema": {
      "type": "object",
      "properties": {
        "CSAT": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "description": "Customer Satisfaction Score from 1-10"
        },
        "customerSentiment": {
          "type": "string",
          "enum": ["Very Positive", "Positive", "Neutral", "Negative", "Very Negative", "Frustrated"],
          "description": "Overall customer sentiment during the call"
        },
        "success": {
          "type": "boolean",
          "description": "Whether the customer's issue was successfully resolved"
        },
        "summary": {
          "type": "string",
          "description": "2-3 sentence summary of the call"
        },
        "issueType": {
          "type": "string",
          "enum": ["fraud", "card", "login", "dispute", "payments", "general", "other"],
          "description": "Type of issue discussed"
        }
      },
      "required": ["CSAT", "customerSentiment", "success"]
    }
  }
}
```

### Webhook Configuration

Ensure your Vapi assistant has the webhook URL configured:
```
https://your-domain.com/api/vapi/webhook
```

## Field Mapping Reference

| Vapi Field | Our Schema Field | Notes |
|------------|------------------|-------|
| `CSAT` / `csat` | `quality_score` | Normalized to 1-10 (if Vapi sends 1-5, we scale it) |
| `customerSentiment` | `customer_sentiment` | Normalized: "Very Positive"/"Positive" → "positive", "Negative"/"Very Negative"/"Frustrated" → "negative" or "frustrated" |
| `success` / `successEvaluation` | `issue_resolved` | Boolean or string containing "success"/"resolved" |
| `summary` / `callSummary` | `call_summary` | 2-3 sentence summary |
| `issueType` | `issue_type` | Optional, inferred from transcript if not provided |
| Transcript analysis | `issue_type`, `issue_severity` | Auto-detected from keywords |

## What Happens After Analysis is Stored

1. **Database**: Analysis stored in `cc_call_analysis` table
2. **Automation**: Inbox items created for:
   - Escalation required (if quality ≤ 3 and frustrated)
   - Compliance review (if compliance_verified = false)
   - Supervisor review (if quality ≤ 5)
   - QA coaching (if quality ≤ 6)
   - Customer frustrated (if sentiment indicates frustration)
   - Follow-up required (if issue_resolved = false)
3. **UI**: Analysis appears in conversation panel for voice calls
4. **Events**: `call_analysis_ready` event emitted to automation center

## Testing

After a Vapi call completes, check:

1. **Database**:
   ```sql
   SELECT * FROM cc_call_analysis 
   WHERE vapi_call_id = 'YOUR_VAPI_CALL_ID'
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Inbox Items**:
   ```sql
   SELECT * FROM cc_admin_inbox_items 
   WHERE type LIKE 'call_%'
   ORDER BY created_at DESC LIMIT 5;
   ```

3. **UI**: Open the voice conversation in the inbox - you should see the call analysis card at the top

## Troubleshooting

### Analysis not appearing

1. Check webhook logs: Look for `[vapi/webhook] ✅ Call analysis stored:` in server logs
2. Verify structured output: Ensure Vapi is sending `analysis` or `structuredData` in the webhook
3. Check conversation mapping: Verify `conversation_id` exists for the call

### Quality score wrong

- Vapi might send CSAT as 1-5 scale - we auto-scale to 1-10
- Check `raw_analysis_json` field to see original Vapi values

### Sentiment not mapping

- Check `raw_analysis_json.vapi_sentiment` to see original value
- Our normalization handles: "Very Positive" → "positive", "Very Negative" → "negative", "Frustrated" → "frustrated"

