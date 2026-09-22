create extension if not exists pgcrypto;

create type public.game_mode as enum ('practice', 'public', 'private');
create type public.match_status as enum ('waiting', 'active', 'finished', 'cancelled');
create type public.lobby_status as enum ('waiting', 'ready', 'started', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  elo integer not null default 1000 check (elo >= 0),
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode public.game_mode not null,
  player_one uuid not null references public.profiles(id),
  player_two uuid references public.profiles(id),
  status public.match_status not null default 'waiting',
  player_one_guesses smallint not null default 0 check (player_one_guesses between 0 and 6),
  player_two_guesses smallint not null default 0 check (player_two_guesses between 0 and 6),
  player_one_solved boolean not null default false,
  player_two_solved boolean not null default false,
  player_one_solve_count smallint check (player_one_solve_count between 1 and 6),
  player_two_solve_count smallint check (player_two_solve_count between 1 and 6),
  result text check (result in ('player_one', 'player_two', 'draw')),
  winner_id uuid references public.profiles(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (player_two is null or player_two <> player_one)
);

create table public.allowed_words (
  word text primary key check (word ~ '^[a-z]{5}$')
);

-- This table contains the answer and has no client policies. Only the trusted
-- submit_match_guess() function can read it during an active match.
create table public.match_secrets (
  match_id uuid primary key references public.matches(id) on delete cascade,
  secret_word text not null references public.allowed_words(word),
  created_at timestamptz not null default now()
);

-- Raw words and per-tile statuses are private. Clients receive their own
-- response from the function and a color-only opponent projection.
create table public.match_player_states (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  guesses jsonb not null default '[]'::jsonb,
  tile_results jsonb not null default '[]'::jsonb,
  guesses_used smallint not null default 0 check (guesses_used between 0 and 6),
  solved boolean not null default false,
  solve_count smallint check (solve_count between 1 and 6),
  finished boolean not null default false,
  primary key (match_id, player_id)
);

create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  lobby_code text not null unique check (lobby_code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references public.profiles(id),
  guest_id uuid references public.profiles(id),
  status public.lobby_status not null default 'waiting',
  created_at timestamptz not null default now(),
  check (guest_id is null or guest_id <> host_id)
);

create table public.matchmaking_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  elo integer not null check (elo >= 0),
  joined_at timestamptz not null default now()
);

create table public.match_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  player_one uuid not null references public.profiles(id),
  player_two uuid not null references public.profiles(id),
  result text not null check (result in ('player_one', 'player_two', 'draw')),
  player_one_elo_change integer not null,
  player_two_elo_change integer not null,
  finished_at timestamptz not null default now()
);

insert into public.allowed_words (word) values
  ('apple'), ('brave'), ('crane'), ('crisp'), ('dream'), ('flame'), ('grape'),
  ('house'), ('light'), ('ocean'), ('plant'), ('proud'), ('quiet'), ('river'),
  ('scale'), ('sharp'), ('smile'), ('stone'), ('train'), ('world')
on conflict do nothing;

create index matches_player_one_idx on public.matches (player_one, created_at desc);
create index matches_player_two_idx on public.matches (player_two, created_at desc);
create index lobbies_host_idx on public.lobbies (host_id, created_at desc);
create index lobbies_status_idx on public.lobbies (status, created_at);
create index matchmaking_queue_elo_idx on public.matchmaking_queue (elo, joined_at);
create index match_history_player_one_idx on public.match_history (player_one, finished_at desc);
create index match_history_player_two_idx on public.match_history (player_two, finished_at desc);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_secrets enable row level security;
alter table public.match_player_states enable row level security;
alter table public.lobbies enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.match_history enable row level security;
alter table public.allowed_words enable row level security;

-- Profiles are private to their owner. Statistics are changed only by the
-- server-side match finalizer, so there are no client insert/update policies.
create policy "players read their own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- Match rows intentionally contain counts and flags only, never words or answers.
create policy "players read their own matches" on public.matches
  for select to authenticated using (auth.uid() = player_one or auth.uid() = player_two);

-- A lobby is visible only to its host or joined guest. Lobby mutation happens
-- through trusted functions so users cannot claim or overwrite another lobby.
create policy "lobby members can read lobby" on public.lobbies
  for select to authenticated using (auth.uid() = host_id or auth.uid() = guest_id);

-- Queue rows are never broadly readable. A player may manage only their own
-- queue entry; matchmaking itself is performed by trusted backend code.
create policy "players manage their own queue entry" on public.matchmaking_queue
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "players read their match history" on public.match_history
  for select to authenticated using (auth.uid() = player_one or auth.uid() = player_two);

-- No policies are created for match_secrets, match_player_states, or
-- allowed_words. Normal clients therefore cannot query answers or raw guesses.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_username text := new.raw_user_meta_data ->> 'username';
begin
  if requested_username is null or requested_username !~ '^[a-zA-Z0-9_]{3,20}$' then
    requested_username := 'player_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.profiles (id, username) values (new.id, requested_username);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.submit_match_guess(p_match_id uuid, p_word text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  match_row public.matches%rowtype;
  state_row public.match_player_states%rowtype;
  opponent_state public.match_player_states%rowtype;
  secret text;
  normalized_word text := lower(trim(p_word));
  statuses text[] := array['gray', 'gray', 'gray', 'gray', 'gray'];
  remaining text[];
  answer_letter text;
  answer_index integer;
  guess_index integer;
  guess_number integer;
  solved boolean := false;
  both_finished boolean := false;
  result_value text;
  winner uuid;
  player_one_rating integer;
  player_two_rating integer;
  player_one_score numeric;
  player_two_score numeric;
  player_one_expected numeric;
  player_two_expected numeric;
  player_one_new_rating integer;
  player_two_new_rating integer;
  player_one_change integer;
  player_two_change integer;
  opponent_id uuid;
  player_one_solved_now boolean;
  player_two_solved_now boolean;
  player_one_solve_count_now integer;
  player_two_solve_count_now integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if normalized_word !~ '^[a-z]{5}$' then raise exception 'Guess must contain exactly five letters'; end if;
  if not exists (select 1 from public.allowed_words where word = normalized_word) then raise exception 'Guess is not in the allowed word list'; end if;

  select * into match_row from public.matches where id = p_match_id for update;
  if not found or (match_row.player_one <> current_user_id and match_row.player_two <> current_user_id) then raise exception 'Match not found'; end if;
  if match_row.status <> 'active' then raise exception 'Match is not active'; end if;

  select * into state_row from public.match_player_states where match_id = p_match_id and player_id = current_user_id for update;
  if not found then raise exception 'Player state not found'; end if;
  if state_row.guesses_used >= 6 or state_row.finished then raise exception 'No guesses remaining'; end if;

  select secret_word into secret from public.match_secrets where match_id = p_match_id;
  if secret is null then raise exception 'Match secret unavailable'; end if;
  guess_number := state_row.guesses_used + 1;
  remaining := regexp_split_to_array(secret, '');

  for guess_index in 1..5 loop
    if substr(normalized_word, guess_index, 1) = substr(secret, guess_index, 1) then
      statuses[guess_index] := 'green';
      remaining[guess_index] := '';
    end if;
  end loop;
  for guess_index in 1..5 loop
    if statuses[guess_index] = 'green' then continue; end if;
    answer_letter := substr(normalized_word, guess_index, 1);
    answer_index := 1;
    while answer_index <= 5 loop
      if remaining[answer_index] = answer_letter then
        statuses[guess_index] := 'yellow';
        remaining[answer_index] := '';
        exit;
      end if;
      answer_index := answer_index + 1;
    end loop;
  end loop;

  solved := statuses = array['green', 'green', 'green', 'green', 'green'];
  update public.match_player_states
    set guesses = guesses || jsonb_build_array(normalized_word),
        tile_results = tile_results || jsonb_build_array(to_jsonb(statuses)),
        guesses_used = guess_number,
        solved = solved,
        solve_count = case when solved then guess_number else solve_count end,
        finished = solved or guess_number = 6
    where match_id = p_match_id and player_id = current_user_id;

  update public.matches
    set player_one_guesses = case when player_one = current_user_id then guess_number else player_one_guesses end,
        player_two_guesses = case when player_two = current_user_id then guess_number else player_two_guesses end,
        player_one_solved = case when player_one = current_user_id then solved else player_one_solved end,
        player_two_solved = case when player_two = current_user_id then solved else player_two_solved end,
        player_one_solve_count = case when player_one = current_user_id and solved then guess_number else player_one_solve_count end,
        player_two_solve_count = case when player_two = current_user_id and solved then guess_number else player_two_solve_count end
    where id = p_match_id;

  select * into state_row from public.match_player_states where match_id = p_match_id and player_id = current_user_id;
  select * into opponent_state from public.match_player_states where match_id = p_match_id and player_id <> current_user_id;
  player_one_solved_now := case when match_row.player_one = current_user_id then state_row.solved else opponent_state.solved end;
  player_two_solved_now := case when match_row.player_two = current_user_id then state_row.solved else opponent_state.solved end;
  player_one_solve_count_now := case when match_row.player_one = current_user_id then state_row.solve_count else opponent_state.solve_count end;
  player_two_solve_count_now := case when match_row.player_two = current_user_id then state_row.solve_count else opponent_state.solve_count end;
  both_finished := state_row.finished and coalesce(opponent_state.finished, false);

  if both_finished then
    if match_row.player_two is null then
      result_value := 'draw';
    elsif player_one_solved_now and not player_two_solved_now then
      result_value := 'player_one'; winner := match_row.player_one;
    elsif player_two_solved_now and not player_one_solved_now then
      result_value := 'player_two'; winner := match_row.player_two;
    elsif player_one_solved_now and player_two_solved_now then
      if player_one_solve_count_now < player_two_solve_count_now then result_value := 'player_one'; winner := match_row.player_one;
      elsif player_two_solve_count_now < player_one_solve_count_now then result_value := 'player_two'; winner := match_row.player_two;
      else result_value := 'draw'; end if;
    else result_value := 'draw'; end if;

    select elo into player_one_rating from public.profiles where id = match_row.player_one;
    select elo into player_two_rating from public.profiles where id = match_row.player_two;
    player_one_score := case when result_value = 'player_one' then 1 when result_value = 'player_two' then 0 else 0.5 end;
    player_two_score := 1 - player_one_score;
    player_one_expected := 1 / (1 + power(10, (player_two_rating - player_one_rating)::numeric / 400));
    player_two_expected := 1 / (1 + power(10, (player_one_rating - player_two_rating)::numeric / 400));
    player_one_new_rating := round(player_one_rating + 32 * (player_one_score - player_one_expected));
    player_two_new_rating := round(player_two_rating + 32 * (player_two_score - player_two_expected));
    player_one_change := player_one_new_rating - player_one_rating;
    player_two_change := player_two_new_rating - player_two_rating;

    update public.matches set status = 'finished', result = result_value, winner_id = winner, finished_at = now() where id = p_match_id;
    update public.profiles set elo = player_one_new_rating, games_played = games_played + 1,
      wins = wins + case when result_value = 'player_one' then 1 else 0 end,
      losses = losses + case when result_value = 'player_two' then 1 else 0 end,
      draws = draws + case when result_value = 'draw' then 1 else 0 end,
      current_streak = case when result_value = 'player_one' then current_streak + 1 else 0 end,
      best_streak = greatest(best_streak, case when result_value = 'player_one' then current_streak + 1 else current_streak end)
      where id = match_row.player_one;
    update public.profiles set elo = player_two_new_rating, games_played = games_played + 1,
      wins = wins + case when result_value = 'player_two' then 1 else 0 end,
      losses = losses + case when result_value = 'player_one' then 1 else 0 end,
      draws = draws + case when result_value = 'draw' then 1 else 0 end,
      current_streak = case when result_value = 'player_two' then current_streak + 1 else 0 end,
      best_streak = greatest(best_streak, case when result_value = 'player_two' then current_streak + 1 else current_streak end)
      where id = match_row.player_two;
    insert into public.match_history (match_id, player_one, player_two, result, player_one_elo_change, player_two_elo_change)
      values (p_match_id, match_row.player_one, match_row.player_two, result_value, player_one_change, player_two_change)
      on conflict (match_id) do nothing;
  end if;

  opponent_id := case when match_row.player_one = current_user_id then match_row.player_two else match_row.player_one end;
  return jsonb_build_object(
    'statuses', to_jsonb(statuses), 'solved', solved, 'guessNumber', guess_number,
    'matchFinished', both_finished, 'result', result_value,
    'opponentProgress', jsonb_build_object(
      'guessesUsed', coalesce(opponent_state.guesses_used, 0),
      'tileResults', coalesce(opponent_state.tile_results, '[]'::jsonb),
      'hasSolved', coalesce(opponent_state.solved, false),
      'isFinished', coalesce(opponent_state.finished, false)
    )
  );
end;
$$;

revoke all on function public.submit_match_guess(uuid, text) from public, anon;
grant execute on function public.submit_match_guess(uuid, text) to authenticated;

create or replace function public.finish_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  caller uuid := auth.uid();
  match_row public.matches%rowtype;
  first_state public.match_player_states%rowtype;
  second_state public.match_player_states%rowtype;
  result_value text;
  winner uuid;
  first_rating integer;
  second_rating integer;
  first_score numeric;
  second_score numeric;
  first_expected numeric;
  second_expected numeric;
  first_new_rating integer;
  second_new_rating integer;
  first_change integer;
  second_change integer;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into match_row from public.matches where id = p_match_id for update;
  if not found or (match_row.player_one <> caller and match_row.player_two <> caller) then raise exception 'Match not found'; end if;
  if match_row.status = 'finished' then
    return jsonb_build_object('status', 'finished', 'result', match_row.result, 'winnerId', match_row.winner_id);
  end if;
  if match_row.player_two is null then raise exception 'Match has no second player'; end if;

  select * into first_state from public.match_player_states where match_id = p_match_id and player_id = match_row.player_one;
  select * into second_state from public.match_player_states where match_id = p_match_id and player_id = match_row.player_two;
  if not first_state.finished or not second_state.finished then raise exception 'Both players must finish first'; end if;

  if first_state.solved and not second_state.solved then result_value := 'player_one'; winner := match_row.player_one;
  elsif second_state.solved and not first_state.solved then result_value := 'player_two'; winner := match_row.player_two;
  elsif first_state.solved and second_state.solved and first_state.solve_count < second_state.solve_count then result_value := 'player_one'; winner := match_row.player_one;
  elsif first_state.solved and second_state.solved and second_state.solve_count < first_state.solve_count then result_value := 'player_two'; winner := match_row.player_two;
  else result_value := 'draw'; end if;

  select elo into first_rating from public.profiles where id = match_row.player_one;
  select elo into second_rating from public.profiles where id = match_row.player_two;
  first_score := case when result_value = 'player_one' then 1 when result_value = 'player_two' then 0 else 0.5 end;
  second_score := 1 - first_score;
  first_expected := 1 / (1 + power(10, (second_rating - first_rating)::numeric / 400));
  second_expected := 1 / (1 + power(10, (first_rating - second_rating)::numeric / 400));
  first_new_rating := round(first_rating + 32 * (first_score - first_expected));
  second_new_rating := round(second_rating + 32 * (second_score - second_expected));
  first_change := first_new_rating - first_rating;
  second_change := second_new_rating - second_rating;

  update public.matches set status = 'finished', result = result_value, winner_id = winner, finished_at = now() where id = p_match_id;
  update public.profiles set elo = first_new_rating, games_played = games_played + 1,
    wins = wins + case when result_value = 'player_one' then 1 else 0 end,
    losses = losses + case when result_value = 'player_two' then 1 else 0 end,
    draws = draws + case when result_value = 'draw' then 1 else 0 end,
    current_streak = case when result_value = 'player_one' then current_streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when result_value = 'player_one' then current_streak + 1 else current_streak end)
    where id = match_row.player_one;
  update public.profiles set elo = second_new_rating, games_played = games_played + 1,
    wins = wins + case when result_value = 'player_two' then 1 else 0 end,
    losses = losses + case when result_value = 'player_one' then 1 else 0 end,
    draws = draws + case when result_value = 'draw' then 1 else 0 end,
    current_streak = case when result_value = 'player_two' then current_streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when result_value = 'player_two' then current_streak + 1 else current_streak end)
    where id = match_row.player_two;
  insert into public.match_history (match_id, player_one, player_two, result, player_one_elo_change, player_two_elo_change)
    values (p_match_id, match_row.player_one, match_row.player_two, result_value, first_change, second_change)
    on conflict (match_id) do nothing;
  return jsonb_build_object('status', 'finished', 'result', result_value, 'winnerId', winner, 'playerOneEloChange', first_change, 'playerTwoEloChange', second_change);
end;
$$;

revoke all on function public.finish_match(uuid) from public, anon;
grant execute on function public.finish_match(uuid) to authenticated;

create or replace function public.join_public_matchmaking()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  caller uuid := auth.uid();
  caller_elo integer;
  opponent_id uuid;
  answer text;
  new_match uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select elo into caller_elo from public.profiles where id = caller;
  delete from public.matchmaking_queue where joined_at < now() - interval '10 minutes';
  insert into public.matchmaking_queue (user_id, elo, joined_at) values (caller, caller_elo, now())
    on conflict (user_id) do update set elo = excluded.elo, joined_at = excluded.joined_at;

  select user_id into opponent_id from public.matchmaking_queue
    where user_id <> caller
    order by abs(elo - caller_elo), joined_at
    for update skip locked limit 1;
  if opponent_id is null then return jsonb_build_object('queued', true); end if;
  delete from public.matchmaking_queue where user_id in (caller, opponent_id);
  select word into answer from public.allowed_words order by random() limit 1;
  insert into public.matches (mode, player_one, player_two, status, started_at)
    values ('public', opponent_id, caller, 'active', now()) returning id into new_match;
  insert into public.match_secrets (match_id, secret_word) values (new_match, answer);
  insert into public.match_player_states (match_id, player_id) values (new_match, opponent_id), (new_match, caller);
  return jsonb_build_object('queued', false, 'matchId', new_match);
end;
$$;

create or replace function public.leave_public_matchmaking()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.matchmaking_queue where user_id = auth.uid();
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.join_public_matchmaking() from public, anon;
revoke all on function public.leave_public_matchmaking() from public, anon;
grant execute on function public.join_public_matchmaking() to authenticated;
grant execute on function public.leave_public_matchmaking() to authenticated;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.lobbies;
