'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicRoom } from './engine';
export function useGame() {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [roomId, setRoomId] = useState('');
  const [invited, setInvited] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const offset = useRef(0);
  const auth = useRef('');
  const active = useRef('');
  const latest = useRef<PublicRoom | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    auth.current =
      sessionStorage.getItem('apples-player') || crypto.randomUUID();
    sessionStorage.setItem('apples-player', auth.current);
    const id = new URLSearchParams(location.search).get('room') || '';
    setInvited(!!id);
    active.current = id;
    if (id) setRoomId(id);
    setReady(true);
    const timer = setInterval(() => setClock(Date.now() + offset.current), 100);
    return () => clearInterval(timer);
  }, []);
  const request = useCallback(
    async (id: string, action?: Record<string, unknown>) => {
      const start = Date.now();
      const response = await fetch(
        `/api/rooms${id ? `/${encodeURIComponent(id)}` : ''}`,
        {
          method: action ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${auth.current}`,
            ...(action ? { 'Content-Type': 'application/json' } : {}),
          },
          body: action ? JSON.stringify(action) : undefined,
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );
      const data = (await response.json()) as PublicRoom & { error?: string };
      if (!response.ok) {
        const e = new Error(data.error || '요청에 실패했습니다.') as Error & {
          status: number;
        };
        e.status = response.status;
        throw e;
      }
      if (data.serverTime)
        offset.current = data.serverTime - (start + Date.now()) / 2;
      return data as PublicRoom;
    },
    [],
  );
  const accept = useCallback((data: PublicRoom) => {
    if (active.current !== data.id) return;
    if (!latest.current || data.revision >= latest.current.revision) {
      latest.current = data;
      setRoom(data);
    }
    setConnected(true);
  }, []);
  useEffect(() => {
    if (!ready || !roomId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const data = await request(roomId);
        if (!cancelled) accept(data);
      } catch (e) {
        if (!cancelled) {
          const status = (e as { status?: number }).status;
          if (status === 401 || status === 404) {
            latest.current = null;
            setRoom(null);
            if (status === 404) setError((e as Error).message);
            return;
          }
          setConnected(false);
        }
      }
      if (!cancelled) timer = setTimeout(poll, 500);
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roomId, ready, request, accept, room?.meId]);
  const run = useCallback(
    async (action: Record<string, unknown>) => {
      if (lock.current) return null;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        const data = await request(active.current, action);
        if (action.type === 'leave') {
          active.current = '';
          latest.current = null;
          setRoom(null);
          setRoomId('');
          setInvited(false);
          history.replaceState(null, '', '/');
        } else {
          active.current = data.id;
          accept(data);
          setRoomId(data.id);
          history.replaceState(null, '', `/?room=${data.id}`);
        }
        return data;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : '연결을 확인한 뒤 다시 시도해 주세요.',
        );
        return null;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [request, accept],
  );
  const enter = useCallback(
    (name: string) => run({ type: active.current ? 'join' : 'create', name }),
    [run],
  );
  const reset = () => {
    active.current = '';
    latest.current = null;
    setRoom(null);
    setRoomId('');
    setInvited(false);
    setError('');
    history.replaceState(null, '', '/');
  };
  return {
    room,
    invited,
    ready,
    busy,
    error,
    setError,
    connected,
    now: clock,
    enter,
    run,
    reset,
  };
}
