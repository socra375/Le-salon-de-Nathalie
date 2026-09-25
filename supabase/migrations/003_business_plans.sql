-- ============================================================
-- 003 — Planes por negocio (prueba / mensual / semestral / anual),
--       bloqueo y pausa
-- ============================================================
-- Qué cambia:
--   * Tabla business_plans (una fila por negocio). Los miembros solo la
--     LEEN; no tiene políticas de escritura, así que únicamente
--     service_role (el bot de Telegram) y las funciones de este archivo
--     pueden modificarla. Un dueño no puede regalarse un plan.
--   * get_current_business_id() devuelve NULL si el negocio está
--     bloqueado, pausado o vencido. Como todas las políticas RLS, las de
--     storage e is_current_business_admin() dependen de ella, el negocio
--     deja de leer y escribir sus datos, también por API.
--   * Todo negocio nuevo recibe 7 días de prueba (trigger).
--   * Funciones admin_* solo para service_role.
--
-- CONSERVACIÓN DE DATOS: bloquear, pausar o vencer NO borra ni modifica
-- citas, clientes, facturas, créditos, servicios ni logos. Solo se corta
-- el acceso; al desbloquear/reanudar/asignar plan todo vuelve tal cual.
-- Ninguna función de aquí borra datos. Borrar un negocio es una acción
-- manual desde el panel de Supabase.
--
-- Pausa vs. bloqueo: el bloqueo no detiene el reloj del plan; la pausa
-- sí (al reanudar, expires_at se corre lo que duró la pausa).
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — cada negocio debe tener su fila de plan
-- ============================================================
select b.name, p.plan, p.expires_at, p.blocked_at, p.paused_at
from businesses b left join business_plans p on p.business_id = b.id
order by b.created_at;
