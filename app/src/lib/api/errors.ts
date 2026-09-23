import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Reemplaza el patrón repetido en el index.html legado de
 * `if (error) alert(t('...error', { msg: error.message }))` en cada
 * llamada a Supabase. La capa de datos nunca traduce ni muestra UI —
 * solo lanza un error tipado con el mensaje original de PostgREST
 * intacto en `cause`, para que quien lo capture (un módulo de acciones,
 * un componente) decida cómo mostrarlo y en qué idioma.
 */
export class ApiError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.cause = cause;
  }
}

interface SupabaseResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Toma el resultado `{ data, error }` que devuelve cualquier llamada de
 * supabase-js: si hay error, lanza ApiError; si no, devuelve `data` ya
 * no-nulo. Úsalo así: `return unwrap(await supabase.from(...).select());`
 */
export function unwrap<T>(result: SupabaseResult<T>): T {
  if (result.error) {
    throw new ApiError(result.error.message, result.error);
  }
  return result.data as T;
}

/**
 * Igual que `unwrap`, pero para consultas donde `data: null` sin error es
 * un resultado válido (p. ej. `.maybeSingle()` cuando no hay fila) — no lo
 * fuerza a un tipo no-nulo.
 */
export function unwrapNullable<T>(result: SupabaseResult<T>): T | null {
  if (result.error) {
    throw new ApiError(result.error.message, result.error);
  }
  return result.data;
}
