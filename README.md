# Gestor Empresarial — v2.0

Gestor todo-en-uno para salones de belleza, peluquerías, barberías y spas: agenda, clientes, servicios, facturación y equipo en un solo lugar, con diseño propio y disponible en 6 idiomas.

Reescrito por completo en esta versión (Vite + TypeScript + Svelte 5), reemplazando el `index.html` original de la v1 — más confiable, más seguro y con una interfaz nueva de punta a punta.

## Qué ofrece

- **Inicio**: un checklist de primeros pasos para negocios nuevos (servicios, clientes, primera cita, equipo) y, ya con actividad, un resumen del negocio — ingresos del período, agenda del día, cuentas por cobrar por cliente y un gráfico de los últimos 7 días.
- **Agenda**: citas agrupadas por Mañana/Tarde, con walk-ins, múltiples servicios por cita y cambio de estado (confirmar, completar, cancelar, no-show).
- **Clientes**: historial de visitas, servicio y especialista preferidos, y créditos pendientes por cobrar.
- **Servicios**: catálogo con precio, duración y especialistas habilitados.
- **Facturas**: nacen de una cita completada, con método de pago (incluido crédito) y PDF descargable con el logo del negocio.
- **Equipo**: invitaciones por código con expiración; empleados con acceso de solo lectura a nivel de base de datos, no solo de interfaz.
- **Configuración**: datos del negocio, moneda e impuestos, apariencia, idioma y actividad reciente.
- **Idioma**: español, inglés, francés, portugués, alemán e italiano — se recuerda por negocio.
- **Diseño propio**: identidad de marca (logo, favicon, PWA instalable) y un mismo lenguaje visual en el login, la landing, la configuración inicial, la agenda y el inicio.
- **Seguridad**: acceso por roles (admin/empleado) reforzado con políticas de base de datos (RLS), no solo ocultando botones en pantalla.

## Cómo empezar

```bash
cd app
npm install
cp .env.example .env   # completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Producción se publica sola en GitHub Pages con cada cambio a `main` (ver `.github/workflows/deploy.yml`). El detalle técnico completo — arquitectura, decisiones de cada sección, pruebas — está en [`app/README.md`](app/README.md).

> El `index.html` de la raíz es la v1, ya reemplazada en producción; se conserva únicamente como referencia de rollback.
