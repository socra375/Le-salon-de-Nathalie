/**
 * Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) -- igual que el
 * legado. Separado de la generación real del código (que usa
 * `crypto.getRandomValues`, un efecto) para poder probar el mapeo
 * bytes-a-código de forma determinística.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function codeFromBytes(bytes: Uint8Array): string {
  let code = 'EMP';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}
