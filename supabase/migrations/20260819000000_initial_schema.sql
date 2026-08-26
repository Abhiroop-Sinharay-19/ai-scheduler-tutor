-- Process Scheduling Tutor: Supabase database schema and initial learning content.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Student',
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  course text not null default 'Operating Systems — CPU Scheduling',
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.algorithms (
  id text primary key,
  name text not null,
  tagline text not null,
  type text not null check (type in ('Preemptive', 'Non-preemptive', 'Both')),
  complexity text not null,
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  overview text not null,
  how_it_works jsonb not null default '[]'::jsonb,
  advantages jsonb not null default '[]'::jsonb,
  disadvantages jsonb not null default '[]'::jsonb,
  exam_questions jsonb not null default '[]'::jsonb,
  ai_explanation text not null
);

create table public.algorithm_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  algorithm_id text not null references public.algorithms(id) on delete cascade,
  mastery integer not null default 0 check (mastery between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, algorithm_id)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.algorithms(id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  answer_index smallint not null check (answer_index >= 0),
  explanation text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  chosen_index smallint not null check (chosen_index >= 0),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  algorithm_id text not null references public.algorithms(id),
  quantum integer check (quantum > 0),
  processes jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 12000),
  context jsonb,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null,
  minutes integer not null check (minutes > 0),
  type text not null,
  is_published boolean not null default true
);

alter table public.profiles enable row level security;
alter table public.algorithm_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.simulations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.algorithms enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.resources enable row level security;

create policy "Users manage their profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage own algorithm progress" on public.algorithm_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own quiz attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "Users create own quiz attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);
create policy "Users manage own simulations" on public.simulations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own chat messages" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Published algorithms are readable" on public.algorithms for select using (true);
-- Quiz answers are served only by the Edge Function after a submission. Keeping
-- the table unreadable to browser roles prevents answer_index from being exposed.
create policy "Quiz questions are not directly readable" on public.quiz_questions for select using (false);
create policy "Published resources are readable" on public.resources for select using (is_published);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger algorithm_progress_updated_at before update on public.algorithm_progress for each row execute procedure public.set_updated_at();

insert into public.algorithms (id, name, tagline, type, complexity, difficulty, overview, ai_explanation) values
  ('fcfs', 'FCFS', 'First Come First Serve — processes run in arrival order.', 'Non-preemptive', 'O(n log n)', 'Beginner', 'The first process to arrive runs first, without preemption.', 'A FIFO queue: first in, first out.'),
  ('sjf', 'SJF', 'Shortest Job First — pick the smallest burst among arrivals.', 'Non-preemptive', 'O(n log n)', 'Intermediate', 'The shortest ready CPU burst runs next.', 'Short jobs first minimises average waiting time.'),
  ('srtf', 'SRTF', 'Shortest Remaining Time First — preemptive SJF.', 'Preemptive', 'O(n log n)', 'Advanced', 'The ready process with the least remaining time runs.', 'A shorter arrival can preempt the current process.'),
  ('rr', 'Round Robin', 'Fixed time quantum, cyclic ready queue.', 'Preemptive', 'O(1) per switch', 'Intermediate', 'Each process receives a fixed CPU quantum in turn.', 'Fair turns trade response time for context switching.'),
  ('priority', 'Priority Scheduling', 'Highest-priority ready process wins the CPU.', 'Both', 'O(log n)', 'Intermediate', 'The ready process with the highest priority is selected.', 'Aging prevents low-priority starvation.')
on conflict (id) do nothing;

insert into public.quiz_questions (category, prompt, options, answer_index, explanation) values
  ('priority', 'Which scheduling algorithm can cause starvation?', '["FCFS", "Round Robin", "Priority Scheduling", "None of these"]', 2, 'Priority scheduling can indefinitely delay low-priority processes; aging fixes it.'),
  ('srtf', 'In SRTF, when is a running process preempted?', '["When its quantum expires", "When a shorter remaining job arrives", "Only for I/O", "Never"]', 1, 'SRTF switches when an arriving process needs less time than the running process has left.'),
  ('sjf', 'Why does SJF minimise average waiting time?', '["Circular queue", "Newest process first", "Short bursts reduce cumulative waiting", "Equal CPU shares"]', 2, 'Putting short jobs first reduces the waiting accumulated by other jobs.'),
  ('rr', 'As the Round Robin quantum grows very large, RR behaves like:', '["SJF", "SRTF", "FCFS", "Priority"]', 2, 'With no quantum expiry before completion, RR becomes FCFS.'),
  ('fcfs', 'The convoy effect in FCFS refers to:', '["Multiple CPUs", "Short processes behind a long one", "Context switching", "Priority inversion"]', 1, 'A long job at the queue head delays every later short job.');
