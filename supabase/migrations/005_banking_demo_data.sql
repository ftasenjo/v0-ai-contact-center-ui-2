-- Banking demo data
-- Populates the banking tables with realistic sample data

-- Insert bank customers
INSERT INTO cc_bank_customers (id, account_number, customer_id, first_name, last_name, email, phone, date_of_birth, address_line1, city, state, zip_code, account_type, account_status, risk_level, kyc_status) VALUES
('11111111-1111-1111-1111-111111111111', 'ACC-001-2024', 'CUST-001', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '+14155551234', '1985-03-15', '123 Main Street', 'New York', 'NY', '10001', 'checking', 'active', 'low', 'verified'),
('22222222-2222-2222-2222-222222222222', 'ACC-002-2024', 'CUST-002', 'Michael', 'Chen', 'michael.chen@email.com', '+14155552345', '1990-07-22', '456 Oak Avenue', 'San Francisco', 'CA', '94102', 'savings', 'active', 'low', 'verified'),
('33333333-3333-3333-3333-333333333333', 'ACC-003-2024', 'CUST-003', 'Emily', 'Rodriguez', 'emily.rodriguez@email.com', '+14155553456', '1988-11-08', '789 Pine Road', 'Chicago', 'IL', '60601', 'credit', 'active', 'medium', 'verified'),
('44444444-4444-4444-4444-444444444444', 'ACC-004-2024', 'CUST-004', 'David', 'Williams', 'david.williams@email.com', '+14155554567', '1992-01-30', '321 Elm Street', 'Boston', 'MA', '02101', 'checking', 'active', 'low', 'verified'),
('55555555-5555-5555-5555-555555555555', 'ACC-005-2024', 'CUST-005', 'Jessica', 'Martinez', 'jessica.martinez@email.com', '+14155555678', '1987-05-18', '654 Maple Drive', 'Seattle', 'WA', '98101', 'savings', 'active', 'low', 'verified'),
('66666666-6666-6666-6666-666666666666', 'ACC-006-2024', 'CUST-006', 'Robert', 'Brown', 'robert.brown@email.com', '+14155556789', '1983-09-25', '987 Cedar Lane', 'Austin', 'TX', '78701', 'credit', 'active', 'high', 'verified'),
('77777777-7777-7777-7777-777777777777', 'ACC-007-2024', 'CUST-007', 'Amanda', 'Davis', 'amanda.davis@email.com', '+14155557890', '1991-12-12', '147 Birch Court', 'Miami', 'FL', '33101', 'checking', 'active', 'low', 'verified'),
('88888888-8888-8888-8888-888888888888', 'ACC-008-2024', 'CUST-008', 'James', 'Garcia', 'james.garcia@email.com', '+14155558901', '1989-04-05', '258 Spruce Way', 'Denver', 'CO', '80201', 'loan', 'active', 'medium', 'verified'),
('99999999-9999-9999-9999-999999999999', 'ACC-009-2024', 'CUST-009', 'Lisa', 'Anderson', 'lisa.anderson@email.com', '+14155559012', '1986-08-20', '369 Willow Street', 'Portland', 'OR', '97201', 'savings', 'active', 'low', 'verified'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ACC-010-2024', 'CUST-010', 'Christopher', 'Taylor', 'christopher.taylor@email.com', '+14155550123', '1993-02-14', '741 Ash Boulevard', 'Phoenix', 'AZ', '85001', 'credit', 'frozen', 'high', 'pending');

-- Insert conversations
INSERT INTO cc_conversations (id, channel, status, bank_customer_id, opened_at, assigned_queue, priority, topic, sentiment) VALUES
('e1111111-1111-1111-1111-111111111111', 'whatsapp', 'active', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 hours', 'Fraud Prevention', 'high', 'Suspicious transaction inquiry', 'neutral'),
('e2222222-2222-2222-2222-222222222222', 'email', 'active', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '5 hours', 'Account Services', 'medium', 'Account balance inquiry', 'positive'),
('e3333333-3333-3333-3333-333333333333', 'voice', 'resolved', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 day', 'Credit Services', 'medium', 'Credit limit increase request', 'positive'),
('e4444444-4444-4444-4444-444444444444', 'chat', 'active', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '30 minutes', 'Dispute Resolution', 'urgent', 'Unauthorized charge dispute', 'negative'),
('e5555555-5555-5555-5555-555555555555', 'whatsapp', 'waiting', '55555555-5555-5555-5555-555555555555', NOW() - INTERVAL '3 hours', 'Account Services', 'low', 'Online banking setup', 'neutral'),
('e6666666-6666-6666-6666-666666666666', 'email', 'escalated', '66666666-6666-6666-6666-666666666666', NOW() - INTERVAL '6 hours', 'Fraud Prevention', 'urgent', 'Account security breach', 'negative'),
('e7777777-7777-7777-7777-777777777777', 'voice', 'active', '77777777-7777-7777-7777-777777777777', NOW() - INTERVAL '1 hour', 'Loan Services', 'medium', 'Loan application status', 'neutral'),
('e8888888-8888-8888-8888-888888888888', 'chat', 'resolved', '88888888-8888-8888-8888-888888888888', NOW() - INTERVAL '2 days', 'Account Services', 'low', 'Statement request', 'positive'),
('e9999999-9999-9999-9999-999999999999', 'whatsapp', 'active', '99999999-9999-9999-9999-999999999999', NOW() - INTERVAL '4 hours', 'Credit Services', 'high', 'Payment dispute', 'negative'),
('eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'closed', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() - INTERVAL '3 days', 'Account Services', 'medium', 'Account reactivation', 'positive');

-- Insert messages
INSERT INTO cc_messages (id, conversation_id, direction, channel, text, provider_msg_id, created_at) VALUES
-- Conversation 1 (Fraud inquiry)
('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'inbound', 'whatsapp', 'I see a charge for $500 at a store I never visited. Is this fraud?', 'TW-MSG-001', NOW() - INTERVAL '2 hours'),
('f1111111-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111111', 'outbound', 'whatsapp', 'Thank you for contacting us. We take fraud seriously. Let me verify your account and investigate this transaction immediately.', 'TW-MSG-002', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
('f1111111-1111-1111-1111-111111111113', 'e1111111-1111-1111-1111-111111111111', 'inbound', 'whatsapp', 'The charge is from "ABC Electronics" but I never shop there.', 'TW-MSG-003', NOW() - INTERVAL '1 hour 50 minutes'),
('f1111111-1111-1111-1111-111111111114', 'e1111111-1111-1111-1111-111111111111', 'outbound', 'whatsapp', 'I have flagged this transaction as suspicious. Your card has been temporarily blocked for your protection. We will issue a new card within 3-5 business days.', 'TW-MSG-004', NOW() - INTERVAL '1 hour 45 minutes'),

-- Conversation 2 (Balance inquiry)
('f2222222-2222-2222-2222-222222222221', 'e2222222-2222-2222-2222-222222222222', 'inbound', 'email', 'Can you please tell me my current account balance?', 'EMAIL-001', NOW() - INTERVAL '5 hours'),
('f2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'outbound', 'email', 'Your current balance is $12,450.32. Is there anything else I can help you with?', 'EMAIL-002', NOW() - INTERVAL '4 hours 50 minutes'),

-- Conversation 3 (Credit limit)
('f3333333-3333-3333-3333-333333333331', 'e3333333-3333-3333-3333-333333333333', 'inbound', 'voice', 'I would like to request a credit limit increase on my account.', 'CALL-001', NOW() - INTERVAL '1 day'),
('f3333333-3333-3333-3333-333333333332', 'e3333333-3333-3333-3333-333333333333', 'outbound', 'voice', 'I can help with that. Based on your account history, I can increase your limit from $5,000 to $7,500. Would you like me to proceed?', 'CALL-002', NOW() - INTERVAL '1 day'),

-- Conversation 4 (Dispute)
('f4444444-4444-4444-4444-444444444441', 'e4444444-4444-4444-4444-444444444444', 'inbound', 'chat', 'I was charged $89.99 for a subscription I cancelled months ago. This is unauthorized!', 'CHAT-001', NOW() - INTERVAL '30 minutes'),
('f4444444-4444-4444-4444-444444444442', 'e4444444-4444-4444-4444-444444444444', 'outbound', 'chat', 'I understand your concern. Let me open a dispute case for this charge. You will receive a temporary credit while we investigate.', 'CHAT-002', NOW() - INTERVAL '28 minutes'),

-- Conversation 5 (Online banking)
('f5555555-5555-5555-5555-555555555551', 'e5555555-5555-5555-5555-555555555555', 'inbound', 'whatsapp', 'How do I set up online banking access?', 'TW-MSG-005', NOW() - INTERVAL '3 hours'),
('f5555555-5555-5555-5555-555555555552', 'e5555555-5555-5555-5555-555555555555', 'outbound', 'whatsapp', 'You can set up online banking by visiting our website and clicking "Register". You will need your account number and social security number.', 'TW-MSG-006', NOW() - INTERVAL '2 hours 55 minutes'),

-- Conversation 6 (Security breach)
('f6666666-6666-6666-6666-666666666661', 'e6666666-6666-6666-6666-666666666666', 'inbound', 'email', 'I received an alert that someone tried to access my account from an unknown device. What should I do?', 'EMAIL-003', NOW() - INTERVAL '6 hours'),
('f6666666-6666-6666-6666-666666666662', 'e6666666-6666-6666-6666-666666666666', 'outbound', 'email', 'This is a critical security issue. We have locked your account. Please call our fraud prevention line immediately at 1-800-XXX-XXXX.', 'EMAIL-004', NOW() - INTERVAL '5 hours 50 minutes'),

-- Conversation 7 (Loan status)
('f7777777-7777-7777-7777-777777777771', 'e7777777-7777-7777-7777-777777777777', 'inbound', 'voice', 'What is the status of my loan application?', 'CALL-003', NOW() - INTERVAL '1 hour'),
('f7777777-7777-7777-7777-777777777772', 'e7777777-7777-7777-7777-777777777777', 'outbound', 'voice', 'Your loan application is currently under review. We expect a decision within 2-3 business days. You will receive an email notification.', 'CALL-004', NOW() - INTERVAL '55 minutes'),

-- Conversation 8 (Statement)
('f8888888-8888-8888-8888-888888888881', 'e8888888-8888-8888-8888-888888888888', 'inbound', 'chat', 'Can I get a copy of my last statement?', 'CHAT-003', NOW() - INTERVAL '2 days'),
('f8888888-8888-8888-8888-888888888882', 'e8888888-8888-8888-8888-888888888888', 'outbound', 'chat', 'I have emailed your statement to your registered email address. It should arrive within 5 minutes.', 'CHAT-004', NOW() - INTERVAL '2 days' + INTERVAL '3 minutes'),

-- Conversation 9 (Payment dispute)
('f9999999-9999-9999-9999-999999999991', 'e9999999-9999-9999-9999-999999999999', 'inbound', 'whatsapp', 'I made a payment but it shows as pending for 3 days. Why is it taking so long?', 'TW-MSG-007', NOW() - INTERVAL '4 hours'),
('f9999999-9999-9999-9999-999999999992', 'e9999999-9999-9999-9999-999999999999', 'outbound', 'whatsapp', 'I see the issue. The payment is being processed but there was a delay due to the weekend. It should clear by tomorrow morning.', 'TW-MSG-008', NOW() - INTERVAL '3 hours 55 minutes'),

-- Conversation 10 (Account reactivation)
('faaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'inbound', 'email', 'My account was frozen. How can I reactivate it?', 'EMAIL-005', NOW() - INTERVAL '3 days'),
('faaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'outbound', 'email', 'Your account has been reactivated. Please verify your identity by answering the security questions in the attached link.', 'EMAIL-006', NOW() - INTERVAL '3 days' + INTERVAL '1 hour');

-- Insert cases
INSERT INTO cc_cases (id, type, status, priority, bank_customer_id, conversation_id, case_number, description, amount, currency) VALUES
('d1111111-1111-1111-1111-111111111111', 'fraud', 'open', 'urgent', '11111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'CASE-FRD-2024-001', 'Suspicious transaction investigation', 500.00, 'USD'),
('d2222222-2222-2222-2222-222222222222', 'dispute', 'in_progress', 'high', '44444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444444', 'CASE-DSP-2024-002', 'Unauthorized subscription charge', 89.99, 'USD'),
('d3333333-3333-3333-3333-333333333333', 'fraud', 'escalated', 'urgent', '66666666-6666-6666-6666-666666666666', 'e6666666-6666-6666-6666-666666666666', 'CASE-FRD-2024-003', 'Account security breach investigation', NULL, 'USD'),
('d4444444-4444-4444-4444-444444444444', 'dispute', 'open', 'medium', '99999999-9999-9999-9999-999999999999', 'e9999999-9999-9999-9999-999999999999', 'CASE-DSP-2024-004', 'Payment processing delay inquiry', NULL, 'USD');

-- Insert auth sessions
INSERT INTO cc_auth_sessions (id, conversation_id, bank_customer_id, method, status, expires_at, verified_at) VALUES
('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'otp', 'verified', NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '1 hour 55 minutes'),
('a2222222-2222-2222-2222-222222222222', 'e4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'kba', 'verified', NOW() + INTERVAL '15 minutes', NOW() - INTERVAL '25 minutes'),
('a3333333-3333-3333-3333-333333333333', 'e6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'otp', 'expired', NOW() - INTERVAL '1 hour', NULL),
('a4444444-4444-4444-4444-444444444444', 'e7777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', 'kba', 'pending', NOW() + INTERVAL '5 minutes', NULL);

-- Insert audit logs
INSERT INTO cc_audit_logs (id, conversation_id, actor, action, payload_redacted, created_at) VALUES
('c1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'agent-001', 'view', '{"conversation_id": "e1111111-1111-1111-1111-111111111111", "reason": "fraud_investigation"}', NOW() - INTERVAL '2 hours'),
('c2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'system', 'escalate', '{"from_queue": "General", "to_queue": "Fraud Prevention", "reason": "suspicious_transaction"}', NOW() - INTERVAL '2 hours'),
('c3333333-3333-3333-3333-333333333333', 'e4444444-4444-4444-4444-444444444444', 'agent-002', 'create_case', '{"case_type": "dispute", "case_number": "CASE-DSP-2024-002"}', NOW() - INTERVAL '30 minutes'),
('c4444444-4444-4444-4444-444444444444', 'e6666666-6666-6666-6666-666666666666', 'system', 'lock_account', '{"reason": "security_breach", "action": "account_locked"}', NOW() - INTERVAL '6 hours'),
('c5555555-5555-5555-5555-555555555555', 'e9999999-9999-9999-9999-999999999999', 'agent-003', 'update', '{"field": "status", "old_value": "pending", "new_value": "processing"}', NOW() - INTERVAL '3 hours 50 minutes');

-- Insert preferences
INSERT INTO cc_preferences (bank_customer_id, dnc, quiet_hours_start, quiet_hours_end, preferred_channel, consent_marketing, consent_data_sharing, language_preference) VALUES
('11111111-1111-1111-1111-111111111111', FALSE, '22:00:00', '08:00:00', 'whatsapp', TRUE, TRUE, 'en'),
('22222222-2222-2222-2222-222222222222', FALSE, NULL, NULL, 'email', TRUE, FALSE, 'en'),
('33333333-3333-3333-3333-333333333333', TRUE, '21:00:00', '09:00:00', 'voice', FALSE, TRUE, 'en'),
('44444444-4444-4444-4444-444444444444', FALSE, NULL, NULL, 'chat', TRUE, TRUE, 'en'),
('55555555-5555-5555-5555-555555555555', FALSE, '23:00:00', '07:00:00', 'whatsapp', TRUE, TRUE, 'es'),
('66666666-6666-6666-6666-666666666666', FALSE, NULL, NULL, 'email', FALSE, FALSE, 'en'),
('77777777-7777-7777-7777-777777777777', FALSE, '20:00:00', '08:00:00', 'voice', TRUE, TRUE, 'en'),
('88888888-8888-8888-8888-888888888888', FALSE, NULL, NULL, 'chat', TRUE, TRUE, 'en'),
('99999999-9999-9999-9999-999999999999', FALSE, '22:00:00', '09:00:00', 'whatsapp', TRUE, TRUE, 'en'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', TRUE, NULL, NULL, 'email', FALSE, FALSE, 'en');

