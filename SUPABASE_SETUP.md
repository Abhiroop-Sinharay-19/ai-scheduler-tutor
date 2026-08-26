# Supabase setup

This project ships with its database schema and Edge Function in `supabase/`.

1. Create a project at [Supabase](https://supabase.com/dashboard), then copy its project URL and **anon/publishable** key from **Project Settings → API**.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Do not put a `service_role` key in a Vite environment file.
3. Install the Supabase CLI, log in, and run these commands from the project root:

   ```powershell
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase functions deploy api
   ```

4. In **Authentication → URL Configuration**, add your local URL (`http://localhost:3000` or the port Vite prints) and production URL. Enable email/password sign-in and email confirmation. In the **Confirm signup** email template, include `{{ .Token }}` so users receive a one-time verification code; the app verifies that code on `/verify` and does not consume email links.

The browser uses only the public anon key. Database access is protected by row-level security: profiles, progress, simulations, quiz attempts, and chat history belong only to the signed-in user. The `api` Edge Function saves simulations, quiz attempts, and tutor messages, and exposes quiz/resource content.
