export type TipoImpuesto = 'IVA' | 'ReteFuente' | 'ReteICA' | 'ReteIVA' | 'Impoconsumo' | string;

export interface Impuesto {
  id: string;
  client_nit: number;
  tax_id: number | null;
  tipo: TipoImpuesto;
  codigo: string;
  description: string | null;
  percentage: number | null;
  type: string | null;
  purchase_account_code: string | null;
  purchase_account_name: string | null;
  active: boolean;
}