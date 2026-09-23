import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falla rápido y con un mensaje claro en vez de un error críptico de
  // supabase-js más adelante. La anon key es pública por diseño (protegida
  // por RLS): esto no es un secreto que se esté validando, solo que la app
  // no puede arrancar sin saber a qué proyecto conectarse.
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia app/.env.example a app/.env y complétalas.'
  );
}

export const supabase = createClient<Database>(url, anonKey);
