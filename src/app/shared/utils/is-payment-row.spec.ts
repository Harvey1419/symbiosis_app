import { describe, it, expect } from 'vitest';
import { isPaymentRow } from './is-payment-row';
import type { FilaFactura } from '@domain/models/factura.model';

/**
 * Acceptance criteria from spec rev 3 §7 (Capability 5 — payment row):
 *   - Positive credit is payment; zero, absent, and invalid values are expense
 *   - Helper has no component or HTTP dependencies
 *
 * `isPaymentRow` is a pure, dependency-free predicate. TDD is exercised
 * through triangulated cases: positive credit, zero credit, absent credit,
 * negative credit, stringy credit, and non-Factura objects.
 */
describe('isPaymentRow (T5.2)', () => {
  it('returns true when credito is a positive number', () => {
    const fila: FilaFactura = { descripcion: 'Pago', cuenta: '11050501', credito: 1234500 };
    expect(isPaymentRow(fila)).toBe(true);
  });

  it('returns true at the boundary (credito = 0.01, the smallest positive credit)', () => {
    const fila: FilaFactura = { descripcion: 'Ajuste mínimo', credito: 0.01 };
    expect(isPaymentRow(fila)).toBe(true);
  });

  it('returns false when credito is exactly 0', () => {
    const fila: FilaFactura = { descripcion: 'Gasto', debito: 100, credito: 0 };
    expect(isPaymentRow(fila)).toBe(false);
  });

  it('returns false when credito is absent (undefined)', () => {
    const fila: FilaFactura = { descripcion: 'Gasto sin monto explícito', debito: 50 };
    expect(isPaymentRow(fila)).toBe(false);
  });

  it('returns false when credito is null', () => {
    const fila = { descripcion: 'Null credit', credito: null } as unknown as FilaFactura;
    expect(isPaymentRow(fila)).toBe(false);
  });

  it('returns false when credito is negative (invalid payment)', () => {
    // Number(-5) > 0 === false, so a negative credit cannot be a payment row.
    const fila: FilaFactura = { descripcion: 'Negativo', credito: -5 };
    expect(isPaymentRow(fila)).toBe(false);
  });

  it('coerces numeric strings (worker may deliver credito as string)', () => {
    const fila = { descripcion: 'Stringy', credito: '1000' } as unknown as FilaFactura;
    expect(isPaymentRow(fila)).toBe(true);
  });

  it('coerces empty string to 0 → expense row', () => {
    const fila = { descripcion: 'Empty string', credito: '' } as unknown as FilaFactura;
    expect(isPaymentRow(fila)).toBe(false);
  });

  it('returns false for non-numeric strings (Number(\"foo\") is NaN, NaN > 0 is false)', () => {
    const fila = { descripcion: 'Bad string', credito: 'foo' } as unknown as FilaFactura;
    expect(isPaymentRow(fila)).toBe(false);
  });
});
