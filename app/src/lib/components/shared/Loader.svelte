<script lang="ts">
  import { t } from '../../stores/locale';
  import { loader, type LoaderMode } from '../../stores/loader';

  const MESSAGE_KEY: Record<LoaderMode, 'loader.boot' | 'loader.login' | 'loader.sync'> = {
    boot: 'loader.boot',
    login: 'loader.login',
    sync: 'loader.sync',
  };

  const mode = $derived($loader);
</script>

{#if mode}
  <div class="ge-loader" role="status" aria-live="polite">
    <div class="ge-loader-spinner" aria-hidden="true"></div>
    <p>{$t(MESSAGE_KEY[mode])}</p>
  </div>
{/if}

<style>
  .ge-loader {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: rgba(11, 13, 18, 0.85);
    color: #fff;
    font-size: 0.95rem;
  }

  .ge-loader-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    animation: ge-loader-spin 0.8s linear infinite;
  }

  @keyframes ge-loader-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ge-loader-spinner {
      animation: none;
    }
  }
</style>
