import { act, authenticate, publicRoom } from '../../../../game/engine';
import { mutateRoom, readRoom } from '../../../../game/repository';
import { body, fail, json, token } from '../../../../game/http';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const auth = token(request);
    let result = await readRoom(id);
    const me = authenticate(result.room, auth);
    if (Date.now() - me.lastSeen > 5000)
      result = await mutateRoom(id, (room, now) =>
        act(room, auth, { type: 'heartbeat' }, now),
      );
    return json(publicRoom(result.room, auth, result.revision, Date.now()));
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const auth = token(request);
    const input = await body(request);
    const result = await mutateRoom(id, (room, now) =>
      act(room, auth, input, now),
    );
    return json(
      input.type === 'leave'
        ? { ok: true }
        : publicRoom(result.room, auth, result.revision, Date.now()),
    );
  } catch (error) {
    return fail(error);
  }
}
