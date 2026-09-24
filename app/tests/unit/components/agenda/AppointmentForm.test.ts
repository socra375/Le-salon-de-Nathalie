import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({ createAppointment: vi.fn() }));
vi.mock('../../../../src/lib/actions/appointments', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/appointments')>(
      '../../../../src/lib/actions/appointments'
    );
  return { ...actual, createAppointment: actionsMock.createAppointment };
});

const { default: AppointmentForm } = await import('../../../../src/lib/components/agenda/AppointmentForm.svelte');

const corte = { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null };
const inactiveSvc = { id: 'svc-2', business_id: 'biz-1', name: 'Inactivo', category: null, duration_minutes: 10, price: 100, active: false, created_at: null };
const specialistOptions = [{ id: 'biz-1', label: 'Tú (Administrador/a)' }];
const customer = { id: 'cust-1', business_id: 'biz-1', name: 'Ana', phone: null, notes: null, address: null, email: null, created_at: null };

const baseProps = {
  businessId: 'biz-1',
  services: [corte, inactiveSvc],
  specialistOptions,
  customers: [customer],
  initialDate: '2026-01-15',
  onSaved: vi.fn(),
  onCancel: vi.fn(),
};

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('AppointmentForm', () => {
  it('solo lista servicios activos', () => {
    render(AppointmentForm, { props: baseProps });
    expect(screen.getByText(/Corte/)).toBeTruthy();
    expect(screen.queryByText(/Inactivo/)).toBeNull();
  });

  it('sin ningún servicio elegido, avisa y no llama a createAppointment', async () => {
    render(AppointmentForm, { props: baseProps });
    await fireEvent.input(screen.getByLabelText('Fecha'), { target: { value: '2026-01-15' } });
    await fireEvent.input(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Cita' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Selecciona un servicio válido.');
    expect(actionsMock.createAppointment).not.toHaveBeenCalled();
  });

  it('completo y válido, crea la cita walk-in con el nombre escrito', async () => {
    actionsMock.createAppointment.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(AppointmentForm, { props: { ...baseProps, onSaved } });

    await fireEvent.click(screen.getByLabelText(/Corte/));
    await fireEvent.input(screen.getByLabelText('Nombre del Cliente (Walk-in, opcional)'), {
      target: { value: 'María' },
    });
    await fireEvent.input(screen.getByLabelText('Fecha'), { target: { value: '2026-01-15' } });
    await fireEvent.input(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Cita' }));

    expect(actionsMock.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        customerId: null,
        walkinName: 'María',
        specialistId: 'biz-1',
        serviceIds: ['svc-1'],
      }),
      expect.any(String)
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('al elegir un cliente registrado, oculta el campo de nombre walk-in', async () => {
    render(AppointmentForm, { props: baseProps });
    expect(screen.getByLabelText('Nombre del Cliente (Walk-in, opcional)')).toBeTruthy();

    await fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'cust-1' } });

    expect(screen.queryByLabelText('Nombre del Cliente (Walk-in, opcional)')).toBeNull();
  });

  it('si falla el guardado, muestra el error traducido', async () => {
    actionsMock.createAppointment.mockRejectedValue(new Error('conexión perdida'));
    render(AppointmentForm, { props: baseProps });

    await fireEvent.click(screen.getByLabelText(/Corte/));
    await fireEvent.input(screen.getByLabelText('Fecha'), { target: { value: '2026-01-15' } });
    await fireEvent.input(screen.getByLabelText('Hora'), { target: { value: '10:00' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Cita' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error al crear la cita: conexión perdida');
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(AppointmentForm, { props: baseProps });
    await expectNoA11yViolations(container);
  });
});
