import { createRoom, publicRoom } from '../../../game/engine';
import { insertRoom } from '../../../game/repository';
import { body, fail, json, token } from '../../../game/http';
export async function POST(request: Request) {
  try {
    const auth = token(request);
    const input = await body(request);
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
    const room = createRoom(id, input.name, auth, Date.now());
    await insertRoom(room);
    return json(publicRoom(room, auth, 0, Date.now()), 201);
  } catch (error) {
    return fail(error);
  }
}
