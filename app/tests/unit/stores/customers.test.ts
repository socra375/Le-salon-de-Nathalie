import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { customers, customerCredits } from '../../../src/lib/stores/customers';

describe('customers store', () => {
  it('arranca vacío -- la carga vive en actions/customers.ts', () => {
    expect(get(customers)).toEqual([]);
    expect(get(customerCredits)).toEqual([]);
  });
});
