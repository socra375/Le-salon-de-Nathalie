# Gestión Salón

Variante de "Gestión PYME" adaptada para salones de belleza, peluquerías, barberías y spas: agenda de citas y catálogo de servicios sobre la misma base de autenticación, roles, clientes, facturación e inventario.

Fase 1 (MVP) implementada en este commit:

- **Catálogo de Servicios** (`sec-services`, solo admin): nombre, categoría, duración, precio, estado activo y especialistas habilitados.
- **Agenda de Citas** (`sec-appointments`, solo admin): crear, ver y cancelar citas por fecha; cálculo automático de la hora de fin según la duración del servicio; opción de cita walk-in sin cliente registrado. La validación de solapamiento de horarios y los horarios por especialista llegan en la Fase 2.
- **Historial de cliente**: última visita, servicio más frecuente, especialista preferido y notas (alergias, preferencias) en la ficha de cada cliente.
- Tarjeta "Citas de Hoy" en el Dashboard.

Los módulos de Autenticación, Roles, Clientes, Facturación, Inventario (productos de venta al público) y Configuración se reutilizan de la app base sin cambios funcionales.

## Stack

HTML + CSS + JavaScript vanilla en un único archivo `index.html`, Supabase (Auth + Postgres con RLS), Chart.js y jsPDF. Sin frameworks ni build tools — pensado para GitHub Pages.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en el SQL Editor, en este orden:
   - El esquema de tu app base "Gestión PYME" (`businesses`, `business_members`, `business_settings`, `customers`, `customer_credits`, `products`, `sales`, `invoices`, `employee_invites`, `activity_log`, la función `redeem_invite_code` y sus políticas RLS).
   - `supabase/schema.sql` de este repositorio (agrega `services`, `specialist_services`, `specialist_schedule`, `appointments`, `commissions`, la columna `notes` en `customers` y sus políticas RLS).
2. En `index.html`, reemplaza `SUPABASE_URL` y `SUPABASE_ANON_KEY` con las credenciales de tu proyecto.
3. Sirve `index.html` como sitio estático (por ejemplo, GitHub Pages).

## Próximas fases

Fase 2: validación de solapamiento de citas y horarios por especialista. Fase 3: comisiones automáticas. Fase 4: dashboard de ocupación. Fase 5 (opcional): recordatorios manuales para WhatsApp y depósitos/señas.
