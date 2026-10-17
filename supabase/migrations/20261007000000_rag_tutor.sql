-- Process Scheduling tutor knowledge base and per-conversation state.
create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_chunks (
  id bigint generated always as identity primary key,
  document_hash text not null,
  chunk_index integer not null,
  filename text not null,
  page_number integer,
  topic text,
  section text,
  content text not null,
  embedding extensions.vector(384) not null,
  created_at timestamptz not null default now(),
  unique (document_hash, chunk_index)
);

create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists knowledge_chunks_document_hash_idx
  on public.knowledge_chunks (document_hash);

alter table public.knowledge_chunks enable row level security;
revoke all on public.knowledge_chunks from anon, authenticated;
grant all on public.knowledge_chunks to service_role;
grant usage, select on sequence public.knowledge_chunks_id_seq to service_role;

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(384),
  match_threshold real default 0.32,
  match_count integer default 5
)
returns table (
  id bigint,
  filename text,
  page_number integer,
  topic text,
  section text,
  content text,
  similarity real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    kc.id,
    kc.filename,
    kc.page_number,
    kc.topic,
    kc.section,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::real as similarity
  from public.knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding) >= greatest(0, least(match_threshold, 1))
  order by kc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 8));
$$;

revoke all on function public.match_knowledge_chunks(extensions.vector, real, integer) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(extensions.vector, real, integer) to service_role;

create or replace function public.replace_knowledge_document(
  document_filename text,
  document_hash_value text,
  document_chunks jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  inserted_count integer;
begin
  delete from public.knowledge_chunks
  where filename = document_filename or document_hash = document_hash_value;

  insert into public.knowledge_chunks (
    document_hash, chunk_index, filename, page_number, topic, section, content, embedding
  )
  select
    item.document_hash,
    item.chunk_index,
    item.filename,
    item.page_number,
    item.topic,
    item.section,
    item.content,
    item.embedding::text::extensions.vector(384)
  from jsonb_to_recordset(document_chunks) as item(
    document_hash text,
    chunk_index integer,
    filename text,
    page_number integer,
    topic text,
    section text,
    content text,
    embedding jsonb
  );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.replace_knowledge_document(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_knowledge_document(text, text, jsonb) to service_role;

alter table public.chat_messages add column if not exists session_id text;
alter table public.chat_messages add column if not exists teaching_state jsonb not null default '{}'::jsonb;
create index if not exists chat_messages_session_idx
  on public.chat_messages (user_id, session_id, created_at desc);
