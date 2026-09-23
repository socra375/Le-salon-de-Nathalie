# Migraciones versionadas

Cada archivo de esta carpeta es UN cambio estructural (una tabla, una
política, una función), numerado en el orden en que se aplica. El nombre
dice qué es: `001_rls_employee_readonly.sql`, `002_invite_expiration.sql`,
etc. Cada uno explica en su propio encabezado **qué** cambia, **por qué**,
y **cuándo** (la fecha va en el mensaje del commit que lo introduce, no
hace falta repetirla aquí).

Todas son idempotentes (`if not exists` / `if exists`) — correrlas dos
veces no rompe nada ni duplica nada.

## Cómo aplicar una migración

1. **Antes de nada, backup.** Supabase → Database → Backups. Esto no es
   opcional para ninguna migración que cambie estructura (columnas,
   políticas, funciones).
2. Copia el archivo completo y pégalo en Supabase → SQL Editor → New query.
3. Ejecuta.
4. Corre la consulta de verificación al final del archivo (si tiene una) o
   `supabase/PRUEBA_RLS.sql` para confirmar que las políticas quedaron como
   se espera.

## Relación con `schema.sql` y `ACTUALIZAR_BASE_DE_DATOS.sql`

Estos dos archivos **no desaparecen**:

- `schema.sql` sigue siendo el script completo para una instalación nueva
  desde cero — se mantiene actualizado con el resultado final de todas las
  migraciones aplicadas, no con el histórico de pasos.
- `ACTUALIZAR_BASE_DE_DATOS.sql` sigue siendo el bloque acumulado para
  quien ya tiene una versión anterior y quiere ponerse al día en un solo
  paso, sin tener que ir migración por migración.
- Esta carpeta es la que responde "¿qué cambió, cuándo y por qué" —
  el historial reproducible que los otros dos no guardan por sí solos.

Cada PR que toque el esquema actualiza los tres a la vez.
