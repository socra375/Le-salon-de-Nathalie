<script lang="ts">
  import { t } from '../../stores/locale';
  import { setForcedPassword } from '../../actions/auth';
  import Modal from '../shared/Modal.svelte';

  interface Props {
    onSaved: () => void;
  }

  const { onSaved }: Props = $props();

  let password = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  async function handleSave() {
    errorMessage = '';
    if (password.length < 6) {
      errorMessage = $t('pwd.min_length');
      return;
    }

    submitting = true;
    try {
      const { error } = await setForcedPassword(password);
      if (error) {
        errorMessage = $t('pwd.forced_error', { msg: error.message });
        return;
      }
      onSaved();
    } finally {
      submitting = false;
    }
  }
</script>

<!-- Sin `onClose`: forzar la contraseña es obligatorio en el onboarding de
     un salón con equipo, no se puede cancelar (igual que el legado). -->
<Modal labelledBy="forced-password-title">
  <h2 id="forced-password-title">{$t('fp.title')}</h2>
  <p>{$t('fp.body')}</p>

  <label for="forced-password-input">{$t('fp.label')}</label>
  <input id="forced-password-input" type="password" autocomplete="new-password" bind:value={password} />

  {#if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}

  <button type="button" onclick={handleSave} disabled={submitting}>{$t('fp.submit')}</button>
</Modal>
