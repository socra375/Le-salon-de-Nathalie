-- ============================================================
-- PRUEBA DE SEGURIDAD RLS  —  Gestión Salón
-- ============================================================
-- Copia TODO este archivo y pégalo en:
--   Supabase > tu proyecto > SQL Editor > New query > Run
--
-- ES SEGURO: todo corre dentro de una transacción que termina en
-- ROLLBACK. No crea, cambia ni borra nada de tus datos reales.
--
-- Qué hace: se hace pasar por dos salones distintos e intenta que
-- uno lea y modifique los datos del otro; además prueba que un empleado
-- quede de solo lectura de verdad (migración 001) mientras el admin
-- sigue pudiendo todo. Cada línea del resultado dice OK (protegido) o
-- FALLA (agujero de seguridad).
-- ============================================================

begin;

-- Dos salones ficticios que solo existen dentro de esta transacción
create temporary table _t (salon_a uuid, salon_b uuid) on commit drop;
insert into _t values ('aaaaaaaa-0000-4000-8000-000000000001',
                       'bbbbbbbb-0000-4000-8000-000000000002');

create temporary table _r (n int generated always as identity, prueba text, veredicto text) on commit drop;

-- ------------------------------------------------------------
-- BLOQUE 1 — ¿Hay alguna tabla sin RLS? (la más grave de todas:
-- una tabla sin RLS la puede leer cualquiera con la clave pública)
-- ------------------------------------------------------------
insert into _r (prueba, veredicto)
select 'RLS activo en la tabla: ' || c.relname,
       case when c.relrowsecurity then 'OK' else 'FALLA — tabla ABIERTA a cualquiera' end
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- ¿Alguna tabla con RLS activo pero sin ninguna política? (queda inaccesible)
insert into _r (prueba, veredicto)
select 'La tabla ' || c.relname || ' tiene políticas definidas',
       case when count(p.polname) > 0 then 'OK' else 'AVISO — RLS activo sin políticas' end
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
group by c.relname;

-- ------------------------------------------------------------
-- BLOQUE 2 — Aislamiento entre salones (lo que de verdad importa)
-- Insertamos datos del SALÓN B y luego nos hacemos pasar por el
-- SALÓN A para ver si los alcanza.
-- ------------------------------------------------------------
insert into businesses (id, name) select salon_a, 'Salón A (prueba)' from _t;
insert into businesses (id, name) select salon_b, 'Salón B (prueba)' from _t;
insert into customers (business_id, name, phone) select salon_b, 'Cliente secreto de B', '000' from _t;
insert into services  (business_id, name, price, duration_minutes, active) select salon_b, 'Servicio de B', 100, 30, true from _t;
insert into invoices  (business_id, invoice_number, subtotal, tax_amount, total)
  select salon_b, 'FAC-PRUEBA-B', 100, 0, 100 from _t;

-- A partir de aquí actuamos como un usuario normal de la app,
-- autenticado como el SALÓN A. Esto es lo mismo que hace el navegador.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

insert into _r (prueba, veredicto) values
  ('LECTURA: el salón A no ve los clientes de B',
   case when (select count(*) from customers where name = 'Cliente secreto de B') = 0
        then 'OK' else 'FALLA — puede LEER clientes ajenos' end),
  ('LECTURA: el salón A no ve los servicios de B',
   case when (select count(*) from services where name = 'Servicio de B') = 0
        then 'OK' else 'FALLA — puede LEER servicios ajenos' end),
  ('LECTURA: el salón A no ve las facturas de B',
   case when (select count(*) from invoices where invoice_number = 'FAC-PRUEBA-B') = 0
        then 'OK' else 'FALLA — puede LEER facturas ajenas' end),
  ('LECTURA: el salón A no ve el negocio B',
   case when (select count(*) from businesses where name = 'Salón B (prueba)') = 0
        then 'OK' else 'FALLA — puede LEER otros negocios' end);

-- ESCRITURA: intentar modificar y borrar datos ajenos
do $$
declare v_afectadas int;
begin
  update customers set name = 'HACKEADO' where name = 'Cliente secreto de B';
  get diagnostics v_afectadas = row_count;
  insert into _r (prueba, veredicto) values
    ('ESCRITURA: el salón A no puede modificar clientes de B',
     case when v_afectadas = 0 then 'OK' else 'FALLA — puede MODIFICAR datos ajenos' end);

  delete from invoices where invoice_number = 'FAC-PRUEBA-B';
  get diagnostics v_afectadas = row_count;
  insert into _r (prueba, veredicto) values
    ('BORRADO: el salón A no puede borrar facturas de B',
     case when v_afectadas = 0 then 'OK' else 'FALLA — puede BORRAR datos ajenos' end);
end $$;

-- SUPLANTACIÓN: intentar crear datos a nombre de otro salón
do $$
begin
  insert into customers (business_id, name) values ('bbbbbbbb-0000-4000-8000-000000000002', 'Inyectado por A');
  insert into _r (prueba, veredicto) values
    ('SUPLANTACIÓN: el salón A no puede crear datos a nombre de B', 'FALLA — puede ESCRIBIR en otro salón');
exception when insufficient_privilege or others then
  insert into _r (prueba, veredicto) values
    ('SUPLANTACIÓN: el salón A no puede crear datos a nombre de B', 'OK');
end $$;

-- SECUESTRO DE SESIÓN: ¿puedo meter a OTRO usuario en mi negocio?
-- Si esto pasa, el dueño de ese usuario entra a MI salón al iniciar
-- sesión, pierde el acceso al suyo y sus datos nuevos caen en mi negocio.
do $$
begin
  insert into business_members (business_id, user_id, role)
  values ('aaaaaaaa-0000-4000-8000-000000000001',
          'bbbbbbbb-0000-4000-8000-000000000002', 'employee');
  insert into _r (prueba, veredicto) values
    ('SECUESTRO: no puedo afiliar a otro usuario a mi negocio', 'FALLA — puede SECUESTRAR la sesión de otro dueño');
exception
  when foreign_key_violation then
    insert into _r (prueba, veredicto) values
      ('SECUESTRO: no puedo afiliar a otro usuario a mi negocio',
       'FALLA — la política lo permite (solo lo frenó la clave foránea; con un id de usuario REAL entraría)');
  when others then
    insert into _r (prueba, veredicto) values
      ('SECUESTRO: no puedo afiliar a otro usuario a mi negocio', 'OK');
end $$;

reset role;

-- ------------------------------------------------------------
-- BLOQUE 3 — El empleado es de solo lectura de verdad (migración 001)
-- Salón C con un admin (dueño) y un empleado ficticio. Se prueba que el
-- empleado puede LEER pero no puede crear/modificar/borrar, y que el
-- admin sigue pudiendo todo.
-- ------------------------------------------------------------

-- business_members.user_id referencia auth.users de verdad; para simular
-- un empleado sin depender de una cuenta real, se quita esa referencia
-- solo dentro de esta transacción (el ROLLBACK final la restaura).
do $$
declare v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'business_members'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass;
  if v_conname is not null then
    execute format('alter table business_members drop constraint %I', v_conname);
  end if;
end $$;

insert into businesses (id, name) values ('cccccccc-0000-4000-8000-000000000003', 'Salón C (prueba)');
insert into business_members (business_id, user_id, role)
values ('cccccccc-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000004', 'employee');
insert into services (id, business_id, name, price, duration_minutes, active)
values ('eeeeeeee-0000-4000-8000-000000000005', 'cccccccc-0000-4000-8000-000000000003', 'Servicio de prueba C', 100, 30, true);

-- Actuamos como el EMPLEADO del salón C
set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-0000-4000-8000-000000000004","role":"authenticated"}';

insert into _r (prueba, veredicto) values
  ('EMPLEADO: puede LEER los servicios de su propio salón',
   case when (select count(*) from services where id = 'eeeeeeee-0000-4000-8000-000000000005') = 1
        then 'OK' else 'FALLA — el empleado no puede ni leer su propio negocio' end);

do $$
begin
  begin
    insert into services (business_id, name, price, duration_minutes, active)
    values ('cccccccc-0000-4000-8000-000000000003', 'Colado por empleado', 1, 1, true);
    insert into _r (prueba, veredicto) values ('EMPLEADO: no puede CREAR servicios', 'FALLA — un empleado puede insertar');
  exception when insufficient_privilege or others then
    insert into _r (prueba, veredicto) values ('EMPLEADO: no puede CREAR servicios', 'OK');
  end;
end $$;

do $$
declare v_afectadas int;
begin
  update services set name = 'HACKEADO POR EMPLEADO' where id = 'eeeeeeee-0000-4000-8000-000000000005';
  get diagnostics v_afectadas = row_count;
  insert into _r (prueba, veredicto) values
    ('EMPLEADO: no puede MODIFICAR servicios',
     case when v_afectadas = 0 then 'OK' else 'FALLA — un empleado puede modificar' end);

  delete from services where id = 'eeeeeeee-0000-4000-8000-000000000005';
  get diagnostics v_afectadas = row_count;
  insert into _r (prueba, veredicto) values
    ('EMPLEADO: no puede BORRAR servicios',
     case when v_afectadas = 0 then 'OK' else 'FALLA — un empleado puede borrar' end);
end $$;

-- Ahora actuamos como el ADMIN (dueño) del salón C: debe seguir pudiendo todo.
set local request.jwt.claims = '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}';

do $$
declare v_afectadas int;
begin
  update services set name = 'Editado por el admin' where id = 'eeeeeeee-0000-4000-8000-000000000005';
  get diagnostics v_afectadas = row_count;
  insert into _r (prueba, veredicto) values
    ('ADMIN: sigue pudiendo MODIFICAR sus servicios (no quedó bloqueado por error)',
     case when v_afectadas = 1 then 'OK' else 'FALLA — el admin quedó bloqueado sin querer' end);

  delete from services where id = 'eeeeeeee-0000-4000-8000-000000000005';
  get diagnostics v_afectadas = row_count;
  insert into _r (prueba, veredicto) values
    ('ADMIN: sigue pudiendo BORRAR sus servicios (no quedó bloqueado por error)',
     case when v_afectadas = 1 then 'OK' else 'FALLA — el admin quedó bloqueado sin querer' end);
end $$;

reset role;

-- ------------------------------------------------------------
-- RESULTADO
-- ------------------------------------------------------------
select prueba, veredicto from _r where veredicto <> 'OK'
union all
select '--- ' || count(*) || ' pruebas superadas (OK) ---', 'OK' from _r where veredicto = 'OK'
order by 2 desc, 1;

-- Nada de lo anterior se guarda: se deshace todo.
rollback;
