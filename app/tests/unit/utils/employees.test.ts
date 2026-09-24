import { describe, expect, it } from 'vitest';
import { codeFromBytes } from '../../../src/lib/utils/employees';

describe('codeFromBytes', () => {
  it('antepone "EMP" y mapea cada byte al alfabeto sin caracteres ambiguos', () => {
    expect(codeFromBytes(new Uint8Array([0, 1, 2]))).toBe('EMPABC');
  });

  it('el largo del código sigue el largo de los bytes dados', () => {
    expect(codeFromBytes(new Uint8Array(10)).length).toBe(13);
  });
});
