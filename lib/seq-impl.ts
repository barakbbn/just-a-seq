import {Condition, Seq} from './seq';
import {internalEmpty} from "./internal";
import {
  CloseableIterator,
  EMPTY_ARRAY,
  SeqTags,
  TaggedSeq
} from './common';

import {SeqBase} from './seq-base';

export function createSeq<TSource = any, T = TSource>(
  source: Iterable<TSource> = EMPTY_ARRAY as unknown as TSource[],
  generator?: (source: Iterable<TSource>) => Iterator<T>,
  tags?: readonly [symbol, any][]): SeqBase<T> {

  return !generator?
    Array.isArray(source)?
      new ArraySeqImpl<T>(source, tags):
      new IterableSeqImpl(source as unknown as Iterable<T>, tags):
    new GeneratorSeqImpl(source, generator, tags);
}

export class GeneratorSeqImpl<TSource = any, T = TSource> extends SeqBase<T> {
  constructor(
    protected readonly source: Iterable<TSource>,
    private generator: (source: Iterable<TSource>) => Iterator<T>,
    tags: readonly [tag: symbol, value: any][] = EMPTY_ARRAY) {

    super();

    SeqTags.setTagsIfMissing(this, tags);
  }

  all(condition: Condition<T>): boolean {
    return super.allOptimized(this.source, condition);
  }

  any(condition?: Condition<T>): boolean {
    return super.anyOptimized(this.source, condition);
  }

  count(condition?: Condition<T>): number {
    return super.countOptimized(this.source, condition);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastOptimized(this.source, count);
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return super.includesOptimized(this.source, itemToFind, fromIndex);
  }

  [Symbol.iterator](): Iterator<T> {
    return new CloseableIterator<TSource, T>(this.source, this.generator);
  }

}

export class ArraySeqImpl<T = any> extends SeqBase<T> {
  [SeqTags.$notAffectingNumberOfItems] = true;
  [SeqTags.$notMappingItems] = true;

  constructor(protected readonly source: readonly T[] = EMPTY_ARRAY,
              tags: readonly [symbol, any][] = EMPTY_ARRAY) {
    super();
    SeqTags.setTagsIfMissing(this, tags);
  }

  aggregate<U, TRes>(initialValue: U, aggregator: (previousValue: U, currentValue: T, currentIndex: number) => U, resultSelector: (aggregatedValue: U) => TRes): TRes {
    return resultSelector(this.reduce(aggregator, initialValue));
  }

  aggregateRight<U, TRes>(initialValue: U, aggregator: (previousValue: U, currentValue: T, currentIndex: number) => U, resultSelector: (aggregatedValue: U) => TRes): TRes {
    return resultSelector(this.reduceRight(aggregator, initialValue));
  }

  all(condition: Condition<T>): boolean {
    return this.every(condition);
  }

  any(condition?: Condition<T>): boolean {
    return condition? this.source.some(condition): this.source.length > 0;
  }

  at(index: number, fallback?: T): T | undefined {
    index = Math.trunc(index);
    if (index < 0) index = this.source.length + index;
    if (index < 0 || index >= this.source.length) return fallback;
    return this.source[index] ?? fallback;
  }

  chunk(size: number, maxChunks: number = Number.MAX_SAFE_INTEGER): Seq<Seq<T>> {
    size = Math.trunc(size);
    maxChunks = Math.trunc(maxChunks);
    if (size <= 0) {
      throw new Error('size parameter must be positive value');
    }

    if (maxChunks < 1) return internalEmpty<Seq<T>>();

    const self = this;
    return this.generateForSource(this.source, function* chunk(source: T[]) {
      for (let skip = 0, chunk = 0; skip < source.length && chunk < maxChunks; skip += size, chunk++) {
        yield self.slice(skip, skip + size);
      }
    });
  }

  count(condition?: Condition<T>): number {
    return this.countOptimized(this.source, condition);
  }

  every(condition: Condition<T>): boolean {
    return this.source.every(condition);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastOptimized(this.source, count);
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return this.source.includes(itemToFind, fromIndex);
  }

  indexOf(itemToFind: T, fromIndex: number = 0): number {
    return this.source.indexOf(itemToFind, fromIndex);
  }

  isEmpty(): boolean {
    return this.source.length === 0;
  }

  last(): T | undefined;

  last(fallback: T): T;

  last(fallback?: T): T | undefined {
    const items = this.source;
    return items.length? items[items.length - 1]: fallback;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    return fromIndex == null?
      this.source.lastIndexOf(itemToFind):
      this.source.lastIndexOf(itemToFind, fromIndex);
  }

  padStart(length: number, value: T): Seq<T> {
    length = Math.max(Math.trunc(length), 0);
    if (length === 0) return this;
    return this.generateForSource(this.source, function* padStart(source: T[]) {
      let counted = 0;
      while (source.length + counted < length) {
        yield value;
        counted++;
      }
      yield* source;
    });
  }

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T;
  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T;

  reduce<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduce<U = T>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {

    return arguments.length > 1?
      this.source.reduce<U>(reducer, initialValue!):
      this.source.reduce(reducer as unknown as (previousValue: T, currentValue: T, currentIndex: number) => T) as unknown as U;
  }

  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T;

  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T;

  reduceRight<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduceRight<U = T>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {
    return arguments.length > 1?
      this.source.reduceRight<U>(reducer, initialValue!):
      this.source.reduceRight(reducer as unknown as (previousValue: T, currentValue: T, currentIndex: number) => T) as unknown as U;
  }

  reverse(): Seq<T> {
    return this.createDefaultSeq(this.source, function* reverse(source: T[]) {
      for (let i = source.length - 1; i >= 0; i--) yield source[i];
    }, [
      [SeqTags.$notMappingItems, true],
      [SeqTags.$notAffectingNumberOfItems, true]
    ]);
  }

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: (item: T) => K = t => t as unknown as K, secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {
    if (Array.isArray(second) && this.source.length !== second.length) return false;
    return super.sameItems(second, firstKeySelector, secondKeySelector);
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean): boolean {
    if (Array.isArray(second) && this.source.length !== second.length) return false;
    return super.sameOrderedItems(second, equals);
  }

  some(condition: Condition<T> = () => true): boolean {
    return this.any(condition);
  }

  slice(start: number, end: number): Seq<T> {
    return this.generateForSource(this.source, function* slice(source: T[]) {
      if (start < 0) start += source.length;
      if (start < 0) start = 0;
      if (end < 0) end += source.length;
      if (end < 0) end = 0;
      else if (end > source.length) end = source.length;

      if (end === 0 || end - start <= 0) return;

      for (let i = start; i < end; i++) yield source[i];
    }, [[SeqTags.$notMappingItems, true]]);
  }

  skip(count: number): Seq<T> {
    if (count <= 0) return this;

    return this.generateForSource(this.source, function* skip(source: T[]) {
      for (let i = count; i < source.length; i++) yield source[i];
    }, [[SeqTags.$notMappingItems, true]]);
  }

  splitAt(index: number): [Seq<T>, Seq<T>] & { first: Seq<T>; second: Seq<T>; } {
    let result: any = [];
    if (index > 0) result = [this.take(index), this.skip(index)];
    else result.push(internalEmpty<T>(), this);

    result.first = result[0];
    result.second = result[1];
    return result as ([Seq<T>, Seq<T>] & { first: Seq<T>; second: Seq<T>; });
  }

  startsWith(items: Iterable<T>, keySelector?: (item: T) => unknown): boolean;
  startsWith<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): boolean;
  startsWith<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;
  startsWith<U = T>(items: Iterable<U>, {equals}: { equals(t: T, u: U): unknown; }): boolean;

  startsWith<U, K>(items: Iterable<U>, firstKeySelector?: ((item: T) => K) | { equals(t: T, u: U): unknown; }, secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {
    if (Array.isArray(items)) {
      if (items.length === 0) return true;
      if (this.source.length < items.length) return false;
    }
    return super.startsWith(items, firstKeySelector as any, secondKeySelector);
  }

  takeLast(count: number): Seq<T> {
    return this.generateForSource(this.source, function* takeLast(source: T[]) {
      const startIndex = Math.max(source.length - count, 0);
      for (let i = startIndex; i < source.length; i++) yield source[i];
    }, [[SeqTags.$notMappingItems, true]]);
  }

  with(index: number, value: T): Seq<T> {
    index = Math.trunc(index);
    if (index < 0 && index >= -this.source.length) index += this.source.length;
    return super.with(index, value);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this.source;
  }

  protected findFirstByConditionInternal<S extends T>(fromIndex: number, condition: | Condition<T> | ((item: T, index: number) => item is S), fallback?: S): [number, S | undefined] {
    if (fromIndex >= this.source.length) return [-1, fallback];
    for (let index = fromIndex; index < this.source.length; index++) {
      const item = this.source[index];
      if (condition(item, index)) return [index, item];
    }
    return [-1, fallback];
  }

  protected findLastByConditionInternal(tillIndex: number, condition: Condition<T>, fallback?: T): [number, (T | undefined)] {
    const array = this.source;
    if (tillIndex < 0 || array.length === 0) return [-1, fallback];
    if (Number.isNaN(tillIndex) || tillIndex >= array.length) tillIndex = array.length - 1;
    for (let index = tillIndex; index >= 0; index--) {
      const item = array[index];
      if (condition(item, index)) return [index, item];
    }

    return [-1, fallback];
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + this.source.join(separator) + end;
  }
}


export class IterableSeqImpl<T = any> extends SeqBase<T> implements TaggedSeq {
  [SeqTags.$notAffectingNumberOfItems] = true;
  [SeqTags.$notMappingItems] = true;

  constructor(
    protected readonly source: Iterable<T>,
    tags: readonly [symbol, any][] = EMPTY_ARRAY) {

    super();

    SeqTags.setTagsIfMissing(this, tags);
  }

  isEmpty(): boolean {
    return SeqTags.isSeq(this.source)?
      this.source.isEmpty():
      super.isEmpty();
  }

  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this.source;
  }
}
