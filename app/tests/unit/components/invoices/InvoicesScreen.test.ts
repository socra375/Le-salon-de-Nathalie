import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

const invoicesActionsMock = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock('../../../../src/lib/actions/invoices', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/invoices')>('../../../../src/lib/actions/invoices');
  return { ...actual, loadInvoices: invoicesActionsMock.loadInvoices };
});

const servicesActionsMock = vi.hoisted(() => ({ loadSpecialistOptions: vi.fn() }));
vi.mock('../../../../src/lib/actions/services', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/services')>('../../../../src/lib/actions/services');
  return { ...actual, loadSpecialistOptions: servicesActionsMock.loadSpecialistOptions };
});

const pdfMock = vi.hoisted(() => ({
  buildInvoicePdf: vi.fn(),
  openInvoicePdf: vi.fn(),
  loadImageAsDataURL: vi.fn(),
}));
vi.mock('../../../../src/lib/pdf/invoicePdf', () => pdfMock);

const { default: InvoicesScreen } = await import('../../../../src/lib/components/invoices/InvoicesScreen.svelte');
const { currentBusinessId, currentBusiness } = await import('../../../../src/lib/stores/session');
const { invoices } = await import('../../../../src/lib/stores/invoices');
const { appointments } = await import('../../../../src/lib/stores/appointments');
const { services } = await import('../../../../src/lib/stores/services');
const { customers } = await import('../../../../src/lib/stores/customers');

const invoice = {
  id: 'inv-1',
  business_id: 'biz-1',
  sale_id: null,
  customer_id: 'cust-1',
  appointment_id: 'appt-1',
  invoice_number: 'FAC-123456',
  customer_name: 'Ana',
  payment_method: 'efectivo',
  subtotal: 500,
  tax_amount: 0,
  total: 500,
  created_at: '2026-01-01T00:00:00.000Z',
};

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  currentBusiness.set({ id: 'biz-1', name: 'Mi Salón' } as never);
  invoices.set([]);
  appointments.set([]);
  services.set([]);
  customers.set([]);
  invoicesActionsMock.loadInvoices.mockResolvedValue(undefined);
  servicesActionsMock.loadSpecialistOptions.mockResolvedValue([]);
});

describe('InvoicesScreen', () => {
  it('al montar, carga las facturas del negocio actual', async () => {
    render(InvoicesScreen);
    await vi.waitFor(() => expect(invoicesActionsMock.loadInvoices).toHaveBeenCalledWith('biz-1'));
  });

  it('lista las facturas con número, fecha, método y total', () => {
    invoices.set([invoice] as never);
    render(InvoicesScreen);
    expect(screen.getByText('FAC-123456')).toBeTruthy();
    expect(screen.getByText('Efectivo')).toBeTruthy();
    expect(screen.getByText('$500.00')).toBeTruthy();
  });

  it('"Ver" reabre el PDF de la factura', async () => {
    invoices.set([invoice] as never);
    pdfMock.buildInvoicePdf.mockReturnValue({});
    render(InvoicesScreen);

    await fireEvent.click(screen.getByRole('button', { name: 'Ver' }));

    await vi.waitFor(() => expect(pdfMock.buildInvoicePdf).toHaveBeenCalled());
    expect(pdfMock.openInvoicePdf).toHaveBeenCalled();
  });
});
