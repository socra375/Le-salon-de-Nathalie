import { writable } from 'svelte/store';
import type { Tables } from '../types/database.types';

/** Solo estado -- la carga y el guardado viven en actions/employees.ts. */
export const employees = writable<Tables<'business_members'>[]>([]);
