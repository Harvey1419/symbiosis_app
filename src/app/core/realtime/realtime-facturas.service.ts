import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { EVENT_SOURCE, EventSourceFactory, EventSourceLike } from './event-source.token';
import { SyncEvent } from './sync-event';

const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;

@Injectable({ providedIn: 'root' })
export class RealtimeFacturasService {
  private readonly factory: EventSourceFactory = inject(EVENT_SOURCE);
  private readonly apiUrl = environment.apiUrl;
  private activeCleanup: (() => void) | null = null;

  subscribe(nit: string, jobId: string, token: string): Observable<SyncEvent> {
    return new Observable<SyncEvent>((subscriber) => {
      this.unsubscribe();

      let eventSource: EventSourceLike | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let closedIntentionally = false;
      let attempt = 0;

      const clearReconnectTimer = (): void => {
        if (reconnectTimer === null) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      };

      const cleanup = (): void => {
        closedIntentionally = true;
        clearReconnectTimer();
        if (eventSource) {
          eventSource.onmessage = null;
          eventSource.onerror = null;
          eventSource.close();
          eventSource = null;
        }
        if (this.activeCleanup === cleanup) this.activeCleanup = null;
      };

      const open = (): void => {
        if (closedIntentionally) return;
        reconnectTimer = null;
        const url = `${this.apiUrl}/jobs/${nit}/events?token=${encodeURIComponent(token)}`;
        const source = this.factory.create(url);
        eventSource = source;

        source.onmessage = (message: MessageEvent) => {
          try {
            const event = JSON.parse(message.data) as SyncEvent;
            if (event.jobId !== jobId) return;

            subscriber.next(event);
            if (event.type === 'terminal') {
              closedIntentionally = true;
              clearReconnectTimer();
              source.close();
              if (eventSource === source) eventSource = null;
              subscriber.complete();
            }
          } catch {
            // Ignore malformed transport payloads and keep the stream alive.
          }
        };

        source.onerror = () => {
          source.close();
          if (eventSource === source) eventSource = null;
          if (closedIntentionally || reconnectTimer !== null) return;

          const delay = RECONNECT_BACKOFF_MS[
            Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)
          ];
          attempt += 1;
          reconnectTimer = setTimeout(open, delay);
        };
      };

      this.activeCleanup = cleanup;
      open();

      return cleanup;
    });
  }

  unsubscribe(): void {
    this.activeCleanup?.();
    this.activeCleanup = null;
  }
}
