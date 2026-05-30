-- profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ai_provider text default 'claude',
  ai_api_key text,
  ai_base_url text,
  ai_model text,
  created_at timestamptz default now()
);

-- authors
create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  note text,
  created_at timestamptz default now()
);

-- books
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references authors(id) on delete cascade,
  title text not null,
  toc_text text not null default '',
  publisher text,
  publish_date text,
  isbn text,
  cover_url text,
  douban_id text unique,
  douban_rating text,
  reading_status text,
  started_reading_at timestamptz,
  finished_reading_at timestamptz,
  created_at timestamptz default now()
);

-- toc_items
create table if not exists toc_items (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  parent_id uuid references toc_items(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

-- reading_rounds
create table if not exists reading_rounds (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  round_number integer not null default 1,
  started_at timestamptz default now(),
  status text not null default 'active'
);

-- chapter_statuses
create table if not exists chapter_statuses (
  toc_item_id uuid not null references toc_items(id) on delete cascade,
  round_id uuid not null references reading_rounds(id) on delete cascade,
  checked boolean not null default false,
  checked_at timestamptz,
  scheduled_date date,
  primary key (toc_item_id, round_id)
);

-- tags
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- book_tags
create table if not exists book_tags (
  book_id uuid not null references books(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

-- cover_images
create table if not exists cover_images (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  storage_path text not null,
  created_at timestamptz default now()
);

-- invite_codes
create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references auth.users(id),
  used_by uuid references auth.users(id),
  is_used boolean not null default false,
  created_at timestamptz default now(),
  used_at timestamptz
);

-- Indexes
create index if not exists idx_books_user_id on books(user_id);
create index if not exists idx_books_author_id on books(author_id);
create index if not exists idx_toc_items_book_id on toc_items(book_id);
create index if not exists idx_toc_items_parent_id on toc_items(parent_id);
create index if not exists idx_reading_rounds_book_id on reading_rounds(book_id);
create index if not exists idx_tags_user_id on tags(user_id);
create index if not exists idx_chapter_statuses_round_id on chapter_statuses(round_id);
