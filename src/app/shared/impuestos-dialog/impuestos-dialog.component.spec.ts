import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ImpuestosDialogComponent } from './impuestos-dialog.component';
import { Impuesto } from '../../domain/models/impuesto.model';

describe('ImpuestosDialogComponent', () => {
  let fixture: ComponentFixture<ImpuestosDialogComponent>;
  let component: ImpuestosDialogComponent;

  const sampleImpuestos: Impuesto[] = [
    { id: '1', client_nit: 123, tax_id: 1, tipo: 'IVA', codigo: '01', description: 'IVA 19%', percentage: 19, type: 'IVA', purchase_account_code: '2408', purchase_account_name: 'IVA', active: true },
    { id: '2', client_nit: 123, tax_id: 2, tipo: 'ReteIVA', codigo: '02', description: 'ReteIVA 15%', percentage: 15, type: 'ReteIVA', purchase_account_code: '2368', purchase_account_name: 'ReteIVA', active: true },
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ImpuestosDialogComponent],
      providers: [provideAnimations()],
    });
    fixture = TestBed.createComponent(ImpuestosDialogComponent);
    component = fixture.componentInstance;
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('filters impuestos by tipo (IVA section)', () => {
    fixture.componentRef.setInput('impuestos', sampleImpuestos);
    fixture.detectChanges();
    expect(component.ivaOptions().length).toBe(1);
    expect(component.ivaOptions()[0].codigo).toBe('01');
  });

  it('filters impuestos by tipo (Rete section)', () => {
    fixture.componentRef.setInput('impuestos', sampleImpuestos);
    fixture.detectChanges();
    expect(component.reteOptions().length).toBe(1);
    expect(component.reteOptions()[0].codigo).toBe('02');
  });
});