-- Fix: remove broad listing policy on covers bucket
-- Public bucket serves files via direct URL, no SELECT policy needed on storage.objects
drop policy if exists "Anyone can view covers" on storage.objects;
