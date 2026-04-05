const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_API_URL || '').trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return import.meta.env.DEV ? '' : trimTrailingSlash(window.location.origin);
};

export const toApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};

export const apiFetch: typeof fetch = (input, init) => {
  if (typeof input === 'string') {
    return fetch(toApiUrl(input), init);
  }

  if (input instanceof URL) {
    return fetch(input, init);
  }

  return fetch(input, init);
};