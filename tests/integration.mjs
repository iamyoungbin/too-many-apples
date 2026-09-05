import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
const tokens = Array.from({ length: 10 }, () => crypto.randomUUID());
async function call(id, token, action) {
  const res = await fetch(`${origin}/api/rooms${id ? `/${id}` : ''}`, {
    method: action ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(action ? { 'Content-Type': 'application/json', Origin: origin } : {}),
    },
    body: action ? JSON.stringify(action) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}
const created = await call('', tokens[0], { name: '테스트방장' });
assert.equal(created.status, 201, JSON.stringify(created.data));
const id = created.data.id;
try {
  const joins = await Promise.all(
    tokens
      .slice(1)
      .map((token, i) =>
        call(id, token, { type: 'join', name: `수집가${i + 1}` }),
      ),
  );
  assert.equal(
    joins.filter((r) => r.status === 200).length,
    7,
    JSON.stringify(joins),
  );
  assert.equal(joins.filter((r) => r.status === 409).length, 2);
  const participant = tokens.slice(1).find((_, i) => joins[i].status === 200);
  assert.equal(
    (await call(id, participant, { type: 'start', round: 0 })).status,
    403,
  );
  const started = await call(id, tokens[0], { type: 'start', round: 0 });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.endsAt - started.data.startsAt, 120000);
  assert.deepEqual(started.data.board, []);
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, started.data.startsAt - Date.now() + 100)),
  );
  const [host, guest] = await Promise.all([
    call(id, tokens[0]),
    call(id, participant),
  ]);
  assert.equal(host.data.board.length, 170);
  assert.deepEqual(host.data.board, guest.data.board);
  assert.equal((await call(id, crypto.randomUUID())).status, 401);
  assert.ok(!JSON.stringify(host.data).includes(tokens[0]));
  const selections = await Promise.all([
    call(id, tokens[0], { type: 'select', round: 1, rect: [0, 0, 1, 0] }),
    call(id, tokens[0], { type: 'select', round: 1, rect: [0, 0, 1, 0] }),
  ]);
  assert.deepEqual(selections.map((r) => r.status).sort(), [200, 409]);
  const scored = await call(id, tokens[0]);
  assert.equal(
    scored.data.players.find((p) => p.id === scored.data.meId).score,
    2,
  );
  const guestAfter = await call(id, participant);
  assert.deepEqual(guestAfter.data.board, guest.data.board);
  assert.equal(
    guestAfter.data.players.find((p) => p.id === scored.data.meId).score,
    2,
  );
  assert.equal((await call(id, tokens[0], { type: 'leave' })).status, 200);
  const transfer = await call(id, participant);
  assert.notEqual(transfer.data.hostId, scored.data.meId);
  assert.equal((await call(id, tokens[0])).status, 401);
  console.log(
    'PASS: concurrent 8-player capacity, host authorization, synchronized start, same independent boards, secret isolation, atomic scoring, live scores, reconnect readback, host transfer, leave.',
  );
} finally {
  await Promise.all(
    tokens.map((token) => call(id, token, { type: 'leave' }).catch(() => {})),
  );
}
