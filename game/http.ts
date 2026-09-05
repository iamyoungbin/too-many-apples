import { GameError } from './engine';
export const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}
export function fail(error: unknown) {
  if (error instanceof GameError)
    return json({ error: error.message }, error.status);
  console.error('Game request failed', error);
  return json(
    { error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' },
    500,
  );
}
export function token(request: Request) {
  const value = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!value || !/^[a-f0-9-]{36}$/.test(value))
    throw new GameError('참가 정보가 없습니다. 다시 입장해 주세요.', 401);
  return value;
}
export async function body(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new GameError('허용되지 않은 요청입니다.', 403);
  const text = await request.text();
  if (text.length > 2048) throw new GameError('요청이 너무 큽니다.', 413);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GameError('요청 형식이 올바르지 않습니다.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new GameError('요청 형식이 올바르지 않습니다.');
  return data as Record<string, unknown>;
}
