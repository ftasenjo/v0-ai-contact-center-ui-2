-- Seed conversations and messages for demo data
-- This populates conversations with messages for all industries

-- Note: This is a simplified seed. In production, you'd want to use a proper data migration tool
-- or insert via the application API.

-- Healthcare conversations
INSERT INTO conversations (id, customer_id, channel, status, priority, sentiment, sentiment_score, sla_deadline, sla_remaining, sla_status, assigned_to, queue, topic, last_message, last_message_time, start_time, ai_confidence, escalation_risk, tags, industry) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'voice', 'active', 'urgent', 'negative', 0.22, NOW() + INTERVAL '2 minutes', 2, 'warning', '660e8400-e29b-41d4-a716-446655440001', 'Urgent Care', 'Appointment Scheduling - Urgent', 'I need to see a doctor today, my symptoms are getting worse!', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '5 minutes', 0.78, true, ARRAY['urgent', 'appointment', 'symptoms'], 'healthcare'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'whatsapp', 'active', 'medium', 'neutral', 0.58, NOW() + INTERVAL '30 minutes', 30, 'healthy', '660e8400-e29b-41d4-a716-446655440002', 'Appointments', 'Prescription Refill', 'Thank you! I''ll pick it up at the pharmacy tomorrow.', NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '15 minutes', 0.95, false, ARRAY['prescription', 'refill', 'pharmacy'], 'healthcare'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'email', 'active', 'high', 'neutral', 0.52, NOW() + INTERVAL '15 minutes', 15, 'healthy', '660e8400-e29b-41d4-a716-446655440001', 'Medical Records', 'Medical Records Request', 'I need patient records for John Doe, DOB 05/15/1980, for a consultation scheduled next week.', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '45 minutes', 0.88, false, ARRAY['records', 'hipaa', 'enterprise'], 'healthcare'),

-- E-commerce conversations
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'chat', 'active', 'medium', 'negative', 0.35, NOW() + INTERVAL '20 minutes', 20, 'healthy', '660e8400-e29b-41d4-a716-446655440003', 'Order Support', 'Order Not Delivered', 'It''s been 5 days and I still haven''t received my order. This is unacceptable!', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '10 minutes', 0.82, true, ARRAY['delivery', 'order', 'refund'], 'ecommerce'),
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'whatsapp', 'active', 'low', 'positive', 0.85, NOW() + INTERVAL '45 minutes', 45, 'healthy', '660e8400-e29b-41d4-a716-446655440004', 'Product Questions', 'Product Recommendation', 'Perfect! I''ll order the wireless headphones. Thanks for the recommendation!', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '8 minutes', 0.91, false, ARRAY['product', 'recommendation', 'upsell'], 'ecommerce'),
('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'email', 'active', 'medium', 'neutral', 0.60, NOW() + INTERVAL '25 minutes', 25, 'healthy', NULL, 'Returns', 'Return Request', 'I''d like to return item #PROD-789. It doesn''t fit as expected. What''s the return process?', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '10 minutes', 0.89, false, ARRAY['return', 'refund', 'policy'], 'ecommerce'),

-- Banking conversations
('770e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'voice', 'active', 'urgent', 'negative', 0.15, NOW() + INTERVAL '1 minute', 1, 'warning', '660e8400-e29b-41d4-a716-446655440005', 'Fraud Prevention', 'Suspicious Transaction', 'I didn''t make this $2,500 purchase! Please freeze my card immediately!', NOW() - INTERVAL '30 seconds', NOW() - INTERVAL '3 minutes', 0.95, true, ARRAY['fraud', 'urgent', 'security'], 'banking'),
('770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'email', 'active', 'high', 'neutral', 0.55, NOW() + INTERVAL '10 minutes', 10, 'healthy', '660e8400-e29b-41d4-a716-446655440006', 'Loan Services', 'Mortgage Application', 'I''ve submitted all required documents. When can I expect a decision on my mortgage application?', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '2 days', 0.87, false, ARRAY['loan', 'mortgage', 'application'], 'banking'),
('770e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', 'chat', 'active', 'medium', 'positive', 0.75, NOW() + INTERVAL '30 minutes', 30, 'healthy', '660e8400-e29b-41d4-a716-446655440005', 'Account Services', 'Account Balance Inquiry', 'Thank you! That''s exactly what I needed to know.', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '8 minutes', 0.96, false, ARRAY['balance', 'account', 'inquiry'], 'banking'),

-- SaaS conversations
('770e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440010', 'chat', 'active', 'high', 'negative', 0.28, NOW() + INTERVAL '5 minutes', 5, 'warning', '660e8400-e29b-41d4-a716-446655440007', 'Technical Support', 'API Integration Issue', 'Our production API calls are failing with 500 errors. This is affecting our entire platform!', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '20 minutes', 0.76, true, ARRAY['api', 'integration', 'production', 'urgent'], 'saas'),
('770e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440011', 'email', 'active', 'medium', 'positive', 0.82, NOW() + INTERVAL '25 minutes', 25, 'healthy', '660e8400-e29b-41d4-a716-446655440008', 'Onboarding', 'Account Setup', 'Thanks for the detailed guide! I''ve successfully set up our team workspace.', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '2 hours', 0.93, false, ARRAY['onboarding', 'setup', 'workspace'], 'saas'),
('770e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440012', 'whatsapp', 'active', 'low', 'neutral', 0.65, NOW() + INTERVAL '40 minutes', 40, 'healthy', NULL, 'Feature Questions', 'Feature Request', 'That would be amazing! When can we expect this feature?', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '12 minutes', 0.88, false, ARRAY['feature', 'request', 'roadmap'], 'saas')
ON CONFLICT (id) DO NOTHING;

-- Insert sample messages for conversations
-- Healthcare conversation 1 messages
INSERT INTO messages (conversation_id, type, content, timestamp, is_transcript) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'system', 'Call connected - Urgent Care Queue', NOW() - INTERVAL '5 minutes', true),
('770e8400-e29b-41d4-a716-446655440001', 'customer', 'Hello, I need to schedule an urgent appointment. I''ve been experiencing severe chest pain and shortness of breath.', NOW() - INTERVAL '4 minutes', true),
('770e8400-e29b-41d4-a716-446655440001', 'ai', 'I understand this is urgent. For chest pain and breathing difficulties, I''m connecting you immediately with our urgent care team. Please hold while I transfer you.', NOW() - INTERVAL '3 minutes', true),
('770e8400-e29b-41d4-a716-446655440001', 'customer', 'I need to see a doctor today, my symptoms are getting worse!', NOW() - INTERVAL '1 minute', true);

-- E-commerce conversation 1 messages
INSERT INTO messages (conversation_id, type, content, timestamp) VALUES
('770e8400-e29b-41d4-a716-446655440004', 'system', 'Chat started via website widget', NOW() - INTERVAL '10 minutes'),
('770e8400-e29b-41d4-a716-446655440004', 'customer', 'Hi, I placed an order #ORD-12345 last week and it hasn''t arrived yet. Can you check the status?', NOW() - INTERVAL '9 minutes'),
('770e8400-e29b-41d4-a716-446655440004', 'ai', 'Hello Lisa! I''d be happy to help you track your order. Let me check the status of order #ORD-12345 for you.', NOW() - INTERVAL '8 minutes'),
('770e8400-e29b-41d4-a716-446655440004', 'customer', 'It''s been 5 days and I still haven''t received my order. This is unacceptable!', NOW() - INTERVAL '2 minutes');

-- Banking conversation 1 messages
INSERT INTO messages (conversation_id, type, content, timestamp, is_transcript) VALUES
('770e8400-e29b-41d4-a716-446655440007', 'system', 'Call connected - Fraud Prevention Queue (Priority)', NOW() - INTERVAL '3 minutes', true),
('770e8400-e29b-41d4-a716-446655440007', 'customer', 'I just received an alert about a $2,500 charge I didn''t make. I need to report fraud immediately!', NOW() - INTERVAL '2 minutes', true),
('770e8400-e29b-41d4-a716-446655440007', 'ai', 'I understand this is urgent. I''m immediately connecting you with our fraud prevention specialist. Your card will be frozen right away.', NOW() - INTERVAL '1 minute', true),
('770e8400-e29b-41d4-a716-446655440007', 'customer', 'I didn''t make this $2,500 purchase! Please freeze my card immediately!', NOW() - INTERVAL '30 seconds', true);

-- SaaS conversation 1 messages
INSERT INTO messages (conversation_id, type, content, timestamp) VALUES
('770e8400-e29b-41d4-a716-446655440010', 'system', 'Chat started via website widget', NOW() - INTERVAL '20 minutes'),
('770e8400-e29b-41d4-a716-446655440010', 'customer', 'Hi, we''re experiencing API errors. Our integration is failing with 500 status codes.', NOW() - INTERVAL '19 minutes'),
('770e8400-e29b-41d4-a716-446655440010', 'ai', 'Hello Ryan! I understand you''re experiencing API errors. Let me check our system status and gather some details. Can you share the API endpoint you''re calling and any error messages?', NOW() - INTERVAL '18 minutes'),
('770e8400-e29b-41d4-a716-446655440010', 'customer', 'We''re calling /api/v2/users endpoint. The error says ''Internal Server Error''. This started about 30 minutes ago.', NOW() - INTERVAL '15 minutes'),
('770e8400-e29b-41d4-a716-446655440010', 'agent', 'I see the issue. There''s a known issue with our /api/v2/users endpoint affecting some enterprise accounts. Our engineering team is working on a fix. I can provide a workaround using /api/v1/users in the meantime.', NOW() - INTERVAL '10 minutes'),
('770e8400-e29b-41d4-a716-446655440010', 'customer', 'Our production API calls are failing with 500 errors. This is affecting our entire platform!', NOW() - INTERVAL '1 minute');



