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
