import { getDb } from '../db';
import { GameError, type Room } from './engine';
type Stored = { state: string; revision: number };
export async function readRoom(id: string) {
  const row = await getDb()
    .prepare(
      'SELECT state, revision FROM rooms WHERE id = ? AND expires_at > ?',
    )
    .bind(id, Date.now())
    .first<Stored>();
  if (!row)
    throw new GameError(
      '방을 찾을 수 없거나 만료되었습니다. 새 방을 만들어 주세요.',
      404,
    );
  return { room: JSON.parse(row.state) as Room, revision: row.revision };
}
export async function insertRoom(room: Room) {
  await getDb().batch([
    getDb()
      .prepare(
        'DELETE FROM rooms WHERE id IN (SELECT id FROM rooms WHERE expires_at < ? LIMIT 100)',
      )
      .bind(Date.now()),
    getDb()
      .prepare(
        'INSERT INTO rooms (id, state, revision, expires_at) VALUES (?, ?, 0, ?)',
      )
      .bind(room.id, JSON.stringify(room), Date.now() + 86_400_000),
  ]);
}
export async function mutateRoom(
  id: string,
  mutate: (room: Room, now: number) => void,
) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const { room, revision } = await readRoom(id);
    mutate(room, Date.now());
    const result = await getDb()
      .prepare(
        'UPDATE rooms SET state = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND expires_at > ?',
      )
      .bind(JSON.stringify(room), id, revision, Date.now())
      .run();
    if (result.meta.changes === 1) return { room, revision: revision + 1 };
  }
  throw new GameError('요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.', 409);
}
