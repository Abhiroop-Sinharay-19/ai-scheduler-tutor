alter table public.profiles
  add column if not exists institution text check (char_length(institution) <= 120),
  add column if not exists study_year text check (char_length(study_year) <= 40),
  add column if not exists learning_goal text check (char_length(learning_goal) <= 80);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, level, institution, study_year, learning_goal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case new.raw_user_meta_data ->> 'level'
      when 'Intermediate' then 'Intermediate'
      when 'Advanced' then 'Advanced'
      else 'Beginner'
    end,
    nullif(new.raw_user_meta_data ->> 'institution', ''),
    nullif(new.raw_user_meta_data ->> 'study_year', ''),
    nullif(new.raw_user_meta_data ->> 'learning_goal', '')
  );
  return new;
end;
$$;
