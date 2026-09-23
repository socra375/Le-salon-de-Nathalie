<script lang="ts">
  const hasSupabaseConfig =
    Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
</script>

<main>
  <h1>Gestión Salón</h1>
  <p>
    Andamiaje de la reescritura en Vite + TypeScript + Svelte (Fase 2 del plan de
    modernización). Sin funcionalidad todavía — la app en producción sigue siendo
    el <code>index.html</code> de la raíz del repositorio.
  </p>
  <p class="config-status" data-testid="config-status">
    {#if hasSupabaseConfig}
      Variables de entorno de Supabase detectadas.
    {:else}
      Faltan <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> — copia
      <code>.env.example</code> a <code>.env</code> y complétalas.
    {/if}
  </p>
</main>

<style>
  main {
    max-width: 40rem;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    color: #1f2933;
  }

  h1 {
    font-size: 1.75rem;
  }

  code {
    background: #f0f0f0;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }

  .config-status {
    color: #52606d;
  }
</style>
