import { changeAppointmentStatus } from './appointments';
import { createInvoiceForAppointment } from './invoices';
import type { Tables } from '../types/database.types';
import type { PaymentMethodKey } from '../utils/payments';

export interface CompleteAppointmentInput {
  businessId: string;
  appt: Tables<'appointments'>;
  services: Tables<'services'>[];
  business: Tables<'businesses'> | null;
  customerName: string;
  paymentMethod: PaymentMethodKey;
  statusActivityMessage: string;
  buildInvoiceActivityMessage: (invoiceNumber: string) => string;
}

/**
 * Compone marcar la cita como completada + facturarla automáticamente con
 * el método de pago elegido -- el primer acoplamiento real entre Agenda y
 * Facturas que señala el plan de la Fase 5. Agenda no sabe nada de cómo
 * Facturas renderiza ni genera el PDF; solo dispara esto y listo. Para
 * reintentar la factura de una cita ya completada (el botón manual
 * "Generar Factura"), se llama a `createInvoiceForAppointment` de
 * `actions/invoices.ts` directamente, sin pasar por acá.
 */
export async function completeAppointment(input: CompleteAppointmentInput): Promise<Tables<'invoices'>> {
  await changeAppointmentStatus(input.businessId, input.appt.id, 'completada', input.statusActivityMessage);
  return createInvoiceForAppointment({
    businessId: input.businessId,
    appt: input.appt,
    services: input.services,
    business: input.business,
    customerId: input.appt.customer_id,
    customerName: input.customerName,
    paymentMethod: input.paymentMethod,
    buildActivityMessage: input.buildInvoiceActivityMessage,
  });
}
