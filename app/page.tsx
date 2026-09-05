'use client';

import { useEffect, useState } from 'react';
import {
  Apple,
  ArrowUpRight,
  MousePointer2,
  Users,
  Timer,
  Link2,
  Crown,
  LogOut,
  Trophy,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGame } from '@/game/use-game';
import { Board } from '@/game/board';
import { registerRoomTool } from '@/game/webmcp';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const game = useGame();
  const { room, now, busy, error, connected } = game;
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => registerRoomTool(game.enter), [game.enter]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setNotice('');
    } catch {
      setNotice(`초대 링크: ${location.href}`);
    }
  };
  const host = room?.hostId === room?.meId;
  const state = !room?.round
    ? 'lobby'
    : now < room.startsAt
      ? 'countdown'
      : now < room.endsAt
        ? 'playing'
        : 'finished';
  const seconds = room
    ? Math.max(0, Math.ceil((room.endsAt - now) / 1000))
    : 120;
  const me = room?.players.find((p) => p.id === room.meId);
  const online = room?.players.filter((p) => p.online).length || 0;
  if (room)
    return (
      <main className="app-shell room-shell">
        <header className="topbar">
          <a href="/" className="brand" onClick={(e) => e.preventDefault()}>
            <Apple fill="currentColor" />
            <span>
              too many apples<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="room-top-actions">
            <span className={`connection ${connected ? '' : 'offline'}`}>
              <span className="live-dot" />
              {connected ? '연결됨' : '재연결 중'}
            </span>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => game.run({ type: 'leave' })}
            >
              <LogOut size={16} />
              나가기
            </Button>
          </div>
        </header>
        <div className="room-heading">
          <div>
            <span className="eyebrow">
              {room.round
                ? `ROUND ${String(room.round).padStart(2, '0')}`
                : 'WAITING ROOM'}
            </span>
            <h1>
              {state === 'lobby'
                ? '함께할 친구를 기다려요.'
                : state === 'finished'
                  ? '이번 승부의 결과는?'
                  : '더 많이 모아보세요.'}
            </h1>
          </div>
          <Button variant="outline" className="invite-button" onClick={copy}>
            {copied ? <Check size={17} /> : <Link2 size={17} />}{' '}
            {copied ? '복사했어요' : '초대 링크 복사'}
          </Button>
        </div>
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="message" role="status">
            {notice}
          </div>
        )}
        {!connected && (
          <div className="message error" role="alert">
            연결을 복구하고 있습니다. 다시 연결되면 플레이할 수 있어요.
          </div>
        )}
        <section className="play-layout">
          <div className="play-main">
            {state === 'lobby' ? (
              <div className="lobby-panel">
                <div className="lobby-title">
                  <span className="lobby-icon">
                    <Users size={30} />
                  </span>
                  <h2>오늘의 사과 수집가들</h2>
                  <p>친구에게 초대 링크를 보내고 함께 시작하세요.</p>
                </div>
                <div className="player-seats">
                  {Array.from({ length: 8 }, (_, i) => {
                    const p = room.players.filter((p) => !p.left)[i];
                    return (
                      <div
                        className={`player-seat ${p ? 'occupied' : ''}`}
                        key={p?.id || i}
                      >
                        {p ? (
                          <>
                            <span className={`avatar color-${i % 4}`}>
                              {p.name.slice(0, 1)}
                            </span>
                            <b>
                              {p.name} {p.id === room.meId && <small>나</small>}
                            </b>
                            <span>
                              {p.id === room.hostId ? (
                                <>
                                  <Crown size={14} />
                                  방장
                                </>
                              ) : p.online ? (
                                '준비 완료'
                              ) : (
                                '연결 끊김'
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="empty-seat">+</span>
                            <span>참가 대기</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="lobby-bottom">
                  <span>
                    <b>{online}</b> / 8명 참가 중
                  </span>
                  <span>2명 이상이면 시작할 수 있어요.</span>
                </div>
              </div>
            ) : state === 'finished' ? (
              <div className="results-panel">
                <span className="result-icon">
                  <Trophy size={38} />
                </span>
                <span className="eyebrow">TIME'S UP!</span>
                <h2>
                  {room.players
                    .filter((p) => p.playedRound === room.round && p.rank === 1)
                    .map((p) => p.name)
                    .join(', ')}{' '}
                  승리!
                </h2>
                <p>2분 동안 모은 사과, 최종 순위를 확인하세요.</p>
                <div className="final-table">
                  <div className="result-row table-label">
                    <span>순위</span>
                    <span>참가자</span>
                    <span>사과</span>
                  </div>
                  {room.players
                    .filter((p) => p.playedRound === room.round)
                    .map((p) => (
                      <div
                        className={`result-row ${p.id === room.meId ? 'my-result' : ''}`}
                        key={p.id}
                      >
                        <b>
                          {p.rank}
                          <small>위</small>
                        </b>
                        <span>
                          {p.name} {p.id === room.meId && <em>나</em>}
                          {room.players.filter(
                            (q) =>
                              q.playedRound === room.round &&
                              q.score === p.score,
                          ).length > 1 && (
                            <small className="tie-label">공동 순위</small>
                          )}
                        </span>
                        <b>
                          {p.score}
                          <small>점</small>
                        </b>
                      </div>
                    ))}
                </div>
                <p className="result-note">
                  동점은 공동 순위 · 재경기는 새로운 보드로 시작해요.
                </p>
              </div>
            ) : (
              <div className="board-panel">
                <div className="board-toolbar">
                  <span>
                    나의 사과{' '}
                    <b>
                      {me?.score || 0}
                      <small>점</small>
                    </b>
                  </span>
                  <span className={`timer ${seconds <= 20 ? 'urgent' : ''}`}>
                    <Timer size={20} />
                    {state === 'countdown'
                      ? '02:00'
                      : `${Math.floor(seconds / 60)
                          .toString()
                          .padStart(
                            2,
                            '0',
                          )}:${(seconds % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>
                <div className="time-track">
                  <div
                    style={{
                      width: `${Math.min(100, (seconds / 120) * 100)}%`,
                    }}
                  />
                </div>
                <div className="board-wrap">
                  <Board
                    board={room.board}
                    enabled={
                      state === 'playing' &&
                      connected &&
                      !busy &&
                      room.board.length > 0
                    }
                    round={room.round}
                    onSelect={(rect) =>
                      void game.run({ type: 'select', rect, round: room.round })
                    }
                  />
                  {state === 'countdown' && (
                    <div className="countdown-overlay">
                      <span>모두 같은 보드, 동시에 시작!</span>
                      <strong>
                        {Math.max(1, Math.ceil((room.startsAt - now) / 1000))}
                      </strong>
                      <p>마우스를 준비하세요.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <aside className="score-panel">
            <div className="score-title">
              <h2>{state === 'lobby' ? '이번 게임의 규칙' : '실시간 순위'}</h2>
              <span className="live-label">
                {state === 'lobby'
                  ? '120 SEC'
                  : state === 'finished'
                    ? 'FINAL'
                    : 'LIVE'}
              </span>
            </div>
            {state === 'lobby' ? (
              <div className="lobby-rules">
                <p>
                  <b>01</b>
                  <span>
                    사각형으로 드래그해
                    <br />
                    숫자의 합 <strong>10</strong> 만들기
                  </span>
                </p>
                <p>
                  <b>02</b>
                  <span>
                    제거한 사과 하나마다
                    <br />
                    <strong>1점</strong>씩 쌓기
                  </span>
                </p>
                <p>
                  <b>03</b>
                  <span>
                    <strong>2분</strong> 동안 더 많이 모아
                    <br />
                    가장 높은 점수에 도전
                  </span>
                </p>
              </div>
            ) : (
              <div className="live-scores">
                {room.players
                  .filter((p) => p.playedRound === room.round)
                  .map((p) => (
                    <div
                      key={p.id}
                      className={`live-player ${p.id === room.meId ? 'is-me' : ''}`}
                    >
                      <span className="rank">{p.rank}</span>
                      <div>
                        <b>
                          {p.name} {p.id === room.meId && <small>나</small>}
                        </b>
                        <span>
                          {p.left
                            ? '나감'
                            : p.online
                              ? p.id === room.hostId
                                ? '방장'
                                : '참가자'
                              : '연결 끊김'}
                        </span>
                      </div>
                      <strong>
                        {p.score}
                        <small>점</small>
                      </strong>
                    </div>
                  ))}
              </div>
            )}
            {(state === 'lobby' || state === 'finished') && (
              <div className="start-area">
                {host ? (
                  <>
                    <Button
                      className="primary-button"
                      disabled={busy || online < 2 || !connected}
                      onClick={() =>
                        game.run({ type: 'start', round: room.round })
                      }
                    >
                      {state === 'finished' ? (
                        <RotateCcw size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}{' '}
                      {busy
                        ? '준비 중…'
                        : state === 'finished'
                          ? '다시 경기하기'
                          : '게임 시작하기'}
                    </Button>
                    <p>
                      {online < 2
                        ? '접속 중인 참가자가 2명 이상 필요해요.'
                        : '모두 3초 카운트다운 후 시작해요.'}
                    </p>
                  </>
                ) : (
                  <p className="waiting-host">
                    방장이 {state === 'finished' ? '재경기를' : '게임을'}{' '}
                    시작하기를 기다리는 중이에요.
                  </p>
                )}
              </div>
            )}
            <div className="fair-note">
              <Apple size={16} />
              <span>
                같은 배치에서 각자 플레이해요.
                <br />
                다른 참가자의 사과는 사라지지 않아요.
              </span>
            </div>
          </aside>
        </section>
        <footer>
          작은 사과, 치열한 승부.<span>PC 마우스 전용 · 2~8인 대전</span>
        </footer>
      </main>
    );
  return (
    <main className="app-shell">
      <header className="topbar">
        <a href="/" className="brand">
          <Apple fill="currentColor" />
          <span>
            too many apples<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="edition">MULTIPLAYER / 01</span>
      </header>
      <section className="entry-layout">
        <div className="entry-copy">
          <span className="eyebrow">
            <span className="live-dot" />
            친구와 함께, 사과 게임
          </span>
          <h1>
            합은 10.
            <br />
            승부는 2분<span className="accent">.</span>
          </h1>
          <p className="intro">
            같은 보드에서 시작하는 작은 승부.
            <br />
            사과를 더 많이 모은 사람이 이깁니다.
          </p>
          <form
            className="entry-form"
            onSubmit={(e) => {
              e.preventDefault();
              void game.enter(nickname);
            }}
          >
            <label htmlFor="nickname">어떤 이름으로 플레이할까요?</label>
            <Input
              id="nickname"
              placeholder="닉네임 입력"
              maxLength={12}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="nickname"
            />
            <Button
              className="primary-button"
              type="submit"
              disabled={!nickname.trim() || busy || !game.ready}
            >
              {busy
                ? '입장 중…'
                : game.invited
                  ? '초대받은 방 입장하기'
                  : '방 만들기'}{' '}
              <ArrowUpRight size={20} />
            </Button>
            {error && (
              <p className="entry-error" role="alert">
                {error}
              </p>
            )}
            {game.invited && (
              <button
                className="text-button"
                type="button"
                onClick={game.reset}
              >
                대신 새 방 만들기
              </button>
            )}
            <p className="form-note">회원가입 없이 · 2~8명 · PC 마우스</p>
          </form>
        </div>
        <div className="rule-panel">
          <div className="panel-caption">
            <span>HOW TO PLAY</span>
            <MousePointer2 size={20} />
          </div>
          <div
            className="demo-board"
            aria-label="예시: 3과 7을 드래그하면 합이 10"
          >
            <div className="demo-pair">
              {[3, 7].map((n) => (
                <span className="demo-apple" key={n}>
                  <Apple fill="currentColor" strokeWidth={1.5} />
                  <b>{n}</b>
                </span>
              ))}
              <span className="demo-sum">= 10 ✓</span>
            </div>
            {[2, 5, 8, 4].map((n) => (
              <span className="demo-apple muted-apple" key={n}>
                <Apple fill="currentColor" strokeWidth={1.5} />
                <b>{n}</b>
              </span>
            ))}
          </div>
          <h2>드래그하고, 10을 만드세요.</h2>
          <p>
            사각형 안의 숫자 합이 10이면 사과가 사라져요.
            <br />
            제거한 사과 하나마다 1점을 얻습니다.
          </p>
          <div className="rule-facts">
            <span>
              <Link2 />
              링크로 초대
            </span>
            <span>
              <Timer />
              120초 승부
            </span>
            <span>
              <Users />
              실시간 순위
            </span>
          </div>
        </div>
      </section>
      <footer>
        작은 사과, 치열한 승부.<span>모두 같은 보드 · 각자의 플레이</span>
      </footer>
    </main>
  );
}
