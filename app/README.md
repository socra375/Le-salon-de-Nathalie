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
`index.html` legado, que solo tiene es/en/fr). Por ahora viven únicamente
en esta reescritura (`app/`); el `index.html` de producción no se tocó,
así que estos 3 idiomas nuevos no están disponibles todavía para los
clientes reales del salón — eso requeriría además backportearlos al
legado, algo que no se hizo aquí para no desviarse del alcance de la Fase 4.

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

## Qué NO hay todavía

Sin componentes reales, sin paridad funcional con el `index.html` legado —
eso es trabajo de las Fases 4 a 6. Las Fases 2-3 son andamiaje y datos:
build, tipos, entorno, capa de datos y CI en verde.
