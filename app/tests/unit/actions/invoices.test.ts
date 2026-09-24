import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const invoicesApiMock = vi.hoisted(() => ({
  listInvoices: vi.fn(),
  createInvoice: vi.fn(),
}));
vi.mock('../../../src/lib/api/invoices', () => invoicesApiMock);

const customerCreditsApiMock = vi.hoisted(() => ({ createCustomerCredit: vi.fn() }));
vi.mock('../../../src/lib/api/customerCredits', () => customerCreditsApiMock);

const activityLogApiMock = vi.hoisted(() => ({ logActivity: vi.fn() }));
vi.mock('../../../src/lib/api/activityLog', () => activityLogApiMock);

const customersActionsMock = vi.hoisted(() => ({ loadCredits: vi.fn() }));
vi.mock('../../../src/lib/actions/customers', () => customersActionsMock);

const { loadInvoices, createInvoiceForAppointment } = await import('../../../src/lib/actions/invoices');
const { invoices } = await import('../../../src/lib/stores/invoices');

const services = [
  { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 1000, active: true, created_at: null },
];

const appt = {
  id: 'appt-1',
  business_id: 'biz-1',
  customer_id: 'cust-1',
  employee_id: 'biz-1',
  service_id: 'svc-1',
  service_ids: null,
  start_at: '2026-01-01T10:00:00Z',
  end_at: '2026-01-01T10:30:00Z',
  status: 'completada',
  price: null,
  notes: null,
  created_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  invoices.set([]);
});

describe('loadInvoices', () => {
  it('carga las facturas del negocio en el store', async () => {
    invoicesApiMock.listInvoices.mockResolvedValue([{ id: 'inv-1' }]);
    await loadInvoices('biz-1');
    expect(invoicesApiMock.listInvoices).toHaveBeenCalledWith('biz-1');
    expect(get(invoices)).toEqual([{ id: 'inv-1' }]);
  });
});

describe('createInvoiceForAppointment', () => {
  it('sin impuesto, crea la factura por el ingreso completo y no crea crédito para efectivo', async () => {
    invoicesApiMock.createInvoice.mockResolvedValue({ id: 'inv-new', invoice_number: 'FAC-000001', total: 1000 });
    invoicesApiMock.listInvoices.mockResolvedValue([]);

    const invoice = await createInvoiceForAppointment({
      businessId: 'biz-1',
      appt,
      services,
      business: null,
      customerId: 'cust-1',
      customerName: 'Ana',
      paymentMethod: 'efectivo',
      buildActivityMessage: (number) => `Factura generada ${number}`,
    });

    expect(invoicesApiMock.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: 'biz-1',
        appointment_id: 'appt-1',
        customer_id: 'cust-1',
        customer_name: 'Ana',
        payment_method: 'efectivo',
        subtotal: 1000,
        tax_amount: 0,
        total: 1000,
      })
    );
    expect(customerCreditsApiMock.createCustomerCredit).not.toHaveBeenCalled();
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({
      business_id: 'biz-1',
      action: 'Factura generada FAC-000001',
    });
    expect(invoice).toEqual({ id: 'inv-new', invoice_number: 'FAC-000001', total: 1000 });
  });

  it('a crédito con cliente, crea el crédito pendiente y recarga créditos', async () => {
    invoicesApiMock.createInvoice.mockResolvedValue({ id: 'inv-new', invoice_number: 'FAC-000002', total: 1000 });
    invoicesApiMock.listInvoices.mockResolvedValue([]);
    customerCreditsApiMock.createCustomerCredit.mockResolvedValue(undefined);

    await createInvoiceForAppointment({
      businessId: 'biz-1',
      appt,
      services,
      business: null,
      customerId: 'cust-1',
      customerName: 'Ana',
      paymentMethod: 'credito',
      buildActivityMessage: () => 'Factura generada',
    });

    expect(customerCreditsApiMock.createCustomerCredit).toHaveBeenCalledWith({
      business_id: 'biz-1',
      customer_id: 'cust-1',
      invoice_id: 'inv-new',
      amount: 1000,
      amount_paid: 0,
      status: 'pendiente',
    });
    expect(customersActionsMock.loadCredits).toHaveBeenCalledWith('biz-1');
  });

  it('a crédito sin cliente (walk-in no enlazado), no crea crédito', async () => {
    invoicesApiMock.createInvoice.mockResolvedValue({ id: 'inv-new', invoice_number: 'FAC-000003', total: 1000 });
    invoicesApiMock.listInvoices.mockResolvedValue([]);

    await createInvoiceForAppointment({
      businessId: 'biz-1',
      appt,
      services,
      business: null,
      customerId: null,
      customerName: 'Walk-in',
      paymentMethod: 'credito',
      buildActivityMessage: () => 'Factura generada',
    });

    expect(customerCreditsApiMock.createCustomerCredit).not.toHaveBeenCalled();
  });

  it('con impuesto sumado al vender, guarda subtotal/impuesto/total desglosados', async () => {
    invoicesApiMock.createInvoice.mockResolvedValue({ id: 'inv-new', invoice_number: 'FAC-000004', total: 1180 });
    invoicesApiMock.listInvoices.mockResolvedValue([]);

    await createInvoiceForAppointment({
      businessId: 'biz-1',
      appt,
      services,
      business: { tax_enabled: true, tax_percentage: 18, tax_included_in_price: false } as never,
      customerId: 'cust-1',
      customerName: 'Ana',
      paymentMethod: 'efectivo',
      buildActivityMessage: () => 'Factura generada',
    });

    expect(invoicesApiMock.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal: 1000, tax_amount: 180, total: 1180 })
    );
  });
});
