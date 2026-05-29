-- Add a complete book with author, TOC, round, and chapter statuses
create or replace function add_book(
  p_title text,
  p_author_name text,
  p_toc_text text,
  p_meta jsonb default '{}'::jsonb
) returns jsonb as $$
declare
  v_author_id uuid;
  v_book_id uuid;
  v_round_id uuid;
  v_toc_item_id uuid;
  v_item jsonb;
  v_parent_stack uuid[] := '{}';
  v_indent_stack int[] := '{}';
  v_current_indent int;
  v_book books%rowtype;
begin
  -- Find or create author
  select id into v_author_id from authors where user_id = auth.uid() and name = p_author_name limit 1;
  if v_author_id is null then
    insert into authors (user_id, name) values (auth.uid(), p_author_name) returning id into v_author_id;
  end if;

  -- Create book
  insert into books (user_id, author_id, title, toc_text, publisher, publish_date, isbn, cover_url, douban_id, douban_rating)
  values (
    auth.uid(), v_author_id, p_title, p_toc_text,
    p_meta->>'publisher', p_meta->>'publishDate', p_meta->>'isbn', p_meta->>'coverUrl',
    p_meta->>'doubanId', p_meta->>'doubanRating'
  ) returning * into v_book;

  -- Create initial reading round
  insert into reading_rounds (book_id, round_number, status)
  values (v_book.id, 1, 'active') returning id into v_round_id;

  -- Parse and create TOC items from JSON array
  if p_meta ? 'tocItems' then
    for v_item in select * from jsonb_array_elements(p_meta->'tocItems')
    loop
      v_current_indent := (v_item->>'indent')::int;

      -- Pop stack to find correct parent
      while array_length(v_indent_stack, 1) > 0 and v_indent_stack[array_length(v_indent_stack, 1)] >= v_current_indent loop
        v_indent_stack := v_indent_stack[1:array_length(v_indent_stack, 1) - 1];
        v_parent_stack := v_parent_stack[1:array_length(v_parent_stack, 1) - 1];
      end loop;

      insert into toc_items (book_id, parent_id, title, sort_order)
      values (
        v_book.id,
        case when array_length(v_parent_stack, 1) > 0 then v_parent_stack[array_length(v_parent_stack, 1)] else null end,
        v_item->>'title',
        (v_item->>'order')::int
      ) returning id into v_toc_item_id;

      v_parent_stack := v_parent_stack || v_toc_item_id;
      v_indent_stack := v_indent_stack || v_current_indent;

      -- Create chapter status for this TOC item
      insert into chapter_statuses (toc_item_id, round_id) values (v_toc_item_id, v_round_id);
    end loop;
  end if;

  return jsonb_build_object('bookId', v_book.id, 'roundId', v_round_id);
end;
$$ language plpgsql security invoker;

-- Delete a book and all related data (cascading via FK)
create or replace function delete_book(p_book_id uuid)
returns void as $$
begin
  if not exists (select 1 from books where id = p_book_id and user_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;
  delete from books where id = p_book_id;
end;
$$ language plpgsql security invoker;

-- Start a new reading round
create or replace function start_new_round(
  p_book_id uuid,
  p_inherit_schedule boolean default false
) returns jsonb as $$
declare
  v_new_round_id uuid;
  v_max_round_number int;
  v_old_round_id uuid;
begin
  if not exists (select 1 from books where id = p_book_id and user_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  -- Mark current round as completed
  update reading_rounds set status = 'completed'
  where book_id = p_book_id and status = 'active'
  returning id into v_old_round_id;

  -- Get max round number
  select coalesce(max(round_number), 0) into v_max_round_number from reading_rounds where book_id = p_book_id;

  -- Create new round
  insert into reading_rounds (book_id, round_number, status)
  values (p_book_id, v_max_round_number + 1, 'active')
  returning id into v_new_round_id;

  -- Create chapter statuses for all TOC items
  if p_inherit_schedule then
    insert into chapter_statuses (toc_item_id, round_id, scheduled_date)
    select cs.toc_item_id, v_new_round_id, cs.scheduled_date
    from chapter_statuses cs
    where cs.round_id = v_old_round_id;
  else
    insert into chapter_statuses (toc_item_id, round_id)
    select id, v_new_round_id from toc_items where book_id = p_book_id;
  end if;

  return jsonb_build_object('roundId', v_new_round_id, 'roundNumber', v_max_round_number + 1);
end;
$$ language plpgsql security invoker;

-- Replace book TOC (for editing)
create or replace function replace_book_toc(
  p_book_id uuid,
  p_items jsonb
) returns void as $$
declare
  v_item jsonb;
  v_parent_stack uuid[] := '{}';
  v_indent_stack int[] := '{}';
  v_current_indent int;
  v_toc_item_id uuid;
  v_round record;
begin
  if not exists (select 1 from books where id = p_book_id and user_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  -- Delete existing TOC items (cascades to chapter_statuses)
  delete from toc_items where book_id = p_book_id;

  -- Rebuild TOC items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_current_indent := (v_item->>'indent')::int;

    while array_length(v_indent_stack, 1) > 0 and v_indent_stack[array_length(v_indent_stack, 1)] >= v_current_indent loop
      v_indent_stack := v_indent_stack[1:array_length(v_indent_stack, 1) - 1];
      v_parent_stack := v_parent_stack[1:array_length(v_parent_stack, 1) - 1];
    end loop;

    insert into toc_items (book_id, parent_id, title, sort_order)
    values (
      p_book_id,
      case when array_length(v_parent_stack, 1) > 0 then v_parent_stack[array_length(v_parent_stack, 1)] else null end,
      v_item->>'title',
      (v_item->>'order')::int
    ) returning id into v_toc_item_id;

    v_parent_stack := v_parent_stack || v_toc_item_id;
    v_indent_stack := v_indent_stack || v_current_indent;
  end loop;

  -- Recreate chapter statuses for active round
  for v_round in select id from reading_rounds where book_id = p_book_id and status = 'active'
  loop
    insert into chapter_statuses (toc_item_id, round_id)
    select id, v_round.id from toc_items where book_id = p_book_id;
  end loop;
end;
$$ language plpgsql security invoker;

-- Validate invite code
create or replace function validate_and_use_invite_code(p_code text, p_user_id uuid)
returns boolean as $$
declare
  v_code_id uuid;
begin
  select id into v_code_id from invite_codes where code = p_code and is_used = false limit 1;
  if v_code_id is null then
    return false;
  end if;

  update invite_codes set is_used = true, used_by = p_user_id, used_at = now() where id = v_code_id;
  return true;
end;
$$ language plpgsql security invoker;
