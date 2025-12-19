# Authentication Policy Matrix

This document defines which customer intents require authentication and what level of authentication is needed.

## Overview

Different customer intents require different levels of authentication based on:
- **Sensitivity** of the operation
- **Regulatory requirements** (especially for banking)
- **Risk level** of the customer
- **Data access** required

---

## Authentication Levels

### Level 0: No Authentication
- Public information
- General inquiries
- Non-sensitive operations

### Level 1: Basic Verification
- Phone number verification
- Email verification
- Simple identity check

### Level 2: OTP (One-Time Password)
- SMS or email OTP
- Time-limited (10-15 minutes)
- Single use

### Level 3: KBA (Knowledge-Based Authentication)
- Security questions
- Account details verification
- Multi-factor verification

### Level 4: Biometric
- Fingerprint
- Face recognition
- Voice recognition

### Level 5: Full Authentication
- Password + OTP
- Multi-factor authentication
- High-security operations

---

## Intent → Auth Level Matrix

### Banking Intents

| Intent | Auth Level | Method | Required For |
|--------|-----------|--------|--------------|
| **Account Balance Inquiry** | Level 3 | KBA | Viewing account balance |
| **Transaction History** | Level 3 | KBA | Viewing transactions |
| **Transfer Funds** | Level 5 | Password + OTP | Money transfers |
| **Change Password** | Level 5 | Password + OTP | Security changes |
| **Block Card** | Level 3 | KBA | Card operations |
| **Unblock Card** | Level 3 | KBA | Card operations |
| **Report Fraud** | Level 2 | OTP | Fraud reporting |
| **Dispute Transaction** | Level 3 | KBA | Dispute creation |
| **Request Statement** | Level 3 | KBA | Document access |
| **Update Contact Info** | Level 3 | KBA | Profile changes |
| **Loan Application Status** | Level 2 | OTP | Application inquiry |
| **Credit Limit Increase** | Level 3 | KBA | Credit operations |
| **Payment Inquiry** | Level 2 | OTP | Payment questions |
| **General Inquiry** | Level 0 | None | General questions |
| **Online Banking Setup** | Level 3 | KBA | Account setup |

### General Support Intents

| Intent | Auth Level | Method | Required For |
|--------|-----------|--------|--------------|
| **Product Inquiry** | Level 0 | None | General questions |
| **Technical Support** | Level 1 | Phone/Email | Support access |
| **Billing Question** | Level 2 | OTP | Billing information |
| **Cancel Service** | Level 3 | KBA | Account changes |
| **Complaint** | Level 1 | Basic | Complaint submission |
| **Feedback** | Level 0 | None | Feedback submission |

---

## Risk-Based Authentication

### Low Risk Customer
- Standard authentication requirements
- Can use Level 2 (OTP) for most operations

### Medium Risk Customer
- Enhanced authentication
- Requires Level 3 (KBA) for sensitive operations
- Additional verification for high-value transactions

### High Risk Customer
- Maximum authentication
- Requires Level 5 (Full Auth) for most operations
- Additional security checks
- May require manual verification

---

## Authentication Flow

### Step 1: Intent Detection
```
Customer Message → AI analyzes intent → Check auth requirement
```

### Step 2: Auth Check
```
If auth required:
  → Check if customer is authenticated
  → If not, initiate auth flow
  → If yes, verify auth level matches requirement
```

### Step 3: Auth Execution
```
Initiate auth session:
  → Create record in cc_auth_sessions
  → Send OTP / Present KBA questions
  → Wait for verification
  → Update session status
```

### Step 4: Proceed or Escalate
```
If verified:
  → Proceed with intent fulfillment
If failed:
  → Escalate to human agent
  → Log failure in audit log
```

---

## Authentication Methods

### OTP (One-Time Password)
- **Delivery**: SMS or Email
- **Validity**: 10-15 minutes
- **Attempts**: 3 maximum
- **Use Cases**: Quick verification, low-risk operations

### KBA (Knowledge-Based Authentication)
- **Questions**: 
  - Last 4 digits of account
  - Date of birth
  - Security question answers
  - Recent transaction details
- **Validity**: Single session
- **Attempts**: 2-3 maximum
- **Use Cases**: Medium-risk operations, account access

### Biometric
- **Methods**: Fingerprint, Face, Voice
- **Validity**: Per session
- **Use Cases**: High-security operations, mobile apps

### Full Authentication
- **Components**: Password + OTP + KBA
- **Validity**: Per session
- **Use Cases**: High-risk operations, money transfers

---

## Exceptions and Overrides

### Human Agent Override
- Human agents can bypass auth for:
  - Emergency situations
  - Customer service recovery
  - Manual verification completed

### System Override
- System can auto-authenticate for:
  - Known device/browser
  - Recent successful auth
  - Low-risk operations

### Regulatory Requirements
- **PCI DSS**: Payment operations require Level 5
- **GDPR**: Data access requires Level 3
- **Banking Regulations**: Account changes require Level 3+

---

## Audit Requirements

All authentication attempts must be logged:
- **Success**: Logged to `cc_audit_logs`
- **Failure**: Logged with reason
- **Bypass**: Logged with justification
- **Retention**: 7 years for banking compliance

---

## Implementation

### Database Schema
```sql
cc_auth_sessions (
  id UUID,
  conversation_id UUID,
  bank_customer_id UUID,
  method TEXT, -- 'otp', 'kba', 'biometric', 'password', 'pin'
  status TEXT, -- 'pending', 'verified', 'failed', 'expired'
  expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  attempts INTEGER,
  max_attempts INTEGER
)
```

### Code Example
```typescript
// Check auth requirement
const authLevel = getAuthLevelForIntent(intent);
if (authLevel > 0) {
  const isAuthenticated = await checkAuthStatus(customerId, authLevel);
  if (!isAuthenticated) {
    await initiateAuthFlow(customerId, conversationId, authLevel);
    return { requiresAuth: true, authLevel };
  }
}
```

---

## Future Enhancements

1. **Adaptive Authentication**: Adjust auth level based on behavior
2. **Risk Scoring**: Dynamic risk assessment
3. **Device Trust**: Trusted device recognition
4. **Biometric Integration**: Face/voice recognition
5. **SSO Integration**: Single sign-on support

