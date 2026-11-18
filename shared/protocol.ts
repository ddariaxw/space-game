import { z } from 'zod';

export const JoinMessageSchema = z.object({
  type: z.literal('join'),
  room: z.string(),
  name: z.string(),
});

export const InputMessageSchema = z.object({
  type: z.literal('input'),
  seq: z.number().int().nonnegative(),
  tick: z.number().int().nonnegative(),
  thrust: z.boolean(),
  turn: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  fire: z.boolean(),
});

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  text: z.string(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  JoinMessageSchema,
  InputMessageSchema,
  ChatMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export type EntitySnapshot =
  | { readonly kind: 'ship'; readonly id: number; readonly x: number; readonly y: number; readonly angle: number }
  | { readonly kind: 'asteroid'; readonly id: number; readonly x: number; readonly y: number; readonly radius: number };

export function parseClientMessage(data: unknown): { success: true; data: ClientMessage } | { success: false; error: z.ZodError } {
  const result = ClientMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function handleClientMessage(msg: ClientMessage): void {
  switch (msg.type) {
    case 'join':
      break;
    case 'input':
      break;
    case 'chat':
      break;
    default: {
      const _exhaustive: never = msg;
      throw new Error(`Unhandled message type: ${_exhaustive}`);
    }
  }
}