import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const customersActionsMock = vi.hoisted(() => ({
  loadCustomers: vi.fn(),
  loadCredits: vi.fn(),
  registerCustomer: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/customers', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/customers')>(
      '../../../../src/lib/actions/customers'
    );
  return { ...actual, ...customersActionsMock };
});

const appointmentsActionsMock = vi.hoisted(() => ({ loadAppointments: vi.fn() }));
vi.mock('../../../../src/lib/actions/appointments', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/appointments')>(
      '../../../../src/lib/actions/appointments'
    );
  return { ...actual, ...appointmentsActionsMock };
});

const servicesActionsMock = vi.hoisted(() => ({ loadSpecialistOptions: vi.fn() }));
vi.mock('../../../../src/lib/actions/services', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/services')>(
      '../../../../src/lib/actions/services'
    );
  return { ...actual, loadSpecialistOptions: servicesActionsMock.loadSpecialistOptions };
});

const invoicesActionsMock = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock('../../../../src/lib/actions/invoices', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/invoices')>('../../../../src/lib/actions/invoices');
  return { ...actual, loadInvoices: invoicesActionsMock.loadInvoices };
});

const { default: CustomersScreen } = await import('../../../../src/lib/components/customers/CustomersScreen.svelte');
const { currentBusinessId } = await import('../../../../src/lib/stores/session');
const { customers, customerCredits } = await import('../../../../src/lib/stores/customers');
const { appointments } = await import('../../../../src/lib/stores/appointments');

const customer = { id: 'cust-1', business_id: 'biz-1', name: 'Ana', phone: '555-1234', notes: null, address: null, email: null, created_at: null };

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  customers.set([]);
  customerCredits.set([]);
  appointments.set([]);
  customersActionsMock.loadCustomers.mockImplementation(async () => {
    customers.set([customer]);
  });
  customersActionsMock.loadCredits.mockResolvedValue(undefined);
  appointmentsActionsMock.loadAppointments.mockResolvedValue(undefined);
  invoicesActionsMock.loadInvoices.mockResolvedValue(undefined);
  servicesActionsMock.loadSpecialistOptions.mockResolvedValue([]);
});

describe('CustomersScreen', () => {
  it('al montar, carga clientes, créditos, citas y opciones de especialistas del negocio actual', async () => {
    render(CustomersScreen);

    await vi.waitFor(() => expect(customersActionsMock.loadCustomers).toHaveBeenCalledWith('biz-1'));
    expect(customersActionsMock.loadCredits).toHaveBeenCalledWith('biz-1');
    expect(appointmentsActionsMock.loadAppointments).toHaveBeenCalledWith('biz-1');
    expect(invoicesActionsMock.loadInvoices).toHaveBeenCalledWith('biz-1');
    expect(servicesActionsMock.loadSpecialistOptions).toHaveBeenCalledWith(
      'biz-1',
      'Tú (Administrador/a)',
      'Empleado sin nombre'
    );
    expect(await screen.findByText('Ana')).toBeTruthy();
  });

  it('al enviar el formulario, registra el cliente y limpia los campos', async () => {
    customersActionsMock.registerCustomer.mockResolvedValue(undefined);
    render(CustomersScreen);
    await screen.findByText('Ana');

    await fireEvent.input(screen.getByLabelText('Nombre del Cliente'), { target: { value: 'Beto' } });
    await fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: '555-9999' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Cliente' }));

    expect(customersActionsMock.registerCustomer).toHaveBeenCalledWith({
      businessId: 'biz-1',
      name: 'Beto',
      phone: '555-9999',
      address: null,
      email: null,
    });
    await vi.waitFor(() => expect((screen.getByLabelText('Nombre del Cliente') as HTMLInputElement).value).toBe(''));
  });

  it('"Ver Cuenta" abre el modal de cuenta, y cerrar lo oculta', async () => {
    render(CustomersScreen);
    await screen.findByText('Ana');

    await fireEvent.click(screen.getByRole('button', { name: 'Ver Cuenta' }));
    expect(screen.getByRole('heading', { name: 'Cuenta de Ana' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('heading', { name: 'Cuenta de Ana' })).toBeNull();
  });

  it('sin violaciones de accesibilidad (axe-core), con la cuenta del cliente abierta', async () => {
    const { container } = render(CustomersScreen);
    await screen.findByText('Ana');
    await fireEvent.click(screen.getByRole('button', { name: 'Ver Cuenta' }));

    await expectNoA11yViolations(container);
  });
});
