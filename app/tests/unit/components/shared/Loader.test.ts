import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { hideLoader, showLoader } from '../../../../src/lib/stores/loader';

const { default: Loader } = await import('../../../../src/lib/components/shared/Loader.svelte');

afterEach(() => {
  cleanup();
  hideLoader();
});

describe('Loader', () => {
  it('oculto por defecto, no muestra nada', () => {
    render(Loader);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('muestra el mensaje de arranque en modo boot', () => {
    showLoader('boot');
    render(Loader);
    expect(screen.getByRole('status').textContent).toContain('Cargando');
  });

  it('muestra el mensaje de inicio de sesión en modo login', () => {
    showLoader('login');
    render(Loader);
    expect(screen.getByRole('status').textContent).toContain('Iniciando sesión');
  });

  it('muestra el mensaje de sincronización en modo sync', () => {
    showLoader('sync');
    render(Loader);
    expect(screen.getByRole('status').textContent).toContain('Sincronizando');
  });
});
