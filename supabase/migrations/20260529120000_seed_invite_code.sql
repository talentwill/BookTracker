-- Initial invite code for first user registration
INSERT INTO invite_codes (code)
SELECT 'booktracker2024'
WHERE NOT EXISTS (SELECT 1 FROM invite_codes WHERE code = 'booktracker2024');
