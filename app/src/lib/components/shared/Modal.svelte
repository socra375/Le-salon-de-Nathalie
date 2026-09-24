<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';

  /**
   * Primitiva compartida de diálogo modal (Fase 6 del plan): rol y
   * `aria-modal` correctos, el foco queda atrapado adentro mientras está
   * abierto (Tab/Shift+Tab no se escapan a la página de atrás), se
   * enfoca el primer elemento interactivo al abrir, y al cerrarse el
   * foco vuelve a quien lo abrió. `onClose` es opcional a propósito: un
   * diálogo sin forma de cancelar (como forzar una contraseña en el
   * onboarding) no debe cerrarse con Escape.
   */
  interface Props {
    labelledBy: string;
    onClose?: () => void;
    children: Snippet;
  }

  const { labelledBy, onClose, children }: Props = $props();

  let dialogEl = $state<HTMLDivElement | undefined>();
  let previouslyFocused: HTMLElement | null = null;

  function focusableElements(): HTMLElement[] {
    if (!dialogEl) return [];
    return Array.from(
      dialogEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (!onClose) return;
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = focusableElements();
    const first = focusables.at(0);
    const last = focusables.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    previouslyFocused = document.activeElement as HTMLElement | null;
    const first = focusableElements()[0];
    (first ?? dialogEl)?.focus();
  });

  onDestroy(() => {
    previouslyFocused?.focus?.();
  });
</script>

<div bind:this={dialogEl} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabindex="-1" onkeydown={handleKeydown}>
  {@render children()}
</div>
