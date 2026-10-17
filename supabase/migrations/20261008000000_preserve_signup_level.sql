-- Keep the signup level selected in Auth metadata synchronized with the existing
-- profile row. Profiles remain the source used by the application after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_level text := new.raw_user_meta_data ->> 'level';
begin
  insert into public.profiles (id, full_name, level)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    case
      when requested_level in ('Beginner', 'Intermediate', 'Advanced') then requested_level
      else 'Beginner'
    end
  );
  return new;
end;
$$;

-- Existing accounts created by the earlier trigger kept the database default
-- even though Auth saved the selected level in metadata.
update public.profiles as profile
set level = auth_user.raw_user_meta_data ->> 'level'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.raw_user_meta_data ->> 'level' in ('Beginner', 'Intermediate', 'Advanced')
  and profile.level is distinct from auth_user.raw_user_meta_data ->> 'level';
