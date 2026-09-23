import { describe, expect, it, vi, beforeEach } from 'vitest';

// El módulo se puede importar siempre sin reventar (así App.svelte puede
// decidir en tiempo de ejecución si muestra la app o una pantalla de
// configuración faltante) -- lo que revienta es USAR el cliente sin
// configurar. Cada caso reimporta desde cero con vi.resetModules() porque
// isSupabaseConfigured/supabase se calculan una sola vez, al cargar el
// módulo.
describe('src/lib/supabase/client.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('isSupabaseConfigured es false si faltan las variables de entorno', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { isSupabaseConfigured } = await import('../../src/lib/supabase/client');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('usar el cliente sin configurar lanza un error claro, recién al llamarlo', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { supabase } = await import('../../src/lib/supabase/client');
    expect(() => supabase.auth).toThrow(/VITE_SUPABASE_URL/);
  });

  it('isSupabaseConfigured es true y el cliente funciona cuando las variables están presentes', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://ejemplo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-de-prueba');

    const { supabase, isSupabaseConfigured } = await import('../../src/lib/supabase/client');
    expect(isSupabaseConfigured).toBe(true);
    expect(typeof supabase.from).toBe('function');
  });
});
