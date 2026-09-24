import { writable } from 'svelte/store';
import type { Tables } from '../types/database.types';

/** Solo estado -- la carga y el guardado viven en actions/invoices.ts. */
export const invoices = writable<Tables<'invoices'>[]>([]);
