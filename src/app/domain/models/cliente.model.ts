export interface Cliente {
  nit: number;
  nombre_empresa: string;
  tipo_siigo: 'contador' | 'nube';
  estado_proceso?: string;
  ultima_sincronizacion?: string;
}