-- profiles
alter table profiles enable row level security;
create policy if not exists "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy if not exists "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy if not exists "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- authors
alter table authors enable row level security;
create policy if not exists "Users can CRUD own authors" on authors for all using (auth.uid() = user_id);

-- books
alter table books enable row level security;
create policy if not exists "Users can CRUD own books" on books for all using (auth.uid() = user_id);

-- toc_items
alter table toc_items enable row level security;
create policy if not exists "Users can CRUD own toc_items" on toc_items for all
  using (exists (select 1 from books where books.id = toc_items.book_id and books.user_id = auth.uid()));

-- reading_rounds
alter table reading_rounds enable row level security;
create policy if not exists "Users can CRUD own reading_rounds" on reading_rounds for all
  using (exists (select 1 from books where books.id = reading_rounds.book_id and books.user_id = auth.uid()));

-- chapter_statuses
alter table chapter_statuses enable row level security;
create policy if not exists "Users can CRUD own chapter_statuses" on chapter_statuses for all
  using (exists (
    select 1 from toc_items
    join books on books.id = toc_items.book_id
    where toc_items.id = chapter_statuses.toc_item_id and books.user_id = auth.uid()
  ));

-- tags
alter table tags enable row level security;
create policy if not exists "Users can CRUD own tags" on tags for all using (auth.uid() = user_id);

-- book_tags
alter table book_tags enable row level security;
create policy if not exists "Users can CRUD own book_tags" on book_tags for all
  using (exists (select 1 from books where books.id = book_tags.book_id and books.user_id = auth.uid()));

-- invite_codes: readable by all for validation, writable by admin
alter table invite_codes enable row level security;
create policy if not exists "Anyone can read invite codes" on invite_codes for select to anon, authenticated using (true);

-- cover_images: readable by all
alter table cover_images enable row level security;
create policy if not exists "Anyone can read cover_images" on cover_images for select using (true);
