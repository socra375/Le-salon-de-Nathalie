import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

const employeesActionsMock = vi.hoisted(() => ({
  loadEmployees: vi.fn(),
  generateInvite: vi.fn(),
  updateEmployeeRoleTitle: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/employees', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/employees')>(
      '../../../../src/lib/actions/employees'
    );
  return { ...actual, ...employeesActionsMock };
});

const { default: EmployeesScreen } = await import('../../../../src/lib/components/employees/EmployeesScreen.svelte');
const { currentBusinessId } = await import('../../../../src/lib/stores/session');
const { employees } = await import('../../../../src/lib/stores/employees');

const member = {
  id: 'member-1',
  business_id: 'biz-1',
  user_id: 'user-1',
  role: 'employee',
  employee_name: 'Ana',
  role_title: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  currentBusinessId.set('biz-1');
  employees.set([]);
  employeesActionsMock.loadEmployees.mockImplementation(async () => {
    employees.set([member]);
  });
});

describe('EmployeesScreen', () => {
  it('al montar, carga los empleados del negocio actual', async () => {
    render(EmployeesScreen);
    await vi.waitFor(() => expect(employeesActionsMock.loadEmployees).toHaveBeenCalledWith('biz-1'));
    expect(await screen.findByText('Ana')).toBeTruthy();
  });

  it('generar un código lo muestra en pantalla', async () => {
    employeesActionsMock.generateInvite.mockResolvedValue('EMPABC123XY');
    render(EmployeesScreen);

    await fireEvent.click(screen.getByRole('button', { name: 'Generar Código de Invitación' }));

    expect(await screen.findByText('EMPABC123XY')).toBeTruthy();
    expect(employeesActionsMock.generateInvite).toHaveBeenCalledWith('biz-1', 'Generó un código de invitación para empleado');
  });

  it('si falla la generación del código, muestra el error', async () => {
    employeesActionsMock.generateInvite.mockRejectedValue(new Error('límite alcanzado'));
    render(EmployeesScreen);

    await fireEvent.click(screen.getByRole('button', { name: 'Generar Código de Invitación' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error generando código: límite alcanzado');
  });

  it('copiar el código lo escribe al portapapeles y avisa', async () => {
    employeesActionsMock.generateInvite.mockResolvedValue('EMPABC123XY');
    render(EmployeesScreen);
    await fireEvent.click(screen.getByRole('button', { name: 'Generar Código de Invitación' }));
    await screen.findByText('EMPABC123XY');

    await fireEvent.click(screen.getByRole('button', { name: 'Copiar Código' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('EMPABC123XY');
    expect(await screen.findByText('Código copiado al portapapeles.')).toBeTruthy();
  });

  it('editar el cargo de un empleado lo guarda', async () => {
    employeesActionsMock.updateEmployeeRoleTitle.mockResolvedValue(undefined);
    render(EmployeesScreen);
    await screen.findByText('Ana');

    const input = screen.getByPlaceholderText('Ej: Estilista');
    await fireEvent.change(input, { target: { value: 'Estilista Senior' } });

    expect(employeesActionsMock.updateEmployeeRoleTitle).toHaveBeenCalledWith(
      'biz-1',
      'member-1',
      'Estilista Senior',
      'Actualizó el cargo de un empleado a "Estilista Senior"'
    );
  });

  it('un empleado sin nombre muestra el texto de reserva', async () => {
    employeesActionsMock.loadEmployees.mockImplementation(async () => {
      employees.set([{ ...member, employee_name: null }]);
    });
    render(EmployeesScreen);
    expect(await screen.findByText('Sin nombre')).toBeTruthy();
  });
});
