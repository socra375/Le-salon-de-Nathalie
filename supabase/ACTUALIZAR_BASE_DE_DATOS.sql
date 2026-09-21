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
