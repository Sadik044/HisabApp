
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'USD',
  theme_preference text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- jars
create table public.jars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  percentage numeric(5,2) not null,
  color text not null,
  icon text not null,
  balance numeric(14,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, key)
);
alter table public.jars enable row level security;
create policy "own jars all" on public.jars for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.jars(user_id);

-- incomes
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  source text not null,
  note text,
  received_at date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.incomes enable row level security;
create policy "own incomes all" on public.incomes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.incomes(user_id, received_at desc);

-- expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  note text,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create policy "own expenses all" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.expenses(user_id, spent_at desc);
create index on public.expenses(jar_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- new user handler: create profile + seed 6 default jars
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.jars (user_id, key, name, percentage, color, icon, sort_order) values
    (new.id, 'NEC',  'Necessities',         55, '#10B981', 'Home',       1),
    (new.id, 'LTSS', 'Long-Term Savings',   10, '#3B82F6', 'PiggyBank',  2),
    (new.id, 'EDU',  'Education',           10, '#8B5CF6', 'GraduationCap', 3),
    (new.id, 'PLAY', 'Play',                10, '#F59E0B', 'PartyPopper', 4),
    (new.id, 'FFA',  'Financial Freedom',   10, '#EF4444', 'TrendingUp', 5),
    (new.id, 'GIVE', 'Give',                 5, '#EC4899', 'Heart',      6);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- income trigger: distribute amount across jars by percentage
create or replace function public.distribute_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.jars
       set balance = balance + round(new.amount * percentage / 100, 2)
     where user_id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.jars
       set balance = balance - round(old.amount * percentage / 100, 2)
     where user_id = old.user_id;
  elsif tg_op = 'UPDATE' then
    update public.jars
       set balance = balance + round((new.amount - old.amount) * percentage / 100, 2)
     where user_id = new.user_id;
  end if;
  return null;
end;
$$;

create trigger incomes_distribute
  after insert or update or delete on public.incomes
  for each row execute function public.distribute_income();

-- expense trigger: subtract from jar
create or replace function public.apply_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.jars set balance = balance - new.amount where id = new.jar_id;
  elsif tg_op = 'DELETE' then
    update public.jars set balance = balance + old.amount where id = old.jar_id;
  elsif tg_op = 'UPDATE' then
    if new.jar_id = old.jar_id then
      update public.jars set balance = balance - (new.amount - old.amount) where id = new.jar_id;
    else
      update public.jars set balance = balance + old.amount where id = old.jar_id;
      update public.jars set balance = balance - new.amount where id = new.jar_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger expenses_apply
  after insert or update or delete on public.expenses
  for each row execute function public.apply_expense();
