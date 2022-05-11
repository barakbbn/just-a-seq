import {internalEmpty} from "./internal";
import {CloseableIterator, EMPTY_ARRAY, IterationContext, SeqTags, TaggedSeq} from './common'

import {Condition, Seq} from './seq'
import {SeqBase} from './seq-base';

export function createSeq<TSource = any, T = TSource>(
  source: Iterable<TSource> = EMPTY_ARRAY as unknown as TSource[],
  generator?: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>,
  tags?: readonly [symbol, any][]): SeqBase<T> {

  return !generator ?
    Array.isArray(source) ?
      new ArraySeqImpl<T>(source, tags) :
      new IterableSeqImpl(source as unknown as Iterable<T>, tags) :
    new GeneratorSeqImpl(source, generator, tags);
}

export class GeneratorSeqImpl<TSource = any, T = TSource> extends SeqBase<T> {
  constructor(
    protected readonly source: Iterable<TSource>,
    private generator: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>,
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

  // TaggedSeq
  get [SeqTags.$maxCount](): number {
    return this.source.length;
  }

  all(condition: Condition<T>): boolean {
    return this.every(condition);
  }

  any(condition?: Condition<T>): boolean {
    return condition ? this.source.some(condition) : this.source.length > 0;
  }

  at(index: number, fallback?: T): T | undefined {
    if (index < 0) index = this.source.length + index;
    if (index < 0 || index >= this.source.length) return fallback;
    return this.source[index] ?? fallback;
  }

  chunk(size: number): Seq<Seq<T>> {
    if (size < 1) return internalEmpty<Seq<T>>();
    const self = this;
    return this.generateForSource(this.source, function* chunk(source: T[]) {
      for (let skip = 0; skip < source.length; skip += size) {
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
    return items.length ? items[items.length - 1] : fallback;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    return fromIndex == null ?
      this.source.lastIndexOf(itemToFind) :
      this.source.lastIndexOf(itemToFind, fromIndex);
  }

  reverse(): Seq<T> {
    if (this.source.length === 0) return this;

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
    if (start < 0) start += this.source.length;
    if (start < 0) start = 0;
    if (end < 0) end += this.source.length;
    if (end < 0) end = 0;
    else if (end > this.source.length) end = this.source.length;

    if (end === 0 || end - start <= 0) return internalEmpty<T>();

    return this.generateForSource(this.source, function* slice(source: T[]) {
      for (let i = start; i < end; i++) yield source[i];
    }, [[SeqTags.$notMappingItems, true]]);
  }

  skip(count: number): Seq<T> {
    if (count <= 0) return this;

    return this.generateForSource(this.source, function* skip(source: T[]) {
      for (let i = count; i < source.length; i++) yield source[i];
    }, [[SeqTags.$notMappingItems, true]]);
  }

  split(atIndex: number): [first: Seq<T>, second: Seq<T>] & { first: Seq<T>; second: Seq<T>; };

  split(condition: Condition<T>): [first: Seq<T>, second: Seq<T>] & { first: Seq<T>; second: Seq<T>; };

  split(atIndexOrCondition: number | Condition<T>): [Seq<T>, Seq<T>] & { first: Seq<T>; second: Seq<T>; } {
    let result: any = [];
    if (typeof atIndexOrCondition !== 'number') result = super.split(atIndexOrCondition);
    else if (atIndexOrCondition > 0) result = [this.take(atIndexOrCondition), this.skip(atIndexOrCondition)];
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

  take(count: number): Seq<T> {
    if (count >= this.source.length) return this;
    return super.take(count);
  }

  takeLast(count: number): Seq<T> {
    if (count > this.source.length) return this;

    return this.generateForSource(this.source, function* takeLast(source: T[]) {
      const startIndex = source.length - count;
      for (let i = startIndex; i < source.length; i++) yield source[i];
    }, [[SeqTags.$notMappingItems, true]]);
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
    return SeqTags.isSeq(this.source) ?
      this.source.isEmpty() :
      super.isEmpty();
  }

  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this.source;
  }
}
