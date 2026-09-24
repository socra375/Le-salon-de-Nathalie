import { listInvoices, createInvoice } from '../api/invoices';
import { createCustomerCredit } from '../api/customerCredits';
import { logActivity } from '../api/activityLog';
import { loadCredits } from './customers';
import { invoices } from '../stores/invoices';
import { calculateInvoiceTax, generateInvoiceNumber } from '../utils/invoices';
import { appointmentRevenue } from '../utils/appointments';
import type { PaymentMethodKey } from '../utils/payments';
import type { Tables, TablesInsert } from '../types/database.types';

export async function loadInvoices(businessId: string): Promise<void> {
  invoices.set(await listInvoices(businessId));
}

export interface CreateInvoiceForAppointmentInput {
  businessId: string;
  appt: Tables<'appointments'>;
  services: Tables<'services'>[];
  business: Tables<'businesses'> | null;
  customerId: string | null;
  customerName: string;
  paymentMethod: PaymentMethodKey;
  /**
   * El número de factura se genera acá adentro (no lo conoce quien
   * llama), así que el mensaje de actividad se arma con un callback en
   * vez de un string ya resuelto -- quien llama sigue siendo el único
   * que traduce (`act.invoice_generated` necesita `{{number}}`), la
   * acción no hace i18n.
   */
  buildActivityMessage: (invoiceNumber: string) => string;
}

/**
 * Crea la factura de una cita (completada, o re-facturada manualmente),
 * registra el crédito si el método de pago es "credito", y recarga
 * facturas (y créditos, si aplica) -- lo mismo que hacía
 * `createInvoiceForAppointment` del legado, salvo generar el PDF: eso lo
 * decide quien llama esta función (separación vista-modelo / dibujo puro
 * que pide el plan para esta sección), no la acción.
 */
export async function createInvoiceForAppointment(
  input: CreateInvoiceForAppointmentInput
): Promise<Tables<'invoices'>> {
  const revenue = appointmentRevenue(input.appt, input.services);
  const { subtotal, taxAmount, total } = calculateInvoiceTax(revenue, input.business);

  const payload: TablesInsert<'invoices'> = {
    business_id: input.businessId,
    appointment_id: input.appt.id,
    customer_id: input.customerId,
    customer_name: input.customerName,
    invoice_number: generateInvoiceNumber(),
    payment_method: input.paymentMethod,
    subtotal,
    tax_amount: taxAmount,
    total,
  };

  const invoice = await createInvoice(payload);

  if (input.paymentMethod === 'credito' && input.customerId) {
    await createCustomerCredit({
      business_id: input.businessId,
      customer_id: input.customerId,
      invoice_id: invoice.id,
      amount: total,
      amount_paid: 0,
      status: 'pendiente',
    });
    await loadCredits(input.businessId);
  }

  await logActivity({ business_id: input.businessId, action: input.buildActivityMessage(invoice.invoice_number) });
  await loadInvoices(input.businessId);
  return invoice;
}
