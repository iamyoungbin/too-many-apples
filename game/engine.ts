export const COLS = 17;
export const ROWS = 10;
export const DURATION = 120_000;
export const COUNTDOWN = 3_000;
export const DISCONNECT_AFTER = 30_000;
export type Player = {
  id: string;
  token: string;
  name: string;
  score: number;
  board: number[];
  lastSeen: number;
  left: boolean;
  playedRound: number;
};
export type Room = {
  id: string;
  hostId: string;
  round: number;
  startsAt: number;
  endsAt: number;
  board: number[];
  players: Player[];
};
export type PublicRoom = ReturnType<typeof publicRoom>;
export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function nickname(value: unknown): string {
  if (typeof value !== 'string') throw new GameError('닉네임을 입력해 주세요.');
  const name = value.trim().normalize('NFC');
  if (!name || [...name].length > 12 || /[\p{Cc}\p{Cf}]/u.test(name))
    throw new GameError('닉네임은 공백만 제외하고 1~12자로 입력해 주세요.');
  return name;
}
export function phase(room: Room, now: number) {
  return !room.round
    ? 'lobby'
    : now < room.startsAt
      ? 'countdown'
      : now < room.endsAt
        ? 'playing'
        : 'finished';
}
export function makeBoard(): number[] {
  const bytes = new Uint32Array(COLS * ROWS);
  crypto.getRandomValues(bytes);
  const board = Array.from(bytes, (n) => 1 + (n % 9));
  // A fresh board always has at least one valid opening rectangle.
  board[1] = 10 - board[0];
  return board;
}
export function createPlayer(
  name: unknown,
  token: string,
  now: number,
): Player {
  return {
    id: crypto.randomUUID(),
    token,
    name: nickname(name),
    board: [],
    score: 0,
    lastSeen: now,
    left: false,
    playedRound: 0,
  };
}
export function createRoom(
  id: string,
  name: unknown,
  token: string,
  now: number,
): Room {
  const player = createPlayer(name, token, now);
  return {
    id,
    hostId: player.id,
    players: [player],
    round: 0,
    startsAt: 0,
    endsAt: 0,
    board: [],
  };
}
export function authenticate(room: Room, token: string) {
  const player = room.players.find((p) => p.token === token && !p.left);
  if (!player)
    throw new GameError(
      '참가 정보가 만료되었습니다. 닉네임으로 다시 입장해 주세요.',
      401,
    );
  return player;
}
export function online(player: Player, now: number) {
  return !player.left && now - player.lastSeen < DISCONNECT_AFTER;
}
export function maintainHost(room: Room, now: number) {
  if (!room.players.some((p) => p.id === room.hostId && online(p, now))) {
    const next = room.players.find((p) => online(p, now));
    if (next) room.hostId = next.id;
  }
}
export function rectangleIndices(rect: unknown): number[] {
  if (
    !Array.isArray(rect) ||
    rect.length !== 4 ||
    !rect.every(Number.isInteger)
  )
    throw new GameError('올바른 사각형을 선택해 주세요.');
  const [x1, y1, x2, y2] = rect as number[];
  if (
    Math.min(x1, x2) < 0 ||
    Math.max(x1, x2) >= COLS ||
    Math.min(y1, y2) < 0 ||
    Math.max(y1, y2) >= ROWS
  )
    throw new GameError('보드 안에서 선택해 주세요.');
  const indices: number[] = [];
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      indices.push(y * COLS + x);
  return indices;
}
export function act(
  room: Room,
  token: string,
  action: Record<string, unknown>,
  now: number,
): void {
  if (action.type === 'join') {
    const existing = room.players.find((p) => p.token === token && !p.left);
    if (existing) {
      existing.lastSeen = now;
      maintainHost(room, now);
      return;
    }
    if (phase(room, now) === 'playing' || phase(room, now) === 'countdown')
      throw new GameError(
        '이미 게임이 시작되었습니다. 게임이 끝나면 입장할 수 있어요.',
        409,
      );
    room.players = room.players.filter(
      (p) => online(p, now) || (room.round > 0 && p.playedRound === room.round),
    );
    if (room.players.filter((p) => online(p, now)).length >= 8)
      throw new GameError(
        '방이 가득 찼습니다. 최대 8명까지 참가할 수 있어요.',
        409,
      );
    const name = nickname(action.name);
    if (room.players.some((p) => online(p, now) && p.name === name))
      throw new GameError(
        '이미 사용 중인 닉네임입니다. 다른 이름을 입력해 주세요.',
        409,
      );
    // Retire offline seats; their completed score remains visible until the next round.
    for (const p of room.players) if (!online(p, now)) p.left = true;
    room.players.push(createPlayer(name, token, now));
    maintainHost(room, now);
    return;
  }
  const player = authenticate(room, token);
  player.lastSeen = now;
  maintainHost(room, now);
  if (action.type === 'heartbeat') return;
  if (action.type === 'leave') {
    player.left = true;
    maintainHost(room, now);
    return;
  }
  if (action.type === 'start') {
    if (player.id !== room.hostId)
      throw new GameError('방장만 게임을 시작할 수 있어요.', 403);
    if (phase(room, now) === 'playing' || phase(room, now) === 'countdown')
      throw new GameError('이미 진행 중인 게임입니다.', 409);
    const ready = room.players.filter((p) => online(p, now));
    if (ready.length < 2 || ready.length > 8)
      throw new GameError('접속 중인 참가자 2~8명이 필요합니다.', 409);
    if (action.round !== room.round)
      throw new GameError('이미 새로운 라운드가 시작되었습니다.', 409);
    room.players = ready;
    room.round++;
    room.board = makeBoard();
    room.startsAt = now + COUNTDOWN;
    room.endsAt = room.startsAt + DURATION;
    for (const p of room.players) {
      p.board = [...room.board];
      p.score = 0;
      p.playedRound = room.round;
    }
    return;
  }
  if (action.type === 'select') {
    if (phase(room, now) !== 'playing')
      throw new GameError('지금은 사과를 제거할 수 없습니다.', 409);
    if (action.round !== room.round)
      throw new GameError('다른 라운드의 선택입니다.', 409);
    const indices = rectangleIndices(action.rect);
    if (indices.reduce((sum, i) => sum + player.board[i], 0) !== 10)
      throw new GameError('선택한 숫자의 합이 10이 아닙니다.', 409);
    for (const i of indices)
      if (player.board[i]) {
        player.board[i] = 0;
        player.score++;
      }
    return;
  }
  throw new GameError('알 수 없는 요청입니다.');
}
export function publicRoom(
  room: Room,
  token: string,
  revision: number,
  now: number,
) {
  const me = authenticate(room, token);
  const sorted = [...room.players]
    .filter((p) => !p.left || p.playedRound === room.round)
    .sort((a, b) => b.score - a.score);
  const participants = sorted.filter((p) => p.playedRound === room.round);
  return {
    id: room.id,
    hostId: room.hostId,
    round: room.round,
    phase: phase(room, now),
    startsAt: room.startsAt,
    endsAt: room.endsAt,
    serverTime: now,
    revision,
    meId: me.id,
    board: now < room.startsAt ? [] : me.board,
    players: sorted.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      online: online(p, now),
      left: p.left,
      playedRound: p.playedRound,
      rank: participants.findIndex((q) => q.score === p.score) + 1,
    })),
  };
}
