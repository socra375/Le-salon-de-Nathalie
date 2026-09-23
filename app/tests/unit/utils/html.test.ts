import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../../../src/lib/utils/html';

describe('escapeHtml', () => {
  it('escapa los 5 caracteres peligrosos', () => {
    expect(escapeHtml(`<img src=x onerror="a&b" title='c'>`)).toBe(
      '&lt;img src=x onerror=&quot;a&amp;b&quot; title=&#39;c&#39;&gt;'
    );
  });

  it('deja intacto un nombre normal', () => {
    expect(escapeHtml('Ana Pérez')).toBe('Ana Pérez');
  });

  it('convierte null/undefined en cadena vacía', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('convierte valores no-string a texto antes de escapar', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});
