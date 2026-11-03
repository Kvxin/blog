import { authResponseSchema, healthResponseSchema, type AuthResponse, type HealthResponse, type MediaRecord } from '@blog/contracts';

let csrfToken = '';
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const response = await fetch(`/api${path}`, {
    method, credentials: 'same-origin', signal: AbortSignal.timeout(path.startsWith('/ai/') ? 135_000 : 15_000),
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(response.status, Array.isArray(data?.message) ? data.message.join('; ') : data?.message ?? `请求失败 (${response.status})`);
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试';
}

export async function getHealth(): Promise<HealthResponse> {
  return healthResponseSchema.parse(await request('/health'));
}
export async function getSession(): Promise<AuthResponse | null> {
  try {
    const session = authResponseSchema.parse(await request('/auth/me'));
    csrfToken = session.csrfToken;
    return session;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) { csrfToken = ''; return null; }
    throw error;
  }
}
export async function login(email: string, password: string) {
  const session = authResponseSchema.parse(await request('/auth/login', { method: 'POST', body: { email, password } }));
  csrfToken = session.csrfToken;
  return session;
}
export async function logout() {
  await request('/auth/logout', { method: 'POST', body: {} });
  csrfToken = '';
}

export async function uploadImage(file: File): Promise<MediaRecord> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/media/upload', {
    method: 'POST', body: form, credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrfToken }, signal: AbortSignal.timeout(90_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(response.status, data?.message ?? `上传失败 (${response.status})`);
  }
  return data as MediaRecord;
}
