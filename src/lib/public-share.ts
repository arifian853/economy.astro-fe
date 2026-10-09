const SHARE_TOKEN_PATTERN = /^(?:[0-9a-f]{64}|[A-Za-z0-9]{22})$/;

export function isValidPublicShareToken(token: string): boolean {
  return SHARE_TOKEN_PATTERN.test(token);
}

export function buildPublicShareUrl(origin: string, token: string): string | null {
  if (!isValidPublicShareToken(token)) return null;

  try {
    const url = new URL("/share/", origin);
    url.hash = token;
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePublicShareToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return isValidPublicShareToken(token) ? token : null;
}
