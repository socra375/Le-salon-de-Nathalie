import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ApiError } from '../../../src/lib/api/errors';

const servicesApiMock = vi.hoisted(() => ({
  listServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}));
vi.mock('../../../src/lib/api/services', () => servicesApiMock);

const specialistServicesApiMock = vi.hoisted(() => ({
  listSpecialistServices: vi.fn(),
  deleteSpecialistServicesForService: vi.fn(),
  createSpecialistServices: vi.fn(),
}));
vi.mock('../../../src/lib/api/specialistServices', () => specialistServicesApiMock);

const businessMembersApiMock = vi.hoisted(() => ({
  listEmployees: vi.fn(),
}));
vi.mock('../../../src/lib/api/businessMembers', () => businessMembersApiMock);

const activityLogApiMock = vi.hoisted(() => ({
  logActivity: vi.fn(),
}));
vi.mock('../../../src/lib/api/activityLog', () => activityLogApiMock);

const { loadServices, loadSpecialistOptions, saveService, removeService } = await import(
  '../../../src/lib/actions/services'
);
const { services, specialistServices } = await import('../../../src/lib/stores/services');

beforeEach(() => {
  vi.clearAllMocks();
  services.set([]);
  specialistServices.set([]);
});

describe('loadServices', () => {
  it('carga servicios y sus vínculos con especialistas en los stores', async () => {
    servicesApiMock.listServices.mockResolvedValue([{ id: 'svc-1', name: 'Corte' }]);
    specialistServicesApiMock.listSpecialistServices.mockResolvedValue([
      { id: 'link-1', service_id: 'svc-1', employee_id: 'emp-1' },
    ]);

    await loadServices('biz-1');

    expect(servicesApiMock.listServices).toHaveBeenCalledWith('biz-1');
    expect(get(services)).toEqual([{ id: 'svc-1', name: 'Corte' }]);
    expect(get(specialistServices)).toEqual([{ id: 'link-1', service_id: 'svc-1', employee_id: 'emp-1' }]);
  });
});

describe('loadSpecialistOptions', () => {
  it('el admin del negocio siempre aparece primero, luego los empleados', async () => {
    businessMembersApiMock.listEmployees.mockResolvedValue([
      { user_id: 'emp-1', employee_name: 'Ana' },
      { user_id: 'emp-2', employee_name: null },
    ]);

    const options = await loadSpecialistOptions('biz-1', 'Tú (admin)', 'Empleado sin nombre');

    expect(options).toEqual([
      { id: 'biz-1', label: 'Tú (admin)' },
      { id: 'emp-1', label: 'Ana' },
      { id: 'emp-2', label: 'Empleado sin nombre' },
    ]);
  });
});

describe('saveService', () => {
  it('crea un servicio nuevo, reemplaza sus especialistas y registra actividad', async () => {
    servicesApiMock.createService.mockResolvedValue({ id: 'svc-new' });
    servicesApiMock.listServices.mockResolvedValue([{ id: 'svc-new' }]);
    specialistServicesApiMock.listSpecialistServices.mockResolvedValue([]);

    await saveService(
      {
        id: null,
        businessId: 'biz-1',
        name: 'Corte',
        category: 'Cabello',
        durationMinutes: 30,
        price: 15,
        active: true,
        specialistIds: ['emp-1', 'emp-2'],
      },
      'Creó el servicio "Corte"'
    );

    expect(servicesApiMock.createService).toHaveBeenCalledWith({
      business_id: 'biz-1',
      name: 'Corte',
      category: 'Cabello',
      duration_minutes: 30,
      price: 15,
      active: true,
    });
    expect(servicesApiMock.updateService).not.toHaveBeenCalled();
    expect(specialistServicesApiMock.deleteSpecialistServicesForService).toHaveBeenCalledWith('biz-1', 'svc-new');
    expect(specialistServicesApiMock.createSpecialistServices).toHaveBeenCalledWith([
      { business_id: 'biz-1', employee_id: 'emp-1', service_id: 'svc-new' },
      { business_id: 'biz-1', employee_id: 'emp-2', service_id: 'svc-new' },
    ]);
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({
      business_id: 'biz-1',
      action: 'Creó el servicio "Corte"',
    });
  });

  it('al editar, actualiza en vez de crear y no llama a createService', async () => {
    servicesApiMock.listServices.mockResolvedValue([]);
    specialistServicesApiMock.listSpecialistServices.mockResolvedValue([]);

    await saveService(
      {
        id: 'svc-1',
        businessId: 'biz-1',
        name: 'Corte',
        category: 'Cabello',
        durationMinutes: 45,
        price: 20,
        active: false,
        specialistIds: [],
      },
      'Editó el servicio "Corte"'
    );

    expect(servicesApiMock.updateService).toHaveBeenCalledWith('svc-1', {
      business_id: 'biz-1',
      name: 'Corte',
      category: 'Cabello',
      duration_minutes: 45,
      price: 20,
      active: false,
    });
    expect(servicesApiMock.createService).not.toHaveBeenCalled();
    expect(specialistServicesApiMock.createSpecialistServices).not.toHaveBeenCalled();
  });
});

describe('removeService', () => {
  it('borra el servicio, registra actividad y recarga la lista', async () => {
    servicesApiMock.deleteService.mockResolvedValue(undefined);
    servicesApiMock.listServices.mockResolvedValue([]);
    specialistServicesApiMock.listSpecialistServices.mockResolvedValue([]);

    const result = await removeService('biz-1', 'svc-1', 'Eliminó el servicio "Corte"');

    expect(result).toEqual({ status: 'deleted' });
    expect(activityLogApiMock.logActivity).toHaveBeenCalledWith({
      business_id: 'biz-1',
      action: 'Eliminó el servicio "Corte"',
    });
  });

  it('si tiene citas o facturas asociadas (FK), devuelve "blocked" en vez de lanzar', async () => {
    servicesApiMock.deleteService.mockRejectedValue(new ApiError('violates foreign key', { code: '23503' }));

    const result = await removeService('biz-1', 'svc-1', 'Eliminó el servicio "Corte"');

    expect(result).toEqual({ status: 'blocked' });
    expect(activityLogApiMock.logActivity).not.toHaveBeenCalled();
  });

  it('otros errores se devuelven como "error" con el mensaje', async () => {
    servicesApiMock.deleteService.mockRejectedValue(new ApiError('network down'));

    const result = await removeService('biz-1', 'svc-1', 'Eliminó el servicio "Corte"');

    expect(result).toEqual({ status: 'error', message: 'network down' });
  });
});
