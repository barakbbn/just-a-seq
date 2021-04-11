import {Seq} from "./seq";

export * from './index';
import * as factory from "./seq-factory";
import {SeqTags, TaggedSeq} from './common';
import {randomInternal} from './internal';


export function range(start: number, end?: number, step: number = 1): Seq<number> {
  const seq = factory.range(start, end, step);
  (seq as TaggedSeq)[SeqTags.$optimize] = true;
  return seq;
}

export function indexes(count: number): Seq<number> {
  return range(0, count - 1);
}

export function repeat<T>(value: T, count: number): Seq<T> {
  const seq = factory.repeat(value, count);
  (seq as TaggedSeq)[SeqTags.$optimize] = true;
  return seq;
}

export function random(): Seq<number> {
  return randomInternal(true);
}

export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>)): Seq<T> {
  const seq = factory.asSeq<T>(itemsProvider as any);
  (seq as TaggedSeq)[SeqTags.$optimize] = true;
  return seq;
}

export const empty = factory.empty;
