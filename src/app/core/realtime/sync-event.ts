export type SyncEventType = 'processing' | 'factura_inserted' | 'terminal' | 'reconnected';

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

/**
 * Emitted by `RealtimeFacturasService` after a successful backoff-and-reopen
 * cycle. Distinct from the backend-published `processing`/`factura_inserted`/
 * `terminal` events: this is a transport-layer signal indicating that the SSE
 * connection dropped, the client reconnected, and the stream resumed — so the
 * UI can call `getJobStatus` + `getJobInvoices` to reconcile any events that
 * were missed during the disconnect window.
 *
 * Carries `jobId` + `nit` so subscribers can guard on the active job, and
 * `at` (ISO 8601) so log-driven reconciliations can show "reconectado a las
 * HH:mm".
 */
export interface SyncEventReconnected {
  type: 'reconnected';
  jobId: string;
  nit: string;
  at: string;
}

export type SyncEvent = SyncEventProcessing | SyncEventFacturaInserted | SyncEventTerminal | SyncEventReconnected;

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
