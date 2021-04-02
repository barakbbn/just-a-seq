import {CachedSeq, Seq, SortedSeq} from "./seq";

export interface IterationContext {
  closeWhenDone<V>(iterator: Iterator<V>): Iterator<V>;

  onClose(action: () => void): void;
}

class IterationContextImpl implements IterationContext {
  private onCloseActions: (() => void)[];

  closeWhenDone<V>(iterator: Iterator<V>) {
    this.onClose(() => closeIterator(iterator));
    return iterator;
  }

  onClose(action: () => void): void {
    (this.onCloseActions ??= []).push(action);
  }

  __close(): void {
    this.onCloseActions?.splice?.(0)?.forEach(action => action());
  }
}

export class CloseableIterator<T, U = T> implements Iterator<U> {
  private iterator: Iterator<U>;
  private done = false;
  private iterationContext = new IterationContextImpl();

  constructor(private source: Iterable<T>,
              private generator: (seq: Iterable<T>, iterationContext: IterationContext) => Iterator<U>) {
  }

  return(value?: any): IteratorResult<any> {
    this.done = true;
    const result = closeIterator(this.iterator, value) ?? {done: true, value};
    this.iterationContext.__close();
    return result;
  }

  next(): IteratorResult<U> {
    if (this.done) return {done: true, value: undefined};
    if (!this.iterator) this.iterator = this.generator(this.source, this.iterationContext);
    const {value, done} = this.iterator.next();
    return done ? this.return(value) : {value};
  }
}

export class Gen<T, U = T> implements Iterable<U> {

  constructor(private seq: Iterable<T>, private generator: (seq: Iterable<T>, iterationContext: IterationContext) => Iterator<U>) {
  }

  [Symbol.iterator](): Iterator<U> {
    return new CloseableIterator<T, U>(this.seq, this.generator);
  }
}

export function closeIterator(iterator: Iterator<any>, value?: any): IteratorResult<any> | undefined {
  if (typeof iterator?.return === 'function') return iterator.return(value);
  return undefined;
}

class IterableGenerator<T> implements Iterable<T> {
  constructor(private generator: () => Iterator<T>) {
  }

  [Symbol.iterator](): Iterator<T> {
    return this.generator();
  }
}

export function generate<T>(generator: () => Iterator<T>): Iterable<T> {
  return new IterableGenerator(generator);
}


export function getIterator<T>(iterable: Iterable<T>): Iterator<T> {
  return iterable[Symbol.iterator]();
}

export function sameValueZero(a: any, b: any): boolean {
  return Number.isNaN(a) && Number.isNaN(b) || a === b;
}

export function* tapGenerator<T>(items: Iterable<T>, callbacks: ((item: T, index: number) => void)[]): Generator<T> {
  for (const {value, index} of entries(items)) {
    callbacks.forEach(callback => callback(value, index));
    yield value;
  }
}

export function tapIterable<T>(items: Iterable<T>, callback: (item: T, index: number) => void, thisArg?: any): Iterable<T> {
  return {
    [Symbol.iterator]() {
      if (thisArg) callback = callback.bind(thisArg);
      return tapGenerator(items, [callback]);
    }
  }
}

export function isIterable<R>(item: any, ignoreIfString = false): item is Iterable<R> {
  return item && typeof item[Symbol.iterator] === "function" && (!ignoreIfString || typeof item !== 'string');
}

export function* entries<T>(items: Iterable<T>): Generator<{ value: T; index: number; }> {
  let index = 0;
  for (const value of items) yield {value, index: index++};
}

export function consume(iterable: Iterable<any>): void {
  for (const _ of iterable) {
  }
}

export const IGNORED_ITEM: any = {};
export const LEGACY_COMPARER: any = {};
export const DONT_COMPARE: any = {};
export const EMPTY_ARRAY: readonly any[] = []


export class SeqTags {

  static readonly $sourceIsArray: unique symbol = Symbol('sourceIsArray');
  static readonly $seq: unique symbol = Symbol('seq');
  static readonly $cacheable: unique symbol = Symbol('cacheable');
  static readonly $cached: unique symbol = Symbol('cached');
  static readonly $sorted: unique symbol = Symbol('sorted');
  static readonly $notAffectingNumberOfItems: unique symbol = Symbol('notAffectingNumberOfItems');
  static readonly $notMapItems: unique symbol = Symbol('notMapItems');
  static readonly $maxCount: unique symbol = Symbol('maxCount');

  static getTag<Tag extends keyof TaggedSeq>(seq: Iterable<any>, tag: Tag): TaggedSeq[Tag] {
    const guard = (seq: any): seq is TaggedSeq => seq;
    return guard(seq) ? seq[tag] : undefined;
  }

  static sourceIsArray<T>(seq: Iterable<T>): seq is T[] {
    const isNot = !this.getTag(seq, this.$sourceIsArray);
    return !isNot;
  }

  static isSeq<T>(seq: Iterable<T>): seq is Seq<T> {
    const isNot = !this.getTag(seq, this.$seq);
    return !isNot;
  }

  static cacheable<T>(seq: Iterable<T>): seq is CachedSeq<T> {
    const isNot = !this.getTag(seq, this.$cacheable);
    return !isNot;
  }

  static cached(seq: Iterable<any>): boolean {
    const isNot = !this.getTag(seq, this.$cached)
    return !isNot;
  }

  static sorted<T>(seq: Iterable<T>): seq is SortedSeq<T> {
    const isNot = !this.getTag(seq, this.$sorted);
    return !isNot;
  }

  static notAffectingNumberOfItems(seq: Iterable<any>): boolean | unknown {
    const isNot = !this.getTag(seq, this.$notAffectingNumberOfItems)
    return !isNot;
  }

  static notMapItems(seq: Iterable<any>): boolean | unknown {
    const isNot = !this.getTag(seq, this.$notMapItems)
    return !isNot;
  }

  static infinite(seq: Iterable<any>): boolean {
    const maxCount = this.maxCount(seq) ?? -1;
    return Number.POSITIVE_INFINITY === maxCount;
  }

  static maxCount(seq: Iterable<any>): number | undefined {
    return this.getTag(seq, this.$maxCount)
  }

  static empty(seq: Iterable<any>): boolean {
    const maxCount = this.maxCount(seq) ?? Number.MAX_SAFE_INTEGER;
    return maxCount === 0;
  }
}

// export type TaggedSeq = { [TAG in keyof Omit<typeof SeqTags, 'prototype'> as typeof SeqTags[TAG] extends symbol ? typeof SeqTags[TAG] : never]?: boolean; }

export interface TaggedSeq {
  [SeqTags.$sourceIsArray]?: boolean;
  [SeqTags.$seq]?: boolean;
  [SeqTags.$cacheable]?: boolean;
  [SeqTags.$cached]?: boolean;
  [SeqTags.$sorted]?: boolean;
  [SeqTags.$notAffectingNumberOfItems]?: boolean;
  [SeqTags.$notMapItems]?: boolean;
  [SeqTags.$maxCount]?: number;
}

