import type { FilaFactura } from '@domain/models/factura.model';

/**
 * Pure, dependency-free predicate that identifies a payment row in `filas`.
 *
 * The worker already constructs the credit line of the journal entry as
 * the last row in `filas` (`process-invoice.use-case.ts`), with a
 * numeric `credito` > 0. We detect that row here to drive the UI:
 *   - payment p-select sourced from `?groups=1,2`
 *   - hidden impuestos (no iva, no rete)
 *   - accessible "Cuenta de pago" marker
 *
 * `Number(...)` coerces strings and gracefully returns `NaN` for
 * non-numeric input; `NaN > 0` is `false`, so an invalid credit
 * value falls back to the expense presentation instead of crashing.
 */
export function isPaymentRow(fila: FilaFactura | null | undefined): boolean {
  if (!fila) return false;
  return Number(fila.credito) > 0;
}
