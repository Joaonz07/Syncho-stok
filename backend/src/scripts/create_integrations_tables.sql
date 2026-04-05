-- Tabelas para integracoes WhatsApp/Instagram
-- Execute no banco (Supabase SQL editor) se desejar persistencia completa.

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  provider text not null check (provider in ('WHATSAPP', 'INSTAGRAM')),
  connected boolean not null default false,
  token text,
  account_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, provider)
);

create table if not exists integration_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  provider text not null check (provider in ('WHATSAPP', 'INSTAGRAM')),
  conversation_id text not null,
  user_id text not null,
  user_name text,
  sender_role text not null check (sender_role in ('ADMIN', 'CLIENT')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_integrations_company_provider
  on integrations(company_id, provider);

create index if not exists idx_integration_messages_lookup
  on integration_messages(company_id, provider, conversation_id, created_at desc);
