-- Seed demo data for all industries
-- This will populate the database with sample data

-- Insert demo customers
INSERT INTO customers (id, name, email, phone, avatar, language, preferred_language, tier, company) VALUES
-- Healthcare customers
('550e8400-e29b-41d4-a716-446655440001', 'Robert Martinez', 'robert.m@healthcare.com', '+15551112222', '/professional-man-marcus.jpg', 'English', 'en', 'premium', 'Healthcare Inc.'),
('550e8400-e29b-41d4-a716-446655440002', 'Patricia Chen', 'patricia.c@email.com', '+15552223333', '/professional-woman-emily.jpg', 'English', 'en', 'standard', NULL),
('550e8400-e29b-41d4-a716-446655440003', 'Dr. Michael Thompson', 'm.thompson@hospital.org', '+15553334444', '/professional-man-david-agent.jpg', 'English', 'en', 'enterprise', 'City Hospital'),

-- E-commerce customers
('550e8400-e29b-41d4-a716-446655440004', 'Lisa Anderson', 'lisa.a@email.com', '+15554445555', '/professional-woman-rachel.jpg', 'English', 'en', 'standard', NULL),
('550e8400-e29b-41d4-a716-446655440005', 'David Kim', 'david.k@email.com', '+15555556666', '/professional-asian-man-james.jpg', 'English', 'en', 'premium', NULL),
('550e8400-e29b-41d4-a716-446655440006', 'Sarah Williams', 'sarah.w@email.com', '+15556667777', '/professional-woman-sarah-agent.jpg', 'English', 'en', 'standard', NULL),

-- Banking customers
('550e8400-e29b-41d4-a716-446655440007', 'Jennifer Lopez', 'j.lopez@email.com', '+15557778888', '/professional-woman-maria-agent.jpg', 'English', 'en', 'premium', NULL),
('550e8400-e29b-41d4-a716-446655440008', 'Thomas Brown', 'thomas.b@email.com', '+15558889999', '/professional-man-marcus.jpg', 'English', 'en', 'enterprise', 'Finance Corp'),
('550e8400-e29b-41d4-a716-446655440009', 'Amanda Taylor', 'amanda.t@email.com', '+15559990000', '/professional-woman-emily.jpg', 'English', 'en', 'premium', NULL),

-- SaaS customers
('550e8400-e29b-41d4-a716-446655440010', 'Ryan Patel', 'ryan.p@startup.io', '+15551012020', '/professional-asian-man-james.jpg', 'English', 'en', 'enterprise', 'Tech Startup'),
('550e8400-e29b-41d4-a716-446655440011', 'Emma Wilson', 'emma.w@company.com', '+15552023030', '/professional-woman-rachel.jpg', 'English', 'en', 'premium', 'Company Inc.'),
('550e8400-e29b-41d4-a716-446655440012', 'Daniel Lee', 'daniel.l@tech.com', '+15553034040', '/professional-man-david-agent.jpg', 'English', 'en', 'standard', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert demo agents
INSERT INTO agents (id, name, email, avatar, status, role, active_conversations, avg_handle_time, csat) VALUES
-- Healthcare agents
('660e8400-e29b-41d4-a716-446655440001', 'Dr. Sarah Mitchell', 'sarah.m@healthcare.com', '/professional-woman-sarah-agent.jpg', 'online', 'agent', 3, 12.5, 4.9),
('660e8400-e29b-41d4-a716-446655440002', 'Michael Chen', 'michael.c@healthcare.com', '/professional-man-david-agent.jpg', 'busy', 'agent', 4, 10.2, 4.7),

-- E-commerce agents
('660e8400-e29b-41d4-a716-446655440003', 'Jessica Martinez', 'jessica.m@ecommerce.com', '/professional-woman-maria-agent.jpg', 'online', 'agent', 5, 6.8, 4.6),
('660e8400-e29b-41d4-a716-446655440004', 'Alex Johnson', 'alex.j@ecommerce.com', '/professional-person-alex-agent.jpg', 'online', 'agent', 3, 7.5, 4.8),

-- Banking agents
('660e8400-e29b-41d4-a716-446655440005', 'Robert Williams', 'robert.w@banking.com', '/professional-man-marcus.jpg', 'busy', 'supervisor', 2, 15.3, 4.9),
('660e8400-e29b-41d4-a716-446655440006', 'Patricia Davis', 'patricia.d@banking.com', '/professional-woman-emily.jpg', 'online', 'agent', 4, 11.2, 4.7),

-- SaaS agents
('660e8400-e29b-41d4-a716-446655440007', 'David Kim', 'david.k@saas.com', '/professional-asian-man-james.jpg', 'online', 'agent', 3, 18.5, 4.8),
('660e8400-e29b-41d4-a716-446655440008', 'Emily Rodriguez', 'emily.r@saas.com', '/professional-woman-rachel.jpg', 'online', 'agent', 2, 16.2, 4.9)
ON CONFLICT (id) DO NOTHING;

-- Note: Conversations and messages will be inserted via the application
-- This seed file focuses on reference data (customers and agents)



