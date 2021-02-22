import {EMPTY_ARRAY, Gen} from './common'

import {CachedSeq, Condition, factories, Selector, Seq} from './seq'
import {SeqBase} from "./seq-base";

export class SeqImpl<T = any> extends SeqBase<T> {
  constructor(protected readonly items: Iterable<T> = EMPTY_ARRAY) {
    super();
  }

  static create<T>(items: Iterable<T> = []): SeqImpl<T> {
    return new SeqImpl(items);
  }

  at(index: number, fallback?: T): T | undefined {
    if (Array.isArray(this.items)) {
      if (index < 0) index = this.items.length + index;
      if (index < 0) return fallback;
      return this.items[index] ?? fallback;
    }
    return super.at(index, fallback);
  }

  cache(now?: boolean): CachedSeq<T> {
    // Using this.items instead of this, is potentially more optimized in case this.items is an array
    // Since the CachedSeq take advantage of that. while using this as the source, is Generator function *[Symbol.iterator]().
    // (Alternatively, could override function *[Symbol.iterator]() and return this.items as is in case it's array)
    return factories.CachedSeq(this.items, now);
  }

  count(condition: Condition<T> = () => true): number {
    if(!condition && Array.isArray(this.items)) return this.items.length;
    return super.count(condition);
  }

  hasAtLeast(count: number): boolean {
    if (count <= 0) throw new RangeError('count must be positive');
    if (Array.isArray(this.items)) return this.items.length >= count;
    return super.hasAtLeast(count);
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    if (Array.isArray(this.items)) {
      return this.items.includes(itemToFind, fromIndex);
    }
    return super.includes(itemToFind, fromIndex);
  }

  indexOf(itemToFind: T, fromIndex: number = 0): number {
    if (Array.isArray(this.items)) {
      return this.items.indexOf(itemToFind, fromIndex);
    }
    return super.indexOf(itemToFind, fromIndex);
  }

  last(): T | undefined;

  last(fallback: T): T;
  last(fallback?: T): T | undefined {
    const items = this.items;
    if (Array.isArray(items)) return items[items.length - 1] ?? fallback;
    return super.last();
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    if (Array.isArray(this.items)) return fromIndex == null ?
      this.items.lastIndexOf(itemToFind) :
      this.items.lastIndexOf(itemToFind, fromIndex);
    return super.lastIndexOf(itemToFind, fromIndex);
  }

  sameItems<K>(second: Iterable<T>, keySelector?: Selector<T, K>): boolean {
    if (Array.isArray(this.items) && Array.isArray(second) && this.items.length !== second.length) return false;
    return super.sameItems(second, keySelector);
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean): boolean {
    if (Array.isArray(this.items) && Array.isArray(second) && this.items.length !== second.length) return false;
    return super.sameOrderedItems(second, equals);
  }

  skip(count: number): Seq<T> {
    if (Array.isArray(this.items)) return factories.Seq<T>(this.items.slice(count));
    return super.skip(count);
  }

  slice(start: number, end: number): Seq<T> {
    if (Array.isArray(this.items)) {
      return factories.Seq<T>(this.items.slice(start, end));
    }
    return super.slice(start, end);
  }

  startsWith<K>(items: Iterable<T>, keySelector: Selector<T, K> = t => t as unknown as K): boolean {
    if (Array.isArray(this.items) && Array.isArray(items)) {
      if (items.length === 0) return true;
      if (this.items.length < items.length) return false;
    }
    return super.startsWith(items, keySelector);
  }

  take(count: number): Seq<T> {
    if (Array.isArray(this.items)) return factories.Seq<T>(this.items.slice(0, count));
    return super.take(count);
  }

  protected findFirstByConditionInternal(fromIndex: number, condition: Condition<T>, fallback?: T): [number, T | undefined] {
    if (Array.isArray(this.items)) {
      if (fromIndex >= this.items.length) return [-1, fallback];
      for (let index = fromIndex; index < this.items.length; index++) {
        const item = this.items[index];
        if (condition(item, index)) return [index, item];
      }
    }

    return super.findFirstByConditionInternal(fromIndex, condition, fallback);
  }

  protected findLastByConditionInternal(tillIndex: number, condition: Condition<T>, fallback?: T): [number, (T | undefined)] {
    if (Array.isArray(this.items)) {
      const array = this.items;
      if (tillIndex < 0 || array.length === 0) return [-1, fallback];
      if (Number.isNaN(tillIndex) || tillIndex >= array.length) tillIndex = array.length - 1;
      for (let index = tillIndex; index >= 0; index--) {
        const item = array[index];
        if (condition(item, index)) return [index, item];
      }
    }
    return super.findLastByConditionInternal(tillIndex, condition, fallback);
  }

  protected generate<U>(generator: (items: Iterable<T>) => Generator<U>): Seq<U> {
    return factories.Seq<U>(new Gen(this.items, generator));
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + ((Array.isArray(this.items)) ? this.items : [...this]).join(separator) + end;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}




