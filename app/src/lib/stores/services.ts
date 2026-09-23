import { writable } from 'svelte/store';
import type { Tables } from '../types/database.types';

/** Solo estado -- la carga y el guardado viven en actions/services.ts. */
export const services = writable<Tables<'services'>[]>([]);
export const specialistServices = writable<Tables<'specialist_services'>[]>([]);
