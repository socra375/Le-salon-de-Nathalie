# Gestión Salón

Variante de "Gestión PYME" adaptada para salones de belleza, peluquerías, barberías y spas: agenda de citas y catálogo de servicios sobre la misma base de autenticación, roles, clientes, facturación e inventario.

Fase 1 (MVP) implementada en este commit:

- **Catálogo de Servicios**: nombre, categoría, duración, precio, estado activo y especialistas habilitados.
- **Agenda de Citas**: crear, ver y cancelar citas por fecha; cálculo automático de la hora de fin según la duración del servicio; opción de cita walk-in sin cliente registrado. La validación de solapamiento de horarios y los horarios por especialista llegan en la

- Fase 2.
- **Historial de cliente**: última visita, servicio más frecuente, especialista preferido y notas (alergias, preferencias) en la ficha de cada cliente.
- Tarjeta "Citas de Hoy" en el Dashboard.

Los módulos de Autenticación, Roles, Clientes, Facturación, Inventario (productos de venta al público) y Configuración se reutilizan de la app base sin cambios funcionales.

## Próximas fases

Fase 2: validación de solapamiento de citas y horarios por especialista. Fase 3: comisiones automáticas. Fase 4: dashboard de ocupación. Fase 5 (opcional): recordatorios manuales para WhatsApp y depósitos/señas.
