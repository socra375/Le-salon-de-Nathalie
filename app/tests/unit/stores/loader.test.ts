import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { loader, showLoader, hideLoader } from '../../../src/lib/stores/loader';

beforeEach(() => {
  hideLoader();
});

describe('loader', () => {
  it('arranca oculto', () => {
    expect(get(loader)).toBeNull();
  });

  it('showLoader guarda el modo pedido', () => {
    showLoader('sync');
    expect(get(loader)).toBe('sync');
  });

  it('hideLoader lo vuelve a ocultar', () => {
    showLoader('login');
    hideLoader();
    expect(get(loader)).toBeNull();
  });
});
