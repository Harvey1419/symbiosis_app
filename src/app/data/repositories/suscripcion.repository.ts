import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { SuscripcionMe, UsageRow, Plan } from '@domain/models/suscripcion.model';

@Injectable({ providedIn: 'root' })
export class SuscripcionRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMe(): Observable<SuscripcionMe> {
    return this.http.get<SuscripcionMe>(`${this.apiUrl}/suscripciones/me`);
  }

  getUsage(months = 6): Observable<UsageRow[]> {
    const params = new HttpParams().set('months', String(months));
    return this.http.get<UsageRow[]>(`${this.apiUrl}/suscripciones/usage`, { params });
  }

  getPlanes(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.apiUrl}/planes`);
  }
}
