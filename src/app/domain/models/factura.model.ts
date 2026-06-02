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
  ai_reason?: string;
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
  status: 'clasificando' | 'pendiente' | 'causada' | 'error';
  subtotal?: number;
  total_iva?: number;
  total_pagar?: number;
  created_at: string;
  confianzaMin?: number;
}