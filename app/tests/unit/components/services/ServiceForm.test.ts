import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({ saveService: vi.fn() }));
vi.mock('../../../../src/lib/actions/services', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/services')>(
      '../../../../src/lib/actions/services'
    );
  return { ...actual, saveService: actionsMock.saveService };
});

const { default: ServiceForm } = await import('../../../../src/lib/components/services/ServiceForm.svelte');

const specialistOptions = [
  { id: 'biz-1', label: 'Tú (admin)' },
  { id: 'emp-1', label: 'Ana' },
];

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('ServiceForm', () => {
  it('un servicio nuevo arranca con los valores por defecto del legado', () => {
    render(ServiceForm, {
      props: {
        businessId: 'biz-1',
        service: null,
        selectedSpecialistIds: [],
        specialistOptions,
        onSaved: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByRole('heading', { name: 'Guardar Servicio' })).toBeTruthy();
    expect((screen.getByLabelText('Duración Estimada (minutos)') as HTMLInputElement).value).toBe('30');
  });

  it('al enviar un servicio nuevo, llama a saveService con id null y avisa al padre', async () => {
    actionsMock.saveService.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(ServiceForm, {
      props: {
        businessId: 'biz-1',
        service: null,
        selectedSpecialistIds: [],
        specialistOptions,
        onSaved,
        onCancel: vi.fn(),
      },
    });

    await fireEvent.input(screen.getByLabelText('Nombre del Servicio'), { target: { value: 'Corte' } });
    await fireEvent.input(screen.getByLabelText('Precio ($)'), { target: { value: '15' } });
    await fireEvent.click(screen.getByLabelText('Ana'));
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Servicio' }));

    expect(actionsMock.saveService).toHaveBeenCalledWith(
      {
        id: null,
        businessId: 'biz-1',
        name: 'Corte',
        category: 'Cabello',
        durationMinutes: 30,
        price: 15,
        active: true,
        specialistIds: ['emp-1'],
      },
      'Creó el servicio "Corte"'
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('al editar, precarga los campos y el mensaje de actividad dice "Editó"', async () => {
    actionsMock.saveService.mockResolvedValue(undefined);
    render(ServiceForm, {
      props: {
        businessId: 'biz-1',
        service: {
          id: 'svc-1',
          business_id: 'biz-1',
          name: 'Corte',
          category: 'Barbería',
          duration_minutes: 45,
          price: 20,
          active: false,
          created_at: null,
        },
        selectedSpecialistIds: ['emp-1'],
        specialistOptions,
        onSaved: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByRole('heading', { name: 'Editar Servicio' })).toBeTruthy();
    expect((screen.getByLabelText('Nombre del Servicio') as HTMLInputElement).value).toBe('Corte');
    expect((screen.getByLabelText('Ana') as HTMLInputElement).checked).toBe(true);

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Servicio' }));

    expect(actionsMock.saveService).toHaveBeenCalledWith(expect.anything(), 'Editó el servicio "Corte"');
  });

  it('si falla el guardado, muestra el error traducido y no avisa al padre', async () => {
    actionsMock.saveService.mockRejectedValue(new Error('conexión perdida'));
    const onSaved = vi.fn();
    render(ServiceForm, {
      props: {
        businessId: 'biz-1',
        service: null,
        selectedSpecialistIds: [],
        specialistOptions,
        onSaved,
        onCancel: vi.fn(),
      },
    });

    await fireEvent.input(screen.getByLabelText('Nombre del Servicio'), { target: { value: 'Corte' } });
    await fireEvent.input(screen.getByLabelText('Precio ($)'), { target: { value: '15' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Servicio' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error al guardar el servicio: conexión perdida');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('el botón cancelar llama a onCancel', async () => {
    const onCancel = vi.fn();
    render(ServiceForm, {
      props: {
        businessId: 'biz-1',
        service: null,
        selectedSpecialistIds: [],
        specialistOptions,
        onSaved: vi.fn(),
        onCancel,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(ServiceForm, {
      props: {
        businessId: 'biz-1',
        service: null,
        selectedSpecialistIds: [],
        specialistOptions,
        onSaved: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    await expectNoA11yViolations(container);
  });
});
