import { get } from 'svelte/store';
import { listCustomers, createCustomer as apiCreateCustomer } from '../api/customers';
import { listCustomerCredits, updateCustomerCredit } from '../api/customerCredits';
import { customers, customerCredits } from '../stores/customers';
import type { TablesInsert } from '../types/database.types';

export async function loadCustomers(businessId: string): Promise<void> {
  customers.set(await listCustomers(businessId));
}

export async function loadCredits(businessId: string): Promise<void> {
  customerCredits.set(await listCustomerCredits(businessId));
}

export interface RegisterCustomerInput {
  businessId: string;
  name: string;
  phone: string;
  address: string | null;
  email: string | null;
}

/** Sin edición ni borrado -- el legado tampoco los tiene para clientes. */
export async function registerCustomer(input: RegisterCustomerInput): Promise<void> {
  const payload: TablesInsert<'customers'> = {
    business_id: input.businessId,
    name: input.name,
    phone: input.phone,
    address: input.address,
    email: input.email,
  };
  await apiCreateCustomer(payload);
  await loadCustomers(input.businessId);
}

export interface PayCreditInput {
  creditId: string;
  amountToPay: number;
}

/**
 * El estado pasa a "pagado" en cuanto lo abonado alcanza el total del
 * crédito, igual que el legado. El monto y el estado nuevos se calculan
 * acá (no en la capa de datos) porque dependen de leer el crédito actual
 * primero -- más de un paso de negocio.
 */
export async function payCredit(input: PayCreditInput): Promise<void> {
  const credit = get(customerCredits).find((c) => c.id === input.creditId);
  if (!credit) return;

  const newPaid = Number(credit.amount_paid) + input.amountToPay;
  const newStatus = newPaid >= Number(credit.amount) ? 'pagado' : 'parcial';

  await updateCustomerCredit(input.creditId, { amount_paid: newPaid, status: newStatus });
  await loadCredits(credit.business_id);
}
