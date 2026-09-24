import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import type { Tables } from '../../../../src/lib/types/database.types';

const actionsMock = vi.hoisted(() => ({ updateBusinessInfo: vi.fn() }));
vi.mock('../../../../src/lib/actions/settings', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/settings')>('../../../../src/lib/actions/settings');
  return { ...actual, updateBusinessInfo: actionsMock.updateBusinessInfo };
});

const { default: BusinessTab } = await import('../../../../src/lib/components/settings/BusinessTab.svelte');

const business = {
  id: 'biz-1',
  name: 'Mi Salón',
  phone: '555',
  address: 'Calle 1',
  website: 'www.x.com',
  logo_url: null,
} as Tables<'businesses'>;

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('BusinessTab', () => {
  it('precarga los campos con los datos actuales del negocio', () => {
    render(BusinessTab, { props: { businessId: 'biz-1', business } });
    expect((screen.getByLabelText('Nombre Comercial') as HTMLInputElement).value).toBe('Mi Salón');
  });

  it('al guardar, llama a updateBusinessInfo y muestra el mensaje de éxito', async () => {
    actionsMock.updateBusinessInfo.mockResolvedValue({ logoUploadError: null });
    render(BusinessTab, { props: { businessId: 'biz-1', business } });

    await fireEvent.input(screen.getByLabelText('Nombre Comercial'), { target: { value: 'Nuevo Nombre' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Datos del Negocio' }));

    expect(actionsMock.updateBusinessInfo).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz-1', name: 'Nuevo Nombre', currentLogoUrl: null }),
      expect.any(String)
    );
    expect(await screen.findByText('Datos del salón guardados.')).toBeTruthy();
  });

  it('si el logo falla al subir, muestra ese error en vez del éxito', async () => {
    actionsMock.updateBusinessInfo.mockResolvedValue({ logoUploadError: 'bucket lleno' });
    render(BusinessTab, { props: { businessId: 'biz-1', business } });

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Datos del Negocio' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error subiendo el logo: bucket lleno');
  });
});
