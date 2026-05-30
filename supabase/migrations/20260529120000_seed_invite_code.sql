-- Initial invite code for first user registration
INSERT INTO invite_codes (code) VALUES ('booktracker2024')
ON CONFLICT (code) DO NOTHING;
