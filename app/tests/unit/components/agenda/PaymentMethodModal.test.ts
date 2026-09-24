import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({ linkAppointmentCustomer: vi.fn() }));
vi.mock('../../../../src/lib/actions/appointments', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/appointments')>(
      '../../../../src/lib/actions/appointments'
    );
  return { ...actual, linkAppointmentCustomer: actionsMock.linkAppointmentCustomer };
});

const { default: PaymentMethodModal } = await import(
  '../../../../src/lib/components/agenda/PaymentMethodModal.svelte'
);

const corte = { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null };
const customer = { id: 'cust-1', business_id: 'biz-1', name: 'Ana', phone: null, notes: null, address: null, email: null, created_at: null };

function makeAppt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appt-1',
    business_id: 'biz-1',
    customer_id: 'cust-1',
    employee_id: 'biz-1',
    service_id: 'svc-1',
    service_ids: null,
    start_at: '2026-01-01T10:00:00.000Z',
    end_at: '2026-01-01T10:30:00.000Z',
    status: 'confirmada',
    price: 500,
    notes: null,
    created_at: null,
    ...overrides,
  };
}

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('PaymentMethodModal', () => {
  it('muestra el resumen del cliente, servicios y total', () => {
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt(),
        clientName: 'Ana',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByText(/Ana — Corte \| Total: \$500\.00/)).toBeTruthy();
  });

  it('confirma con el método de pago elegido (por defecto, el primero habilitado)', async () => {
    const onConfirm = vi.fn();
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt(),
        clientName: 'Ana',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm,
        onCancel: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Completar' }));
    expect(onConfirm).toHaveBeenCalledWith('efectivo');
    expect(actionsMock.linkAppointmentCustomer).not.toHaveBeenCalled();
  });

  it('walk-in + crédito: exige elegir un cliente registrado antes de confirmar', async () => {
    const onConfirm = vi.fn();
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt({ customer_id: null }),
        clientName: 'Walk-in',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm,
        onCancel: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByLabelText('Crédito (fiado)'));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Completar' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'El crédito (fiado) requiere un cliente registrado. Registra al cliente o elige otro método de pago.'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('walk-in + crédito + cliente elegido: enlaza la cita y confirma', async () => {
    actionsMock.linkAppointmentCustomer.mockResolvedValue(undefined);
    const onConfirm = vi.fn();
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt({ customer_id: null }),
        clientName: 'Walk-in',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm,
        onCancel: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByLabelText('Crédito (fiado)'));
    await fireEvent.change(screen.getByLabelText(/Esta cita no está vinculada/), { target: { value: 'cust-1' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Completar' }));

    expect(actionsMock.linkAppointmentCustomer).toHaveBeenCalledWith('appt-1', 'cust-1');
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith('credito'));
  });

  it('cliente ya registrado + crédito: no pide enlazar nada', async () => {
    const onConfirm = vi.fn();
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt({ customer_id: 'cust-1' }),
        clientName: 'Ana',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm,
        onCancel: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByLabelText('Crédito (fiado)'));
    expect(screen.queryByLabelText(/Esta cita no está vinculada/)).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Completar' }));
    expect(onConfirm).toHaveBeenCalledWith('credito');
  });

  it('respeta los métodos de pago habilitados por el negocio', () => {
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt(),
        clientName: 'Ana',
        services: [corte],
        customers: [customer],
        business: { payment_methods: { efectivo: true, transferencia: false, tarjeta: false, credito: false } } as never,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.getByLabelText('Efectivo')).toBeTruthy();
    expect(screen.queryByLabelText('Transferencia')).toBeNull();
  });

  it('el botón cancelar llama a onCancel', async () => {
    const onCancel = vi.fn();
    render(PaymentMethodModal, {
      props: {
        appt: makeAppt(),
        clientName: 'Ana',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm: vi.fn(),
        onCancel,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('sin violaciones de accesibilidad (axe-core), con el selector de cliente walk-in visible', async () => {
    const { container } = render(PaymentMethodModal, {
      props: {
        appt: makeAppt({ customer_id: null }),
        clientName: 'Walk-in',
        services: [corte],
        customers: [customer],
        business: null,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    await fireEvent.click(screen.getByLabelText('Crédito (fiado)'));

    await expectNoA11yViolations(container);
  });
});
