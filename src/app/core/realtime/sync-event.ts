export type SyncEventType = 'processing' | 'factura_inserted' | 'terminal';

export interface SyncEventBase {
  type: SyncEventType;
  jobId: string;
  firmaId: string;
  nit: string;
  procesadas: number;
  errors: number;
  total: number;
  estado: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  emittedAt: string;
}

export interface SyncEventProcessing extends SyncEventBase {
  type: 'processing';
}

export interface SyncEventFacturaInserted extends SyncEventBase {
  type: 'factura_inserted';
  invoices: InvoiceSummary[];
}

export interface SyncEventTerminal extends SyncEventBase {
  type: 'terminal';
  terminalReason: 'completed' | 'failed' | 'partial';
}

export type SyncEvent = SyncEventProcessing | SyncEventFacturaInserted | SyncEventTerminal;

export interface InvoiceSummary {
  id: string;
  track_id: string;
  client_nit: number;
  vendor_nit: string;
  vendor_name: string;
  status: string;
  total_pagar: number | null;
  created_at: string;
}
