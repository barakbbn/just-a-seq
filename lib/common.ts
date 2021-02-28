import {ComparableType, Selector, ToComparableKey} from "./seq";

export class Gen<T, U = T> implements Iterable<U> {
  constructor(private seq: Iterable<T>, private generator: (seq: Iterable<T>) => Generator<U>) {
  }

  [Symbol.iterator](): Iterator<U> {
    return this.generator(this.seq);
  }
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

export function mapAsArray<T, K = T>(items: Iterable<T>, mapFn?: Selector<T, K>): K[] {
  if (!mapFn && Array.isArray(items)) return items;
  return Array.from(items, mapFn as Selector<T, K>);
}

export function sameValueZero(a: any, b: any): boolean {
  return Number.isNaN(a) && Number.isNaN(b) || a === b;
}

export function* tapIterable<T>(items: Iterable<T>, callback: (item: T, index: number) => void, thisArg?: any): Generator<T> {
  if (thisArg) callback = callback.bind(thisArg);
  for (const {value, index} of entries(items)) {
    callback(value, index);
    yield value;
  }
}

export function tapGenerator<T>(items: Iterable<T>, callback: (item: T, index: number) => void, thisArg?: any): Iterable<T> {
  return {
    [Symbol.iterator]() {
      return tapIterable(items, callback, thisArg);
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


export function groupItems<K, T, V = T>(items: Iterable<T>,
                                        keySelector?: Selector<T, K>,
                                        toComparableKey?: ToComparableKey<K>,
                                        valueSelector: Selector<T, V> = x => x as unknown as V): Map<ComparableType, { key: K, items: V[] }> {
  const map = new Map<ComparableType, { key: K, items: V[] }>();
  let index = 0;
  for (const item of items) {
    const key: K = keySelector?.(item, index++) ?? item as unknown as K;
    const comparableKey = toComparableKey?.(key) ?? key as unknown as ComparableType;
    let group = map.get(comparableKey) ?? {key, items: <V[]>[]};
    if (!group.items.length) map.set(comparableKey, group);
    group.items.push(valueSelector(item, index));
  }
  return map;
}

export function consume(iterable: Iterable<any>): void {
  for (const _ of iterable) {
  }
}

export const IGNORED_ITEM: any = {};
export const LEGACY_COMPARER: any = {};
export const DONT_COMPARE: any = {};
export const EMPTY_ARRAY: any[] = []
