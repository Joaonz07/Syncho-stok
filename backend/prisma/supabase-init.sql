create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('ADMIN', 'DEV', 'CLIENT');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type subscription_plan as enum ('BASIC', 'PRO', 'PREMIUM');
  end if;

  if not exists (select 1 from pg_type where typname = 'movement_type') then
    create type movement_type as enum ('IN', 'OUT');
  end if;
end
$$;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text null,
  plan subscription_plan not null default 'BASIC',
  subscription_status text not null default 'ACTIVE',
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  role user_role not null default 'CLIENT',
  company_id uuid null references companies(id) on delete set null,
  access_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  price numeric(10, 2) not null,
  quantity integer not null default 0,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, company_id)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null,
  unit_price numeric(10, 2) not null
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type movement_type not null,
  quantity integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  requester_id uuid not null references users(id) on delete cascade,
  requester_name text null,
  requester_email text null,
  subject text not null,
  message text not null,
  status text not null default 'PENDING',
  admin_response text null,
  resolved_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null,
  priority text not null default 'MEDIA',
  position integer not null default 0,
  value numeric(10, 2) not null default 0,
  notes text null,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists leads
  add column if not exists position integer not null default 0;

alter table if exists companies
  add column if not exists location text null,
  add column if not exists subscription_status text not null default 'ACTIVE',
  add column if not exists expires_at timestamptz null;

alter table if exists users
  add column if not exists access_until timestamptz null;

alter table if exists support_requests
  add column if not exists requester_name text null,
  add column if not exists requester_email text null,
  add column if not exists admin_response text null,
  add column if not exists resolved_by uuid null references users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_users_company_id on users(company_id);
create index if not exists idx_products_company_id on products(company_id);
create index if not exists idx_sales_company_id on sales(company_id);
create index if not exists idx_messages_company_id on messages(company_id);
create index if not exists idx_support_requests_company_id on support_requests(company_id);
create index if not exists idx_support_requests_status_created_at on support_requests(status, created_at desc);
create index if not exists idx_leads_company_id on leads(company_id);
create index if not exists idx_leads_company_status_position on leads(company_id, status, position);
