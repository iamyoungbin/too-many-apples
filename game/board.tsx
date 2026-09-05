'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Apple, MousePointer2 } from 'lucide-react';
import { COLS, ROWS, rectangleIndices } from './engine';
type Point = [number, number];
export function Board({
  board,
  enabled,
  round,
  onSelect,
}: {
  board: number[];
  enabled: boolean;
  round: number;
  onSelect: (rect: number[]) => void;
}) {
  const [selection, setSelection] = useState<{ from: Point; to: Point } | null>(
    null,
  );
  const [message, setMessage] = useState(
    '사각형으로 드래그해 합이 10인 사과를 모으세요.',
  );
  const drag = useRef<{ from: Point; to: Point } | null>(null);
  useEffect(() => {
    drag.current = null;
    setSelection(null);
  }, [round, enabled]);
  const point = (event: PointerEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(
          COLS - 1,
          Math.floor(((event.clientX - bounds.left) / bounds.width) * COLS),
        ),
      ),
      Math.max(
        0,
        Math.min(
          ROWS - 1,
          Math.floor(((event.clientY - bounds.top) / bounds.height) * ROWS),
        ),
      ),
    ];
  };
  const rect = selection ? [...selection.from, ...selection.to] : null;
  const indices = new Set(rect ? rectangleIndices(rect) : []);
  const sum = [...indices].reduce((s, i) => s + (board[i] || 0), 0);
  const cancel = () => {
    drag.current = null;
    setSelection(null);
  };
  return (
    <>
      <div
        className={`game-board ${enabled ? 'is-playable' : ''}`}
        aria-label="17열 10행 사과 보드. 마우스로 사각형을 드래그하세요."
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (!enabled || e.button !== 0 || e.pointerType !== 'mouse') return;
          e.preventDefault();
          const p = point(e);
          drag.current = { from: p, to: p };
          setSelection(drag.current);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          drag.current = { ...drag.current, to: point(e) };
          setSelection(drag.current);
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          const r = [...drag.current.from, ...point(e)];
          const total = rectangleIndices(r).reduce(
            (s, i) => s + (board[i] || 0),
            0,
          );
          cancel();
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (!enabled) return;
          if (total === 10) {
            setMessage('좋아요! 계속해서 사과를 모아 보세요.');
            onSelect(r);
          } else
            setMessage(`선택한 합은 ${total}. 합이 10인 영역을 찾아보세요.`);
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => (
          <div
            className={`apple-cell ${indices.has(i) ? (sum === 10 ? 'selected valid' : 'selected') : ''}`}
            key={i}
          >
            {!!board[i] && (
              <>
                <Apple
                  className="apple-icon"
                  fill="currentColor"
                  strokeWidth={1.5}
                />
                <span>{board[i]}</span>
              </>
            )}
          </div>
        ))}
        {selection && (
          <div
            className={`selection-outline ${sum === 10 ? 'valid' : ''}`}
            style={{
              left: `${(Math.min(selection.from[0], selection.to[0]) / COLS) * 100}%`,
              top: `${(Math.min(selection.from[1], selection.to[1]) / ROWS) * 100}%`,
              width: `${((Math.abs(selection.from[0] - selection.to[0]) + 1) / COLS) * 100}%`,
              height: `${((Math.abs(selection.from[1] - selection.to[1]) + 1) / ROWS) * 100}%`,
            }}
          >
            <span>
              합 {sum}
              {sum === 10 ? ' ✓' : ''}
            </span>
          </div>
        )}
      </div>
      <p className="board-help" role="status">
        <MousePointer2 size={16} />
        {selection ? `선택한 숫자의 합: ${sum}` : message}
      </p>
    </>
  );
}
