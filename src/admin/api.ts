export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-app-token': localStorage.getItem('APP_TOKEN') || '',
      'x-app-role': localStorage.getItem('APP_ROLE') || 'admin',
      ...(init?.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || `Request failed: ${response.status}`);
  }
  return json.data;
}
