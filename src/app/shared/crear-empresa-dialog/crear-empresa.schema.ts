import { z } from 'zod';

/**
 * Schema del formulario "Crear Empresa" (frontend mirror del backend
 * `CreateFirmaSchema`).
 *
 * Se mantiene en sync manualmente con `api/src/presentation/schemas/firma.schema.ts`.
 * NO usa `.openapi()` — ese decorador es exclusivo del backend
 * (`@asteasolutions/zod-to-openapi`).
 *
 * El tipo inferido `CrearEmpresaInput` alimenta el `FormBuilder.group` del
 * dialog y el `FirmaRepository.create()`.
 */
export const CrearEmpresaSchema = z.object({
  tipo_persona: z.enum(['juridica', 'natural']),
  nombre: z.string().min(1).max(200),
  nit: z.number().int().positive(),
  tipo_id_rep_legal: z.enum(['cedula', 'cedula_extranjeria', 'pasaporte']),
  id_rep_legal: z.number().int().positive(),
  tipo_siigo: z.enum(['nube', 'contador']),
  firma_user: z.string().email('Email must be a valid email address'),
  firma_pass: z.string().min(1),
});

export type CrearEmpresaInput = z.infer<typeof CrearEmpresaSchema>;
