import {Seq as ISeq} from "./seq";
import {Seq as factory} from "./seq-factory";
import {SeqTags, TaggedSeq} from './common';
import {asSeqInternal, internalEmpty, randomInternal} from './internal';

export * from './index';

export function asSeq<T>(items: Iterable<T>): ISeq<T>;
export function asSeq<T>(generator: () => Iterator<T>): ISeq<T>;
export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>)): ISeq<T> {
  return asSeqInternal(itemsProvider, true);
}

export type Seq<T> = ISeq<T>;

export namespace Seq {
  export function range(start: number, end?: number, step: number = 1): ISeq<number> {
    const seq = factory.range(start, end, step);
    (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }

  export function indexes(count: number): ISeq<number> {
    return range(0, count - 1);
  }

  export function repeat<T>(value: T, count: number): ISeq<T> {
    const seq = factory.repeat(value, count);
    (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }

  export function random(): ISeq<number> {
    return randomInternal(true);
  }

  export const empty = internalEmpty;
}
export declare namespace Seq {
  export const enableOptimization: boolean;

  export function asSeq<T>(items: Iterable<T>): ISeq<T>;
  export function asSeq<T>(generator: () => Iterator<T>): ISeq<T>;
  export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>)): ISeq<T>;
}
Seq.asSeq = asSeq as any;
