export interface FilaFactura {
  tipo?: number;
  fecha?: string;
  cuenta: string | null;
  debito?: number;
  credito?: number;
  tercero?: string;
  confianza?: number;
  consecutivo?: string;
  descripcion?: string;
  justificacion?: string;
  iva_code?: string | null;
  rete_code?: string | null;
}

export interface Factura {
  id: string;
  client_nit: number;
  track_id: string;
  cufe: string | null;
  factura_nro: string | null;
  vendor_nit: string | null;
  vendor_name: string | null;
  fecha_emision: string | null;
  payment_due_date: string | null;
  notes: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  /** Base64 del PDF (solo en detail endpoint, NO en listado). */
  pdf_base64?: string | null;
  error_message?: string | null;
  subtotal: number | null;
  total_iva: number | null;
  total_pagar: number | null;
  status: 'clasificando' | 'pendiente' | 'causada' | 'finalizada' | 'error';
  filas: FilaFactura[];
  clasificado_at: string | null;
  causada_at: string | null;
  causada_by: string | null;
  created_at: string;
  firma_id: string;
  job_id: string | null;
}

export interface UpdateItemBody {
  cuenta?: string;
  iva_code?: string | null;
  rete_code?: string | null;
}