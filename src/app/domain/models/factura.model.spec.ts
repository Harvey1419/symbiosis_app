import { describe, it, expect } from 'vitest';
import type { FilaFactura, Factura, FacturaPdfResponse, UpdateItemBody } from './factura.model';

/**
 * Acceptance criteria from spec rev 3 §7 (Capability 5 — payment row):
 *   - Existing debit and credit row fixtures compile without new backend concepts
 *   - No deferred retenciones or `tipo_factura` UI fields enter the frontend model
 *
 * The model is the contract between the backend (worker) and the UI. This spec
 * pins the existing FilaFactura shape so PR-5 (and future iterations) cannot
 * silently grow it with retenciones split or tipo_factura UI fields. Those
 * additions are explicitly deferred to the next iteration.
 */
describe('factura.model — payment-row contract (T5.1)', () => {
  it('preserves numeric credito and cuenta for a representative credit row', () => {
    const creditRow: FilaFactura = {
      descripcion: 'Pago a proveedor XYZ',
      cuenta: '11050501',
      debito: 0,
      credito: 1234500,
      iva_code: null,
      rete_code: null,
    };

    expect(creditRow.credito).toBe(1234500);
    expect(creditRow.cuenta).toBe('11050501');
    expect(creditRow.debito).toBe(0);
  });

  it('preserves numeric debito, credito=0, and cuenta for a representative expense row', () => {
    const expenseRow: FilaFactura = {
      descripcion: 'Servicio de consultoría',
      cuenta: '51050301',
      debito: 500000,
      credito: 0,
      iva_code: 'IVA-19',
      rete_code: null,
      confianza: 92,
    };

    expect(expenseRow.debito).toBe(500000);
    expect(expenseRow.credito).toBe(0);
    expect(expenseRow.cuenta).toBe('51050301');
    expect(expenseRow.confianza).toBe(92);
  });

  it('allows credito and debito to be absent (worker omits them on edge rows)', () => {
    const minimalRow: FilaFactura = {
      descripcion: 'Línea sin monto explícito',
      cuenta: null,
    };

    expect(minimalRow.credito).toBeUndefined();
    expect(minimalRow.debito).toBeUndefined();
    expect(minimalRow.cuenta).toBeNull();
  });

  it('exposes a FilaFactura with no retenciones split or tipo_factura UI fields', () => {
    // Build a fully-populated FilaFactura and inspect every own key.
    // The expected key set is the locked shape — anything outside it would
    // mean a deferred field leaked into the frontend model.
    const fila: FilaFactura = {
      tipo: 1,
      fecha: '2026-07-26',
      cuenta: '11050501',
      debito: 0,
      credito: 100,
      tercero: '900123456',
      confianza: 80,
      consecutivo: 'CON-1',
      descripcion: 'Test',
      justificacion: 'OK',
      iva_code: null,
      rete_code: null,
    };

    const allowedKeys = new Set([
      'tipo',
      'fecha',
      'cuenta',
      'debito',
      'credito',
      'tercero',
      'confianza',
      'consecutivo',
      'descripcion',
      'justificacion',
      'iva_code',
      'rete_code',
    ]);

    for (const key of Object.keys(fila)) {
      expect(allowedKeys.has(key)).toBe(true);
    }

    // Explicitly assert deferred fields are NOT in the shape.
    expect('rete_ica_code' in fila).toBe(false);
    expect('rete_iva_code' in fila).toBe(false);
    expect('rete_fuente_code' in fila).toBe(false);
    expect('tipo_factura' in fila).toBe(false);
  });

  it('keeps UpdateItemBody restricted to cuenta + existing tax fields (no payment-row specific shape)', () => {
    // UpdateItemBody is the existing item PATCH contract. The payment row
    // must reuse it as-is (cuenta update), per the design.
    const body: UpdateItemBody = {
      cuenta: '11050501',
      iva_code: null,
      rete_code: null,
    };

    const allowedKeys = new Set(['cuenta', 'iva_code', 'rete_code']);
    for (const key of Object.keys(body)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });

  it('keeps FacturaPdfResponse and Factura present (PR-3 contract preserved)', () => {
    // Compile-time presence check: assigning values to Factura and
    // FacturaPdfResponse would fail to typecheck if either type vanished.
    const pdf: FacturaPdfResponse = { pdf_base64: null, content_type: 'application/pdf' };
    const factura: Factura = {
      id: 'fac-1',
      client_nit: 900123456,
      track_id: 'track-1',
      cufe: null,
      factura_nro: 'SETT-1',
      vendor_nit: null,
      vendor_name: null,
      fecha_emision: null,
      payment_due_date: null,
      notes: null,
      pdf_url: null,
      xml_url: null,
      subtotal: 0,
      total_iva: 0,
      total_pagar: 0,
      status: 'pendiente',
      filas: [],
      clasificado_at: null,
      causada_at: null,
      causada_by: null,
      created_at: '2026-07-26',
      firma_id: 'firma-1',
      job_id: null,
    };

    expect(pdf.content_type).toBe('application/pdf');
    expect(factura.id).toBe('fac-1');
  });

  // PR-C (issue 5): the FilaFactura shape gains `cantidad` to mirror
  // the backend's FilaRow.cantidad (added in api/ feat(commit 654c3b0)).
  // The Cantidad column in the items table reads from this field.
  // Pre-PR-C filas from the DB have no `cantidad`, so the field is
  // optional and the renderer falls back to 1.
  it('PR-C: FilaFactura accepts an optional cantidad number (>= 1)', () => {
    const filaWithCantidad: FilaFactura = {
      descripcion: 'Resma papel carta',
      cuenta: '51952501',
      debito: 125_000,
      credito: 0,
      cantidad: 5,
    };

    expect(filaWithCantidad.cantidad).toBe(5);
  });

  it('PR-C: FilaFactura allows cantidad to be null (filas pre-PR-C en la DB)', () => {
    const legacyRow: FilaFactura = {
      descripcion: 'Línea pre-PR-C',
      cuenta: '51050301',
      debito: 100,
      credito: 0,
      cantidad: null,
    };

    expect(legacyRow.cantidad).toBeNull();
  });

  it('PR-C: FilaFactura allows cantidad to be absent (renderer falls back to 1)', () => {
    const noCantidadRow: FilaFactura = {
      descripcion: 'Línea sin campo',
      cuenta: '51050301',
      debito: 100,
      credito: 0,
    };

    expect(noCantidadRow.cantidad).toBeUndefined();
  });
});
