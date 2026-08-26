drop policy if exists "Published questions are readable" on public.quiz_questions;
create policy "Quiz questions are not directly readable" on public.quiz_questions for select using (false);
