-- =================================================================
-- Gestión Salón — Esquema para el módulo de Servicios y Citas
-- =================================================================
-- Este script asume que la app base "Gestión PYME" ya existe en tu
-- proyecto de Supabase con las tablas: businesses, business_members,
-- business_settings, customers, customer_credits, products, sales,
-- invoices, employee_invites, activity_log.
--
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.
-- =================================================================

-- -----------------------------------------------------------------
-- Extensión del módulo de Clientes (5.5 Historial de cliente)
-- -----------------------------------------------------------------
alter table customers add column if not exists notes text;

-- -----------------------------------------------------------------
-- Servicios ofrecidos por el salón (5.1)
-- -----------------------------------------------------------------
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  name text not null,
  category text,
  duration_minutes int not null default 30,
  price numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Relación especialista <-> servicios que puede realizar (5.1 / 5.3)
create table if not exists specialist_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  employee_id uuid not null,
  service_id uuid references services(id) not null,
  commission_pct numeric default 0
);

-- Horario laboral de cada especialista (usado desde la Fase 2)
create table if not exists specialist_schedule (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  employee_id uuid not null,
  day_of_week int not null, -- 0=domingo ... 6=sábado
  start_time time not null,
  end_time time not null
);

-- Citas (5.2)
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_id uuid references customers(id),
  employee_id uuid not null,
  service_id uuid references services(id) not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text default 'pendiente', -- pendiente | confirmada | completada | cancelada | no_show
  deposit_amount numeric default 0,
  deposit_paid boolean default false,
  reminder_sent boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Comisiones generadas al completar una cita (usado desde la Fase 3)
create table if not exists commissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  appointment_id uuid references appointments(id),
  employee_id uuid not null,
  amount numeric not null,
  paid boolean default false,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------
-- Row Level Security — mismo patrón que la app base:
-- cada política filtra por business_id perteneciente al usuario
-- autenticado (dueño/admin o miembro del negocio vía business_members).
-- -----------------------------------------------------------------
create or replace function public.is_business_member(biz_id uuid)
returns boolean
language sql
stable
as $$
  select biz_id = auth.uid() or exists (
    select 1 from business_members bm
    where bm.business_id = biz_id and bm.user_id = auth.uid()
  );
$$;

alter table services enable row level security;
alter table specialist_services enable row level security;
alter table specialist_schedule enable row level security;
alter table appointments enable row level security;
alter table commissions enable row level security;

create policy "Miembros del negocio gestionan sus servicios"
  on services for all
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

create policy "Miembros del negocio gestionan especialista-servicio"
  on specialist_services for all
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

create policy "Miembros del negocio gestionan horarios de especialistas"
  on specialist_schedule for all
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

create policy "Miembros del negocio gestionan citas"
  on appointments for all
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

create policy "Miembros del negocio gestionan comisiones"
  on commissions for all
  using (is_business_member(business_id))
  with check (is_business_member(business_id));
