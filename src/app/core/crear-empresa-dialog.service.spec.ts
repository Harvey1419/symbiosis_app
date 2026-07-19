import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CrearEmpresaDialogService } from './crear-empresa-dialog.service';

describe('CrearEmpresaDialogService', () => {
  let service: CrearEmpresaDialogService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrearEmpresaDialogService);
  });

  it('inicia con visible=false', () => {
    expect(service.visible()).toBe(false);
  });

  it('open() pone visible en true', () => {
    service.open();
    expect(service.visible()).toBe(true);
  });

  it('close() pone visible en false', () => {
    service.open();
    expect(service.visible()).toBe(true);
    service.close();
    expect(service.visible()).toBe(false);
  });

  it('toggle open → close → visible vuelve a false', () => {
    expect(service.visible()).toBe(false);
    service.open();
    expect(service.visible()).toBe(true);
    service.close();
    expect(service.visible()).toBe(false);
  });
});
