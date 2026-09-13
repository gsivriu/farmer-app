-- Cache partajat pentru răspunsurile GNews.
--
-- Ştirile sunt identice pentru toţi utilizatorii, dar până acum fiecare
-- deschidere a tabului „Ştiri" declanşa un apel nou către GNews. Planul
-- gratuit GNews are şi cotă zilnică mică, şi protecţie anti-burst, aşa că
-- apelurile se blocau cu „too many requests in a short period" (confirmat în
-- function_logs pe 2026-09-13 11:56:35) — iar la ţinta de 5000 de utilizatori
-- din ARCHITECTURE.md modelul e complet nefuncţional: O(utilizatori × vizite)
-- apeluri upstream pentru acelaşi conţinut.
--
-- Cu tabelul ăsta devine O(1 apel per fereastră TTL), indiferent de câţi
-- fermieri deschid tabul. Rândul vechi se păstrează şi după expirare: dacă
-- GNews pică sau ne limitează, funcţia serveşte cache-ul expirat în loc de
-- eroare.
create table if not exists public.news_cache (
  cache_key  text primary key,
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

comment on table public.news_cache is
  'Cache partajat al răspunsurilor GNews, scris doar de Edge Function-ul gnews (service_role).';

-- RLS pornit şi *nicio* politică: doar service_role (care ocoleşte RLS) poate
-- citi sau scrie. Clientul nu atinge niciodată tabelul direct — trece prin
-- Edge Function, care autentifică apelantul înainte.
alter table public.news_cache enable row level security;

revoke all on public.news_cache from anon, authenticated;
