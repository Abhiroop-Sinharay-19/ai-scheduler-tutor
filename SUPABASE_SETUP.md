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
5. Add the OpenRouter API key to Supabase's Edge Function secrets and deploy the API:

   ```powershell
   supabase secrets set OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY OPENROUTER_MODEL=qwen/qwen3-235b-a22b-2507
   supabase functions deploy api
   ```

   `OPENROUTER_API_KEY` is read only by the Edge Function and must never use a `VITE_` prefix. `OPENROUTER_MODEL` defaults to the fixed `qwen/qwen3-235b-a22b-2507` instruct model; avoid the `openrouter/free` random model router for reliable multi-turn tutoring. Chat generation uses OpenRouter; query embeddings use Supabase's built-in `gte-small` model in the Edge Function, so Hugging Face Inference Providers are not involved in either generation or embeddings.

6. For local indexing, put `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` in the ignored `.env.local` file, then run `npm run ingest:kb`. The command reads `notes for process`, extracts each slide/page, chunks the text, creates normalized 384-dimensional embeddings locally with the public `Supabase/gte-small` Transformers.js model, and upserts them to Supabase pgvector. The deployed Edge Function uses the matching built-in Supabase `gte-small` model for query embeddings. Unchanged file hashes are skipped; changed files replace their old chunks transactionally after embeddings succeed. Run `npm run ingest:kb:check` to verify parsing and chunking without credentials. Add supported `.pptx`, `.ppt`, `.pdf`, `.docx`, `.txt`, or `.md` files to that folder and rerun the same command.

The browser uses only the public anon key. Database access is protected by row-level security: profiles, progress, simulations, quiz attempts, and chat history belong only to the signed-in user. The `api` Edge Function saves simulations, quiz attempts, and tutor messages, and exposes quiz/resource content. Knowledge chunks are server-only and searchable through a restricted pgvector RPC. Signed-in chat sessions retain recent messages by session ID; citations are returned from the rows retrieved for that turn.
