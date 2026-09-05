import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  authenticate,
  createRoom,
  COLS,
  ROWS,
  DURATION,
  GameError,
  makeBoard,
  nickname,
  phase,
  publicRoom,
  rectangleIndices,
} from '../game/engine.ts';
const now = 1_000_000;
function setup(count = 2) {
  const room = createRoom('test', '방장', 'host', now);
  for (let i = 1; i < count; i++)
    act(room, `p${i}`, { type: 'join', name: `참가자${i}` }, now);
  return room;
}
test('nickname validation and Unicode normalization', () => {
  assert.equal(nickname('  사과  '), '사과');
  for (const v of ['', ' ', 'a'.repeat(13), 'a\u200bb', null])
    assert.throws(() => nickname(v), GameError);
});
test('room capacity is 2–8 and nicknames are unique', () => {
  const room = setup(8);
  assert.throws(() => act(room, 'p9', { type: 'join', name: '초과' }, now));
  const solo = setup(1);
  assert.throws(() => act(solo, 'host', { type: 'start', round: 0 }, now));
  assert.throws(() =>
    act(solo, 'duplicate', { type: 'join', name: '방장' }, now),
  );
});
test('only host starts, countdown hides board, all players get independent identical boards', () => {
  const room = setup();
  assert.throws(() => act(room, 'p1', { type: 'start', round: 0 }, now));
  act(room, 'host', { type: 'start', round: 0 }, now);
  assert.equal(room.endsAt - room.startsAt, DURATION);
  assert.equal(phase(room, now), 'countdown');
  assert.deepEqual(publicRoom(room, 'host', 1, now).board, []);
  assert.deepEqual(room.players[0].board, room.players[1].board);
  assert.notEqual(room.players[0].board, room.players[1].board);
  assert.throws(() => act(room, 'new', { type: 'join', name: '늦음' }, now));
  assert.throws(() =>
    act(room, 'host', { type: 'select', rect: [0, 0, 1, 0], round: 1 }, now),
  );
});
test('rectangle validation handles reverse drags and rejects malformed bounds', () => {
  assert.deepEqual(rectangleIndices([1, 1, 0, 0]), [0, 1, 17, 18]);
  for (const r of [
    [-1, 0, 1, 0],
    [0, 0, 17, 0],
    [0, 0, 0, 10],
    [0.1, 0, 1, 0],
    [0, 0, 1],
    'bad',
  ])
    assert.throws(() => rectangleIndices(r));
});
test('score is number of nonempty apples, cannot double score, opponents keep their apples', () => {
  const room = setup();
  act(room, 'host', { type: 'start', round: 0 }, now);
  const action = { type: 'select', rect: [0, 0, 1, 0], round: 1 };
  act(room, 'host', action, room.startsAt);
  assert.equal(room.players[0].score, 2);
  assert.equal(room.players[0].board[0], 0);
  assert.notEqual(room.players[1].board[0], 0);
  assert.throws(() => act(room, 'host', action, room.startsAt + 1));
  room.players[0].board.fill(0);
  room.players[0].board[0] = 3;
  room.players[0].board[2] = 7;
  act(
    room,
    'host',
    { type: 'select', rect: [0, 0, 2, 0], round: 1 },
    room.startsAt + 2,
  );
  assert.equal(room.players[0].score, 4);
});
test('server rejects selections at timeout and stale rounds', () => {
  const room = setup();
  act(room, 'host', { type: 'start', round: 0 }, now);
  assert.throws(() =>
    act(
      room,
      'host',
      { type: 'select', rect: [0, 0, 1, 0], round: 0 },
      room.startsAt,
    ),
  );
  assert.throws(() =>
    act(
      room,
      'host',
      { type: 'select', rect: [0, 0, 1, 0], round: 1 },
      room.endsAt,
    ),
  );
  assert.equal(phase(room, room.endsAt), 'finished');
});
test('competition ranking uses shared 1, 1, 3 and never exposes tokens or another board', () => {
  const room = setup(3);
  act(room, 'host', { type: 'start', round: 0 }, now);
  room.players[0].score = room.players[1].score = 10;
  room.players[2].score = 2;
  const view = publicRoom(room, 'host', 1, room.endsAt);
  assert.deepEqual(
    view.players.map((p) => p.rank),
    [1, 1, 3],
  );
  assert.ok(view.players.every((p) => !('token' in p) && !('board' in p)));
});
test('rematch resets scores and changes board for everyone', () => {
  const room = setup();
  act(room, 'host', { type: 'start', round: 0 }, now);
  const previous = [...room.board];
  room.players[0].score = 10;
  const end = room.endsAt;
  act(room, 'host', { type: 'heartbeat' }, end);
  act(room, 'p1', { type: 'heartbeat' }, end);
  act(room, 'host', { type: 'start', round: 1 }, end);
  assert.equal(room.round, 2);
  assert.notDeepEqual(room.board, previous);
  assert.deepEqual(room.players[0].board, room.players[1].board);
  assert.ok(room.players.every((p) => p.score === 0));
});
test('disconnect elects online host, token resumes, leave revokes membership', () => {
  const room = setup();
  act(room, 'p1', { type: 'heartbeat' }, now + 30_001);
  assert.equal(room.hostId, room.players[1].id);
  assert.equal(authenticate(room, 'host').name, '방장');
  act(room, 'host', { type: 'leave' }, now + 30_002);
  assert.throws(() => authenticate(room, 'host'));
});
test('every generated board has 170 values in 1..9 and a valid opening', () => {
  for (let i = 0; i < 50; i++) {
    const b = makeBoard();
    assert.equal(b.length, ROWS * COLS);
    assert.ok(b.every((n) => n >= 1 && n <= 9));
    assert.equal(b[0] + b[1], 10);
  }
});
