import { describe, it, expect } from 'vitest';
import { CrearEmpresaSchema, type CrearEmpresaInput } from './crear-empresa.schema';

describe('CrearEmpresaSchema (frontend mirror of backend CreateFirmaSchema)', () => {
  const validInput = {
    tipo_persona: 'juridica',
    nombre: 'Empresa Demo SAC',
    nit: 900123456,
    tipo_id_rep_legal: 'cedula',
    id_rep_legal: 12345678,
    tipo_siigo: 'nube',
    firma_user: 'demo@empresa.com',
    firma_pass: 'secreto-123',
  };

  it('parsea un payload completo y válido (nube)', () => {
    const result = CrearEmpresaSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo_siigo).toBe('nube');
      expect(result.data.nit).toBe(900123456);
    }
  });

  it('parsea un payload válido (natural + contador)', () => {
    const result = CrearEmpresaSchema.safeParse({
      ...validInput,
      tipo_persona: 'natural',
      tipo_siigo: 'contador',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tipo_persona).toBe('natural');
      expect(result.data.tipo_siigo).toBe('contador');
    }
  });

  it('rechaza cuando falta nit', () => {
    const missingNit = { ...validInput, nit: undefined as unknown as number };
    delete (missingNit as { nit?: number }).nit;
    const result = CrearEmpresaSchema.safeParse(missingNit);
    expect(result.success).toBe(false);
  });

  it('rechaza tipo_persona fuera del enum', () => {
    const result = CrearEmpresaSchema.safeParse({ ...validInput, tipo_persona: 'otro' });
    expect(result.success).toBe(false);
  });

  it('rechaza firma_user que no es email', () => {
    const result = CrearEmpresaSchema.safeParse({ ...validInput, firma_user: 'no-email' });
    expect(result.success).toBe(false);
  });

  it('rechaza nit negativo', () => {
    const result = CrearEmpresaSchema.safeParse({ ...validInput, nit: -1 });
    expect(result.success).toBe(false);
  });

  it('el tipo inferido CrearEmpresaInput coincide con los campos del schema', () => {
    const sample: CrearEmpresaInput = validInput;
    expect(sample.firma_user).toBe('demo@empresa.com');
    expect(sample.tipo_siigo).toBe('nube');
  });
});
