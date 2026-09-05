type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerRoomTool(
  enter: (name: string) => Promise<{ id: string } | null>,
) {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'enter_apple_room',
          title: '사과 게임 방 입장',
          description:
            '현재 초대 링크의 방에 닉네임으로 참가합니다. 초대 링크가 없으면 새 방을 생성합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              nickname: { type: 'string', minLength: 1, maxLength: 12 },
            },
            required: ['nickname'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input) {
            const name = (input as { nickname?: unknown })?.nickname;
            if (
              typeof name !== 'string' ||
              !name.trim() ||
              [...name].length > 12
            )
              throw new Error('닉네임은 1~12자여야 합니다.');
            const room = await enter(name);
            if (!room)
              throw new Error(
                '방에 입장하지 못했습니다. 화면의 오류를 확인하세요.',
              );
            return { roomId: room.id, entered: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional browser API. */
  }
  return () => lifecycle.abort();
}
