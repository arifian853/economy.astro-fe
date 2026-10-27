export async function fetchFx(path: string, signal?: AbortSignal): Promise<unknown> {
  const base = (import.meta.env.PUBLIC_API_URL || '/api').replace(/\/$/, '');
  const response = await fetch(`${base}/fx/${path}`, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal: signal ?? AbortSignal.timeout(5000) });
  if (!response.ok) throw Error('Referensi FX sementara tidak tersedia.');
  return response.json();
}
