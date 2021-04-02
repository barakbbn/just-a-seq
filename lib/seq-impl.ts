import {CloseableIterator, EMPTY_ARRAY, IterationContext, SeqTags, TaggedSeq} from './common'

import {Condition, Selector} from './seq'
import {SeqBase} from "./seq-base";

export class SeqImpl<TSource = any, T = TSource> extends SeqBase<T> implements TaggedSeq {
  readonly [SeqTags.$seq] = true;

  constructor(
    protected readonly source: Iterable<TSource> = EMPTY_ARRAY,
    private generator?: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>,
    tags: readonly [symbol, any][] = EMPTY_ARRAY) {

    super();

    const tagged = this as TaggedSeq;
    if (!generator) {
      tagged[SeqTags.$notAffectingNumberOfItems] = true;
      tagged[SeqTags.$notMapItems] = true;
    }

    tags.forEach(([tag, value]) => (this as any)[tag] = value);
  }

  static create<TSource = any, T = TSource>(
    source: Iterable<TSource> = EMPTY_ARRAY,
    generator?: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>,
    tags?: readonly [symbol, any][]): SeqImpl<TSource, T> {

    return new SeqImpl(source, generator, tags);
  }

  // TaggedSeq
  get [SeqTags.$sourceIsArray](): boolean {
    return Array.isArray(this.source);
  }


  any(condition?: Condition<T>): boolean {
    return super.anyOptimized(this.source, condition);
  }

  at(index: number, fallback?: T): T | undefined {
    if (Array.isArray(this.source) && !this.generator) {
      if (index < 0) index = this.source.length + index;
      if (index < 0 || index >= this.source.length) return fallback;
      return this.source[index] ?? fallback;
    }
    return super.at(index, fallback);
  }

  count(condition: Condition<T> = () => true): number {
    return super.countOptimized(this.source, condition);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastOptimized(this.source, count);
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    if (Array.isArray(this.source) && !this.generator) {
      return this.source.includes(itemToFind, fromIndex);
    }
    return super.includes(itemToFind, fromIndex);
  }

  indexOf(itemToFind: T, fromIndex: number = 0): number {
    if (Array.isArray(this.source) && !this.generator) {
      return this.source.indexOf(itemToFind, fromIndex);
    }
    return super.indexOf(itemToFind, fromIndex);
  }

  last(): T | undefined;

  last(fallback: T): T;

  last(fallback?: T): T | undefined {
    const items = this.source;
    if (Array.isArray(items) && !this.generator) return items[items.length - 1] ?? fallback;
    return super.last();
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    if (Array.isArray(this.source) && !this.generator) return fromIndex == null ?
      this.source.lastIndexOf(itemToFind) :
      this.source.lastIndexOf(itemToFind, fromIndex);
    return super.lastIndexOf(itemToFind, fromIndex);
  }

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K> = t => t as unknown as K, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): boolean {
    if (Array.isArray(this.source) && !this.generator && Array.isArray(second) && this.source.length !== second.length) return false;
    return super.sameItems(second, firstKeySelector, secondKeySelector);
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean): boolean {
    if (Array.isArray(this.source) && !this.generator && Array.isArray(second) && this.source.length !== second.length) return false;
    return super.sameOrderedItems(second, equals);
  }


  startsWith<K>(items: Iterable<T>, keySelector: (item: T) => K = t => t as unknown as K): boolean {
    if (Array.isArray(this.source) && !this.generator && Array.isArray(items)) {
      if (items.length === 0) return true;
      if (this.source.length < items.length) return false;
    }
    return super.startsWith(items, keySelector);
  }


  [Symbol.iterator](): Iterator<T> {
    if (this.generator) return new CloseableIterator<TSource, T>(this.source, this.generator);
    return this.source[Symbol.iterator]() as unknown as Iterator<T>;
  }

  protected findFirstByConditionInternal(fromIndex: number, condition: Condition<T>, fallback?: T): [number, T | undefined] {
    if (Array.isArray(this.source) && !this.generator) {
      if (fromIndex >= this.source.length) return [-1, fallback];
      for (let index = fromIndex; index < this.source.length; index++) {
        const item = this.source[index];
        if (condition(item, index)) return [index, item];
      }
    }

    return super.findFirstByConditionInternal(fromIndex, condition, fallback);
  }

  protected findLastByConditionInternal(tillIndex: number, condition: Condition<T>, fallback?: T): [number, (T | undefined)] {
    if (Array.isArray(this.source) && !this.generator) {
      const array = this.source;
      if (tillIndex < 0 || array.length === 0) return [-1, fallback];
      if (Number.isNaN(tillIndex) || tillIndex >= array.length) tillIndex = array.length - 1;
      for (let index = tillIndex; index >= 0; index--) {
        const item = array[index];
        if (condition(item, index)) return [index, item];
      }
    }
    return super.findLastByConditionInternal(tillIndex, condition, fallback);
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + ((Array.isArray(this.source) && !this.generator) ? this.source : [...this]).join(separator) + end;
  }

  protected getSource(): Iterable<T> {
    return this.generator?this:this.source as unknown as Iterable<T>;
  }
}




