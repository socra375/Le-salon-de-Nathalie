# Gestión Salón — reescritura (Vite + TypeScript + Svelte)

Andamiaje de la Fase 2 del plan de modernización. Vive aparte del
`index.html` de la raíz del repositorio, que sigue sirviendo producción sin
ningún cambio hasta la Fase 7 (corte final) — nada de lo que hay aquí tiene
riesgo de romper lo que ya está funcionando.

## Arrancar

```bash
cd app
npm install
cp .env.example .env   # completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build de producción a `app/dist` |
| `npm run preview` | Sirve `app/dist` tal cual se vería en GitHub Pages |
| `npm run check` | `svelte-check` (tipos de TypeScript + Svelte) |
| `npm run test:unit` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Pruebas end-to-end (Playwright) contra `npm run preview` |

## `base` de Vite y GitHub Pages

`vite.config.ts` fija `base: '/gestor-empresarial/'` — la ruta real bajo la
que GitHub Pages de proyecto sirve este repo hoy
(`https://socra375.github.io/gestor-empresarial/`; el repo se llama así desde
que se renombró, viene de "Le-salon-de-Nathalie", y no hay `CNAME` de dominio
propio). Si el repositorio se vuelve a renombrar o se le pone un dominio
propio, **hay que actualizar esta constante** (y la de
`playwright.config.ts`, que la simula) — de lo contrario todos los assets
compilados dan 404 en producción tras el corte de la Fase 7, con la app
quedando en blanco. `tests/e2e/base-path.spec.ts` existe justo para atrapar
este error en CI antes de que llegue a producción.

## Variables de entorno

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`). La anon
key es pública por diseño (protegida por RLS) — el build final la incluye
en el bundle igual que el `index.html` legado la incluye hoy en texto plano;
no es una regresión de seguridad, solo cómo funciona Supabase.

## Tipos de la base de datos

`src/lib/types/database.types.ts` está redactado a mano a partir de
`supabase/schema.sql`, porque este entorno de desarrollo no tiene acceso a
la CLI de Supabase autenticada contra el proyecto real. Es un reemplazo
directo del archivo que genera la CLI, así que en cuanto alguien con acceso
pueda correr esto, debería hacerlo (y repetirlo después de cada migración
nueva en `supabase/migrations/`):

```bash
npx supabase login
npx supabase gen types typescript --project-id <tu-project-ref> > src/lib/types/database.types.ts
```

## Sin router de rutas (decisión deliberada)

GitHub Pages no reescribe rutas del lado del servidor: si la app usara URLs
tipo `/agenda`, `/clientes`, recargar la página o abrir esa URL directamente
daría 404. La app legada ya funciona sin URLs por sección (cambia de vista
con estado en memoria, no con `history.pushState`) y esta reescritura
mantiene el mismo modelo — así el problema no existe, en vez de mitigarlo
con el parche habitual de un `404.html` que redirige.

## Capa de datos (`src/lib/api/`)

Fase 3 del plan: un archivo por tabla (`businesses.ts`, `services.ts`,
`appointments.ts`, ...), cada uno con funciones tipadas y pequeñas que
envuelven exactamente las llamadas `supabase.from(...)` que el
`index.html` legado ya hace hoy — mapeadas call por call, no adivinadas.
`client.ts` reexporta el cliente único; `errors.ts` normaliza cualquier
`{ data, error }` de PostgREST en un `ApiError` con el mensaje original en
`cause`, reemplazando el patrón repetido `alert(t('...error', { msg:
error.message }))` del legado — la traducción y el mostrarlo en pantalla
son cosa de la UI (Fase 5), no de esta capa.

Cada función tiene su prueba en `tests/unit/api/*.test.ts`, mockeando el
cliente con el helper de `tests/unit/support/supabaseMock.ts` — sin red
real. Nada de esto se usa todavía desde ningún componente; eso empieza en
la Fase 5.

## i18n y utilidades puras (`src/lib/i18n/`, `src/lib/utils/`)

Fase 4 del plan. Las 292 claves de traducción del `index.html` legado,
extraídas tal cual a `src/lib/i18n/{es,en,fr}.json` (español es la
referencia: todas las demás se validan contra ella en
`tests/unit/i18n/i18n.test.ts` — un idioma con una clave de más o de menos
falla la prueba). `src/lib/i18n/index.ts` expone un `t(locale, key, vars)`
tipado (autocompletado de claves incluido) con el mismo comportamiento que
la `t()` del legado: interpola `{{var}}` y cae a español si la clave no
existe en el idioma pedido.

**Se agregaron 3 idiomas nuevos** a pedido explícito del usuario para esta
fase: `pt.json` (portugués), `de.json` (alemán) e `it.json` (italiano) —
292 claves cada uno, traducidas para esta migración (no vienen del
`index.html` legado, que solo tenía es/en/fr). Después, a pedido del
usuario, también se backportearon al `index.html` de producción — ver el
commit "Agregar portugués, alemán e italiano a la interfaz en producción"
— así que hoy los 6 idiomas existen en ambos lados (legado y reescritura).

`src/lib/utils/`: funciones puras extraídas del legado, ahora recibiendo
por parámetro lo que antes leían de una variable global (`locale`,
snapshots de servicios/facturas/créditos) — así son comprobables sin
montar ningún estado de la app:
- `html.ts` — `escapeHtml`. En los componentes Svelte de las próximas
  fases esto no hace falta (`{expresión}` ya escapa solo); se conserva
  para los pocos lugares que sigan construyendo HTML/texto crudo a mano
  (el PDF).
- `format.ts` — `fmtDate`/`fmtDateTime`/`fmtTime`, con el locale como
  parámetro.
- `dates.ts` — `toDateInputValue`, semana/mes calendario (la lógica
  detrás del bug de "Esta Semana" que se corrigió en el legado).
- `labels.ts` — `apptStatusLabel`/`creditStatusLabel`, con un mapa
  `satisfies Record<string, TranslationKey>` en vez de concatenar strings
  a mano (`'appt.status_' + status`), que TypeScript no revisaba.
- `payments.ts` — catálogo de métodos de pago y cuáles están habilitados.
- `appointments.ts` — `apptServices*`/`appointmentRevenue`/
  `collectedRevenue` (esta última es la que corrigió el bug de contar el
  crédito dos veces).

## Fase 5 (en curso) — componentes Svelte + stores: Auth/Onboarding

Primera sección de la Fase 5, siguiendo el orden del plan (Auth/Onboarding
es la base de la que depende todo lo demás). Todavía faltan Servicios,
Clientes, Agenda, Facturas/PDF, Dashboard, Configuración y Empleados.

- `src/lib/stores/session.ts`: `currentUserId`/`currentBusinessId`/
  `currentUserRole`/`currentBusiness` (`writable`) + `isAuthenticated`/
  `isAdmin`/`needsOnboarding` (`derived`) — solo estado, nada de lógica,
  siguiendo la regla de stores del plan.
- `src/lib/stores/locale.ts`: el idioma activo (persistido en
  `localStorage`, igual que el legado) y `t` como store derivado —
  `$t('clave', vars)` reactivo en cualquier componente.
- `src/lib/actions/auth.ts`: la orquestación de más de un paso (iniciar
  sesión o registrarse con el mismo formulario, canjear una invitación
  pendiente de la URL, resolver a qué negocio pertenece el usuario y con
  qué rol, completar el onboarding, forzar una contraseña) — usa los
  stores y la capa de datos de la Fase 3, nunca al revés.
- `src/lib/components/auth/`: `AuthScreen`, `OnboardingScreen`,
  `ForcedPasswordModal` — sin `alert()` nativo (mensajes traducidos y
  anunciados con `role="alert"`/`role="status"`, más accesible y con
  idioma correcto que el diálogo nativo del navegador); accesibilidad
  integrada desde el inicio (Fase 6 del plan), no como pasada final.
- `src/lib/supabase/client.ts` cambió de fallar al *importarlo* sin
  configurar a fallar al *usarlo* (`isSupabaseConfigured` + un cliente que
  revienta recién en el primer uso) — así `App.svelte` puede mostrar una
  pantalla de "falta configuración" en vez de una página en blanco.
- Mejora incidental sobre el legado (no un cambio de comportamiento que
  alguien dependiera de él): al guardar el onboarding, el store se
  actualiza con los datos recién guardados en vez de quedar desactualizado
  hasta la próxima carga; y los campos de validación manual (nombre del
  negocio, nombre completo del empleado) ya no llevan además `required`
  nativo, que antes bloqueaba el envío del formulario antes de que el
  mensaje traducido llegara a mostrarse.
- Pruebas: `tests/unit/stores/`, `tests/unit/actions/auth.test.ts`,
  `tests/unit/components/auth/*.test.ts` (con `@testing-library/svelte`).

## Fase 5 (en curso) — Servicios

Segunda sección de la Fase 5, mapeada llamada por llamada contra
`initServices`/`renderServicesTable`/`deleteService` del `index.html`
legado (sección "8. CATÁLOGO DE SERVICIOS").

- `src/lib/stores/services.ts`: `services`/`specialistServices`
  (`writable`) -- solo estado, igual que el resto de los stores.
- `src/lib/actions/services.ts`: `loadServices`, `loadSpecialistOptions`
  (el admin del negocio siempre aparece como especialista disponible,
  igual que `getSpecialistOptions()` del legado), `saveService`
  (borra-e-inserta los especialistas habilitados del servicio, dos pasos
  de negocio) y `removeService` (si el borrado choca con una llave
  foránea -- código Postgres `23503`, porque el servicio tiene citas o
  facturas asociadas -- devuelve `{ status: 'blocked' }` en vez de
  lanzar, para que la UI sugiera desactivarlo en su lugar).
- `src/lib/components/services/`: `ServiceForm` (alta/edición, con el
  checklist de especialistas) y `ServicesScreen` (tabla + orquesta abrir
  el formulario y borrar). La confirmación de borrado es un diálogo
  inline (`role="alertdialog"`) en vez del `confirm()` nativo del
  legado -- mismo criterio de accesibilidad que ya se usó en Auth
  (traducido, anunciado a lectores de pantalla, no bloqueante del hilo
  de JS).
- Las categorías del `<select>` guardan el mismo valor en español que
  hoy usa la base de datos (`Cabello`, `Uñas`, ...) y solo se traduce la
  etiqueta visible -- igual que el legado, para no romper datos ya
  guardados con otro idioma activo.
- `App.svelte` ya muestra `ServicesScreen` tras iniciar sesión, solo para
  administradores (Servicios vive bajo Configuración, que en el legado
  es una sección admin-only oculta por completo a empleados).
- Pruebas: `tests/unit/stores/services.test.ts`,
  `tests/unit/actions/services.test.ts`,
  `tests/unit/components/services/*.test.ts`.

## Fase 5 (en curso) — Clientes

Tercera sección de la Fase 5, mapeada contra `initCustomersAndCredits`/
`openCustomerAccountModal` del `index.html` legado (sección "5. CLIENTES,
CRÉDITOS E HISTORIAL DE VISITAS"). A diferencia de Servicios, el legado
nunca tuvo edición ni borrado de clientes -- solo alta y consulta -- así
que esta sección tampoco los tiene.

- `src/lib/stores/customers.ts`: `customers`/`customerCredits`
  (`writable`). `src/lib/stores/appointments.ts`: `appointments`
  (`writable`) -- Clientes lo necesita para el historial de cada cuenta
  (misma dependencia cruzada que ya existía en el legado, donde
  `appointmentsSnapshot` está cargado globalmente para cuando se abre
  esta pantalla); Agenda, en su propia sección, lo hará crecer con la
  orquestación de crear/actualizar citas.
- `src/lib/actions/customers.ts`: `loadCustomers`, `loadCredits`,
  `registerCustomer` (alta + recarga) y `payCredit` -- el abono de un
  crédito, que decide si el estado pasa a `parcial` o `pagado` según si
  lo abonado ya cubre el total (dos pasos de negocio: leer el crédito
  actual y decidir el estado nuevo antes de guardar).
  `src/lib/actions/appointments.ts`: `loadAppointments`, mínimo por ahora
  -- Agenda lo va a ampliar en su propia sección.
- `src/lib/utils/customerAccount.ts`: `summarizeCustomerHistory` (última
  visita, servicio y especialista más frecuentes -- misma lógica que
  `openCustomerAccountModal` del legado, extraída para poder probarla
  sin montar ningún componente) y `pendingCreditTotal`.
- `src/lib/components/customers/`: `CustomersScreen` (alta + tabla con
  saldo pendiente por cliente) y `CustomerAccountModal` (historial de
  citas, créditos y el formulario de abono). El formulario de abono solo
  se muestra si el cliente tiene algún crédito pendiente -- el legado
  siempre lo mostraba, incluso con el `<select>` de créditos vacío,
  volviéndolo un formulario imposible de enviar; ocultarlo es una mejora
  incidental, no un cambio de comportamiento del que algo dependiera.
- `App.svelte` ya muestra `CustomersScreen` junto a `ServicesScreen`,
  también solo para administradores.
- Pruebas: `tests/unit/stores/customers.test.ts`,
  `tests/unit/utils/customerAccount.test.ts`,
  `tests/unit/actions/{customers,appointments}.test.ts`,
  `tests/unit/components/customers/*.test.ts`.

## Fase 5 (completa) — Agenda, Facturas/PDF, Dashboard, Configuración y Empleados

Últimas cinco secciones, cierran la Fase 5: paridad funcional completa
con el `index.html` legado, todo en `app/`.

### Agenda y el primer acoplamiento real con Facturas

`src/lib/actions/appointments.ts` (ampliado): `createAppointment` (suma
duraciones/precios de los servicios elegidos, antepone el nombre walk-in
a las notas solo si la cita no tiene cliente registrado --
`utils/appointments.ts` gana `buildAppointmentNotes`/
`getAppointmentClientName` para esto), `changeAppointmentStatus` y
`linkAppointmentCustomer` (enlazar una cita walk-in a un cliente
registrado al elegir fiarla). `src/lib/actions/completeAppointment.ts`
es el orquestador que pide el plan para este acoplamiento: compone
marcar la cita como completada + facturarla, sin que Agenda sepa nada de
cómo Facturas dibuja o genera el PDF.

`src/lib/components/agenda/`: `AppointmentForm` (alta, con el checklist
de servicios), `PaymentMethodModal` (pide método de pago antes de
completar/re-facturar, con el mismo flujo de enlazar un cliente walk-in
al elegir crédito) y `AgendaScreen` (calendario por día + tabla +
acciones por estado). Los cambios de estado simples (confirmar, cancelar,
no-show) usan una confirmación inline accesible en vez del `confirm()`
nativo del legado -- mismo criterio que Servicios.

### Facturas y el PDF

`src/lib/utils/invoices.ts` (`calculateInvoiceTax`, desglosa
subtotal/impuesto/total igual que el legado) y
`src/lib/actions/invoices.ts` (`createInvoiceForAppointment`: crea la
factura, el crédito si el método es "credito", y recarga -- sin generar
el PDF, eso lo decide quien llama, según la separación vista-modelo que
pide el plan para esta sección).

`src/lib/pdf/invoicePdf.ts` es el módulo de dibujo puro: `buildInvoicePdf`
arma el documento (jsPDF) a partir de datos ya resueltos, sin tocar el
DOM; `openInvoicePdf` es el único punto que sí lo toca (abre el blob en
una pestaña nueva); `loadImageAsDataURL` descarga el logo para
incrustarlo. `invoiceLineItems`, la construcción de las líneas de la
tabla de servicios, es una función pura aparte, probada sin jsPDF de por
medio. La librería se actualizó a `jspdf@4.2.1` (la `2.5.1` que usa el
legado por CDN depende de una versión de `dompurify` con varias
vulnerabilidades conocidas; la `4.2.1` ya no).

`src/lib/components/invoices/InvoicesScreen.svelte`: historial +
re-abrir el PDF de una factura ya generada.

### Dashboard

`src/lib/utils/dashboard.ts`: `calculateDashboardTotals` (mismo cálculo
que `calculateFinancialDashboard` del legado -- ingreso neto solo de
citas completadas del período elegido, usando `collectedRevenue` para no
contar dos veces lo fiado) y `todaysAppointments`. `stores/dashboard.ts`
solo guarda el período activo (Hoy/Esta Semana/Este Mes). Sin la
animación del contador (`requestAnimationFrame`) del legado -- una
simplificación deliberada, no solo estética: un número que cambia solo
es más simple de anunciar a un lector de pantalla que uno animándose.

### Configuración (el resto de sus pestañas)

`src/lib/actions/settings.ts`: una función por pestaña
(`updateBusinessInfo`, `updateBusinessLanguage`, `updateBusinessAppearance`
+ `clearBusinessBackground`, `updateBusinessTax`,
`updateBusinessPaymentMethods`), cada una replicando el detalle fino del
legado que importa -- por ejemplo, si el logo falla al subir, el negocio
igual se guarda con la URL anterior (solo se avisa del error), pero si
falla el fondo de Personalización, se aborta sin guardar nada; son dos
comportamientos distintos en el legado y se mantienen distintos acá.
`src/lib/actions/account.ts` (datos del perfil de Auth, no de
`businesses`) y `src/lib/actions/activityLog.ts` completan las pestañas
restantes.

`src/lib/components/settings/`: `SettingsScreen` (el selector de
pestañas) más una por pestaña (`AccountTab`, `BusinessTab`,
`LanguageTab`, `AppearanceTab`, `TaxTab`, `PaymentsTab`,
`ActivityLogTab`). El cambio de contraseña de "Mi Cuenta" reutiliza
`setForcedPassword` de `actions/auth.ts` (ya existía desde Auth/
Onboarding) en vez de duplicar la llamada a Supabase Auth.

### Empleados

`src/lib/utils/employees.ts` (`codeFromBytes`, el mapeo bytes-a-código
por separado de `crypto.getRandomValues`, que es un efecto) y
`src/lib/actions/employees.ts` (`generateInvite`, `loadEmployees`,
`updateEmployeeRoleTitle`) -- `employee_invites.expires_at` ya tiene un
default de 72h en la base (migración `002_invite_expiration.sql`), así
que no hace falta mandarlo desde acá. `src/lib/components/employees/
EmployeesScreen.svelte`: generar/copiar código + lista de empleados con
su cargo editable.

### Navegación mínima en `App.svelte`

Con las 7 secciones ya completas, `App.svelte` gana una barra de
navegación real (admin-only, igual que el legado) en vez de apilar
pantallas: Dashboard, Agenda, Facturas, Servicios, Clientes,
Configuración y, solo para negocios de tipo "grupo", Empleados -- misma
condición que el legado usa para ocultar `nav-btn-employees` a un salón
individual. Un empleado solo ve el Dashboard de solo lectura, sin barra
de navegación (misma regla que hoy).

### Qué falta para el corte de producción (fuera de la Fase 5)

Con esto, la Fase 5 completa la paridad funcional con el `index.html`
legado. Quedan la Fase 6 (accesibilidad -- ya integrada por composición
en cada componente desde el inicio, no como pasada aparte) formalizada
con una auditoría explícita, y la Fase 7 (corte a producción) del plan.
