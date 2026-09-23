<script lang="ts">
  import { t } from '../../stores/locale';
  import { currentBusinessId } from '../../stores/session';
  import { completeOnboarding, type OnboardingResult } from '../../actions/auth';

  interface Props {
    onCompleted: (result: OnboardingResult) => void;
  }

  const { onCompleted }: Props = $props();

  let businessName = $state('');
  let businessType = $state<'individual' | 'group'>('individual');
  let teamSize = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';

    const name = businessName.trim();
    if (!name) {
      errorMessage = $t('onboarding.name_required');
      return;
    }

    const businessId = $currentBusinessId;
    if (!businessId) return;

    submitting = true;
    try {
      const result = await completeOnboarding({
        businessId,
        name,
        type: businessType,
        teamSize: businessType === 'group' ? parseInt(teamSize, 10) || null : null,
      });
      onCompleted(result);
    } finally {
      submitting = false;
    }
  }
</script>

<section aria-labelledby="onboarding-title">
  <h1 id="onboarding-title">{$t('onboarding.title')}</h1>
  <p>{$t('onboarding.subtitle')}</p>

  <form onsubmit={handleSubmit}>
    <div>
      <label for="onb-business-name">{$t('onboarding.business_name_label')}</label>
      <!-- Sin `required` nativo a propósito: handleSubmit valida esto con
           un mensaje traducido y anunciado (role="alert") -- un tooltip de
           validación nativo del navegador ni se traduce ni lo anuncia un
           lector de pantalla igual de bien. -->
      <input id="onb-business-name" type="text" bind:value={businessName} />
    </div>

    <fieldset>
      <legend>{$t('onboarding.business_type_label')}</legend>
      <label>
        <input type="radio" name="business-type" value="individual" bind:group={businessType} />
        {$t('onboarding.type_individual')}
      </label>
      <label>
        <input type="radio" name="business-type" value="group" bind:group={businessType} />
        {$t('onboarding.type_group')}
      </label>
    </fieldset>

    {#if businessType === 'group'}
      <div>
        <label for="onb-team-size">{$t('onboarding.team_size_label')}</label>
        <input id="onb-team-size" type="number" min="1" required bind:value={teamSize} />
      </div>
    {/if}

    {#if errorMessage}
      <p role="alert">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={submitting}>{$t('onboarding.submit')}</button>
  </form>
</section>
