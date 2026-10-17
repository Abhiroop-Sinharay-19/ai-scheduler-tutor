# Process Scheduling Tutor

A React application for learning CPU process scheduling. It combines a deterministic scheduler and Gantt chart simulator with quizzes, per-user progress, course resources, and an AI tutor grounded in course documents.

## Implemented features

- FCFS, SJF, SRTF, Round Robin, and Priority scheduling, including Gantt charts, per-process metrics, and step-by-step timelines.
- Supabase email/password authentication, quiz attempts, simulations, and user-scoped progress.
- An AI tutor served by a Supabase Edge Function. The function sends requests to OpenRouter and supplies retrieved course passages and deterministic scheduling results as context.
- An optional document ingestion script that extracts and chunks course notes, generates 384-dimensional `Supabase/gte-small` embeddings, and writes the vectors and source metadata to Supabase pgvector.

Fine-tuning is not implemented as a completed training run. The `training/` directory describes an experiment; the application defaults to its configured OpenRouter model. Do not configure the optional fine-tuned endpoint unless a model has actually been trained, evaluated, and hosted.

## Architecture

| Area                        | Implementation                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Frontend                    | React 19, Vite 8, TanStack Start and TanStack Router, Tailwind CSS 4                                                  |
| Hosting                     | GitHub Pages, with a statically built TanStack Start SPA served from `dist/`                                          |
| Authentication and database | Supabase Auth and PostgreSQL; migrations and RLS policies are in `supabase/migrations/`                               |
| API                         | `supabase/functions/api/`; it verifies Supabase user tokens and uses server-side credentials for protected operations |
| AI                          | OpenRouter chat completions called only from the Edge Function                                                        |
| Retrieval                   | Local document ingestion, `gte-small` embeddings, Supabase pgvector, and a restricted matching RPC                    |
| Scheduling                  | Deterministic calculations in `src/lib/scheduling.ts`; tutor requests also receive scheduling context from the API    |

Protected user records are scoped by RLS. Quiz answers and knowledge chunks are not readable by browser roles. The browser receives only the Supabase URL and public anon/publishable key; the service-role key and OpenRouter key belong on trusted servers only.

## Requirements

- Node.js 22.12 or newer and npm (TanStack Start requires Node 22.12+).
- A Supabase project for authentication, database, and Edge Functions.
- An OpenRouter API key for live AI tutor responses.
- The Supabase CLI for database and Edge Function deployment.
- GitHub Actions enabled and Pages configured to use **GitHub Actions** as the publishing source.

## Local development

Install dependencies from the committed npm lockfile and create a local environment file:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set these public Supabase values in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Then run the app:

```powershell
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Add it to the Supabase Auth URL allow list. Never put a service-role key or OpenRouter key in a `VITE_` variable.

## Validation commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run preview` serves the production static build locally. The GitHub Pages build runs TanStack Start in SPA mode, writes the site to `dist/`, and creates `dist/404.html` so direct route loads and refreshes return to the client router. GitHub Pages cannot run the app's SSR server; its existing Supabase Edge Function remains the backend.

## Environment variables and secrets

### GitHub Pages frontend build

Add these repository variables under **Settings → Secrets and variables → Actions → Variables**. They are public client configuration and are embedded in the browser bundle:

| Variable                 | Required | Purpose                                                                                         |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL; public                                                                    |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anon/publishable client key; public                                                    |
| `VITE_API_BASE_URL`      | No       | Override the Supabase Edge Function API base only when using a separately hosted compatible API |

`VITE_API_BASE_URL` is optional, sent to the browser, and must point to a public API. It is not a place for credentials. The workflow stops with a clear error if either required Supabase variable is missing.

### Supabase Edge Function secrets

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Set the AI provider secret through the Supabase CLI or project dashboard:

| Secret               | Required                  | Purpose                                             |
| -------------------- | ------------------------- | --------------------------------------------------- |
| `OPENROUTER_API_KEY` | Yes for live AI responses | OpenRouter credential; server-side only             |
| `OPENROUTER_MODEL`   | No                        | Model name; defaults to `qwen/qwen3-235b-a22b-2507` |

The function also has an opt-in OpenAI-compatible endpoint configuration (`FINETUNED_QWEN_BASE_URL`, `FINETUNED_QWEN_MODEL`, and `FINETUNED_QWEN_API_KEY`). Leave all three unset unless a trained model is hosted and ready; partial configuration causes the tutor to report a configuration error.

### Local document ingestion

For `npm run ingest:kb`, keep `SUPABASE_SERVICE_ROLE_KEY` in the ignored `.env.local` file. `SUPABASE_URL` is accepted by the script; otherwise it uses `VITE_SUPABASE_URL`. Never commit `.env.local`, `.env`, or service credentials.

## Deploy the frontend to GitHub Pages

1. Set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` repository variables described above. Do not add service-role or OpenRouter keys to GitHub Pages or the frontend build.
2. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. Push to `main` to run `.github/workflows/deploy.yml`, or start **Deploy Process Scheduling Tutor to GitHub Pages** from the Actions tab. The workflow runs `npm ci`, lint, type-check, tests, and the production build, then uploads only `dist/` with the official Pages artifact action.
4. The project site URL is `https://<owner>.github.io/<repository>/` (for this repository: `https://abhiroop-sinharay-19.github.io/ai-scheduler-tutor/`). The workflow sets Vite's base path to `/ai-scheduler-tutor/`; the router and assets use the same base.
5. In Supabase **Authentication → URL Configuration**, set the site URL and allow the published Pages URL. Add the local development URL while developing.
6. Check the Actions run and open the Pages URL. Verify the landing page, sign-up and email verification, sign-in, simulator, and authenticated data-backed routes.

This is a client-rendered static deployment. Supabase Auth, PostgreSQL, RLS, the Edge Function, OpenRouter calls, and pgvector retrieval remain on Supabase; private credentials are not moved into the frontend. TanStack Start's SPA mode is intended for static hosts and generates the application shell at build time ([TanStack SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)). GitHub's official Pages workflow uploads the generated artifact rather than repository source ([GitHub Pages Actions guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)).

## Deploy Supabase migrations and the API

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then run from the repository root:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
supabase secrets set OPENROUTER_MODEL=qwen/qwen3-235b-a22b-2507
supabase functions deploy api
```

The Edge Function validates the user's Supabase access token itself (`verify_jwt = false` in `supabase/config.toml`), then uses the server-side service role for database work. Keep RLS enabled; do not expose or put the service-role key in the browser. Configure the Supabase Auth site URL and allowed redirect URLs for local development and the production domain.

For email confirmation, leave Supabase email confirmation enabled and set the **Confirm signup** email template to include `{{ .Token }}`. The app's `/verify` page accepts that one-time code and calls Supabase Auth to verify it. Configure SMTP in Supabase if the default email service is not suitable for production.

## Ingest course notes and verify RAG

Place supported `.ppt`, `.pptx`, `.pdf`, `.docx`, `.txt`, or `.md` course files in `notes for process/`. The dry run extracts and chunks text without credentials or database writes:

```powershell
npm run ingest:kb:check
```

After applying the RAG migration and adding `SUPABASE_SERVICE_ROLE_KEY` to the ignored local environment file, index the documents:

```powershell
npm run ingest:kb
```

Ingestion extracts text, chunks it, generates normalized 384-dimensional embeddings locally, and replaces changed document rows through the restricted `replace_knowledge_document` RPC. The Edge Function embeds questions using Supabase's `gte-small` model and queries `match_knowledge_chunks` before calling the LLM. Empty retrieval returns a clarification response rather than fabricated course references.

The dry run verifies extraction and chunking only. A successful ingestion and live retrieval smoke check against your configured Supabase project are required before claiming the production RAG corpus works. The AI response path also requires a valid OpenRouter secret and provider quota.

## Repository map

```text
src/routes/                 File-based application routes
src/components/             Shared UI and simulator components
src/lib/api.ts              Frontend API client and query definitions
src/lib/scheduling.ts       Deterministic scheduling calculations
src/lib/supabase.ts         Browser Supabase Auth client
supabase/functions/api/     Edge Function API and scheduling/tutor behavior
supabase/migrations/        PostgreSQL schema, RLS, and vector search
scripts/                    Course ingestion and RAG verification tools
notes for process/           Source course documents for ingestion
training/                   Fine-tuning experiment notes (no completed model)
```

## Troubleshooting

- **Supabase configuration error:** check the two `VITE_SUPABASE_*` values in `.env.local` or the GitHub Actions repository variables, then restart or redeploy after changing build variables.
- **Sign-up verification code fails:** check the Supabase Confirm signup template uses `{{ .Token }}`, and use the newest code sent to the same email address.
- **Tutor says it is not configured:** set `OPENROUTER_API_KEY` as a Supabase Edge Function secret and redeploy the `api` function.
- **Tutor has no relevant course passage:** ingest the course notes, then run the live retrieval check. The parser dry run does not populate Supabase.
- **Pages shows the README or source files:** confirm Pages uses **GitHub Actions** and inspect that the workflow uploaded `dist/`, not the repository root.
- **Nested route refresh returns 404:** confirm `dist/404.html` exists and matches `dist/index.html`, and that the Pages base is `/ai-scheduler-tutor/`.
- **Quiz page has no questions:** apply the Supabase migrations and ensure published quiz-question seed data exists in the database.
