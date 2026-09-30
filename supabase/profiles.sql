-- Profiles table (public, searchable)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  updated_at timestamptz default now()
);

-- Auto-create profile when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;
create policy "public read profiles" on profiles for select using (true);
create policy "own update profile" on profiles for update using (auth.uid() = id);

-- Grants
grant select on profiles to anon, authenticated;
grant update on profiles to authenticated;

-- Insert profile for any existing users who don't have one yet
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1)
from auth.users
where id not in (select id from public.profiles);
