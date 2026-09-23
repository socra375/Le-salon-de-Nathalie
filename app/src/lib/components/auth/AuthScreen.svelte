<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { signInOrSignUp, signInWithGoogle, type PendingInvite } from '../../actions/auth';

  interface Props {
    pendingInvite: PendingInvite | null;
  }

  const { pendingInvite }: Props = $props();

  let email = $state('');
  let password = $state('');
  // Semilla única desde el prop (no reactiva a cambios posteriores a
  // propósito: una vez el formulario está montado, estos campos pasan a
  // ser editables localmente por la persona, no espejos del prop).
  let inviteCode = $state(untrack(() => pendingInvite?.code ?? ''));
  let employeeName = $state(untrack(() => pendingInvite?.employeeName ?? ''));
  let submitting = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  const showEmployeeNameField = $derived(inviteCode.trim().length > 0);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;

    const trimmedInvite = inviteCode.trim();
    if (trimmedInvite && !employeeName.trim()) {
      statusMessage = { kind: 'error', text: $t('auth.need_fullname') };
      return;
    }

    submitting = true;
    try {
      const result = await signInOrSignUp({
        email,
        password,
        invite: trimmedInvite ? { code: trimmedInvite, employeeName: employeeName.trim() } : null,
        redirectBaseUrl: window.location.origin + window.location.pathname,
      });

      if (result.status === 'signup_email_sent') {
        statusMessage = { kind: 'success', text: $t('auth.signup_success') };
      } else if (result.status === 'error') {
        statusMessage = { kind: 'error', text: $t('auth.error', { msg: result.error.message }) };
      }
      // status 'signed_in': no hace falta nada aquí -- quien escucha
      // supabase.auth.onAuthStateChange (App.svelte) toma el control.
    } finally {
      submitting = false;
    }
  }

  async function handleGoogle() {
    const { error } = await signInWithGoogle(window.location.origin + window.location.pathname);
    if (error) statusMessage = { kind: 'error', text: $t('auth.oauth_error', { msg: error.message }) };
  }
</script>

<section aria-labelledby="auth-title">
  <h1 id="auth-title">Gestión Salón</h1>
  <p>{$t('auth.subtitle')}</p>

  <form onsubmit={handleSubmit}>
    <div>
      <label for="auth-email">{$t('auth.email_label')}</label>
      <input id="auth-email" type="email" autocomplete="email" required bind:value={email} />
    </div>

    <div>
      <label for="auth-password">{$t('auth.password_label')}</label>
      <input id="auth-password" type="password" autocomplete="current-password" required bind:value={password} />
    </div>

    <div>
      <label for="auth-invite-code">{$t('auth.invite_label')}</label>
      <input id="auth-invite-code" type="text" bind:value={inviteCode} />
    </div>

    {#if showEmployeeNameField}
      <div>
        <label for="auth-employee-name">{$t('auth.fullname_label')}</label>
        <!-- Sin `required`: la validación de este campo la hace handleSubmit
             (mismo criterio que el legado, con su propio mensaje traducido);
             el `required` nativo bloquearía el submit antes de mostrarlo. -->
        <input id="auth-employee-name" type="text" bind:value={employeeName} />
      </div>
    {/if}

    {#if statusMessage}
      <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
    {/if}

    <button type="submit" disabled={submitting}>{$t('auth.submit')}</button>
    <button type="button" onclick={handleGoogle}>{$t('auth.google')}</button>
  </form>
</section>
