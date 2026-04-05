-- Persistencia da API customizada de integracoes (API keys + webhooks)
-- Execute no editor SQL do Supabase.

create table if not exists custom_integrations_store (
  id integer primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint custom_integrations_store_singleton check (id = 1)
);

insert into custom_integrations_store (id, data)
values (1, '{"companies":{}}'::jsonb)
on conflict (id) do nothing;