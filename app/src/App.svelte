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
  import { readPendingInviteFromUrl, resolveSessionAfterLogin, signOut, type PendingInvite } from './lib/actions/auth';
  import AuthScreen from './lib/components/auth/AuthScreen.svelte';
  import OnboardingScreen from './lib/components/auth/OnboardingScreen.svelte';
  import ForcedPasswordModal from './lib/components/auth/ForcedPasswordModal.svelte';
  import DashboardScreen from './lib/components/dashboard/DashboardScreen.svelte';
  import AgendaScreen from './lib/components/agenda/AgendaScreen.svelte';
  import InvoicesScreen from './lib/components/invoices/InvoicesScreen.svelte';
  import SettingsScreen from './lib/components/settings/SettingsScreen.svelte';
  import EmployeesScreen from './lib/components/employees/EmployeesScreen.svelte';

  type Section = 'dashboard' | 'agenda' | 'invoices' | 'settings' | 'employees';
  let activeSection = $state<Section>('dashboard');

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
  <header>
    <div class="header-top">
      <h1>Gestión Salón</h1>
      <div class="header-actions">
        {#if $isAdmin}
          <button
            type="button"
            class="header-action"
            aria-pressed={activeSection === 'settings'}
            onclick={() => (activeSection = 'settings')}
          >
            {$t('cfg.back')}
          </button>
        {/if}
        <button type="button" class="header-action" onclick={() => signOut()}>{$t('header.logout')}</button>
      </div>
    </div>
    <p>
      Sesión iniciada como <strong>{$currentUserRole === 'admin' ? $t('header.role_admin') : $t('header.role_employee')}</strong>
      de <strong>{$currentBusiness?.name ?? 'Mi Salón'}</strong>.
    </p>
  </header>

  {#if $isAdmin}
    <main>
      {#if activeSection === 'dashboard'}
        <DashboardScreen />
      {:else if activeSection === 'agenda'}
        <AgendaScreen />
      {:else if activeSection === 'invoices'}
        <InvoicesScreen />
      {:else if activeSection === 'settings'}
        <SettingsScreen />
      {:else if activeSection === 'employees'}
        <EmployeesScreen />
      {/if}
    </main>

    <!-- Igual que el legado: barra de navegación fija abajo, solo con las
         secciones de uso frecuente -- Servicios y Clientes viven dentro de
         Configuración (ver settings-list del index.html original). -->
    <nav class="bottom-nav" aria-label={$t('nav.dashboard')}>
      <button type="button" aria-pressed={activeSection === 'dashboard'} onclick={() => (activeSection = 'dashboard')}>
        {$t('nav.dashboard')}
      </button>
      <button type="button" aria-pressed={activeSection === 'agenda'} onclick={() => (activeSection = 'agenda')}>
        {$t('nav.agenda')}
      </button>
      <button type="button" aria-pressed={activeSection === 'invoices'} onclick={() => (activeSection = 'invoices')}>
        {$t('nav.invoices')}
      </button>
      {#if $currentBusiness?.business_type === 'group'}
        <button type="button" aria-pressed={activeSection === 'employees'} onclick={() => (activeSection = 'employees')}>
          {$t('nav.employees')}
        </button>
      {/if}
    </nav>
  {:else}
    <main>
      <DashboardScreen />
    </main>
  {/if}
{/if}
