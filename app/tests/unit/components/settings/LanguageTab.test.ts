import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

const actionsMock = vi.hoisted(() => ({ updateBusinessLanguage: vi.fn() }));
vi.mock('../../../../src/lib/actions/settings', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/settings')>('../../../../src/lib/actions/settings');
  return { ...actual, updateBusinessLanguage: actionsMock.updateBusinessLanguage };
});

const { default: LanguageTab } = await import('../../../../src/lib/components/settings/LanguageTab.svelte');

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('LanguageTab', () => {
  it('lista los 6 idiomas disponibles', () => {
    render(LanguageTab, { props: { businessId: 'biz-1', business: null } });
    const select = screen.getByLabelText('Idioma de la interfaz') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['es', 'en', 'fr', 'pt', 'de', 'it']);
  });

  it('preselecciona el idioma guardado del negocio', () => {
    render(LanguageTab, { props: { businessId: 'biz-1', business: { language: 'fr' } as never } });
    expect((screen.getByLabelText('Idioma de la interfaz') as HTMLSelectElement).value).toBe('fr');
  });

  it('al guardar, persiste el idioma elegido', async () => {
    actionsMock.updateBusinessLanguage.mockResolvedValue(undefined);
    render(LanguageTab, { props: { businessId: 'biz-1', business: null } });

    await fireEvent.change(screen.getByLabelText('Idioma de la interfaz'), { target: { value: 'pt' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Idioma' }));

    expect(actionsMock.updateBusinessLanguage).toHaveBeenCalledWith('biz-1', 'pt');
    expect(await screen.findByText('Idioma guardado.')).toBeTruthy();
  });
});
