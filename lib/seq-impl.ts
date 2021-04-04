import {CloseableIterator, EMPTY_ARRAY, IterationContext, SeqTags, TaggedSeq} from './common'

import {Condition, Selector, Seq} from './seq'
import {SeqBase} from "./seq-base";

export function createSeq<TSource = any, T = TSource>(
  source: Iterable<TSource> = EMPTY_ARRAY as unknown as TSource[],
  generator?: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>,
  tags?: readonly [symbol, any][]): SeqBase<T> {

  return !generator ?
    Array.isArray(source) ?
      new ArraySeqImpl<T>(source) :
      new IterableSeqImpl(source as unknown as Iterable<T>) :
    new GeneratorSeqImpl(source, generator, tags);
}

export class GeneratorSeqImpl<TSource = any, T = TSource> extends SeqBase<T> implements TaggedSeq {
  readonly [SeqTags.$seq] = true;

  constructor(
    protected readonly source: Iterable<TSource>,
    private generator: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>,
    tags: readonly [symbol, any][] = EMPTY_ARRAY) {

    super();

    tags.forEach(([tag, value]) => (this as any)[tag] = value);
  }

  // TaggedSeq
  get [SeqTags.$sourceIsArray](): boolean {
    return Array.isArray(this.source);
  }


  any(condition?: Condition<T>): boolean {
    return super.anyOptimized(this.source, condition);
  }

  count(condition: Condition<T> = () => true): number {
    return super.countOptimized(this.source, condition);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastOptimized(this.source, count);
  }

  [Symbol.iterator](): Iterator<T> {
    return new CloseableIterator<TSource, T>(this.source, this.generator);
  }

}

export class ArraySeqImpl<T = any> extends SeqBase<T> implements TaggedSeq {
  readonly [SeqTags.$seq] = true;
  readonly [SeqTags.$sourceIsArray] = true;
  readonly [SeqTags.$notAffectingNumberOfItems] = true;
  readonly [SeqTags.$notMapItems] = true;

  constructor(protected readonly source: readonly T[] = EMPTY_ARRAY) {
    super();
  }

  // TaggedSeq
  get [SeqTags.$maxCount](): number {
    return this.source.length;
  }

  any(condition?: Condition<T>): boolean {
    return super.anyOptimized(this.source, condition);
  }

  at(index: number, fallback?: T): T | undefined {
    if (index < 0) index = this.source.length + index;
    if (index < 0 || index >= this.source.length) return fallback;
    return this.source[index] ?? fallback;
  }

  count(condition: Condition<T> = () => true): number {
    return this.countOptimized(this.source, condition);
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

  last(): T | undefined;

  last(fallback: T): T;

  last(fallback?: T): T | undefined {
    const items = this.source;
    return items[items.length - 1] ?? fallback;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    return fromIndex == null ?
      this.source.lastIndexOf(itemToFind) :
      this.source.lastIndexOf(itemToFind, fromIndex);
  }

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K> = t => t as unknown as K, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): boolean {
    if (Array.isArray(second) && this.source.length !== second.length) return false;
    return super.sameItems(second, firstKeySelector, secondKeySelector);
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean): boolean {
    if (Array.isArray(second) && this.source.length !== second.length) return false;
    return super.sameOrderedItems(second, equals);
  }


  startsWith<K>(items: Iterable<T>, keySelector: (item: T) => K = t => t as unknown as K): boolean {
    if (Array.isArray(items)) {
      if (items.length === 0) return true;
      if (this.source.length < items.length) return false;
    }
    return super.startsWith(items, keySelector);
  }


  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this.source;
  }

  protected findFirstByConditionInternal(fromIndex: number, condition: Condition<T>, fallback?: T): [number, T | undefined] {
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
  readonly [SeqTags.$seq] = true;
  readonly [SeqTags.$notAffectingNumberOfItems] = true;
  readonly [SeqTags.$notMapItems] = true;

  constructor(
    protected readonly source: Iterable<T>,
    tags: readonly [symbol, any][] = EMPTY_ARRAY) {

    super();

    tags.forEach(([tag, value]) => (this as any)[tag] = value);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this.source;
  }

}
