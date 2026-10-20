import { apiRequest, API_URL } from './auth';

export type Value = null | string | number | boolean | Value[] | { [key: string]: Value };
export type ContentRow = { id: string; title: string; source: string; category: string; kind?: string; identifier?: string; version: number; publishedAt: string | null; updatedAt: string | null; pending: boolean };
export type ContentDetail = ContentRow & {
  redirectedFrom?: string | null; payload: Record<string, Value>; draft: Record<string, Value>; published: Record<string, Value> };
export type Revision = { id: string; version: number; action: string; actorEmail: string; createdAt: string };
export type Asset = { id: string; filename: string; mime: string; bytes: number; meshNames: string[]; createdAt?: string; url?: string };
export type AssetPage = { items: Asset[]; total: number; page: number; pageSize: number };
export type ContentPage = { items: ContentRow[]; total: number; page: number; pageSize: number; categories: string[] };
const route = (id: string) => `/admin/content/${encodeURIComponent(id)}`;
export const contentApi = {
  list: (category: string, q: string, page: number, signal?: AbortSignal, kind = '', scope = 'title') => apiRequest<ContentPage>(`/admin/content?${new URLSearchParams({ category, q, page: String(page), kind, scope })}`, { signal }),
  detail: (id: string, signal?: AbortSignal) => apiRequest<ContentDetail>(route(id), { signal }),
  save: (id: string, version: number, payload: Record<string, Value>) => apiRequest<{ version: number }>(route(id), { method: 'PUT', body: JSON.stringify({ version, payload }) }),
  publish: (id: string, version: number) => apiRequest<{ version: number }>(`${route(id)}/publish`, { method: 'POST', body: JSON.stringify({ version }) }),
  preview: (id: string, version: number) => apiRequest<{ token: string; expiresAt: string }>(`${route(id)}/preview`, { method: 'POST', body: JSON.stringify({ version }) }),
  history: (id: string, page = 1) => apiRequest<Revision[]>(`${route(id)}/history?page=${page}`),
  revision: (id: string, revisionId: string) => apiRequest<Revision & { payload: Record<string, Value> }>(`${route(id)}/history/${encodeURIComponent(revisionId)}`),
  restore: (id: string, version: number, revisionId: string) => apiRequest<{ version: number }>(`${route(id)}/restore`, { method: 'POST', body: JSON.stringify({ version, revisionId }) }),
  assets: (q = '', page = 1, kind = '', signal?: AbortSignal) => apiRequest<AssetPage>(`/admin/content/assets?${new URLSearchParams({ q, page: String(page), kind })}`, { signal }),
  models: () => apiRequest<{ url: string; meshNames: string[] }[]>('/admin/content/models'),
  upload: async (file: File) => { const form = new FormData(); form.set('file', file); return apiRequest<Asset>('/admin/content/assets', { method: 'POST', body: form }); },
};
export const assetUrl = (asset: Pick<Asset, 'id'>) => `${API_URL}/content/assets/${asset.id}`;
export const assetReference = (asset: Pick<Asset, 'id'>) => `/api/content/assets/${asset.id}`;
export const categoryLabels: Record<string, string> = { interface: 'Giao diện & điều hướng', models: 'Mô hình & cảnh 3D', explanations: 'Kiến thức & giải thích', quizzes: 'Ngân hàng câu hỏi' };
export const contentKindLabels: Record<string, string> = { glb: 'Mô hình GLB', 'atlas-scene': 'Cảnh atlas · có thể thay GLB', 'atlas-label': 'Tên cấu trúc atlas', collection: 'Bộ mô hình', content: 'Nội dung' };

export function modelField(payload: Record<string, Value>): { path: string[]; value: Value; templateKey: 'modelFile' | 'replacement' } | null {
  const value = payload.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.modelFile === 'string') return { path: ['value', 'modelFile'], value: value.modelFile, templateKey: 'modelFile' };
  if (value.replacement && typeof value.replacement === 'object' && !Array.isArray(value.replacement)) return { path: ['value', 'replacement'], value: value.replacement, templateKey: 'replacement' };
  return null;
}

export function replaceAt(root: Value, path: (string | number)[], next: Value): Value {
  if (!path.length) return next;
  const [key, ...rest] = path;
  if (Array.isArray(root)) return root.map((item, i) => i === Number(key) ? replaceAt(item, rest, next) : item);
  if (root && typeof root === 'object') return { ...root, [key]: replaceAt(root[key], rest, next) };
  return root;
}
export function changes(before: Value, after: Value, path = ''): { path: string; before: Value | undefined; after: Value | undefined }[] {
  if (canonical(before) === canonical(after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => changes(before[key], after[key], `${path}/${key}`));
  return [{ path, before, after }];
}

function canonical(value: Value): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
