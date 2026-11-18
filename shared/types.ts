declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };

export type EntityId = Brand<number, 'EntityId'>;
export type Tick = Brand<number, 'Tick'>;
export type Seq = Brand<number, 'Seq'>;

export function asEntityId(n: number): EntityId {
  return n as EntityId;
}

export function asTick(n: number): Tick {
  return n as Tick;
}

export function asSeq(n: number): Seq {
  return n as Seq;
}

export type Vector2 = {
  readonly x: number;
  readonly y: number;
};