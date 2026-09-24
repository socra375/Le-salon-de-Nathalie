import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const accountActionsMock = vi.hoisted(() => ({ getAccountInfo: vi.fn() }));
vi.mock('../../../../src/lib/actions/account', () => accountActionsMock);

const activityLogActionsMock = vi.hoisted(() => ({ loadActivityLog: vi.fn() }));
vi.mock('../../../../src/lib/actions/activityLog', () => activityLogActionsMock);

const customersActionsMock = vi.hoisted(() => ({
  loadCustomers: vi.fn(),
  loadCredits: vi.fn(),
  registerCustomer: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/customers', () => customersActionsMock);

const appointmentsActionsMock = vi.hoisted(() => ({ loadAppointments: vi.fn() }));
vi.mock('../../../../src/lib/actions/appointments', () => appointmentsActionsMock);

const servicesActionsMock = vi.hoisted(() => ({
  loadServices: vi.fn(),
  loadSpecialistOptions: vi.fn(),
  removeService: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/services', () => servicesActionsMock);

const { default: SettingsScreen } = await import('../../../../src/lib/components/settings/SettingsScreen.svelte');
const { currentBusinessId, currentBusiness } = await import('../../../../src/lib/stores/session');

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  currentBusiness.set({ id: 'biz-1', name: 'Mi Salón' } as never);
  accountActionsMock.getAccountInfo.mockResolvedValue({ avatarUrl: '', name: '', email: 'ana@example.com' });
  activityLogActionsMock.loadActivityLog.mockResolvedValue([]);
  customersActionsMock.loadCustomers.mockResolvedValue([]);
  customersActionsMock.loadCredits.mockResolvedValue([]);
  appointmentsActionsMock.loadAppointments.mockResolvedValue([]);
  servicesActionsMock.loadServices.mockResolvedValue([]);
  servicesActionsMock.loadSpecialistOptions.mockResolvedValue([]);
});

describe('SettingsScreen', () => {
  it('arranca en la lista de categorías, sin ninguna abierta', () => {
    render(SettingsScreen);
    expect(screen.getByRole('button', { name: 'Mi Cuenta' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Datos Negocio' })).toBeTruthy();
    expect(screen.queryByText('ana@example.com')).toBeNull();
  });

  it('entrar a "Mi Cuenta" muestra su contenido y un botón para volver', async () => {
    render(SettingsScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Mi Cuenta' }));
    expect(await screen.findByText('ana@example.com')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: /Configuración/ }));
    expect(screen.getByRole('button', { name: 'Mi Cuenta' })).toBeTruthy();
    expect(screen.queryByText('ana@example.com')).toBeNull();
  });

  it('entrar a "Cambiar de Plan" muestra el botón de WhatsApp', async () => {
    render(SettingsScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Cambiar de Plan' }));
    expect(screen.getByRole('button', { name: 'Solicitar cambio por WhatsApp' })).toBeTruthy();
  });

  it('entrar a "Datos Negocio" muestra ese formulario', async () => {
    render(SettingsScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Datos Negocio' }));
    expect(screen.getByLabelText('Nombre Comercial')).toBeTruthy();
  });

  it('entrar a "Registro Actividad" carga el log de ese negocio', async () => {
    render(SettingsScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Registro Actividad' }));
    expect(activityLogActionsMock.loadActivityLog).toHaveBeenCalledWith('biz-1');
  });

  it('entrar a "Clientes" muestra la pantalla de clientes', async () => {
    render(SettingsScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeTruthy();
    expect(customersActionsMock.loadCustomers).toHaveBeenCalledWith('biz-1');
  });

  it('entrar a "Servicios" muestra la pantalla de servicios', async () => {
    render(SettingsScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Servicios' }));
    expect(await screen.findByRole('heading', { name: 'Servicios' })).toBeTruthy();
    expect(servicesActionsMock.loadServices).toHaveBeenCalledWith('biz-1');
  });

  it('sin violaciones de accesibilidad (axe-core) en la lista inicial', async () => {
    const { container } = render(SettingsScreen);
    await expectNoA11yViolations(container);
  });
});
