-- ============================================================
-- 002 — Códigos de invitación: vigencia de 72 horas
-- ============================================================
-- Qué cambia: employee_invites gana una columna expires_at, y
-- redeem_invite_code() rechaza un código vencido con un mensaje propio
-- (distinto de "inválido o ya utilizado").
--
-- Por qué: el código se generaba con Math.random() (no apto para nada
-- que funcione como secreto) y, aunque el frontend ya pasó a
-- crypto.getRandomValues con un alfabeto de 10 caracteres, el RPC seguía
-- sin límite de tiempo — un código activo nunca vencía por sí solo. Subir
-- la entropía no acota la ventana de ataque si el secreto es válido para
-- siempre; la expiración sí.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — debe devolver la columna con su default
-- ============================================================
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'employee_invites' and column_name = 'expires_at';
