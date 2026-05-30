-- Add display preference columns to profiles table
alter table profiles
  add column if not exists theme text default 'system',
  add column if not exists language text default 'zh',
  add column if not exists books_per_page int default 20;
