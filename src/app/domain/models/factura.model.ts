export interface FacturaItem {
  cuenta: string;
  cuenta_nombre: string;
  descripcion: string;
  debito: number;
  credito: number;
  confianza: number;
  tipo: 'item' | 'iva' | 'pago';
  iva_code?: string;
  iva_nombre?: string;
  iva_pct?: number;
  iva_valor?: number;
  rete_code?: string;
  rete_pct?: number;
  ai_reason?: string;
}

/**
 * Body for PATCH /api/facturas/:id/items/:idx
 * Only these three fields are editable; all others are read-only.
 */
export interface UpdateItemBody {
  cuenta?: string;
  iva_code?: string | null;
  rete_code?: string | null;
}

/**
 * Row from GET /api/facturas/:id/historico — historical causacion entries
 * for the same vendor_nit + client_nit.
 */
export interface HistoricoRow {
  id: string;
  client_nit: string;
  vendor_nit: string;
  vendor_name: string | null;
  fecha: string | null;
  item_text: string | null;
  item_value: number | null;
  account_code: string;
  account_name: string | null;
  iva_code: string | null;
  iva_pct: number | null;
  rete_code: string | null;
  rete_pct: number | null;
  has_tax: boolean | null;
  created_at: string;
}

export interface Factura {
  id: string;
  client_nit: number;
  track_id: string;
  cufe?: string;
  factura_nro?: string;
  vendor_nit?: string;
  vendor_name?: string;
  fecha_emision?: string;
  payment_due_date?: string;
  filas: FacturaItem[];
  status: 'clasificando' | 'pendiente' | 'causada' | 'finalizada' | 'error';
  subtotal?: number;
  total_iva?: number;
  total_pagar?: number;
  created_at: string;
  confianzaMin?: number;
}