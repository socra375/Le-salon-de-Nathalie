# Gestión Salón

Variante de "Gestión PYME" adaptada para salones de belleza, peluquerías, barberías y spas: agenda de citas y catálogo de servicios sobre la misma base de autenticación, roles, clientes y configuración. No incluye Ventas ni Inventario de productos: el negocio de esta app es 100% por servicios.

Fase 1 (MVP) implementada en este commit:

- **Catálogo de Servicios**: nombre, categoría, duración, precio, estado activo y especialistas habilitados.
- **Agenda de Citas**: crear, ver y cancelar citas por fecha; cálculo automático de la hora de fin según la duración del servicio; opción de cita walk-in sin cliente registrado. La validación de solapamiento de horarios y los horarios por especialista llegan en la Fase 2.
- **Historial de cliente**: última visita, servicio más frecuente, especialista preferido y notas (alergias, preferencias) en la ficha de cada cliente.
- Tarjeta "Citas de Hoy" e "Ingresos por Servicios Completados" en el Dashboard.
- **Facturas nacen de una cita completada** (no de una venta): desde la Agenda, una cita "completada" muestra un botón "Facturar"; el cliente es obligatorio, hay método de pago (incluyendo Crédito, que genera cuenta por cobrar), y el PDF sigue una plantilla tipo "Nota de Remisión" (encabezado con datos del cliente, tabla de servicio con cantidad/descripción/valor unitario/importe, subtotal/impuesto/total, y pie con dirección/teléfono/sitio web del negocio).

Los módulos de Autenticación, Roles, Clientes y Configuración se reutilizan de la app base sin cambios funcionales.

## Puesta en marcha

1. Ejecuta `supabase/schema.sql` en el SQL Editor de tu proyecto Supabase (si ya lo corriste antes de esta versión, solo hace falta el bloque final "7. MIGRACIÓN").
2. En `index.html`, reemplaza `SUPABASE_URL` y `SUPABASE_ANON_KEY` con las credenciales de tu proyecto.
3. Sirve `index.html` como sitio estático (por ejemplo, GitHub Pages).

## Próximas fases

Fase 2: validación de solapamiento de citas y horarios por especialista. Fase 3: comisiones automáticas. Fase 4: dashboard de ocupación. Fase 5 (opcional): recordatorios manuales para WhatsApp y depósitos/señas.
