import { writable } from 'svelte/store';
import type { Tables } from '../types/database.types';

/** Solo estado -- la carga y el guardado viven en actions/customers.ts. */
export const customers = writable<Tables<'customers'>[]>([]);
export const customerCredits = writable<Tables<'customer_credits'>[]>([]);
