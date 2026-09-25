-- ============================================================
-- 004 — Súper admins (dueño del SaaS) y vínculo con el bot de Telegram
-- ============================================================
-- Qué cambia:
--   * Tabla super_admins, sin políticas RLS: solo service_role y las
--     funciones security definer la tocan.
--   * El negocio de un súper admin queda exento de planes: nunca vence
--     y el bot no puede bloquearlo ni pausarlo (evita dejarse afuera).
--   * El bot deja de depender de un chat_id fijo en un secreto: el súper
--     admin genera en la app un código de un solo uso (10 min) y lo manda
--     al bot con /vincular. Iniciar sesión prueba que el email es suyo.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — debe listar al súper admin por defecto
-- ============================================================
select u.email, sa.telegram_chat_id is not null as telegram_vinculado
from super_admins sa join auth.users u on u.id = sa.user_id;
