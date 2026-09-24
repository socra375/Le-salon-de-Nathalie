<script lang="ts">
  import Modal from '../../../../src/lib/components/shared/Modal.svelte';

  interface Props {
    dismissible?: boolean;
    onClose?: () => void;
  }

  const { dismissible = true, onClose }: Props = $props();

  let open = $state(false);

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

<button id="trigger" onclick={() => (open = true)}>Abrir</button>

{#if open}
  <Modal labelledBy="host-title" onClose={dismissible ? handleClose : undefined}>
    <h2 id="host-title">Título</h2>
    <button id="first">Primero</button>
    <button id="second">Segundo</button>
    <button id="last">Último</button>
  </Modal>
{/if}
