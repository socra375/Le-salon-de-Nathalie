import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url) && Boolean(anonKey);

const MISSING_CONFIG_MESSAGE =
  'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia app/.env.example a app/.env y complétalas.';

/**
 * Un cliente que revienta con un mensaje claro en cuanto se le pide hacer
 * cualquier cosa (`.from(...)`, `.auth.x()`, lo que sea) en vez de al
 * importar el módulo. Así App.svelte puede importar todo lo que necesite y
 * decidir en tiempo de ejecución si muestra la app o una pantalla de
 * configuración faltante, sin que la sola importación tumbe todo antes de
 * poder mostrar ese mensaje.
 */
function createMissingConfigClient(): SupabaseClient<Database> {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(MISSING_CONFIG_MESSAGE);
      },
    }
  ) as SupabaseClient<Database>;
}

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(url, anonKey)
  : createMissingConfigClient();
