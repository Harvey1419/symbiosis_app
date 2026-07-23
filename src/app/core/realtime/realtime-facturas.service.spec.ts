import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EVENT_SOURCE,
  EventSourceFactory,
  EventSourceLike,
} from './event-source.token';
import { RealtimeFacturasService } from './realtime-facturas.service';
import { SyncEvent, SyncEventReconnected } from './sync-event';
import { environment } from '@environments/environment';

class FakeEventSource implements EventSourceLike {
  onmessage: ((this: EventSourceLike, ev: MessageEvent) => any) | null = null;
  onerror: ((this: EventSourceLike, ev: Event) => any) | null = null;
  readonly close = vi.fn();
  readonly readyState = 1;

  constructor(readonly url: string) {}

  simulateMessage(data: SyncEvent): void {
    this.onmessage?.call(this, { data: JSON.stringify(data) } as MessageEvent);
  }

  simulateError(): void {
    this.onerror?.call(this, new Event('error'));
  }
}

const processingEvent: SyncEvent = {
  type: 'processing',
  jobId: 'job-1',
  firmaId: 'firma-1',
  nit: '900123456',
  procesadas: 7,
  errors: 0,
  total: 10,
  estado: 'processing',
  emittedAt: '2026-07-23T12:00:00.000Z',
};

const terminalEvent: SyncEvent = {
  ...processingEvent,
  type: 'terminal',
  estado: 'completed',
  procesadas: 10,
  terminalReason: 'completed',
};

describe('RealtimeFacturasService', () => {
  let service: RealtimeFacturasService;
  let sources: FakeEventSource[];
  let factory: EventSourceFactory;

  beforeEach(() => {
    TestBed.resetTestingModule();
    sources = [];
    factory = {
      create: vi.fn((url: string) => {
        const source = new FakeEventSource(url);
        sources.push(source);
        return source;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        RealtimeFacturasService,
        { provide: EVENT_SOURCE, useValue: factory },
      ],
    });
    service = TestBed.inject(RealtimeFacturasService);
  });

  afterEach(() => {
    service.unsubscribe();
    vi.useRealTimers();
  });

  it('subscribe(nit, jobId, token) creates EventSource with the authenticated NIT URL', () => {
    const subscription = service.subscribe('900123456', 'job-1', 'jwt+/=').subscribe();

    expect(factory.create).toHaveBeenCalledOnce();
    expect(factory.create).toHaveBeenCalledWith(
      `${environment.apiUrl}/jobs/900123456/events?token=${encodeURIComponent('jwt+/=')}`,
    );

    subscription.unsubscribe();
  });

  it('forwards a parsed processing message as a typed SyncEventProcessing snapshot', () => {
    let received: SyncEvent | undefined;
    const subscription = service.subscribe('900123456', 'job-1', 'jwt').subscribe((event) => {
      received = event;
    });

    sources[0].simulateMessage(processingEvent);

    expect(received).toEqual(processingEvent);
    expect(received?.type).toBe('processing');
    expect(received?.procesadas).toBe(7);

    subscription.unsubscribe();
  });

  it('reconnects unexpected errors with exponential backoff capped at 30 seconds', () => {
    vi.useFakeTimers();
    const subscription = service.subscribe('900123456', 'job-1', 'jwt').subscribe();
    const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];

    for (const [index, delay] of delays.entries()) {
      sources.at(-1)!.simulateError();
      vi.advanceTimersByTime(delay - 1);
      expect(sources).toHaveLength(index + 1);
      vi.advanceTimersByTime(1);
      expect(sources).toHaveLength(index + 2);
    }

    expect(sources.every((source) => source.close.mock.calls.length <= 1)).toBe(true);
    subscription.unsubscribe();
  });

  it('completes and closes permanently when a terminal event arrives', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    service.subscribe('900123456', 'job-1', 'jwt').subscribe({ complete });
    const source = sources[0];

    source.simulateError();
    expect(vi.getTimerCount()).toBe(1);
    source.simulateMessage(terminalEvent);

    expect(complete).toHaveBeenCalledOnce();
    expect(source.close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(sources).toHaveLength(1);
  });

  it('unsubscribe closes the source and timer, while a later subscribe creates a new source', () => {
    vi.useFakeTimers();
    const firstSubscription = service.subscribe('900123456', 'job-1', 'jwt').subscribe();
    const firstSource = sources[0];
    firstSource.simulateError();
    expect(vi.getTimerCount()).toBe(1);

    service.unsubscribe();

    expect(firstSource.close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    const secondSubscription = service.subscribe('900123456', 'job-2', 'jwt').subscribe();
    expect(sources).toHaveLength(2);
    expect(sources[1]).not.toBe(firstSource);

    firstSubscription.unsubscribe();
    secondSubscription.unsubscribe();
  });

  it('does not reconnect if onerror fires after terminal completion', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    service.subscribe('900123456', 'job-1', 'jwt').subscribe({ complete });
    const source = sources[0];

    source.simulateMessage(terminalEvent);
    source.simulateError();
    vi.advanceTimersByTime(60_000);

    expect(complete).toHaveBeenCalledOnce();
    expect(sources).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does NOT emit reconnected on the initial open', () => {
    const received: SyncEvent[] = [];
    service.subscribe('900123456', 'job-1', 'jwt').subscribe((event) => {
      received.push(event);
    });

    sources[0].simulateMessage(processingEvent);

    expect(received.some((e) => e.type === 'reconnected')).toBe(false);
  });

  it('emits a reconnected event after a successful backoff-and-reopen cycle', () => {
    vi.useFakeTimers();
    const received: SyncEvent[] = [];
    service.subscribe('900123456', 'job-1', 'jwt').subscribe((event) => {
      received.push(event);
    });

    // Initial processing on the first source.
    sources[0].simulateMessage(processingEvent);
    expect(received.filter((e) => e.type === 'reconnected')).toHaveLength(0);

    // First reconnect: error → wait 1000ms → new EventSource opens.
    sources[0].simulateError();
    vi.advanceTimersByTime(1000);
    expect(sources).toHaveLength(2);

    // The new source should fire a reconnected event when the subscriber
    // receives any message after the reopen.
    sources[1].simulateMessage(processingEvent);
    const reconnected = received.find((e) => e.type === 'reconnected');
    expect(reconnected).toBeDefined();
    const rc = reconnected as SyncEventReconnected;
    expect(rc.jobId).toBe('job-1');
    expect(rc.nit).toBe('900123456');
    expect(typeof rc.at).toBe('string');
    expect(() => new Date(rc.at).toISOString()).not.toThrow();
  });

  it('emits a reconnected event for every subsequent reconnect, not just the first', () => {
    vi.useFakeTimers();
    const received: SyncEvent[] = [];
    service.subscribe('900123456', 'job-1', 'jwt').subscribe((event) => {
      received.push(event);
    });

    // Trigger two consecutive reconnects.
    sources[0].simulateError();
    vi.advanceTimersByTime(1000);
    sources[1].simulateMessage(processingEvent);
    sources[1].simulateError();
    vi.advanceTimersByTime(2000);
    sources[2].simulateMessage(processingEvent);

    const reconnected = received.filter((e) => e.type === 'reconnected');
    expect(reconnected).toHaveLength(2);
  });
});
