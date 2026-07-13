import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { environment } from '@environments/environment';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(DashboardComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('se monta sin error', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    // ngOnInit dispara GET /firmas; la vaciamos para dejar el backend limpio
    httpMock.expectOne(`${environment.apiUrl}/firmas`).flush([]);
  });

  it('en ngOnInit dispara GET /api/firmas y carga firmas vacias', () => {
    fixture.detectChanges(); // dispara ngOnInit -> getFirmas()

    const req = httpMock.expectOne(`${environment.apiUrl}/firmas`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(fixture.componentInstance.totalClientes()).toBe(0);
    expect(fixture.componentInstance.facturas()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('expone el signal usuario desde TokenService', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/firmas`).flush([]);

    expect(fixture.componentInstance.usuario).toBeDefined();
  });
});
