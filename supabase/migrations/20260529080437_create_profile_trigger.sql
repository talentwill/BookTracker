create or replace function public.handle_new_user()
returns trigger
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Revoke direct API access to trigger function
revoke execute on function public.handle_new_user() from anon, authenticated;
