import type { DataProvider } from '@refinedev/core';

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export function dataProvider(apiUrl: string): DataProvider {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const token = localStorage.getItem('APP_TOKEN') || '';
    const role = localStorage.getItem('APP_ROLE') || 'admin';
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-app-token': token,
        'x-app-role': role,
        ...(init?.headers || {}),
      },
    });
    const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!response.ok || json.ok === false) {
      throw new Error(json.error || `Request failed: ${response.status}`);
    }
    return json.data;
  };

  return {
    getList: async ({ resource, pagination, filters, sorters }) => {
      const current = pagination?.current ?? 1;
      const pageSize = pagination?.pageSize ?? 20;
      const params = new URLSearchParams({ current: String(current), pageSize: String(pageSize) });
      for (const filter of filters ?? []) {
        if ('field' in filter && 'value' in filter && filter.value !== undefined && filter.value !== '') {
          params.set(String(filter.field), String(filter.value));
        }
      }
      const firstSorter = sorters?.[0];
      if (firstSorter?.field && firstSorter?.order) {
        params.set('sort_by', String(firstSorter.field));
        params.set('sort_order', firstSorter.order);
      }
      const data = await request<{ items: unknown[]; total: number }>(`/${resource}?${params.toString()}`);
      return { data: data.items, total: data.total };
    },
    getOne: async ({ resource, id }) => {
      const data = await request<Record<string, unknown>>(`/${resource}/${id}`);
      return { data };
    },
    create: async ({ resource, variables }) => {
      const data = await request<Record<string, unknown>>(`/${resource}`, {
        method: 'POST',
        body: JSON.stringify(variables),
      });
      return { data };
    },
    update: async ({ resource, id, variables }) => {
      const data = await request<Record<string, unknown>>(`/${resource}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(variables),
      });
      return { data };
    },
    deleteOne: async ({ resource, id }) => {
      const data = await request<Record<string, unknown>>(`/${resource}/${id}`, { method: 'DELETE' });
      return { data };
    },
    getApiUrl: () => apiUrl,
  };
}
