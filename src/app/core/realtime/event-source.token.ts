import { InjectionToken } from '@angular/core';

export interface EventSourceLike {
  onmessage: ((this: EventSourceLike, ev: MessageEvent) => any) | null;
  onerror: ((this: EventSourceLike, ev: Event) => any) | null;
  close(): void;
  readonly readyState: number;
}

export interface EventSourceFactory {
  create(url: string): EventSourceLike;
}

export const EVENT_SOURCE = new InjectionToken<EventSourceFactory>('EVENT_SOURCE', {
  providedIn: 'root',
  factory: () => ({
    create(url: string): EventSourceLike {
      return new EventSource(url) as unknown as EventSourceLike;
    },
  }),
});
