/**
 * Representación de un cliente que aparece en `/clientes/firma/:id`.
 *
 * La fila base vive en la tabla `clientes_siigo` (relación N–1 con `firmas`)
 * y trae una join con la fila de `empresas` que es donde viven los datos
 * de negocio (razón social, tipo de persona, datos del representante
 * legal, etc.).
 *
 * El `getFirmaClientes` del backend hace `SELECT clientes_siigo.*,
 * empresas(nit, nombre_empresa, tipo_persona)` — los campos
 * `tipo_id_rep_legal` e `id_rep_legal` también viven en `empresas` pero
 * el controller actual no los devuelve en este listado (ver TODO en
 * `cliente.repository.ts`). El modal los tolera como opcionales.
 */
export interface Cliente {
  nit: number;
  firma_id?: string;
  ultima_sincronizacion?: string;
  empresas?: EmpresaDetalle;
}

export interface EmpresaDetalle {
  nit: number;
  nombre_empresa: string;
  tipo_persona?: 'juridica' | 'natural' | null;
  tipo_id_rep_legal?: 'cedula' | 'cedula_extranjeria' | 'pasaporte' | null;
  id_rep_legal?: number | string | null;
}