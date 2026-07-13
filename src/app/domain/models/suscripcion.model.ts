export interface SuscripcionMe {
  plan: {
    codigo: string;
    nombre: string;
    limite_facturas_mes: number | null;
  };
  estado: string;
  periodo_actual: string;
  used: number;
  limite: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface UsageRow {
  periodo: string;
  used: number;
  limite: number;
}

export interface Plan {
  codigo: string;
  nombre: string;
  limite_facturas_mes: number | null;
  precio_mensual_cop: number;
  soporte_nivel: string;
}
