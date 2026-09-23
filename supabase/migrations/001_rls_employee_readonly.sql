-- ============================================================
-- 001 — RLS: el empleado pasa a ser de solo lectura de verdad
-- ============================================================
-- Qué cambia: 8 tablas (customers, services, specialist_services,
-- appointments, invoices, customer_credits, products, sales) tenían una
-- sola política "for all" que daba a CUALQUIER miembro del negocio
-- (admin o empleado) los mismos permisos de lectura Y escritura. La
-- pantalla de "solo lectura" para el rol employee era solo apariencia
-- del frontend — nada la respaldaba en la base de datos: un empleado
-- podía crear, modificar o borrar cualquier cosa por la API.
--
-- Por qué: alinear la base de datos con lo que la interfaz ya promete.
-- products/sales ya no los usa el frontend (vestigios del módulo de
-- Ventas/Inventario eliminado), pero seguían abiertos por API igual que
-- el resto — se cierran también, por consistencia y porque siguen siendo
-- una superficie de ataque aunque nadie los muestre en pantalla.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
-- Después de aplicar: correr supabase/PRUEBA_RLS.sql para confirmar.
-- ============================================================

-- --- Función helper: ¿el usuario actual es admin de su negocio? ---
-- Se reconocen dos formas de ser admin porque hoy el dueño nunca tiene
-- fila en business_members (su propio auth.uid() ES el business_id); la
-- condición sobre business_members.role deja abierto el camino a varios
-- admins por negocio en el futuro sin tocar esta función de nuevo.
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

-- --- customers ---
drop policy if exists "members_all_customers" on customers;
create policy "select_customers" on customers for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_customers" on customers;
create policy "admin_insert_customers" on customers for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_customers" on customers;
create policy "admin_update_customers" on customers for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_customers" on customers;
create policy "admin_delete_customers" on customers for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- --- products (vestigio, ya sin uso en el frontend; se salta si la tabla no existe) ---
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

-- --- sales (vestigio, ya sin uso en el frontend; se salta si la tabla no existe) ---
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

-- --- customer_credits ---
drop policy if exists "members_all_credits" on customer_credits;
create policy "select_credits" on customer_credits for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_credits" on customer_credits;
create policy "admin_insert_credits" on customer_credits for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_credits" on customer_credits;
create policy "admin_update_credits" on customer_credits for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_credits" on customer_credits;
create policy "admin_delete_credits" on customer_credits for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- --- invoices ---
drop policy if exists "members_all_invoices" on invoices;
create policy "select_invoices" on invoices for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_invoices" on invoices;
create policy "admin_insert_invoices" on invoices for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_invoices" on invoices;
create policy "admin_update_invoices" on invoices for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_invoices" on invoices;
create policy "admin_delete_invoices" on invoices for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- --- activity_log (el SELECT no cambia: ambos roles pueden leer la bitácora) ---
drop policy if exists "members_insert_activity" on activity_log;
drop policy if exists "admin_insert_activity" on activity_log;
create policy "admin_insert_activity" on activity_log for insert with check (business_id = get_current_business_id() and is_current_business_admin());

-- --- services ---
drop policy if exists "members_all_services" on services;
create policy "select_services" on services for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_services" on services;
create policy "admin_insert_services" on services for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_services" on services;
create policy "admin_update_services" on services for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_services" on services;
create policy "admin_delete_services" on services for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- --- specialist_services ---
drop policy if exists "members_all_specserv" on specialist_services;
create policy "select_specserv" on specialist_services for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_specserv" on specialist_services;
create policy "admin_insert_specserv" on specialist_services for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_specserv" on specialist_services;
create policy "admin_update_specserv" on specialist_services for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_specserv" on specialist_services;
create policy "admin_delete_specserv" on specialist_services for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- --- appointments ---
drop policy if exists "members_all_appointments" on appointments;
create policy "select_appointments" on appointments for select using (business_id = get_current_business_id());
drop policy if exists "admin_insert_appointments" on appointments;
create policy "admin_insert_appointments" on appointments for insert with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_update_appointments" on appointments;
create policy "admin_update_appointments" on appointments for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
drop policy if exists "admin_delete_appointments" on appointments;
create policy "admin_delete_appointments" on appointments for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- ============================================================
-- ROLLBACK — si algo se rompe, pegar este bloque para volver atrás
-- ============================================================
-- do $$ begin
--   drop policy if exists "select_customers" on customers; drop policy if exists "admin_insert_customers" on customers; drop policy if exists "admin_update_customers" on customers; drop policy if exists "admin_delete_customers" on customers;
--   create policy "members_all_customers" on customers for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "select_products" on products; drop policy if exists "admin_insert_products" on products; drop policy if exists "admin_update_products" on products; drop policy if exists "admin_delete_products" on products;
--   create policy "members_all_products" on products for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "select_sales" on sales; drop policy if exists "admin_insert_sales" on sales; drop policy if exists "admin_update_sales" on sales; drop policy if exists "admin_delete_sales" on sales;
--   create policy "members_all_sales" on sales for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "select_credits" on customer_credits; drop policy if exists "admin_insert_credits" on customer_credits; drop policy if exists "admin_update_credits" on customer_credits; drop policy if exists "admin_delete_credits" on customer_credits;
--   create policy "members_all_credits" on customer_credits for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "select_invoices" on invoices; drop policy if exists "admin_insert_invoices" on invoices; drop policy if exists "admin_update_invoices" on invoices; drop policy if exists "admin_delete_invoices" on invoices;
--   create policy "members_all_invoices" on invoices for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "admin_insert_activity" on activity_log;
--   create policy "members_insert_activity" on activity_log for insert with check (business_id = get_current_business_id());
--   drop policy if exists "select_services" on services; drop policy if exists "admin_insert_services" on services; drop policy if exists "admin_update_services" on services; drop policy if exists "admin_delete_services" on services;
--   create policy "members_all_services" on services for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "select_specserv" on specialist_services; drop policy if exists "admin_insert_specserv" on specialist_services; drop policy if exists "admin_update_specserv" on specialist_services; drop policy if exists "admin_delete_specserv" on specialist_services;
--   create policy "members_all_specserv" on specialist_services for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
--   drop policy if exists "select_appointments" on appointments; drop policy if exists "admin_insert_appointments" on appointments; drop policy if exists "admin_update_appointments" on appointments; drop policy if exists "admin_delete_appointments" on appointments;
--   create policy "members_all_appointments" on appointments for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id());
-- end $$;

-- ============================================================
-- VERIFICACIÓN — cada una de las 8 tablas debe mostrar exactamente 4
-- políticas: select_X (r), admin_insert_X (a), admin_update_X (w),
-- admin_delete_X (d). Si falta alguna fila o sobra "members_all_X",
-- algo no se aplicó bien.
-- ============================================================
select
  c.relname as tabla,
  p.polname as politica,
  case p.polcmd
    when 'r' then 'select'
    when 'a' then 'insert'
    when 'w' then 'update'
    when 'd' then 'delete'
    else p.polcmd::text
  end as operacion
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname in ('customers','products','sales','customer_credits','invoices','services','specialist_services','appointments')
order by c.relname, operacion;
