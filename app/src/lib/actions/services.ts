import type { PostgrestError } from '@supabase/supabase-js';
import {
  listServices,
  createService,
  updateService,
  deleteService as apiDeleteService,
} from '../api/services';
import {
  listSpecialistServices,
  deleteSpecialistServicesForService,
  createSpecialistServices,
} from '../api/specialistServices';
import { listEmployees } from '../api/businessMembers';
import { logActivity } from '../api/activityLog';
import { ApiError } from '../api/errors';
import { services, specialistServices } from '../stores/services';
import type { TablesInsert } from '../types/database.types';

export interface SpecialistOption {
  id: string;
  label: string;
}

export async function loadServices(businessId: string): Promise<void> {
  const [svcList, linkList] = await Promise.all([
    listServices(businessId),
    listSpecialistServices(businessId),
  ]);
  services.set(svcList);
  specialistServices.set(linkList);
}

/**
 * El admin del negocio siempre aparece como especialista disponible
 * (`id === businessId`, igual que el legado); el resto son los empleados
 * del negocio.
 */
export async function loadSpecialistOptions(
  businessId: string,
  adminLabel: string,
  employeeFallbackLabel: string
): Promise<SpecialistOption[]> {
  const employees = await listEmployees(businessId);
  return [
    { id: businessId, label: adminLabel },
    ...employees.map((e) => ({ id: e.user_id, label: e.employee_name || employeeFallbackLabel })),
  ];
}

export interface SaveServiceInput {
  id: string | null;
  businessId: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  specialistIds: string[];
}

/**
 * Guarda el servicio y reemplaza por completo sus especialistas
 * habilitados (borrar-e-insertar, igual que el legado) -- más de un paso
 * de negocio, por eso vive aquí y no en la capa de datos.
 */
export async function saveService(input: SaveServiceInput, activityMessage: string): Promise<void> {
  const payload: TablesInsert<'services'> = {
    business_id: input.businessId,
    name: input.name,
    category: input.category,
    duration_minutes: input.durationMinutes,
    price: input.price,
    active: input.active,
  };

  let serviceId = input.id;
  if (serviceId) {
    await updateService(serviceId, payload);
  } else {
    const created = await createService(payload);
    serviceId = created.id;
  }

  await deleteSpecialistServicesForService(input.businessId, serviceId);
  if (input.specialistIds.length > 0) {
    await createSpecialistServices(
      input.specialistIds.map((employeeId) => ({
        business_id: input.businessId,
        employee_id: employeeId,
        service_id: serviceId as string,
      }))
    );
  }

  await logActivity({ business_id: input.businessId, action: activityMessage });
  await loadServices(input.businessId);
}

export type DeleteServiceResult = { status: 'deleted' } | { status: 'blocked' } | { status: 'error'; message: string };

/**
 * Si el servicio tiene citas o facturas asociadas, la base de datos
 * rechaza el borrado por llave foránea (código 23503) -- se informa como
 * "bloqueado" en vez de un error genérico, igual que el legado, para que
 * la UI sugiera desactivarlo en su lugar.
 */
export async function removeService(
  businessId: string,
  serviceId: string,
  activityMessage: string
): Promise<DeleteServiceResult> {
  try {
    await apiDeleteService(serviceId);
  } catch (err) {
    if (err instanceof ApiError) {
      const code = (err.cause as PostgrestError | undefined)?.code;
      if (code === '23503') return { status: 'blocked' };
      return { status: 'error', message: err.message };
    }
    throw err;
  }

  await logActivity({ business_id: businessId, action: activityMessage });
  await loadServices(businessId);
  return { status: 'deleted' };
}
