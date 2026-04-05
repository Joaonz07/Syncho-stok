create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  company_id uuid not null references public.companies(id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (product_id, company_id)
);

create index if not exists idx_stock_company_id on public.stock(company_id);
create index if not exists idx_stock_product_id on public.stock(product_id);

create or replace function public.set_stock_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stock_updated_at on public.stock;
create trigger trg_stock_updated_at
before update on public.stock
for each row
execute function public.set_stock_updated_at();
