import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const customersApiMock = vi.hoisted(() => ({
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
}));
vi.mock('../../../src/lib/api/customers', () => customersApiMock);

const customerCreditsApiMock = vi.hoisted(() => ({
  listCustomerCredits: vi.fn(),
  updateCustomerCredit: vi.fn(),
}));
vi.mock('../../../src/lib/api/customerCredits', () => customerCreditsApiMock);

const { loadCustomers, loadCredits, registerCustomer, payCredit } = await import(
  '../../../src/lib/actions/customers'
);
const { customers, customerCredits } = await import('../../../src/lib/stores/customers');

beforeEach(() => {
  vi.clearAllMocks();
  customers.set([]);
  customerCredits.set([]);
});

describe('loadCustomers', () => {
  it('carga los clientes del negocio en el store', async () => {
    customersApiMock.listCustomers.mockResolvedValue([{ id: 'cust-1', name: 'Ana' }]);

    await loadCustomers('biz-1');

    expect(customersApiMock.listCustomers).toHaveBeenCalledWith('biz-1');
    expect(get(customers)).toEqual([{ id: 'cust-1', name: 'Ana' }]);
  });
});

describe('loadCredits', () => {
  it('carga los créditos del negocio en el store', async () => {
    customerCreditsApiMock.listCustomerCredits.mockResolvedValue([{ id: 'cr-1' }]);

    await loadCredits('biz-1');

    expect(get(customerCredits)).toEqual([{ id: 'cr-1' }]);
  });
});

describe('registerCustomer', () => {
  it('crea el cliente y recarga la lista', async () => {
    customersApiMock.createCustomer.mockResolvedValue(undefined);
    customersApiMock.listCustomers.mockResolvedValue([{ id: 'cust-new', name: 'Ana' }]);

    await registerCustomer({
      businessId: 'biz-1',
      name: 'Ana',
      phone: '555-1234',
      address: null,
      email: null,
    });

    expect(customersApiMock.createCustomer).toHaveBeenCalledWith({
      business_id: 'biz-1',
      name: 'Ana',
      phone: '555-1234',
      address: null,
      email: null,
    });
    expect(get(customers)).toEqual([{ id: 'cust-new', name: 'Ana' }]);
  });
});

describe('payCredit', () => {
  it('abono parcial: suma al monto abonado y el estado queda "parcial"', async () => {
    customerCredits.set([
      { id: 'cr-1', business_id: 'biz-1', customer_id: 'cust-1', amount: 100, amount_paid: 20, status: 'parcial' },
    ] as never);
    customerCreditsApiMock.updateCustomerCredit.mockResolvedValue(undefined);
    customerCreditsApiMock.listCustomerCredits.mockResolvedValue([]);

    await payCredit({ creditId: 'cr-1', amountToPay: 30 });

    expect(customerCreditsApiMock.updateCustomerCredit).toHaveBeenCalledWith('cr-1', {
      amount_paid: 50,
      status: 'parcial',
    });
    expect(customerCreditsApiMock.listCustomerCredits).toHaveBeenCalledWith('biz-1');
  });

  it('abono que cubre el total: el estado pasa a "pagado"', async () => {
    customerCredits.set([
      { id: 'cr-1', business_id: 'biz-1', customer_id: 'cust-1', amount: 100, amount_paid: 80, status: 'parcial' },
    ] as never);
    customerCreditsApiMock.updateCustomerCredit.mockResolvedValue(undefined);
    customerCreditsApiMock.listCustomerCredits.mockResolvedValue([]);

    await payCredit({ creditId: 'cr-1', amountToPay: 20 });

    expect(customerCreditsApiMock.updateCustomerCredit).toHaveBeenCalledWith('cr-1', {
      amount_paid: 100,
      status: 'pagado',
    });
  });

  it('si el crédito no existe (ya no en el store), no hace nada', async () => {
    await payCredit({ creditId: 'no-existe', amountToPay: 10 });
    expect(customerCreditsApiMock.updateCustomerCredit).not.toHaveBeenCalled();
  });
});
