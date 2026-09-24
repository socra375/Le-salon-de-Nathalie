import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({
  updateBusinessAppearance: vi.fn(),
  clearBusinessBackground: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/settings', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/settings')>('../../../../src/lib/actions/settings');
  return { ...actual, ...actionsMock };
});

const { default: AppearanceTab } = await import('../../../../src/lib/components/settings/AppearanceTab.svelte');

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('AppearanceTab', () => {
  it('guardar sin cambiar el fondo, llama a la acción con el fondo actual', async () => {
    actionsMock.updateBusinessAppearance.mockResolvedValue(undefined);
    render(AppearanceTab, { props: { businessId: 'biz-1', business: { background_url: 'https://bg' } as never } });

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Personalización' }));

    expect(actionsMock.updateBusinessAppearance).toHaveBeenCalledWith(
      { businessId: 'biz-1', backgroundFile: null, currentBackgroundUrl: 'https://bg' },
      expect.any(String)
    );
    expect(await screen.findByText('Personalización guardada.')).toBeTruthy();
  });

  it('si la subida falla, muestra el error', async () => {
    actionsMock.updateBusinessAppearance.mockRejectedValue(new Error('bucket lleno'));
    render(AppearanceTab, { props: { businessId: 'biz-1', business: null } });

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Personalización' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error subiendo el fondo: bucket lleno');
  });

  it('"Quitar Fondo" llama a clearBusinessBackground', async () => {
    actionsMock.clearBusinessBackground.mockResolvedValue(undefined);
    render(AppearanceTab, { props: { businessId: 'biz-1', business: null } });

    await fireEvent.click(screen.getByRole('button', { name: 'Quitar Fondo' }));

    expect(actionsMock.clearBusinessBackground).toHaveBeenCalledWith('biz-1', expect.any(String));
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(AppearanceTab, { props: { businessId: 'biz-1', business: null } });
    await expectNoA11yViolations(container);
  });
});
