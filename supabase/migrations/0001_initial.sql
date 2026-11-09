-- Call It! initial schema (PLAN.md §11).
-- Live gameplay runs over Realtime broadcast on channel `room:<CODE>`; the `rooms`
-- row stores the latest state so a dropped phone or a new host can recover it.

create extension if not exists pgcrypto;

-- Player profiles (one per auth user, including anonymous users).
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  avatar jsonb not null default '{"animal":"cat","color":"orange"}',
  premium boolean not null default false,
  party_trial_used boolean not null default false,
  games_played int not null default 0,
  games_won int not null default 0,
  created_at timestamptz not null default now()
);

create table public.rooms (
  code text primary key check (code ~ '^[A-Z]{4}$'),
  host_id uuid not null references public.profiles(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.room_players (
  room_code text references public.rooms(code) on delete cascade,
  player_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_code, player_id)
);

create table public.round_results (
  id bigserial primary key,
  room_code text not null,
  round int not null,
  category text not null,
  question_id text not null,
  challenger_a uuid,
  challenger_b uuid,
  outcome text not null check (outcome in ('A','B','DRAW')),
  bets jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  category text not null,
  mode text not null default 'classic' check (mode in ('classic','party')),
  spicy boolean not null default false,
  type text not null,
  difficulty text not null check (difficulty in ('E','M','H')),
  prompt text not null,
  answer text,
  numeric_answer double precision,
  image text,
  tags text[] not null default '{}',
  active boolean not null default true,
  thumbs_up int not null default 0,
  thumbs_down int not null default 0,
  reports int not null default 0
);

create table public.custom_packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  share_code text unique not null,
  created_at timestamptz not null default now()
);

create table public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.custom_packs(id) on delete cascade,
  category text not null,
  type text not null,
  prompt text not null,
  answer text,
  numeric_answer double precision
);

create table public.cosmetics (
  id text primary key,            -- e.g. 'animal:fox', 'color:gold', 'accessory:crown'
  price int not null,
  available_from timestamptz,
  available_until timestamptz      -- seasonal items
);

create table public.inventory (
  player_id uuid references public.profiles(id) on delete cascade,
  item_id text references public.cosmetics(id),
  acquired_at timestamptz not null default now(),
  primary key (player_id, item_id)
);

create table public.seen_questions (
  player_id uuid references public.profiles(id) on delete cascade,
  question_id text not null,
  seen_at timestamptz not null default now(),
  primary key (player_id, question_id)
);

-- Every token change is a ledger row written only by server functions.
create table public.token_ledger (
  id bigserial primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null,            -- 'game', 'daily', 'rewarded_ad', 'purchase', 'spend:<item>'
  created_at timestamptz not null default now()
);

create view public.token_balances as
  select player_id, coalesce(sum(delta), 0)::int as tokens from public.token_ledger group by player_id;

-- Row-level security ------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.round_results enable row level security;
alter table public.questions enable row level security;
alter table public.custom_packs enable row level security;
alter table public.custom_questions enable row level security;
alter table public.cosmetics enable row level security;
alter table public.inventory enable row level security;
alter table public.seen_questions enable row level security;
alter table public.token_ledger enable row level security;

create policy "profiles readable by all signed-in users" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
-- premium is only changed by the purchase webhook (service role), never by the client.
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update (premium) on public.profiles from authenticated;

create policy "rooms readable" on public.rooms for select to authenticated using (true);
create policy "host creates room" on public.rooms for insert to authenticated with check (host_id = auth.uid());
create policy "host updates room" on public.rooms for update to authenticated using (host_id = auth.uid());
create policy "host deletes room" on public.rooms for delete to authenticated using (host_id = auth.uid());

create policy "room players readable" on public.room_players for select to authenticated using (true);
create policy "join as yourself" on public.room_players for insert to authenticated with check (player_id = auth.uid());
create policy "leave as yourself" on public.room_players for delete to authenticated using (player_id = auth.uid());

create policy "results readable" on public.round_results for select to authenticated using (true);
create policy "host writes results" on public.round_results for insert to authenticated
  with check (exists (select 1 from public.rooms r where r.code = room_code and r.host_id = auth.uid()));

create policy "active questions readable" on public.questions for select to authenticated using (active);
create policy "cosmetics readable" on public.cosmetics for select to authenticated using (true);

create policy "own packs" on public.custom_packs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "packs readable by share code" on public.custom_packs for select to authenticated using (true);
create policy "pack questions readable" on public.custom_questions for select to authenticated using (true);
create policy "owner edits pack questions" on public.custom_questions for all to authenticated
  using (exists (select 1 from public.custom_packs p where p.id = pack_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.custom_packs p where p.id = pack_id and p.owner_id = auth.uid()));

create policy "own inventory readable" on public.inventory for select to authenticated using (player_id = auth.uid());
create policy "own seen questions" on public.seen_questions for all to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());
create policy "own ledger readable" on public.token_ledger for select to authenticated using (player_id = auth.uid());
-- No insert policies on inventory/token_ledger: only server functions (service role) write them.
