<script lang="ts">
  import { onMount } from 'svelte';
  import { t, locale } from './lib/stores/locale';
  import { isLocale } from './lib/i18n';
  import { supabase, isSupabaseConfigured } from './lib/api/client';
  import {
    currentBusiness,
    currentUserRole,
    isAuthenticated,
    isAdmin,
    needsOnboarding,
    resetSession,
  } from './lib/stores/session';
  import { readPendingInviteFromUrl, resolveSessionAfterLogin, type PendingInvite } from './lib/actions/auth';
  import AuthScreen from './lib/components/auth/AuthScreen.svelte';
  import OnboardingScreen from './lib/components/auth/OnboardingScreen.svelte';
  import ForcedPasswordModal from './lib/components/auth/ForcedPasswordModal.svelte';
  import ServicesScreen from './lib/components/services/ServicesScreen.svelte';
  import CustomersScreen from './lib/components/customers/CustomersScreen.svelte';

  let ready = $state(false);
  let resolving = $state(false);
  let pendingInvite = $state<PendingInvite | null>(null);
  let inviteError = $state<string | null>(null);
  let showForcedPassword = $state(false);

  onMount(() => {
    if (!isSupabaseConfigured) {
      ready = true;
      return;
    }

    pendingInvite = readPendingInviteFromUrl(new URL(window.location.href));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // onAuthStateChange dispara de nuevo en cada refresh de token; ya
        // resuelta una vez la sesión, los siguientes eventos son no-ops.
        if (resolving || $isAuthenticated) {
          ready = true;
          return;
        }
        resolving = true;
        const userId = session.user.id;
        const invite = pendingInvite;

        resolveSessionAfterLogin(userId, invite)
          .then(({ business, inviteError: err }) => {
            if (invite) {
              window.history.replaceState({}, document.title, window.location.pathname);
              pendingInvite = null;
            }
            inviteError = err;
            if (business?.language && isLocale(business.language)) locale.set(business.language);
          })
          .finally(() => {
            resolving = false;
            ready = true;
          });
      } else {
        resetSession();
        ready = true;
      }
    });

    return () => subscription.unsubscribe();
  });

  function handleOnboardingCompleted(result: { requiresForcedPassword: boolean }) {
    showForcedPassword = result.requiresForcedPassword;
  }
</script>

{#if !ready}
  <p>…</p>
{:else if !isSupabaseConfigured}
  <main>
    <h1>Gestión Salón</h1>
    <p>
      Faltan <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> — copia
      <code>.env.example</code> a <code>.env</code> y complétalas.
    </p>
  </main>
{:else if !$isAuthenticated}
  {#if inviteError}
    <p role="alert">{$t('auth.invite_invalid', { msg: inviteError })}</p>
  {/if}
  <AuthScreen {pendingInvite} />
{:else if $needsOnboarding}
  <OnboardingScreen onCompleted={handleOnboardingCompleted} />
{:else if showForcedPassword}
  <ForcedPasswordModal onSaved={() => (showForcedPassword = false)} />
{:else}
  <main>
    <h1>Gestión Salón</h1>
    <p>
      Sesión iniciada como <strong>{$currentUserRole === 'admin' ? $t('header.role_admin') : $t('header.role_employee')}</strong>
      de <strong>{$currentBusiness?.name ?? 'Mi Salón'}</strong>.
    </p>
    {#if $isAdmin}
      <!-- Servicios y Clientes son admin-only en el legado (la sección de
           Configuración entera queda oculta para empleados, misma regla
           que hoy). -->
      <ServicesScreen />
      <CustomersScreen />
    {/if}
    <p>El resto de la interfaz (Agenda, Facturas, Dashboard, Configuración, Empleados) llega en las próximas fases.</p>
  </main>
{/if}
