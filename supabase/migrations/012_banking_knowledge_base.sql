-- Step 13: Banking Knowledge Base
-- Stores comprehensive knowledge base articles for banking support
-- Supports categories, tags, search, and usage tracking

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Knowledge base articles table
CREATE TABLE IF NOT EXISTS cc_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Article metadata
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'account_management', 'cards', 'payments', 'loans', 'fraud_security',
    'disputes', 'fees', 'transfers', 'online_banking', 'mobile_app',
    'branch_services', 'compliance', 'general'
  )),
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Content
  content TEXT NOT NULL,
  summary TEXT,
  keywords TEXT[], -- For search optimization
  
  -- Metadata
  author_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  priority INTEGER DEFAULT 0, -- Higher priority articles appear first
  
  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_article_id UUID REFERENCES cc_knowledge_base(id) ON DELETE SET NULL, -- For article versions
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes for efficient search
CREATE INDEX IF NOT EXISTS idx_cc_kb_category ON cc_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_cc_kb_status ON cc_knowledge_base(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_cc_kb_keywords ON cc_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_cc_kb_tags ON cc_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_cc_kb_title_search ON cc_knowledge_base USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_cc_kb_content_search ON cc_knowledge_base USING GIN(to_tsvector('english', content));

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_cc_kb_fulltext_search ON cc_knowledge_base 
  USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, '')));

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_cc_knowledge_base_updated_at ON cc_knowledge_base;
CREATE TRIGGER update_cc_knowledge_base_updated_at
BEFORE UPDATE ON cc_knowledge_base
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (match cc_* posture; service_role can access)
ALTER TABLE cc_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_kb" ON cc_knowledge_base;
CREATE POLICY "service_role_all_access_kb" ON cc_knowledge_base
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert comprehensive banking knowledge base articles
INSERT INTO cc_knowledge_base (title, category, subcategory, content, summary, keywords, tags, status, priority, published_at) VALUES

-- Account Management
('How to Open a New Bank Account', 'account_management', 'account_opening', 
'To open a new bank account, customers need to provide:
1. Valid government-issued photo ID (driver''s license, passport, or state ID)
2. Social Security Number (SSN) or Tax Identification Number (TIN)
3. Proof of address (utility bill, bank statement, or lease agreement dated within 90 days)
4. Initial deposit (minimum varies by account type: $25 for basic checking, $100 for savings)

Customers can open accounts:
- Online: Complete application at bank.com/apply (takes 5-10 minutes)
- In branch: Visit any branch with required documents (same-day account activation)
- By phone: Call 1-800-BANK-HELP (account activated within 24-48 hours)

For joint accounts, both parties must be present or provide notarized signatures. Business accounts require additional documentation including EIN, business license, and articles of incorporation.',
'Step-by-step guide for opening new bank accounts online, in-branch, or by phone. Includes required documents and minimum deposit information.',
ARRAY['open account', 'new account', 'account opening', 'application', 'documents', 'ID', 'SSN', 'deposit'],
ARRAY['account_management', 'onboarding', 'new_customer'],
'published', 10, NOW()),

('Account Closure Process', 'account_management', 'account_closing',
'To close a bank account, customers must:
1. Ensure all transactions are cleared (wait 5-7 business days after last transaction)
2. Cancel all automatic payments and direct deposits
3. Withdraw remaining balance or transfer funds
4. Submit closure request via:
   - Online banking: Account Settings > Close Account
   - Phone: Call 1-800-BANK-HELP
   - Branch: Visit with valid ID

Important notes:
- No fees for account closure
- Accounts with negative balances cannot be closed until balance is resolved
- Joint accounts require consent from all account holders
- Closure is processed within 2-3 business days
- Final statement will be mailed to address on file

For accounts with pending transactions, closure may take up to 10 business days.',
'Complete guide for closing bank accounts, including required steps, timelines, and important considerations.',
ARRAY['close account', 'account closure', 'cancel account', 'terminate account'],
ARRAY['account_management', 'account_closing'],
'published', 8, NOW()),

('Password Reset and Account Recovery', 'account_management', 'security',
'Customers can reset their online banking password through multiple methods:

1. Online Reset (Recommended):
   - Go to bank.com/login
   - Click "Forgot Password"
   - Enter username or account number
   - Verify identity via email or SMS
   - Create new password (must be 8-20 characters, include uppercase, lowercase, number, and special character)

2. Phone Reset:
   - Call 1-800-BANK-HELP
   - Verify identity with account number, SSN, and security questions
   - Temporary password will be sent via SMS or email
   - Must change password on first login

3. Branch Reset:
   - Visit branch with valid photo ID
   - Request password reset
   - New password set immediately

Security measures:
- Passwords expire every 90 days
- Failed login attempts (5+) lock account for 30 minutes
- Two-factor authentication required for password changes
- Suspicious activity triggers automatic account lock

For locked accounts, call 1-800-BANK-HELP or visit branch.',
'Comprehensive guide for password reset and account recovery, including security measures and lockout procedures.',
ARRAY['password reset', 'forgot password', 'account recovery', 'locked account', 'login help'],
ARRAY['account_management', 'security', 'online_banking'],
'published', 9, NOW()),

-- Cards
('Card Activation and PIN Setup', 'cards', 'card_activation',
'New debit and credit cards must be activated before first use:

Activation Methods:
1. Online: Visit bank.com/activate or use mobile app
2. Phone: Call 1-800-CARD-ACT (automated system, 24/7)
3. ATM: Insert card and follow prompts (PIN required)
4. Branch: Visit with card and valid ID

PIN Setup:
- Default PIN mailed separately (arrives 2-3 days after card)
- Change PIN at any ATM or branch
- PIN must be 4 digits, cannot be sequential (1234) or repeated (1111)
- Maximum 3 PIN change attempts per day

Card Delivery:
- Standard delivery: 7-10 business days
- Expedited delivery: 2-3 business days ($15 fee)
- Cards sent via USPS First Class Mail
- Signature required for delivery

If card not received within 14 days, report as lost/stolen and request replacement.',
'Complete instructions for activating new cards and setting up PINs, including delivery timelines.',
ARRAY['card activation', 'activate card', 'PIN setup', 'card delivery', 'new card'],
ARRAY['cards', 'debit_card', 'credit_card', 'activation'],
'published', 10, NOW()),

('Report Lost or Stolen Card', 'cards', 'fraud_security',
'If a card is lost or stolen, customers must report it immediately:

Immediate Actions:
1. Call 1-800-CARD-LOST (24/7 hotline) - FASTEST METHOD
2. Log into online banking and report via Card Services
3. Use mobile app: Cards > Report Lost/Stolen
4. Visit branch during business hours

What happens:
- Card is immediately blocked from all transactions
- New card ordered automatically (arrives in 7-10 business days)
- Expedited replacement available ($15 fee, 2-3 business days)
- Customer not liable for unauthorized charges reported within 60 days
- Temporary card available at branch for immediate use (debit only)

Fraud Protection:
- Zero liability for unauthorized transactions
- 24/7 fraud monitoring
- Instant alerts for suspicious activity
- Dispute process for unauthorized charges

Important: Keep card number, expiration date, and CVV secure. Never share PIN or card details.',
'Emergency procedures for reporting lost or stolen cards, including fraud protection and replacement options.',
ARRAY['lost card', 'stolen card', 'report card', 'card fraud', 'block card', 'card replacement'],
ARRAY['cards', 'fraud_security', 'emergency'],
'published', 10, NOW()),

('Card Replacement and Reissuance', 'cards', 'card_management',
'Customers can request card replacement for various reasons:

Replacement Reasons:
- Card damaged or not working
- Card expired (automatic replacement sent 30 days before expiration)
- Name change (requires documentation)
- PIN forgotten (can reset, replacement only if needed)
- Card upgrade or downgrade

Replacement Process:
1. Request via phone, online banking, mobile app, or branch
2. Verify identity and account ownership
3. Old card blocked immediately
4. New card mailed (7-10 business days standard, 2-3 days expedited for $15)
5. Activate new card upon receipt

Fees:
- Standard replacement: FREE
- Expedited replacement: $15
- Overnight delivery: $25 (available for urgent cases)

Automatic Updates:
- Cards linked to digital wallets (Apple Pay, Google Pay) update automatically
- Recurring payments continue to work with new card number
- Card expiration updates automatically for subscriptions

Note: If card is compromised, report as lost/stolen for enhanced security.',
'Guide for requesting card replacements, including fees, timelines, and automatic update information.',
ARRAY['card replacement', 'replace card', 'new card', 'card reissue', 'damaged card'],
ARRAY['cards', 'card_management'],
'published', 7, NOW()),

-- Payments
('Setting Up Automatic Bill Pay', 'payments', 'bill_pay',
'Automatic bill pay allows customers to schedule recurring payments:

Setup Methods:
1. Online Banking:
   - Log in > Bill Pay > Add Payee
   - Enter payee information and account number
   - Set payment amount and frequency (monthly, bi-weekly, weekly)
   - Choose payment date
   - Confirm and authorize

2. Mobile App:
   - Open app > Payments > Bill Pay
   - Follow same steps as online

3. Phone:
   - Call 1-800-BANK-HELP
   - Speak with representative

Payment Options:
- Fixed amount: Same amount each period
- Variable amount: Pay minimum or full balance
- Pay from: Checking or savings account
- Payment date: Choose specific day of month

Processing Time:
- Electronic payments: 1-2 business days
- Check payments: 3-5 business days
- Same-day payments: Available for select payees ($2.50 fee)

Management:
- View/edit/delete scheduled payments anytime
- Receive email confirmations
- Set up payment reminders
- Pause payments temporarily

Important: Ensure sufficient funds on payment date to avoid fees.',
'Complete guide for setting up and managing automatic bill payments.',
ARRAY['bill pay', 'automatic payments', 'recurring payments', 'pay bills', 'scheduled payments'],
ARRAY['payments', 'bill_pay', 'automation'],
'published', 9, NOW()),

('Wire Transfer Instructions', 'payments', 'transfers',
'Wire transfers enable same-day or next-day money transfers:

Domestic Wire Transfers:
- Processing: Same-day if initiated before 2:00 PM EST
- Fee: $25 per outgoing wire
- Limit: $50,000 per day (can be increased with verification)
- Required Information:
  * Recipient name and account number
  * Bank name and routing number (9 digits)
  * Bank address
  * Transfer amount and currency
  * Purpose of transfer

International Wire Transfers:
- Processing: 1-3 business days
- Fee: $40 per outgoing wire
- Additional fees may apply from intermediary banks
- Required Information:
  * All domestic requirements PLUS
  * SWIFT/BIC code
  * IBAN (for European transfers)
  * Recipient address
  * Purpose code (required for compliance)

Initiation Methods:
1. Online banking (domestic only)
2. Branch visit (domestic and international)
3. Phone (domestic only, requires verification)

Security:
- Identity verification required
- Cannot be cancelled once processed
- Confirmation number provided
- Email notification sent

Important: Verify all details before submitting. Wire transfers cannot be reversed.',
'Comprehensive guide for domestic and international wire transfers, including fees, timelines, and required information.',
ARRAY['wire transfer', 'wire', 'money transfer', 'send money', 'SWIFT', 'international transfer'],
ARRAY['payments', 'transfers', 'wire_transfer'],
'published', 8, NOW()),

('Zelle and P2P Payment Setup', 'payments', 'p2p',
'Zelle allows instant person-to-person payments:

Setup:
1. Enroll in online banking or mobile app
2. Go to Transfers > Send Money with Zelle
3. Accept terms and conditions
4. Link email or mobile number
5. Verify with code sent via email/SMS

Sending Money:
- Enter recipient email or phone number
- Enter amount (up to $2,500 per day)
- Add memo (optional)
- Confirm and send
- Money arrives within minutes

Receiving Money:
- No action needed if already enrolled
- If not enrolled, receive email/SMS with enrollment link
- Complete enrollment to receive funds
- Funds available immediately

Limits:
- Daily sending limit: $2,500
- Monthly sending limit: $20,000
- Receiving: No limit
- Business accounts: Higher limits available

Security:
- Only send to trusted recipients
- Cannot cancel once sent
- Verify recipient information carefully
- Report unauthorized transactions immediately

Fees: FREE for standard transfers',
'Guide for setting up and using Zelle for instant person-to-person payments.',
ARRAY['Zelle', 'P2P', 'person to person', 'send money', 'instant payment', 'peer to peer'],
ARRAY['payments', 'p2p', 'zelle', 'mobile_payments'],
'published', 9, NOW()),

-- Fraud & Security
('Fraud Prevention and Security Tips', 'fraud_security', 'prevention',
'Protect your accounts with these security best practices:

Account Security:
- Use strong, unique passwords (8+ characters, mix of letters, numbers, symbols)
- Enable two-factor authentication
- Never share passwords, PINs, or security questions
- Log out of online banking when finished
- Monitor accounts regularly for suspicious activity

Card Security:
- Sign card immediately upon receipt
- Never write PIN on card
- Cover PIN pad when entering at ATMs or stores
- Keep card in sight during transactions
- Review statements monthly
- Report suspicious transactions immediately

Phishing Protection:
- Never click links in suspicious emails
- Bank will NEVER ask for password via email
- Verify website URLs before entering credentials
- Look for HTTPS and padlock icon
- When in doubt, call bank directly

Identity Theft:
- Shred documents with personal information
- Monitor credit reports annually
- Freeze credit if identity compromised
- Report identity theft to FTC and local police
- Contact bank immediately if identity stolen

Mobile Security:
- Use official bank app only
- Keep app updated
- Enable device lock screen
- Don''t use public Wi-Fi for banking
- Log out of app when finished

If you suspect fraud, call 1-800-FRAUD-ALERT immediately.',
'Comprehensive security tips for protecting bank accounts, cards, and personal information from fraud.',
ARRAY['fraud prevention', 'security', 'protect account', 'phishing', 'identity theft', 'scam'],
ARRAY['fraud_security', 'security', 'prevention'],
'published', 10, NOW()),

('Identity Verification Process', 'fraud_security', 'verification',
'For security, we verify customer identity for certain transactions:

Verification Methods:
1. Knowledge-Based Questions:
   - Previous addresses
   - Account history
   - Personal information from credit reports

2. Document Verification:
   - Government-issued photo ID
   - Proof of address
   - Social Security card (for certain transactions)

3. Multi-Factor Authentication:
   - SMS code to registered phone
   - Email verification code
   - Security questions
   - Biometric verification (mobile app)

When Verification is Required:
- Opening new accounts
- Large transactions ($10,000+)
- Password resets
- Adding new payees
- Changing account information
- Suspicious activity detected

Verification Process:
- Usually takes 2-5 minutes
- Can be completed online, by phone, or in branch
- May require additional documentation for high-risk transactions

If verification fails:
- Contact customer service
- Visit branch with documents
- May need to update account information

We never ask for full SSN, password, or PIN via email or phone.',
'Explanation of identity verification requirements and processes for banking transactions.',
ARRAY['identity verification', 'verify identity', 'KYC', 'know your customer', 'authentication'],
ARRAY['fraud_security', 'compliance', 'verification'],
'published', 8, NOW()),

-- Disputes
('Disputing Unauthorized Transactions', 'disputes', 'unauthorized',
'Customers can dispute unauthorized or fraudulent transactions:

Dispute Process:
1. Report immediately upon discovery
2. Log into online banking > Transactions > Dispute
3. Or call 1-800-DISPUTE (24/7)
4. Provide transaction details and reason
5. Temporary credit issued within 2 business days (for debit cards)
6. Investigation completed within 10 business days
7. Final resolution within 90 days

Required Information:
- Transaction date and amount
- Merchant name
- Transaction reference number
- Reason for dispute
- Any supporting documentation

Timeline:
- Report within 60 days for full protection
- Temporary credit: 2 business days
- Investigation: 10 business days
- Final resolution: Up to 90 days

Protection:
- Zero liability for unauthorized transactions
- Full refund if fraud confirmed
- Account monitoring during investigation
- New card issued if compromised

Important: Continue making minimum payments on credit cards during dispute. Disputed amounts don''t accrue interest if fraud confirmed.',
'Step-by-step guide for disputing unauthorized or fraudulent transactions, including timelines and protection details.',
ARRAY['dispute', 'unauthorized transaction', 'fraud', 'chargeback', 'fraudulent charge'],
ARRAY['disputes', 'fraud_security'],
'published', 10, NOW()),

('Billing Dispute Resolution', 'disputes', 'billing',
'Customers can dispute billing errors or charges:

Types of Disputes:
- Unauthorized charges
- Duplicate charges
- Incorrect amounts
- Services not received
- Merchandise not delivered
- Processing errors

Dispute Methods:
1. Online: Account > Transactions > Dispute Transaction
2. Phone: 1-800-DISPUTE
3. Branch: Visit with transaction details
4. Mail: Send written dispute to P.O. Box [address]

Required Information:
- Transaction date
- Amount
- Merchant/vendor name
- Description of issue
- Supporting documents (receipts, emails, etc.)

Process:
- Dispute filed immediately
- Merchant contacted within 2 business days
- Temporary credit for debit disputes (credit card disputes don''t require payment)
- Investigation: 10-45 business days
- Final resolution: Up to 90 days

Outcomes:
- Dispute resolved in customer favor: Permanent credit
- Dispute resolved in merchant favor: Temporary credit reversed
- Compromise: Partial refund

Documentation:
- Keep all receipts and correspondence
- Save emails and screenshots
- Note dates and times of communications
- Document any promises made by merchant

For billing errors on credit cards, minimum payment still required unless dispute is for fraud.',
'Complete guide for disputing billing errors and charges, including process, timelines, and required documentation.',
ARRAY['billing dispute', 'dispute charge', 'billing error', 'wrong charge', 'merchant dispute'],
ARRAY['disputes', 'billing'],
'published', 9, NOW()),

-- Fees
('Understanding Account Fees', 'fees', 'account_fees',
'Our fee structure is designed to be transparent and fair:

Checking Account Fees:
- Monthly maintenance: $0 if minimum balance $1,500 OR direct deposit $500+/month
- Monthly maintenance (if requirements not met): $12
- Overdraft fee: $35 per transaction
- Insufficient funds (NSF): $35 per transaction
- Stop payment: $35
- Wire transfer (outgoing): $25 domestic, $40 international
- Cashier''s check: $10

Savings Account Fees:
- Monthly maintenance: $0 (no minimum balance required)
- Excess transaction fee: $10 per transaction over 6 per month
- Wire transfer: Same as checking

ATM Fees:
- Bank ATMs: FREE
- Non-bank ATMs: $2.50 per transaction
- Foreign ATM: $5 per transaction + foreign bank fees

Ways to Avoid Fees:
- Maintain minimum balance
- Set up direct deposit
- Use bank ATMs only
- Monitor account balance
- Set up low balance alerts
- Link savings to checking for overdraft protection

Fee Waivers:
- Students: Fee-free accounts available
- Seniors (65+): Reduced fees
- Military: Fee waivers available
- Hardship cases: Contact customer service

Complete fee schedule available at bank.com/fees',
'Comprehensive explanation of all account fees, ways to avoid them, and fee waiver options.',
ARRAY['fees', 'account fees', 'monthly fee', 'overdraft fee', 'ATM fee', 'wire fee'],
ARRAY['fees', 'pricing'],
'published', 9, NOW()),

('Overdraft Protection Options', 'fees', 'overdraft',
'Protect yourself from overdraft fees with these options:

Overdraft Protection Types:
1. Linked Savings Account:
   - Automatically transfers from savings to cover overdrafts
   - Transfer fee: $12.50 per transfer
   - Must maintain minimum in savings
   - Set up: Online or branch

2. Overdraft Line of Credit:
   - Credit line attached to checking account
   - Interest charged only on amount used
   - APR: 18.99% (variable)
   - Application required (credit check)
   - No transfer fees

3. Decline Transactions:
   - Transactions declined if insufficient funds
   - No overdraft fees
   - May result in merchant fees
   - Set as default option

4. Alerts Only:
   - Receive alerts when balance is low
   - No automatic protection
   - Customer responsible for managing balance

Fees Without Protection:
- Overdraft fee: $35 per transaction
- NSF fee: $35 per declined transaction
- Multiple fees can apply per day

Best Practices:
- Monitor account balance regularly
- Set up low balance alerts
- Keep buffer in account
- Link savings for automatic protection
- Review transactions daily

To set up protection: Log into online banking > Account Settings > Overdraft Protection',
'Guide to overdraft protection options, fees, and best practices for avoiding overdraft charges.',
ARRAY['overdraft', 'overdraft protection', 'NSF', 'insufficient funds', 'bounce', 'overdraft fee'],
ARRAY['fees', 'overdraft'],
'published', 8, NOW()),

-- Loans
('Loan Application Process', 'loans', 'application',
'Apply for personal loans, auto loans, or mortgages:

Application Methods:
1. Online: bank.com/loans (fastest, 5-10 minutes)
2. Phone: 1-800-LOANS (speak with loan specialist)
3. Branch: Visit with documents

Required Information:
- Personal: Name, SSN, date of birth, address, employment
- Financial: Income, employment history, existing debts
- Documentation: Pay stubs, tax returns, bank statements
- Purpose: Loan purpose and amount requested

Application Process:
1. Complete application (online, phone, or branch)
2. Submit required documents
3. Credit check performed (soft inquiry for pre-qualification)
4. Loan officer reviews application
5. Decision typically within 1-3 business days
6. If approved: Review terms and sign documents
7. Funds disbursed within 1-2 business days after signing

Loan Types:
- Personal loans: $1,000 - $50,000, 2-7 year terms
- Auto loans: Up to $100,000, terms match vehicle age
- Mortgages: Various programs available
- Home equity: Up to 80% of home value

Interest Rates:
- Based on credit score, income, and loan amount
- Fixed or variable rates available
- Pre-qualification available without credit impact

Pre-approval:
- Get pre-approved before shopping
- Valid for 60-90 days
- No obligation to accept
- Helps with negotiations',
'Complete guide for applying for loans, including required documents, process, and timelines.',
ARRAY['loan application', 'apply for loan', 'personal loan', 'auto loan', 'mortgage', 'pre-approval'],
ARRAY['loans', 'lending'],
'published', 8, NOW()),

('Loan Payment Options', 'loans', 'payments',
'Multiple ways to make loan payments:

Payment Methods:
1. Online Banking:
   - Log in > Loans > Make Payment
   - One-time or recurring payments
   - Schedule future payments
   - FREE

2. Mobile App:
   - Loans tab > Pay Now
   - Quick and convenient
   - FREE

3. Automatic Payment:
   - Set up recurring payments
   - Deducted from checking/savings
   - Never miss a payment
   - May qualify for rate discount
   - FREE

4. Phone:
   - Call 1-800-LOAN-PAY
   - Automated system or representative
   - FREE

5. Mail:
   - Send check with payment coupon
   - Allow 5-7 business days for processing
   - Mail to address on statement
   - FREE

6. Branch:
   - Visit any branch
   - Cash or check accepted
   - FREE

Payment Timing:
- Due date: Same date each month
- Grace period: 10 days after due date
- Late fee: $25 if paid after grace period
- Early payment: Always allowed, no penalty

Payment Allocation:
- Applied to interest first, then principal
- Extra payments reduce principal
- Can specify additional principal payment

Important: Payments must be received by due date to avoid late fees and negative credit reporting.',
'Guide to making loan payments through various methods, including timing and payment allocation.',
ARRAY['loan payment', 'pay loan', 'loan payment methods', 'automatic payment', 'loan due date'],
ARRAY['loans', 'payments'],
'published', 7, NOW()),

-- Online & Mobile Banking
('Online Banking Setup and Features', 'online_banking', 'setup',
'Get started with online banking:

Registration:
1. Visit bank.com/register
2. Enter account number and SSN
3. Verify identity via email or phone
4. Create username and password
5. Set up security questions
6. Accept terms and conditions
7. Start banking online

Available Features:
- View account balances and transactions
- Transfer money between accounts
- Pay bills and set up automatic payments
- Deposit checks via mobile app
- View statements and tax documents
- Manage cards (activate, report lost, set travel notices)
- Set up alerts and notifications
- Apply for loans and credit cards
- Open new accounts
- Update personal information

Security Features:
- Two-factor authentication
- Encrypted connections
- Session timeout after inactivity
- Login alerts
- Device recognition
- Biometric login (mobile)

System Requirements:
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- JavaScript enabled
- Mobile app: iOS 12+ or Android 8+

Support:
- Help center: bank.com/help
- Phone: 1-800-BANK-HELP
- Live chat: Available in online banking

Mobile App:
- Download from App Store or Google Play
- Same features as online banking
- Additional: Mobile check deposit, card controls, location-based alerts',
'Complete guide for setting up and using online banking, including all available features and security measures.',
ARRAY['online banking', 'internet banking', 'online account', 'banking website', 'web banking'],
ARRAY['online_banking', 'digital_banking'],
'published', 10, NOW()),

('Mobile Check Deposit', 'mobile_app', 'check_deposit',
'Deposit checks using the mobile app:

Requirements:
- Mobile app installed and updated
- Account in good standing
- Check properly endorsed
- Good lighting and clear photo

Deposit Process:
1. Open mobile app
2. Tap "Deposit Check"
3. Select account for deposit
4. Enter check amount
5. Take photo of front of check
6. Take photo of back of check (must be endorsed)
7. Review and confirm
8. Submit deposit

Endorsement Requirements:
- Sign back of check
- Write "For mobile deposit only" below signature
- Include account number if check is over $1,000

Limits:
- Daily limit: $5,000
- Monthly limit: $20,000
- Per-check limit: $10,000
- Limits can be increased with verification

Processing:
- Deposits submitted before 2:00 PM: Available next business day
- Deposits submitted after 2:00 PM: Available in 2 business days
- Funds available immediately for first $200
- Remaining balance subject to hold

Hold Policies:
- New accounts: 7 business days
- Accounts with history: Standard availability
- Large deposits: May have extended hold
- Suspicious activity: Hold until verified

After Deposit:
- Keep check for 30 days
- Destroy check after 30 days (shred recommended)
- Do not deposit same check elsewhere
- Check will be marked "VOID" if deposited again

Troubleshooting:
- Ensure good lighting
- Place check on dark, flat surface
- Keep phone steady
- Ensure all corners visible
- Check camera lens is clean',
'Step-by-step guide for depositing checks using the mobile app, including limits, processing times, and troubleshooting.',
ARRAY['mobile deposit', 'check deposit', 'deposit check', 'mobile app', 'remote deposit'],
ARRAY['mobile_app', 'check_deposit', 'deposits'],
'published', 9, NOW()),

-- Branch Services
('Branch Locations and Hours', 'branch_services', 'locations',
'Find our branches and their hours:

Branch Hours:
- Monday - Friday: 9:00 AM - 5:00 PM
- Saturday: 9:00 AM - 1:00 PM
- Sunday: Closed
- Holidays: Most federal holidays closed (check specific dates)

Locations:
- Over 200 branches nationwide
- Find nearest branch: bank.com/locations or use mobile app
- Drive-through available at select locations
- ATM access 24/7 at all branch locations

Services Available:
- Account opening and closing
- Cash deposits and withdrawals
- Check cashing
- Loan applications
- Notary services (free for customers)
- Safe deposit box access
- Wire transfers
- Cashier''s checks and money orders
- Account assistance

Appointments:
- Recommended for complex transactions
- Schedule: bank.com/appointments or call branch
- Loan consultations available
- Financial planning sessions

Accessibility:
- Wheelchair accessible
- Assistive technology available
- Sign language interpreters (advance notice required)
- Large print materials available

Drive-Through:
- Available at most branches
- Same services as lobby
- Extended hours at some locations',
'Information about branch locations, hours, available services, and accessibility features.',
ARRAY['branch', 'branch hours', 'branch location', 'bank location', 'visit branch'],
ARRAY['branch_services', 'locations'],
'published', 8, NOW()),

-- General
('Contact Information and Support', 'general', 'contact',
'Reach us through multiple channels:

Phone Support:
- General Banking: 1-800-BANK-HELP (24/7)
- Credit Cards: 1-800-CARD-HELP (24/7)
- Loans: 1-800-LOANS (Mon-Fri 8 AM - 8 PM)
- Fraud/Disputes: 1-800-FRAUD-ALERT (24/7)
- Lost/Stolen Cards: 1-800-CARD-LOST (24/7)

Online Support:
- Live Chat: Available in online banking (Mon-Fri 8 AM - 8 PM)
- Email: support@bank.com (response within 24 hours)
- Help Center: bank.com/help (FAQs and guides)
- Video Tutorials: bank.com/tutorials

Branch:
- Visit any branch during business hours
- Schedule appointment: bank.com/appointments
- Find locations: bank.com/locations

Mail:
- General Inquiries: P.O. Box 1234, City, State ZIP
- Disputes: P.O. Box 5678, City, State ZIP
- Loan Applications: P.O. Box 9012, City, State ZIP

Social Media:
- Twitter: @BankSupport (monitored Mon-Fri 9 AM - 5 PM)
- Facebook: facebook.com/BankSupport

Response Times:
- Phone: Immediate (24/7 for urgent matters)
- Email: Within 24 hours
- Live Chat: Typically under 2 minutes
- Mail: 5-7 business days

For emergencies (lost card, fraud): Always call the 24/7 hotlines.',
'Complete contact information for all banking support channels, including response times.',
ARRAY['contact', 'customer service', 'support', 'help', 'phone number', 'email'],
ARRAY['general', 'contact', 'support'],
'published', 9, NOW()),

('Account Statement Access', 'general', 'statements',
'Access your account statements:

Online Statements:
- Log into online banking
- Go to Statements & Documents
- Select account and statement period
- View, download, or print
- Available for last 7 years
- FREE

Paper Statements:
- Mailed monthly to address on file
- Can opt out: Account Settings > Statement Preferences
- Opting out saves paper and is environmentally friendly
- FREE for standard accounts

Statement Contents:
- Account summary (beginning/ending balance)
- All transactions (deposits, withdrawals, fees)
- Interest earned (for interest-bearing accounts)
- Fees charged
- Account number (partially masked for security)

Download Options:
- PDF format (standard)
- CSV format (for spreadsheet import)
- Print-friendly version

Tax Documents:
- 1099-INT (interest earned): Available January 31
- 1098 (mortgage interest): Available January 31
- Download from Statements & Documents
- Also mailed if requested

Statement Disputes:
- Review statements within 60 days
- Report errors immediately
- Contact: 1-800-DISPUTE or online banking

Archival:
- Statements archived after 7 years
- Request archived statements: Contact customer service
- Fee may apply for very old statements',
'Guide to accessing account statements online and via mail, including tax documents and archival information.',
ARRAY['statement', 'account statement', 'monthly statement', 'view statement', 'download statement'],
ARRAY['general', 'statements'],
'published', 7, NOW());

-- Create a function to search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  summary TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.category,
    kb.summary,
    ts_rank(
      to_tsvector('english', coalesce(kb.title, '') || ' ' || coalesce(kb.content, '') || ' ' || coalesce(kb.summary, '')),
      plainto_tsquery('english', search_query)
    ) AS relevance
  FROM cc_knowledge_base kb
  WHERE kb.status = 'published'
    AND (
      to_tsvector('english', coalesce(kb.title, '') || ' ' || coalesce(kb.content, '') || ' ' || coalesce(kb.summary, ''))
      @@ plainto_tsquery('english', search_query)
      OR search_query = ANY(kb.keywords)
      OR search_query = ANY(kb.tags)
    )
  ORDER BY relevance DESC, kb.priority DESC, kb.view_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

