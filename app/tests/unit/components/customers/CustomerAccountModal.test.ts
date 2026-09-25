import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const actionsMock = vi.hoisted(() => ({ payCredit: vi.fn() }));
vi.mock('../../../../src/lib/actions/customers', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/customers')>(
      '../../../../src/lib/actions/customers'
    );
  return { ...actual, payCredit: actionsMock.payCredit };
});

const invoicesActionsMock = vi.hoisted(() => ({ createInvoiceForAppointment: vi.fn() }));
vi.mock('../../../../src/lib/actions/invoices', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/invoices')>('../../../../src/lib/actions/invoices');
  return { ...actual, createInvoiceForAppointment: invoicesActionsMock.createInvoiceForAppointment };
});

const pdfMock = vi.hoisted(() => ({
  buildInvoicePdf: vi.fn(),
  openInvoicePdf: vi.fn(),
  loadImageAsDataURL: vi.fn(),
}));
vi.mock('../../../../src/lib/pdf/invoicePdf', () => pdfMock);

const { default: CustomerAccountModal } = await import(
  '../../../../src/lib/components/customers/CustomerAccountModal.svelte'
);
const { currentBusiness } = await import('../../../../src/lib/stores/session');

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
beforeEach(() => {
  vi.clearAllMocks();
  currentBusiness.set({ id: 'biz-1', name: 'Mi Salón' } as never);
});

describe('CustomerAccountModal', () => {
  it('sin historial ni créditos, muestra "Sin registro" y no muestra el formulario de abono', () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });

    expect(screen.getByRole('heading', { name: 'Cuenta de Ana' })).toBeTruthy();
    expect(screen.getAllByText('Sin registro').length).toBe(3);
    expect(screen.queryByRole('button', { name: 'Procesar Abono' })).toBeNull();
  });

  it('con historial, muestra el servicio y especialista más frecuentes', () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [appt], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });

    expect(screen.getAllByText('Corte').length).toBe(2);
    expect(screen.getAllByText('Tú (Administrador/a)').length).toBe(2);
  });

  it('con un crédito pendiente, permite abonar y muestra el mensaje de éxito', async () => {
    actionsMock.payCredit.mockResolvedValue(undefined);
    render(CustomerAccountModal, {
      props: { customer, credits: [pendingCredit], history: [], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });

    await fireEvent.change(screen.getByLabelText('Seleccionar Crédito Pendiente'), { target: { value: 'cr-1' } });
    await fireEvent.input(screen.getByLabelText('Monto a Abonar ($)'), { target: { value: '20' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Procesar Abono' }));

    expect(actionsMock.payCredit).toHaveBeenCalledWith({ creditId: 'cr-1', amountToPay: 20 });
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Abono registrado correctamente.');
  });

  it('con un monto inválido (cero), no llama a payCredit', async () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [pendingCredit], history: [], services, invoices: [], specialistOptions, onClose: vi.fn() },
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
      props: { customer, credits: [pendingCredit], history: [], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });

    await fireEvent.change(screen.getByLabelText('Seleccionar Crédito Pendiente'), { target: { value: 'cr-1' } });
    await fireEvent.input(screen.getByLabelText('Monto a Abonar ($)'), { target: { value: '20' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Procesar Abono' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error al registrar abono: conexión perdida');
  });

  it('el botón cerrar llama a onClose', async () => {
    const onClose = vi.fn();
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [], services, invoices: [], specialistOptions, onClose },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('sin citas completadas, el resumen mensual muestra el aviso de vacío', () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });
    expect(screen.getByText('Todavía no hay historial de gastos por mes.')).toBeTruthy();
  });

  it('agrupa el historial por mes y muestra el total cobrado', () => {
    render(CustomerAccountModal, {
      props: {
        customer,
        credits: [],
        history: [{ ...appt, price: 500 }],
        services,
        invoices: [],
        specialistOptions,
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText(/Enero de 2026|enero de 2026/i)).toBeTruthy();
    expect(screen.getByText(/\$500\.00/)).toBeTruthy();
  });

  it('una cita completada sin factura muestra el botón "Facturar" en su mes', () => {
    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [appt], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });
    expect(screen.getByRole('button', { name: 'Facturar' })).toBeTruthy();
  });

  it('una cita ya facturada no muestra el botón "Facturar"', () => {
    render(CustomerAccountModal, {
      props: {
        customer,
        credits: [],
        history: [appt],
        services,
        invoices: [{ id: 'inv-1', appointment_id: 'a1' }] as never,
        specialistOptions,
        onClose: vi.fn(),
      },
    });
    expect(screen.queryByRole('button', { name: 'Facturar' })).toBeNull();
  });

  it('facturar desde el resumen mensual orquesta createInvoiceForAppointment y abre el PDF', async () => {
    invoicesActionsMock.createInvoiceForAppointment.mockResolvedValue({ id: 'inv-1', customer_id: 'cust-1' });
    pdfMock.buildInvoicePdf.mockReturnValue({});

    render(CustomerAccountModal, {
      props: { customer, credits: [], history: [appt], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Facturar' }));
    expect(screen.getByRole('dialog', { name: 'Método de Pago' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Completar' }));

    await vi.waitFor(() => expect(invoicesActionsMock.createInvoiceForAppointment).toHaveBeenCalled());
    expect(invoicesActionsMock.createInvoiceForAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz-1', customerId: 'cust-1', customerName: 'Ana' })
    );
    expect(pdfMock.buildInvoicePdf).toHaveBeenCalled();
    expect(pdfMock.openInvoicePdf).toHaveBeenCalled();
  });

  it('sin violaciones de accesibilidad (axe-core), con historial y un crédito pendiente', async () => {
    const { container } = render(CustomerAccountModal, {
      props: { customer, credits: [pendingCredit], history: [appt], services, invoices: [], specialistOptions, onClose: vi.fn() },
    });
    await expectNoA11yViolations(container);
  });
});
