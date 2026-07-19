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

/**
 * Schema del formulario "Terminar Registro" / "Actualizar Empresa"
 * (PATCH /api/empresas/:nit).
 *
 * Incluye los 4 campos de negocio editables: `tipo_persona`, `nombre`,
 * `tipo_id_rep_legal`, `id_rep_legal`. NO incluye `nit` — el NIT es el
 * route parameter del endpoint y no se puede modificar (ver comentario
 * del schema backend `UpdateEmpresaSchema` en
 * `api/src/presentation/schemas/firma.schema.ts` que es `.strict()` y
 * rechaza `nit` en el body). NO incluye tampoco `firma_user`,
 * `firma_pass`, `tipo_siigo`, `activo` — esos están reservados al flow
 * de creación o al sync Siigo B2C.
 *
 * UX: en el dialog, todos estos campos se muestran DESHABILITADOS
 * excepto `nombre`, que es el único dato que el contador puede
 * corregir (ej: typo en la razón social). El NIT, el tipo de persona y
 * los datos del representante legal no son modificables desde este flow.
 *
 * En el dialog se muestran SOLO estos 4 inputs. El header cambia a
 * "Completar Registro" cuando `editingFirma` está presente.
 */
export const UpdateEmpresaSchema = z.object({
  tipo_persona: z.enum(['juridica', 'natural']),
  nombre: z.string().min(1).max(200),
  tipo_id_rep_legal: z.enum(['cedula', 'cedula_extranjeria', 'pasaporte']),
  id_rep_legal: z.number().int().positive(),
  firmaId: z.string().uuid().optional(),
});

export type UpdateEmpresaInput = z.infer<typeof UpdateEmpresaSchema>;

