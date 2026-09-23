import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { services, specialistServices } from '../../../src/lib/stores/services';

describe('services store', () => {
  it('arranca vacío -- la carga vive en actions/services.ts', () => {
    expect(get(services)).toEqual([]);
    expect(get(specialistServices)).toEqual([]);
  });
});
