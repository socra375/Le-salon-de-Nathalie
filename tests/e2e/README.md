# Pruebas end-to-end (Playwright)

Suite formal de las pruebas construidas de forma ad-hoc durante la sesión de
modernización (Fase 1 del plan). Prueban el `index.html` estático de la raíz
tal cual se sirve hoy en GitHub Pages — sin ningún paso de build todavía.

## Cómo correrlas

```bash
npm install
npm run test:e2e
```

Esto levanta un `http-server` en `http://127.0.0.1:8099` sirviendo la raíz
del repo (así `/index.html` resuelve igual que en producción) y corre todos
los specs contra Chromium.

- `npm run test:e2e:ui` — modo interactivo (`--ui`), útil para depurar un spec.
- `npm run test:e2e:headed` — con ventana visible en vez de headless.

En fases posteriores de la migración (Vite + Svelte, `app/`), estos mismos
specs podrán apuntar a `vite preview` en vez del `index.html` legado sin
tocar ni un archivo de prueba, pasando la URL por variable de entorno:

```bash
E2E_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
```

## Qué prueba cada archivo

- `multi-service-appointment.spec.ts` — una cita con varios servicios suma
  su duración y precio, y guarda `service_ids` (con `service_id` replicado
  para compatibilidad hacia atrás).
- `payment-method-and-invoice-pdf.spec.ts` — el modal de método de pago al
  completar una cita, la factura generada (método de pago, impuesto) y que
  el PDF imprima una línea por servicio.
- `theme-toggle-and-delete-services.spec.ts` — tono claro/oscuro desde el
  header, eliminar un servicio (con confirmación) y quitar el fondo
  personalizado en Personalización.
- `credit-vs-revenue.spec.ts` — una venta a crédito no debe sumar a
  "Ingresos" hasta que se cobra de verdad (antes se contaba dos veces: como
  ingreso y como cuenta por cobrar).
- `credit-linking-walkin.spec.ts` — al fiar una cita walk-in, se puede
  enlazar a un cliente ya registrado antes de facturar.
- `dashboard-period-filters.spec.ts` — "Esta Semana" usa semana calendario
  (no una ventana móvil de 7 días), y el dashboard se refresca solo al
  cruzar la medianoche sin necesidad de recargar la página.
- `employee-invite-codes.spec.ts` — los códigos de invitación se generan
  con `crypto.getRandomValues`, sin caracteres ambiguos, y muestran el
  aviso de vigencia de 72 horas.
- `xss-escaping.spec.ts` — un nombre de cliente/servicio con una carga XSS
  se muestra como texto literal, nunca se ejecuta.
- `employee-read-only.spec.ts` — un usuario con rol `employee` ve un
  dashboard sin barra de navegación ni ninguna acción de administrador.

## Qué NO prueba esta suite (y por qué)

`stub.js` reemplaza por completo `window.supabase` con una base de datos en
memoria (ver el archivo): valida lógica de negocio y comportamiento de la
interfaz, pero **nunca toca Postgres ni Row Level Security de verdad** —
las reglas de "quién puede leer/escribir qué" están reimplementadas de forma
ingenua en el stub (sin RLS), así que un bug en una política real de
Supabase no se detectaría aquí.

Esa es responsabilidad exclusiva de `supabase/PRUEBA_RLS.sql`, que corre
contra una base real (dentro de una transacción con `rollback`, sin tocar
datos de producción) y simula distintos usuarios autenticados con
`set local request.jwt.claims`. Son dos capas deliberadamente separadas, no
redundantes: esta suite dice "la interfaz se comporta bien si el backend
responde lo que promete"; `PRUEBA_RLS.sql` dice "el backend de verdad
responde lo que promete".

## Estructura

- `stub.js` — el mock en memoria de Supabase/Chart.js/jsPDF. Reemplaza
  `window.supabase.createClient()` con un cliente que opera sobre un objeto
  `window.__DB` en memoria, y expone `window.__WRITES`/`window.__PDF` para
  que las pruebas puedan inspeccionar qué se escribió y qué imprimió el PDF.
  También soporta simular una sesión de empleado vía
  `window.__EMPLOYEE_SESSION` (ver `employee-read-only.spec.ts`).
- `fixtures.ts` — extiende `test` de `@playwright/test` para que cada spec
  reciba automáticamente una página con los CDN externos bloqueados, el
  stub inyectado, y captura de errores de consola/diálogos nativos. Expone
  `gotoApp()` para navegar y esperar a que la sesión haya iniciado.
