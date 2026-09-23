import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

const actionsMock = vi.hoisted(() => ({
  loadServices: vi.fn(),
  loadSpecialistOptions: vi.fn(),
  removeService: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/services', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/services')>(
      '../../../../src/lib/actions/services'
    );
  return { ...actual, ...actionsMock };
});

const { default: ServicesScreen } = await import('../../../../src/lib/components/services/ServicesScreen.svelte');
const { currentBusinessId } = await import('../../../../src/lib/stores/session');
const { services, specialistServices } = await import('../../../../src/lib/stores/services');

const service = {
  id: 'svc-1',
  business_id: 'biz-1',
  name: 'Corte',
  category: 'Cabello',
  duration_minutes: 30,
  price: 15,
  active: true,
  created_at: null,
};

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  services.set([]);
  specialistServices.set([]);
  actionsMock.loadServices.mockImplementation(async () => {
    services.set([service]);
  });
  actionsMock.loadSpecialistOptions.mockResolvedValue([{ id: 'biz-1', label: 'Tú (admin)' }]);
});

describe('ServicesScreen', () => {
  it('al montar, carga los servicios y las opciones de especialistas del negocio actual', async () => {
    render(ServicesScreen);

    await vi.waitFor(() => expect(actionsMock.loadServices).toHaveBeenCalledWith('biz-1'));
    expect(actionsMock.loadSpecialistOptions).toHaveBeenCalledWith(
      'biz-1',
      'Tú (Administrador/a)',
      'Empleado sin nombre'
    );
    expect(await screen.findByText('Corte')).toBeTruthy();
  });

  it('el botón "Nuevo Servicio" abre el formulario, y cancelar lo cierra', async () => {
    render(ServicesScreen);
    await vi.waitFor(() => expect(actionsMock.loadServices).toHaveBeenCalled());

    await fireEvent.click(screen.getByRole('button', { name: '+ Nuevo Servicio' }));
    expect(screen.getByRole('heading', { name: 'Guardar Servicio' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Guardar Servicio' })).toBeNull();
  });

  it('eliminar pide confirmación inline antes de llamar a removeService', async () => {
    actionsMock.removeService.mockResolvedValue({ status: 'deleted' });
    render(ServicesScreen);
    await screen.findByText('Corte');

    await fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(actionsMock.removeService).not.toHaveBeenCalled();
    expect(screen.getByText('¿Eliminar el servicio "Corte"? Esta acción no se puede deshacer.')).toBeTruthy();

    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await fireEvent.click(confirmButtons.at(-1)!);

    expect(actionsMock.removeService).toHaveBeenCalledWith('biz-1', 'svc-1', 'Eliminó el servicio "Corte"');
  });

  it('cancelar la confirmación de borrado no llama a removeService', async () => {
    render(ServicesScreen);
    await screen.findByText('Corte');

    await fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(actionsMock.removeService).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Eliminar el servicio "Corte"? Esta acción no se puede deshacer.')).toBeNull();
  });

  it('si el borrado queda bloqueado por citas/facturas asociadas, muestra el aviso de desactivar', async () => {
    actionsMock.removeService.mockResolvedValue({ status: 'blocked' });
    render(ServicesScreen);
    await screen.findByText('Corte');

    await fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await fireEvent.click(confirmButtons.at(-1)!);

    expect(
      await screen.findByText(
        'No se puede eliminar "Corte" porque tiene citas o facturas asociadas. Puedes desactivarlo en su lugar editándolo.'
      )
    ).toBeTruthy();
  });

  it('editar precarga el formulario con los datos del servicio', async () => {
    render(ServicesScreen);
    await screen.findByText('Corte');

    await fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('heading', { name: 'Editar Servicio' })).toBeTruthy();
    expect((screen.getByLabelText('Nombre del Servicio') as HTMLInputElement).value).toBe('Corte');
  });
});
