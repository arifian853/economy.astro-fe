import { normalizePublicEvent, type PublicEventData } from './public-view';
export type LiveState = 'loading' | 'live' | 'final' | 'paused' | 'unavailable';
export type PollEnvironment = {
  visible(): boolean;
  listen(callback: () => void): () => void;
  schedule(callback: () => void, delay: number): number;
  cancel(id: number): void;
};
const browserEnvironment = (): PollEnvironment => ({
  visible: () => document.visibilityState !== 'hidden',
  listen: callback => { document.addEventListener('visibilitychange', callback); return () => document.removeEventListener('visibilitychange', callback); },
  schedule: (callback, delay) => window.setTimeout(callback, delay),
  cancel: id => window.clearTimeout(id),
});
export function createPublicPoller(options: {
  endpoint: string; token: string;
  onData(data: PublicEventData): void;
  onState(state: LiveState): void;
  request?: typeof fetch;
  environment?: PollEnvironment;
}) {
  const environment = options.environment ?? browserEnvironment();
  const request = options.request ?? fetch;
  let stopped = true, final = false, unavailable = false, failures = 0, generation = 0;
  let timer: number | undefined, timeout: number | undefined;
  let controller: AbortController | undefined;
  let unsubscribe: (() => void) | undefined;
  let fingerprint = '';
  const cancel = () => {
    generation++;
    controller?.abort();
    if (timer !== undefined) environment.cancel(timer);
    if (timeout !== undefined) environment.cancel(timeout);
    timer = timeout = undefined;
  };
  const run = async () => {
    cancel();
    if (stopped || unavailable) return;
    if (final) { options.onState('final'); return; }
    if (!environment.visible()) { options.onState('paused'); return; }
    const current = generation;
    controller = new AbortController();
    timeout = environment.schedule(() => controller?.abort(), 15000);
    try {
      const response = await request(options.endpoint, {
        method: 'GET', headers: { 'X-Economy-Share-Token': options.token },
        credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal,
      });
      if (stopped || current !== generation) return;
      if (response.status === 404 || response.status === 410 || response.status === 401 || response.status === 403) {
        unavailable = true; options.onState('unavailable'); return;
      }
      if (!response.ok) throw Error('Public read unavailable');
      const data = normalizePublicEvent(await response.json());
      if (stopped || current !== generation) return;
      if (!data) throw Error('Invalid public projection');
      const next = JSON.stringify(data);
      if (next !== fingerprint) { options.onData(data); fingerprint = next; }
      failures = 0;
      final = data.event.status === 'completed';
      options.onState(final ? 'final' : 'live');
    } catch {
      if (stopped || current !== generation) return;
      failures = Math.min(failures + 1, 4);
      options.onState('paused');
    } finally {
      if (current === generation) {
        if (timeout !== undefined) environment.cancel(timeout);
        timeout = undefined;
        if (!stopped && !final && !unavailable && environment.visible()) timer = environment.schedule(() => { void run(); }, Math.min(6000 * 2 ** failures, 60000));
      }
    }
  };
  return {
    start() {
      if (!stopped) return;
      stopped = false;
      unsubscribe = environment.listen(() => { void run(); });
      options.onState('loading'); void run();
    },
    stop() { stopped = true; cancel(); unsubscribe?.(); },
  };
}
