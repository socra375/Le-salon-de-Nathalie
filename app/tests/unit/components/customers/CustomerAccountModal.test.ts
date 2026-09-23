import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

const actionsMock = vi.hoisted(() => ({ payCredit: vi.fn() }));
vi.mock('../../../../src/lib/actions/customers', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/customers')>(
      '../../../../src/lib/actions/customers'
    );
  return { ...actual, payCredit: actionsMock.payCredit };
});

const { default: CustomerAccountModal } = await import(
  '../../../../src/lib/components/customers/CustomerAccountModal.svelte'
);

const customer = { id: 'cust-1', business_id: 'biz-1', name: 'Ana', phone: '555-1234', notes: null, address: null, email: null, created_at: null };
const services = [{ id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: 'Cabello', duration_minutes: 30, price: 15, active: true, created_at: null }];
const specialistOptions = [{ id: 'biz-1', label: 'Tú (Administrador/a)' }];

const appt = {
  id: 'a1',
  business_id: 'biz-1',
  customer_id: 'cust-1',
  employee_id: 'biz-1',
  service_id: 'svc-1',
  service_ids: null,
  start_at: '2026-01-01T10:00:00.000Z',
  end_at: '2026-01-01T10:30:00.000Z',
  status: 'completada',
  price: null,
  notes: null,
  created_at: null,
};

const pendingCredit = {
  id: 'cr-1',
  business_id: 'biz-1',
  customer_id: 'cust-1',
  sale_id: null,
  invoice_id: null,
  amount: 100,
  amount_paid: 40,
  status: 'parcial',
  created_at: '2026-01-01T00:00:00.000Z',
};

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('CustomerAccountModal', () => {
  it('sin historial ni créditos, muestra "Sin registro" y no muestra el formulario de abono', () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [], services, specialistOptions, onClose: vi.fn() },
    });

    expect(screen.getByRole('heading', { name: 'Cuenta de Ana' })).toBeTruthy();
    expect(screen.getAllByText('Sin registro').length).toBe(3);
    expect(screen.queryByRole('button', { name: 'Procesar Abono' })).toBeNull();
  });

  it('con historial, muestra el servicio y especialista más frecuentes', () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [appt], services, specialistOptions, onClose: vi.fn() },
    });

    expect(screen.getAllByText('Corte').length).toBe(2);
    expect(screen.getAllByText('Tú (Administrador/a)').length).toBe(2);
  });

  it('con un crédito pendiente, permite abonar y muestra el mensaje de éxito', async () => {
    actionsMock.payCredit.mockResolvedValue(undefined);
    render(CustomerAccountModal, {
      props: { customer, credits: [pendingCredit], history: [], services, specialistOptions, onClose: vi.fn() },
    });

    await fireEvent.change(screen.getByLabelText('Seleccionar Crédito Pendiente'), { target: { value: 'cr-1' } });
    await fireEvent.input(screen.getByLabelText('Monto a Abonar ($)'), { target: { value: '20' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Procesar Abono' }));

    expect(actionsMock.payCredit).toHaveBeenCalledWith({ creditId: 'cr-1', amountToPay: 20 });
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Abono registrado correctamente.');
  });

  it('con un monto inválido (cero), no llama a payCredit', async () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [pendingCredit], history: [], services, specialistOptions, onClose: vi.fn() },
    });

    // El <select>/<input> son `required` -- para probar la validación
    // propia (monto > 0) hay que dejarlos completos pero inválidos, no
    // vacíos, porque un campo vacío ni deja disparar el submit.
    await fireEvent.change(screen.getByLabelText('Seleccionar Crédito Pendiente'), { target: { value: 'cr-1' } });
    await fireEvent.input(screen.getByLabelText('Monto a Abonar ($)'), { target: { value: '0' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Procesar Abono' }));

    expect(actionsMock.payCredit).not.toHaveBeenCalled();
    expect((await screen.findByRole('alert')).textContent).toBe('Monto o crédito inválido.');
  });

  it('si falla el abono, muestra el error traducido', async () => {
    actionsMock.payCredit.mockRejectedValue(new Error('conexión perdida'));
    render(CustomerAccountModal, {
      props: { customer, credits: [pendingCredit], history: [], services, specialistOptions, onClose: vi.fn() },
    });

    await fireEvent.change(screen.getByLabelText('Seleccionar Crédito Pendiente'), { target: { value: 'cr-1' } });
    await fireEvent.input(screen.getByLabelText('Monto a Abonar ($)'), { target: { value: '20' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Procesar Abono' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error al registrar abono: conexión perdida');
  });

  it('el botón cerrar llama a onClose', async () => {
    const onClose = vi.fn();
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [], services, specialistOptions, onClose },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
