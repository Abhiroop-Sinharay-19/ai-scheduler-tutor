-- Verification codes are used only by trusted server-side workflows.
alter table public.email_verifications enable row level security;
revoke all on table public.email_verifications from public, anon, authenticated;
grant all on table public.email_verifications to service_role;
