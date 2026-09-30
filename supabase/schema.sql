-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Teams
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  is_saved boolean default false,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Players
create table players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  role text check (role in ('batsman', 'bowler', 'all-rounder', 'wicket-keeper')) default 'batsman',
  avatar_url text,
  batting_order int,
  jersey_no int,
  user_id uuid references auth.users(id),
  invite_token text unique,
  status text default 'active' check (status in ('invited', 'active')),
  created_at timestamptz default now()
);

-- Matches
create table matches (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  venue text,
  date date,
  overs int not null default 20,
  status text default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  toss_winner uuid references teams(id),
  toss_decision text check (toss_decision in ('bat', 'field')),
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Match Teams (links matches to 2 teams)
create table match_teams (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  innings_no int check (innings_no in (1, 2)),
  unique(match_id, innings_no)
);

-- Innings
create table innings (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade,
  batting_team_id uuid references teams(id),
  bowling_team_id uuid references teams(id),
  innings_number int,
  total_runs int default 0,
  total_wickets int default 0,
  total_overs numeric default 0,
  status text default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  created_at timestamptz default now()
);

-- Deliveries (ball by ball)
create table deliveries (
  id uuid primary key default uuid_generate_v4(),
  innings_id uuid references innings(id) on delete cascade,
  over_number int not null,
  ball_number int not null,
  batsman_id uuid references players(id),
  bowler_id uuid references players(id),
  runs int default 0,
  extras_type text check (extras_type in ('wide', 'no-ball', 'bye', 'leg-bye')),
  extras_runs int default 0,
  is_wicket boolean default false,
  wicket_type text check (wicket_type in ('bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket', 'retired')),
  fielder_id uuid references players(id),
  is_valid_ball boolean default true,
  commentary text,
  created_at timestamptz default now()
);

-- RLS Policies
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_teams enable row level security;
alter table innings enable row level security;
alter table deliveries enable row level security;

-- Matches: anyone can read, only creator can write
create policy "public read matches" on matches for select using (true);
create policy "owner insert matches" on matches for insert with check (auth.uid() = created_by);
create policy "owner update matches" on matches for update using (auth.uid() = created_by);

-- Teams: anyone can read, only creator can write
create policy "public read teams" on teams for select using (true);
create policy "owner insert teams" on teams for insert with check (auth.uid() = created_by);
create policy "owner update teams" on teams for update using (auth.uid() = created_by);

-- Players: anyone can read
create policy "public read players" on players for select using (true);
create policy "auth insert players" on players for insert with check (auth.uid() is not null);
create policy "auth update players" on players for update using (auth.uid() is not null);

-- Match teams: public read, auth insert
create policy "public read match_teams" on match_teams for select using (true);
create policy "auth insert match_teams" on match_teams for insert with check (auth.uid() is not null);

-- Innings: public read, auth insert/update
create policy "public read innings" on innings for select using (true);
create policy "auth insert innings" on innings for insert with check (auth.uid() is not null);
create policy "auth update innings" on innings for update using (auth.uid() is not null);

-- Deliveries: public read, auth insert/delete
create policy "public read deliveries" on deliveries for select using (true);
create policy "auth insert deliveries" on deliveries for insert with check (auth.uid() is not null);
create policy "auth delete deliveries" on deliveries for delete using (auth.uid() is not null);
