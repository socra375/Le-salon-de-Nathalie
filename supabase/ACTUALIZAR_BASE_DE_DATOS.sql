-- ============================================================
-- ACTUALIZAR LA BASE DE DATOS
-- ============================================================
-- Copia TODO este archivo y pégalo en:
--   Supabase > tu proyecto > SQL Editor > New query > Run
--
-- Es seguro ejecutarlo las veces que haga falta: cada línea usa
-- "if not exists", así que no borra nada ni duplica columnas.
-- Si una columna ya existe, simplemente la salta.
-- ============================================================

-- Sitio web del negocio (pie de la factura)
alter table businesses add column if not exists website text;

-- Domicilio y e-mail del cliente (encabezado de la factura)
alter table customers add column if not exists address text;
alter table customers add column if not exists email text;

-- Precio del servicio al momento de la cita (para el dashboard
-- e historial, aunque el precio del servicio cambie después)
alter table appointments add column if not exists price numeric;

-- Las facturas se generan desde una cita completada
alter table invoices add column if not exists appointment_id uuid references appointments(id);

-- Los créditos ("fiado") se generan desde una factura de servicio
alter table customer_credits add column if not exists invoice_id uuid references invoices(id);

create index if not exists idx_invoices_appointment on invoices(appointment_id);

-- Idioma de la interfaz para este negocio: 'es' | 'en' | 'fr'
alter table businesses add column if not exists language text default 'es';

-- Nombre del cliente en la factura (también para walk-ins sin registrar)
alter table invoices add column if not exists customer_name text;

-- Personalización: tono de la interfaz ('dark' | 'light') y fondo propio
alter table businesses add column if not exists theme text default 'dark';
alter table businesses add column if not exists background_url text;

-- Una cita puede incluir varios servicios
alter table appointments add column if not exists service_ids jsonb;

-- Método de pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'credito'
alter table invoices add column if not exists payment_method text;

-- ============================================================
-- COMPROBACIÓN
-- ============================================================
-- Al terminar, esta consulta debe devolver 4 filas. Si las ves,
-- todo quedó listo y la web funcionará sin errores de columna.

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'businesses'   and column_name in ('theme', 'background_url')) or
    (table_name = 'appointments' and column_name = 'service_ids')               or
    (table_name = 'invoices'     and column_name = 'payment_method')
  )
order by table_name, column_name;

-- ============================================================
-- SEGURIDAD — corrige un agujero en las políticas de acceso
-- ============================================================
-- Sin esto, cualquiera con una cuenta podía afiliar a OTRO dueño de
-- salón a su propio negocio. La víctima entraba al salón del atacante
-- al iniciar sesión, perdía el acceso al suyo y los datos que
-- registrara caían en el negocio ajeno.
drop policy if exists "admin_insert_members" on business_members;
create policy "admin_insert_members" on business_members for insert
  with check (business_id = auth.uid() and user_id = auth.uid());

-- ============================================================
-- MIGRACIÓN 001 — el empleado pasa a ser de solo lectura de verdad
-- ============================================================
-- Antes, 8 tablas tenían una sola política "for all" que daba a
-- cualquier miembro (admin O empleado) los mismos permisos de lectura
-- Y escritura. La pantalla de "solo lectura" del empleado era solo
-- apariencia del frontend. Detalle completo y consulta de verificación
-- en supabase/migrations/001_rls_employee_readonly.sql — antes de
-- correr esto, backup desde Supabase → Database → Backups.

create or replace function public.is_current_business_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = get_current_business_id()
    or exists (
      select 1 from business_members bm
      where bm.business_id = get_current_business_id()
        and bm.user_id = auth.uid()
        and bm.role = 'admin'
    );
$$;

grant execute on function public.is_current_business_admin() to authenticated;

drop policy if exists "members_all_customers" on customers;
create policy "select_customers" on customers for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_customers" on customers;
create policy "admin_insert_customers" on customers for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_customers" on customers;
create policy "admin_update_customers" on customers for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_customers" on customers;
create policy "admin_delete_customers" on customers for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- products/sales son restos de un módulo ya eliminado del frontend; en
-- algunas instalaciones (como esta) esas tablas nunca llegaron a crearse,
-- así que cada bloque se salta solo si la tabla no existe.
do $$
begin
  if to_regclass('public.products') is not null then
    execute 'drop policy if exists "members_all_products" on products';
    execute 'create policy "select_products" on products for select using (business_id = get_current_business_id())';
    execute 'drop policy if exists "admin_insert_products" on products';
    execute 'create policy "admin_insert_products" on products for insert with check (business_id = get_current_business_id() and is_current_business_admin())';
    execute 'drop policy if exists "admin_update_products" on products';
    execute 'create policy "admin_update_products" on products for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin())';
    execute 'drop policy if exists "admin_delete_products" on products';
    execute 'create policy "admin_delete_products" on products for delete using (business_id = get_current_business_id() and is_current_business_admin())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.sales') is not null then
    execute 'drop policy if exists "members_all_sales" on sales';
    execute 'create policy "select_sales" on sales for select using (business_id = get_current_business_id())';
    execute 'drop policy if exists "admin_insert_sales" on sales';
    execute 'create policy "admin_insert_sales" on sales for insert with check (business_id = get_current_business_id() and is_current_business_admin())';
    execute 'drop policy if exists "admin_update_sales" on sales';
    execute 'create policy "admin_update_sales" on sales for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin())';
    execute 'drop policy if exists "admin_delete_sales" on sales';
    execute 'create policy "admin_delete_sales" on sales for delete using (business_id = get_current_business_id() and is_current_business_admin())';
  end if;
end $$;

drop policy if exists "members_all_credits" on customer_credits;
create policy "select_credits" on customer_credits for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_credits" on customer_credits;
create policy "admin_insert_credits" on customer_credits for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_credits" on customer_credits;
create policy "admin_update_credits" on customer_credits for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_credits" on customer_credits;
create policy "admin_delete_credits" on customer_credits for delete using (business_id = get_current_business_id() and is_current_business_admin());

drop policy if exists "members_all_invoices" on invoices;
create policy "select_invoices" on invoices for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_invoices" on invoices;
create policy "admin_insert_invoices" on invoices for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_invoices" on invoices;
create policy "admin_update_invoices" on invoices for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_invoices" on invoices;
create policy "admin_delete_invoices" on invoices for delete using (business_id = get_current_business_id() and is_current_business_admin());

drop policy if exists "members_insert_activity" on activity_log;
drop policy if exists "admin_insert_activity" on activity_log;
create policy "admin_insert_activity" on activity_log for insert with check (business_id = get_current_business_id() and is_current_business_admin());

drop policy if exists "members_all_services" on services;
create policy "select_services" on services for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_services" on services;
create policy "admin_insert_services" on services for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_services" on services;
create policy "admin_update_services" on services for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_services" on services;
create policy "admin_delete_services" on services for delete using (business_id = get_current_business_id() and is_current_business_admin());

drop policy if exists "members_all_specserv" on specialist_services;
create policy "select_specserv" on specialist_services for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_specserv" on specialist_services;
create policy "admin_insert_specserv" on specialist_services for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_specserv" on specialist_services;
create policy "admin_update_specserv" on specialist_services for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_specserv" on specialist_services;
create policy "admin_delete_specserv" on specialist_services for delete using (business_id = get_current_business_id() and is_current_business_admin());

drop policy if exists "members_all_appointments" on appointments;
create policy "select_appointments" on appointments for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_appointments" on appointments;
create policy "admin_insert_appointments" on appointments for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_appointments" on appointments;
create policy "admin_update_appointments" on appointments for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_appointments" on appointments;
create policy "admin_delete_appointments" on appointments for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- ============================================================
-- MIGRACIÓN 002 — códigos de invitación con vigencia de 72 horas
-- ============================================================
alter table employee_invites add column if not exists expires_at timestamptz default (now() + interval '72 hours');

create or replace function public.redeem_invite_code(input_code text, input_employee_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_expires_at timestamptz;
begin
  select business_id, expires_at into v_business_id, v_expires_at
  from employee_invites
  where code = input_code and used = false
  limit 1;

  if v_business_id is null then
    raise exception 'Código de invitación inválido o ya utilizado';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'El código de invitación venció. Pide al administrador que genere uno nuevo';
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
-- MIGRACIÓN 003 — planes por negocio, bloqueo y pausa
-- (detalle en supabase/migrations/003_business_plans.sql).
-- Bloquear/pausar/vencer solo corta el acceso: no borra datos.
-- ============================================================

create table if not exists business_plans (
  business_id uuid primary key references businesses(id) on delete cascade,
  plan text not null default 'prueba' check (plan in ('prueba','mensual','semestral','anual')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  blocked_at timestamptz,
  paused_at timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_plans_expires on business_plans(expires_at);

-- Resolución "cruda" del negocio del usuario, sin mirar el plan.
create or replace function public.resolve_business_id()
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

-- true si el negocio aún no existe (registro nuevo en la configuración
-- inicial) o si tiene un plan vigente, sin bloqueo ni pausa.
create or replace function public.business_access_active(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from businesses where id = bid)
    or exists (
      select 1 from business_plans p
      where p.business_id = bid
        and p.blocked_at is null
        and p.paused_at is null
        and p.expires_at > now()
    );
$$;

alter table business_plans enable row level security;
drop policy if exists "select_own_plan" on business_plans;
create policy "select_own_plan" on business_plans for select using (business_id = resolve_business_id());

-- Prueba de 7 días para cada negocio nuevo.
create or replace function public.create_trial_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into business_plans (business_id, plan, starts_at, expires_at)
  values (new.id, 'prueba', now(), now() + interval '7 days')
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_business_trial on businesses;
create trigger trg_business_trial after insert on businesses
  for each row execute function public.create_trial_plan();

-- Negocios existentes sin plan: 7 días de prueba desde hoy, para que
-- nadie quede bloqueado al aplicar esta migración.
insert into business_plans (business_id, plan, starts_at, expires_at)
select id, 'prueba', now(), now() + interval '7 days' from businesses
on conflict (business_id) do nothing;

-- El corte de acceso se activa DESPUÉS del relleno: nunca hay un
-- instante en que un negocio existente quede sin plan.
create or replace function public.get_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when business_access_active(s.bid) then s.bid end
  from (select resolve_business_id() as bid) s;
$$;

grant execute on function public.get_current_business_id() to authenticated;

-- Estado de acceso del usuario actual. Usa resolve_business_id(), así
-- que responde aunque el negocio esté bloqueado (para la pantalla).
create or replace function public.get_my_business_access()
returns table (status text, plan text, expires_at timestamptz, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p.business_id is null and not exists (select 1 from businesses where id = s.bid) then 'new'
      when p.business_id is null then 'expired'
      when p.blocked_at is not null then 'blocked'
      when p.paused_at is not null then 'paused'
      when p.expires_at <= now() then 'expired'
      when p.plan = 'prueba' then 'trial'
      else 'active'
    end,
    p.plan, p.expires_at, p.reason
  from (select resolve_business_id() as bid) s
  left join business_plans p on p.business_id = s.bid;
$$;

revoke execute on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;

-- ============================================================
-- Funciones de administración — SOLO service_role (bot de Telegram)
-- ============================================================

create or replace function public.admin_list_businesses()
returns table (business_id uuid, name text, email text, plan text, expires_at timestamptz, status text, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, u.email::text, p.plan, p.expires_at,
    case
      when p.business_id is null then 'sin_plan'
      when p.blocked_at is not null then 'bloqueado'
      when p.paused_at is not null then 'pausado'
      when p.expires_at <= now() then 'vencido'
      when p.plan = 'prueba' then 'prueba'
      else 'activo'
    end,
    p.reason
  from businesses b
  left join auth.users u on u.id = b.id
  left join business_plans p on p.business_id = b.id
  order by b.created_at;
$$;

create or replace function public.admin_set_plan(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interval interval;
  v_base timestamptz := now();
  v_cur business_plans%rowtype;
  v_expires timestamptz;
begin
  v_interval := case p_plan
    when 'mensual' then interval '1 month'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '1 year'
  end;
  if v_interval is null then
    raise exception 'Plan inválido: %', p_plan;
  end if;
  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Negocio no encontrado';
  end if;

  select * into v_cur from business_plans where business_id = p_business_id;
  -- Un plan pagado vigente se extiende; la prueba o un plan vencido cuentan desde hoy.
  if found and v_cur.plan <> 'prueba' and v_cur.expires_at > now() then
    v_base := v_cur.expires_at;
  end if;
  v_expires := v_base + v_interval;

  insert into business_plans (business_id, plan, starts_at, expires_at, updated_at)
  values (p_business_id, p_plan, now(), v_expires, now())
  on conflict (business_id) do update
    set plan = excluded.plan, starts_at = excluded.starts_at,
        expires_at = excluded.expires_at, updated_at = now();

  return v_expires;
end;
$$;

create or replace function public.admin_block_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update business_plans set blocked_at = now(), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_unblock_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update business_plans set blocked_at = null,
    reason = case when paused_at is null then null else reason end,
    updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_pause_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update business_plans set paused_at = coalesce(paused_at, now()), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_resume_business(p_business_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz;
begin
  update business_plans
    set expires_at = case when paused_at is null then expires_at else expires_at + (now() - paused_at) end,
        paused_at = null,
        reason = case when blocked_at is null then null else reason end,
        updated_at = now()
  where business_id = p_business_id
  returning expires_at into v_expires;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
  return v_expires;
end;
$$;

revoke execute on function public.admin_list_businesses() from public, anon, authenticated;
revoke execute on function public.admin_set_plan(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_block_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_unblock_business(uuid) from public, anon, authenticated;
revoke execute on function public.admin_pause_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_resume_business(uuid) from public, anon, authenticated;
revoke execute on function public.create_trial_plan() from public, anon, authenticated;
-- business_access_active solo se invoca desde get_current_business_id
-- (security definer); no hace falta exponerla por /rpc.
revoke execute on function public.business_access_active(uuid) from public, anon, authenticated;
revoke execute on function public.resolve_business_id() from public, anon;
grant execute on function public.resolve_business_id() to authenticated;
grant execute on function public.admin_list_businesses() to service_role;
grant execute on function public.admin_set_plan(uuid, text) to service_role;
grant execute on function public.admin_block_business(uuid, text) to service_role;
grant execute on function public.admin_unblock_business(uuid) to service_role;
grant execute on function public.admin_pause_business(uuid, text) to service_role;
grant execute on function public.admin_resume_business(uuid) to service_role;

-- ============================================================
-- MIGRACIÓN 004 — súper admins y vínculo con el bot de Telegram
-- (detalle en supabase/migrations/004_super_admins.sql).
-- ============================================================

create table if not exists super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id bigint unique,
  link_code_hash text,
  link_code_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table super_admins enable row level security;

-- Súper admin por defecto (dueño del SaaS). Idempotente; no hace nada si
-- la cuenta todavía no existe.
insert into super_admins (user_id)
select id from auth.users where lower(email) = 'marcosjimenezpolanco323@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.business_access_active(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from businesses where id = bid)
    or exists (select 1 from super_admins where user_id = bid)
    or exists (
      select 1 from business_plans p
      where p.business_id = bid
        and p.blocked_at is null
        and p.paused_at is null
        and p.expires_at > now()
    );
$$;

revoke execute on function public.business_access_active(uuid) from public, anon, authenticated;

drop function if exists public.get_my_business_access();
create function public.get_my_business_access()
returns table (status text, plan text, expires_at timestamptz, reason text, is_super_admin boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when exists (select 1 from super_admins where user_id = s.bid) then 'active'
      when p.business_id is null and not exists (select 1 from businesses where id = s.bid) then 'new'
      when p.business_id is null then 'expired'
      when p.blocked_at is not null then 'blocked'
      when p.paused_at is not null then 'paused'
      when p.expires_at <= now() then 'expired'
      when p.plan = 'prueba' then 'trial'
      else 'active'
    end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.plan end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.expires_at end,
    p.reason,
    exists (select 1 from super_admins where user_id = auth.uid())
  from (select resolve_business_id() as bid) s
  left join business_plans p on p.business_id = s.bid;
$$;

revoke execute on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;

create or replace function public.admin_list_businesses()
returns table (business_id uuid, name text, email text, plan text, expires_at timestamptz, status text, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, u.email::text, p.plan, p.expires_at,
    case
      when exists (select 1 from super_admins sa where sa.user_id = b.id) then 'super_admin'
      when p.business_id is null then 'sin_plan'
      when p.blocked_at is not null then 'bloqueado'
      when p.paused_at is not null then 'pausado'
      when p.expires_at <= now() then 'vencido'
      when p.plan = 'prueba' then 'prueba'
      else 'activo'
    end,
    p.reason
  from businesses b
  left join auth.users u on u.id = b.id
  left join business_plans p on p.business_id = b.id
  order by b.created_at;
$$;

create or replace function public.admin_block_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from super_admins where user_id = p_business_id) then
    raise exception 'No se puede bloquear el negocio de un súper admin';
  end if;
  update business_plans set blocked_at = now(), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_pause_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from super_admins where user_id = p_business_id) then
    raise exception 'No se puede pausar el negocio de un súper admin';
  end if;
  update business_plans set paused_at = coalesce(paused_at, now()), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

-- Código de un solo uso para vincular Telegram. Solo se guarda su hash.
create or replace function public.create_telegram_link_code()
returns table (code text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_expires timestamptz := now() + interval '10 minutes';
begin
  update super_admins
    set link_code_hash = encode(sha256(convert_to(v_code, 'UTF8')), 'hex'),
        link_code_expires_at = v_expires
  where user_id = auth.uid();
  if not found then
    raise exception 'Solo un súper admin puede vincular el bot';
  end if;
  return query select v_code, v_expires;
end;
$$;

revoke execute on function public.create_telegram_link_code() from public, anon;
grant execute on function public.create_telegram_link_code() to authenticated;

create or replace function public.admin_link_telegram(p_code text, p_chat_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_email text;
begin
  select user_id into v_user from super_admins
  where link_code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex')
    and link_code_expires_at > now();
  if v_user is null then
    raise exception 'Código inválido o vencido';
  end if;

  update super_admins set telegram_chat_id = null where telegram_chat_id = p_chat_id and user_id <> v_user;
  update super_admins
    set telegram_chat_id = p_chat_id, link_code_hash = null, link_code_expires_at = null
  where user_id = v_user;

  select email::text into v_email from auth.users where id = v_user;
  return v_email;
end;
$$;

create or replace function public.admin_chat_is_super_admin(p_chat_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from super_admins where telegram_chat_id = p_chat_id);
$$;

revoke execute on function public.admin_list_businesses() from public, anon, authenticated;
revoke execute on function public.admin_block_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_pause_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_link_telegram(text, bigint) from public, anon, authenticated;
revoke execute on function public.admin_chat_is_super_admin(bigint) from public, anon, authenticated;
grant execute on function public.admin_list_businesses() to service_role;
grant execute on function public.admin_block_business(uuid, text) to service_role;
grant execute on function public.admin_pause_business(uuid, text) to service_role;
grant execute on function public.admin_link_telegram(text, bigint) to service_role;
grant execute on function public.admin_chat_is_super_admin(bigint) to service_role;

-- ============================================================
-- COMPROBACIÓN FINAL — debe devolver 8 tablas × 4 políticas cada una
-- ============================================================
select
  c.relname as tabla,
  p.polname as politica,
  case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else p.polcmd::text end as operacion
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname in ('customers','products','sales','customer_credits','invoices','services','specialist_services','appointments')
order by c.relname, operacion;
-- Nota: si products/sales no existen en tu base, simplemente no aparecerán
-- en este listado (no es un error).
