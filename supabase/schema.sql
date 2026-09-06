-- ============================================================
-- GESTIÓN SALÓN — Schema completo para Supabase (Postgres)
-- Pega este archivo completo en el SQL Editor de tu proyecto
-- Supabase y ejecútalo de una sola vez.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. TABLAS PRINCIPALES
-- ============================================================
-- (las tablas van primero: la función helper de la sección 2
-- referencia business_members, así que debe existir antes)

create table if not exists businesses (
  id uuid primary key,
  name text not null default 'Mi Salón',
  business_type text default 'individual',
  team_size int,
  onboarding_completed boolean default false,
  legal_name text,
  tax_id text,
  phone text,
  address text,
  logo_url text,
  currency_symbol text default '$',
  tax_enabled boolean default false,
  tax_percentage numeric default 0,
  tax_included_in_price boolean default true,
  payment_methods jsonb default '{"efectivo":true,"transferencia":true,"tarjeta":true,"credito":true}',
  global_low_stock_alert boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee', -- 'admin' | 'employee'
  employee_name text,
  role_title text,
  created_at timestamptz default now(),
  unique (business_id, user_id)
);

create table if not exists business_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  pct_inventory int default 40,
  pct_operations int default 30,
  pct_savings int default 15,
  pct_personal int default 15,
  updated_at timestamptz default now()
);

create table if not exists employee_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null unique,
  used boolean default false,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  purchase_price numeric default 0,
  sale_price numeric not null,
  stock int not null default 0,
  min_stock int not null default 0,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  items jsonb not null default '[]',
  total numeric not null default 0,
  profit numeric not null default 0,
  payment_method text,
  created_at timestamptz default now()
);

create table if not exists customer_credits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  amount numeric not null,
  amount_paid numeric not null default 0,
  status text not null default 'pendiente', -- pendiente | parcial | pagado
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  invoice_number text not null,
  subtotal numeric not null,
  tax_amount numeric not null default 0,
  total numeric not null,
  created_at timestamptz default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid,
  action text not null,
  created_at timestamptz default now()
);

-- --- Módulos nuevos del salón ---

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  category text,
  duration_minutes int not null default 30,
  price numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists specialist_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null, -- id del admin o de business_members.user_id
  service_id uuid not null references services(id) on delete cascade,
  commission_pct numeric default 0,
  created_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  employee_id uuid not null,
  service_id uuid not null references services(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pendiente', -- pendiente | confirmada | completada | cancelada | no_show
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. FUNCIÓN HELPER: resuelve el business_id del usuario actual
-- ============================================================
-- Si el usuario es empleado, business_members tiene su fila.
-- Si es admin (dueño), su propio auth.uid() ES el business_id
-- (así es como el front-end crea el negocio en el primer login).
create or replace function public.get_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select business_id from business_members where user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

grant execute on function public.get_current_business_id() to authenticated;

-- ============================================================
-- 3. ÍNDICES
-- ============================================================
create index if not exists idx_members_business on business_members(business_id);
create index if not exists idx_customers_business on customers(business_id);
create index if not exists idx_products_business on products(business_id);
create index if not exists idx_sales_business on sales(business_id);
create index if not exists idx_credits_business on customer_credits(business_id);
create index if not exists idx_invoices_business on invoices(business_id);
create index if not exists idx_activity_business on activity_log(business_id);
create index if not exists idx_services_business on services(business_id);
create index if not exists idx_specserv_business on specialist_services(business_id);
create index if not exists idx_appt_business_date on appointments(business_id, start_at);
create index if not exists idx_invites_code on employee_invites(code);

-- ============================================================
-- 4. FUNCIÓN RPC: canjear código de invitación de empleado
-- ============================================================
create or replace function public.redeem_invite_code(input_code text, input_employee_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id
  from employee_invites
  where code = input_code and used = false
  limit 1;

  if v_business_id is null then
    raise exception 'Código de invitación inválido o ya utilizado';
  end if;

  insert into business_members (business_id, user_id, role, employee_name)
  values (v_business_id, auth.uid(), 'employee', input_employee_name)
  on conflict (business_id, user_id) do nothing;

  update employee_invites
    set used = true, used_by = auth.uid(), used_at = now()
    where code = input_code;

  return v_business_id;
end;
$$;

grant execute on function public.redeem_invite_code(text, text) to authenticated;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
-- Regla general: cualquier miembro del negocio (admin o empleado)
-- puede leer/escribir los datos de SU negocio. La separación de
-- permisos admin/empleado en pantalla ya la hace el front-end
-- (nav-admin-only); esto puede reforzarse más adelante si lo necesitas.

alter table businesses enable row level security;
create policy "select_own_business" on businesses for select using (id = get_current_business_id());
create policy "insert_own_business" on businesses for insert with check (id = auth.uid());
create policy "update_own_business" on businesses for update using (id = auth.uid());

alter table business_members enable row level security;
create policy "select_team" on business_members for select using (business_id = get_current_business_id());
create policy "admin_insert_members" on business_members for insert with check (business_id = auth.uid());
create policy "admin_update_members" on business_members for update using (business_id = auth.uid());
create policy "admin_delete_members" on business_members for delete using (business_id = auth.uid());

alter table business_settings enable row level security;
create policy "select_settings" on business_settings for select using (business_id = get_current_business_id());
create policy "admin_upsert_settings_insert" on business_settings for insert with check (business_id = auth.uid());
create policy "admin_upsert_settings_update" on business_settings for update using (business_id = auth.uid());

alter table employee_invites enable row level security;
create policy "admin_manage_invites" on employee_invites for all
  using (business_id = auth.uid()) with check (business_id = auth.uid());

alter table customers enable row level security;
create policy "members_all_customers" on customers for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table products enable row level security;
create policy "members_all_products" on products for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table sales enable row level security;
create policy "members_all_sales" on sales for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table customer_credits enable row level security;
create policy "members_all_credits" on customer_credits for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table invoices enable row level security;
create policy "members_all_invoices" on invoices for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table activity_log enable row level security;
create policy "members_select_activity" on activity_log for select using (business_id = get_current_business_id());
create policy "members_insert_activity" on activity_log for insert with check (business_id = get_current_business_id());

alter table services enable row level security;
create policy "members_all_services" on services for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table specialist_services enable row level security;
create policy "members_all_specserv" on specialist_services for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

alter table appointments enable row level security;
create policy "members_all_appointments" on appointments for all
  using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());

-- ============================================================
-- 6. STORAGE — bucket para logos del salón
-- ============================================================
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy "public_read_logos" on storage.objects
  for select using (bucket_id = 'business-logos');

create policy "business_upload_own_logo" on storage.objects
  for insert with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_current_business_id()::text
  );

create policy "business_update_own_logo" on storage.objects
  for update using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_current_business_id()::text
  );

-- ============================================================
-- FIN DEL SCRIPT
-- Recuerda: en el HTML, reemplaza SUPABASE_URL y SUPABASE_ANON_KEY
-- con las credenciales de tu proyecto (Project Settings > API).
-- ============================================================
