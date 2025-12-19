## Outbound reconciliation rule (V1)

### Definitions
- **attempt = sent**: an attempt is recorded as `sent` **when the provider API returns success** (e.g., Twilio message SID / call SID returned without error).
- **delivery/outcomes are later**: delivery receipts, bounces, call outcomes, etc. are **asynchronous** and are reconciled later via provider webhooks.

### Why this is intentional
- It preserves a deterministic, append-only attempt log at send time.
- It avoids blocking the outbound runner on webhook timing and provider delivery semantics.

### Operational implications
- A job in `sent` means “provider accepted the send request”, **not** “customer received it”.
- Downstream delivery tracking should update *separate* receipt/outcome tables or emit audit events from webhooks.

