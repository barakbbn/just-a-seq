import {IterationContext} from "./common";

export type Class<T = any> = new (...args: any) => T;
export type Condition<T> = (x: T, index: number) => unknown;

export type Selector<T, U> = (x: T, index: number) => U;

export type Comparer<T> = (a: T, b: T) => number;
export type ComparableType = string | number | boolean | undefined | null;
export type ToComparableKey<T> = (x: T) => ComparableType;
export type MapHierarchy<Ks extends any[], T> = Ks extends [infer K1, ...infer KRest]? Map<K1, KRest extends [infer K2, ...any[]]? MapHierarchy<KRest, T>: T[]>: never;

export type ObjectHierarchy<Ks extends any[], T> =
  Ks extends [infer K1, ...infer KRest]?
    { [key in K1 extends keyof any? K1: never]?: KRest extends [infer K2, ...any[]]? ObjectHierarchy<KRest, T>: T }
    : never;


export type Iterables<Ts extends any[]> = { [k in keyof Ts]: Iterable<Ts[k]> }

// Based on Typescript lib FlatArray
export type FlatSeq<Arr, Depth extends number> = {
  "done": Arr,
  "recur": Arr extends Iterable<infer InnerArr>
    ? FlatSeq<InnerArr, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][Depth]>
    : Arr
}[Depth extends 0? "done": "recur"];

export interface Seq<T> extends Iterable<T> {
  // same as every
  all(condition: Condition<T>): boolean;

  // same as some()
  any(condition?: Condition<T>): boolean;

  append(...items: T[]): Seq<T>;

  as<U>(): Seq<U>;

  asSeq(): Seq<T>; // Wrap in basic Seq implementation

  at(index: number, fallback?: T): T | undefined;

  average(): T extends number? number: never;

  average(selector: Selector<T, number>): number;

  cache(now?: boolean): CachedSeq<T>;

  chunk(size: number, maxChunks?: number): Seq<Seq<T>>;

  chunkBy<U>(
    splitLogic: (info: {
      item: T;
      index: number;
      itemNumber: number;
      chunkNumber: number;
      userData?: U;
    }) => {
      endOfChunk?: boolean;
      isLastChunk?: boolean;
      whatAboutTheItem?: 'KeepIt' | 'SkipIt' | 'MoveToNextChunk';
      userData?: U;
    },
    shouldStartNewChunk?: (info: {
      chunkNumber: number;
      processedItemsCount: number;
      userData?: U;
    }) => boolean
  ): Seq<CachedSeq<T>>;

  chunkByLimit(limit: number, opts?: { maxItemsInChunk?: number; maxChunks?: number; }): T extends number? Seq<Seq<T>>: never;

  chunkByLimit(limit: number, selector: (item: T, index: number, itemNumber: number) => number, opts?: { maxItemsInChunk?: number; maxChunks?: number; }): Seq<Seq<T>>;

  concat(...items: Iterable<T>[]): Seq<T>;

  // Behaves same as Array.concat including the quirks
  concat$(...items: (T | Iterable<T>)[]): Seq<T>;

  consume(): void;

  count(condition?: Condition<T>): number;

  diff(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  diff<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): Seq<T | U>;

  diff<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): Seq<T | U>;

  diffDistinct(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  distinct(keySelector?: Selector<T, unknown>): Seq<T>;

  endsWith(items: Iterable<T>, keySelector?: (item: T) => unknown): boolean;

  endsWith<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): boolean;

  endsWith<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  endsWith<U = T>(items: Iterable<U>, {equals}: { equals(t: T, u: U): unknown; }): boolean;

  entries(): Seq<[index: number, value: T]>;

  every(condition: Condition<T>): boolean;

  // It seems the order of the overloads affects Typescript recognizing the right signature
  filter<S extends T>(typeGuard: (item: T, index: number) => item is S): Seq<S>;

  filter(condition: Condition<T>): Seq<T>;

  find<S extends T>(typeGuard: (item: T, index: number) => item is S): S | undefined;

  find<S extends T>(fromIndex: number, typeGuard: (item: T, index: number) => item is S, fallback?: S | undefined): S | undefined;

  find(condition: Condition<T>, fallback?: T | undefined): T | undefined; // Overload

  find(fromIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findIndex(condition: Condition<T>): number; // Overload

  findIndex(fromIndex: number, condition: Condition<T>): number;

  findLast<S extends T>(typeGuard: (item: T, index: number) => item is S): S | undefined;

  findLast<S extends T>(tillIndex: number, typeGuard: (item: T, index: number) => item is S, fallback?: S | undefined): S | undefined;

  findLast(condition: Condition<T>, fallback?: T): T | undefined; // Overload

  findLast(tillIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findLastIndex(condition: Condition<T>): number;  // Overload

  findLastIndex(tillIndex: number, condition: Condition<T>): number;

  first(): T | undefined;

  first(defaultIfEmpty: T): T;

  firstAndRest(defaultIfEmpty?: T): [first: T, rest: Seq<T>] & { first: T; rest: Seq<T>; };

  flat<D extends number>(depth?: D): Seq<FlatSeq<T, D>>;

  flatMap<U, R = U>(selector: Selector<T, Iterable<U>>, mapResult?: (subItem: U, parent: T, index: number) => R): Seq<R>;  // JS2019, Scala (extra C#)

  flatHierarchy<V1, V2, TRes = V2>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    mapResult: (lastItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatHierarchy<V1, V2, V3, TRes = V3>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    mapResult: (lastItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatHierarchy<V1, V2, V3, V4, TRes = V4>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    mapResult: (lastItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatHierarchy<V1, V2, V3, V4, V5, TRes = V5>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    mapResult: (lastItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatHierarchy<V1, V2, V3, V4, V5, V6, TRes = V6>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    selector6: (subItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V6>,
    mapResult: (lastItem: V6, parent: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatHierarchy<V1, V2, V3, V4, V5, V6, V7, TRes = V7>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    selector6: (subItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V6>,
    selector7: (subItem: V6, parent: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V7>,
    mapResult: (lastItem: V7, parent: V6, ancestor5: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatHierarchy<V1, V2, V3, V4, V5, V6, V7, V8, TRes = V8>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    selector6: (subItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V6>,
    selector7: (subItem: V6, parent: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V7>,
    selector8: (subItem: V7, parent: V6, ancestor5: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V8>,
    mapResult: (lastItem: V8, parent: V7, ancestor6: V6, ancestor5: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  forEach(callback: (value: T, index: number, breakLoop: object) => unknown): void;

  groupBy<K>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>): SeqOfGroups<K, T>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey: undefined, valueSelector: (item: T, index: number, key: K) => U): SeqOfGroups<K, U>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey: ToComparableKey<K>, valueSelector: (item: T, index: number, key: K) => U): SeqOfGroups<K, U>;

  groupBy$<K extends object>(keySelector: Selector<T, K>): SeqOfGroups<K, T>;

  groupJoin<I, K>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>): SeqOfGroups<T, I>;

  groupJoinRight<I, K>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>): SeqOfGroups<I, T>;

  hasAtLeast(count: number): boolean;

  ifEmpty(value: T): Seq<T>; // Overload
  ifEmpty({useSequence}: { useSequence: Iterable<T>; }): Seq<T>; // Overload
  ifEmpty({useFactory}: { useFactory: () => T; }): Seq<T>;

  includes(itemToFind: T, fromIndex?: number): boolean;

  includesAll<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean; // Overload
  includesAll<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  includesAny<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean; // Overload
  includesAny<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  includesSubSequence<U = T>(subSequence: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean;

  includesSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, keySelector?: (item: T | U) => unknown): boolean;

  includesSubSequence<U = T>(subSequence: Iterable<U>, options?: { equals(a: T, b: U): unknown }): boolean; // Overload
  includesSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, options?: { equals(a: T, b: U): unknown }): boolean; // Overload

  indexOf(item: T, fromIndex?: number): number;

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, keySelector?: (item: T | U) => unknown): number;

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, keySelector?: (item: T | U) => unknown): number;

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, options?: { equals(a: T, b: U): unknown }): number; // Overload
  indexOfSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, options?: { equals(a: T, b: U): unknown }): number; // Overload

  innerJoin<I, K, R = { outer: T; inner: I }>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>, resultSelector?: (outer: T, inner: I) => R): Seq<R>;

  insert(atIndex: number, ...items: Iterable<T>[]): Seq<T>;  // Overload

  insertAfter(condition: Condition<T>, ...items: Iterable<T>[]): Seq<T>;  // Overload

  insertBefore(condition: Condition<T>, ...items: Iterable<T>[]): Seq<T>;  // Overload

  interleave(...others: Iterable<T>[]):Seq<T>;

  intersect(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  intersectBy<K>(keys: Iterable<K>, keySelector: Selector<T, K>): Seq<T>;

  intersectBy<K>(keys: ReadonlySet<K>, keySelector: Selector<T, K>): Seq<T>;

  intersectBy<K>(keys: ReadonlyMap<K, unknown>, keySelector: Selector<T, K>): Seq<T>;

  // Intersperses a value (separator) between the items in the source sequence
  // Like join(), but return a sequence instead of string
  intersperse(separator: T, insideOut?: boolean): Seq<T>;

  intersperse<U>(separator: U, insideOut?: boolean): Seq<T | U>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: { prefix?: TPrefix; suffix?: TSuffix }): Seq<TPrefix | T | U | TSuffix>;

  intersperseBy<U>(separatorFactory: (info: { prevItem: T; hasPervItem: boolean; prevItemIndex: number; nextItem: T; hasNextItem: boolean; isPrefixSeparator: boolean; isSuffixSeparator: boolean; }) => U, separatorAlignment?: 'Inner' | 'Outer' | 'Left' | 'Right'): Seq<T | U>;

  isEmpty(): boolean;

  join(separator?: string): string; // Overload
  join(opts: { start?: string; separator?: string, end?: string; }): string;

  last(): T | undefined; // Overload
  last(fallback: T): T;

  lastIndexOf(itemToFind: T, fromIndex?: number): number;

  length(): number;

  map<U = T>(mapFn: Selector<T, U>): Seq<U>;

  partition<S extends T>(typeGuard: (item: T, index: number) => item is S): [matched: CachedSeq<S>, unmatched: CachedSeq<T>] & { matched: CachedSeq<S>, unmatched: CachedSeq<T>; };

  partition<S extends T, U>(typeGuard: (item: T, index: number) => item is S, resultSelector: (matched: CachedSeq<S>, unmatched: CachedSeq<T>) => U): U

  partition(condition: Condition<T>): [matched: CachedSeq<T>, unmatched: CachedSeq<T>] & { matched: CachedSeq<T>, unmatched: CachedSeq<T> };

  partition<U>(condition: Condition<T>, resultSelector: (matched: CachedSeq<T>, unmatched: CachedSeq<T>) => U): U;

  partitionWhile(condition: Condition<T>): [first: Seq<T>, second: Seq<T>] & { first: Seq<T>; second: Seq<T>; };

  max(): T extends number? number: never; // Overload
  max(selector: Selector<T, number>): number;

  maxItem(selector: Selector<T, number>, options?: { findLast?: boolean; }): T | undefined;

  maxItem(options: { comparer: (a: T, b: T) => number; findLast?: boolean; }): T | undefined;

  min(): T extends number? number: never; // Overload
  min(selector: Selector<T, number>): number;

  minItem(selector: Selector<T, number>, options?: { findLast?: boolean; }): T | undefined;

  minItem({comparer}: { comparer: (a: T, b: T) => number; findLast?: boolean; }): T | undefined;

  ofType(type: 'number'): Seq<number>; // Overload
  ofType(type: 'string'): Seq<string>; // Overload
  ofType(type: 'boolean'): Seq<boolean>; // Overload
  ofType(type: 'function'): Seq<Function>; // Overload
  ofType(type: 'symbol'): Seq<symbol>; // Overload
  ofType(type: 'object'): Seq<object>; // Overload
  ofType(type: typeof Number): Seq<number>; // Overload
  ofType(type: typeof String): Seq<string>; // Overload
  ofType(type: typeof Boolean): Seq<boolean>; // Overload
  ofType(type: typeof Symbol): Seq<symbol>; // Overload
  ofType(type: typeof Object): Seq<object>; // Overload
  ofType<V extends Class>(type: V): Seq<InstanceType<V>>;

  prepend(...items: Iterable<T>[]): Seq<T>;

  push(...items: T[]): Seq<T>;

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T; // Overload
  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T; // Overload
  reduce<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T; // Overload
  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T; // Overload
  reduceRight<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  remove<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): Seq<T>;

  remove<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): Seq<T>;

  removeAll<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): Seq<T>;

  removeAll<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): Seq<T>;

  removeFalsy(): Seq<T>;

  removeKeys<K>(keys: Iterable<K>, keySelector: (item: T) => K): Seq<T>;

  removeKeys<K>(keys: ReadonlySet<K>, keySelector: (item: T) => K): Seq<T>;

  removeKeys<K>(keys: ReadonlyMap<K, unknown>, keySelector: (item: T) => K): Seq<T>;

  removeNulls(): Seq<T>;

  repeat(count: number): Seq<T>;

  reverse(): Seq<T>;

  sameItems<U = T>(second: Iterable<T>, keySelector?: (item: T | U) => unknown): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  sameOrderedItems<U = T>(second: Iterable<U>, equals?: (first: T, second: U, index: number) => boolean): boolean;

  skip(count: number): Seq<T>;

  skipFirst(): Seq<T>;

  skipLast(count?: number): Seq<T>;

  skipWhile(condition: Condition<T>): Seq<T>;

  slice(start: number, end: number): Seq<T>;

  some(condition?: Condition<T>): boolean;

  /**
   * Sort the sequence by converting items into strings and compares them.
   * (Same as Array.sort() method behaves).
   * @return Sorted sequence implementing SortedSeq interface
   * @desc
   * Avoid using this overload, and prefer the simplifies versions for sorting sorted(), sortBy()
   */
  sort(): Seq<T>;

  /**
   * Sort the sequence by using a comparer function.
   * @param comparer - Optional comparer function.
   * @return Sorted sequence implementing SortedSeq interface
   */
  sort(comparer: Comparer<T>, opts?: { stable?: boolean; }): Seq<T>;

  sort(comparer: Comparer<T>, top: number, opts?: { stable?: boolean; }): Seq<T>;

  sortBy(valueSelector: (item: T) => unknown, opts?: { stable?: boolean; }): SortedSeq<T>;

  sortBy(valueSelector: (item: T) => unknown, reverse: boolean, opts?: { stable?: boolean; }): SortedSeq<T>;

  sortBy(valueSelector: (item: T) => unknown, top: number, opts?: { stable?: boolean; }): SortedSeq<T>;

  sorted(opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;

  sorted(reverse: boolean, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;

  sorted(top: number, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;

  split(condition: Condition<T>, opts?: { keepSeparator?: 'LeftChunk' | 'SeparateChunk' | 'RightChunk'; maxChunks?: number }): Seq<Seq<T>>;

  splitAt(index: number): [first: Seq<T>, second: Seq<T>] & { first: Seq<T>; second: Seq<T>; };

  startsWith(items: Iterable<T>, keySelector?: (item: T) => unknown): boolean;

  startsWith<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): boolean;

  startsWith<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => unknown, secondKeySelector: (item: U) => K): boolean;

  startsWith<U = T>(items: Iterable<U>, {equals}: { equals(t: T, u: U): unknown; }): boolean;

  sum(): T extends number? number: never; // Overload
  sum(selector: Selector<T, number>): number;

  take(count: number): Seq<T>; // negative count is like takeLast

  takeLast(count: number): Seq<T>

  // Similar to intersect() by not distinct items, rather as they appear in second iterable
  takeOnly(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  takeOnly<U = T>(items: Iterable<U>, keySelector: (item: T | U) => unknown): Seq<T>;

  takeOnly<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): Seq<T>;

  takeWhile(condition: Condition<T>): Seq<T>;

  tap(callback: Selector<T, void>): Seq<T>;

  toArray(): T[];

  toMap<K, V = T>(keySelector: Selector<T, K>, valueSelector?: Selector<T, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  toMapOfOccurrences<K = T>(keySelector?: Selector<T, K>, toComparableKey?: ToComparableKey<K>): Map<K, number>;

  toSet<K>(keySelector?: Selector<T, K>): Set<T>;

  toString(): string;

  transform<U = T>(transformer: (seq: Seq<T>) => Seq<U>): Seq<U>;

  union(second: Iterable<T>, keySelector?: (value: T) => unknown): Seq<T>;

  unionRight(second: Iterable<T>, keySelector?: (value: T) => unknown): Seq<T>;

  unshift(...items: T[]): Seq<T>;

  zip<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts>): Seq<[T, T1, ...Ts]>;

  zipAll<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts> | [...Iterables<Ts>, { defaults?: [T?, T1?, ...Ts] }]): Seq<[T, T1, ...Ts]>;

  zipWithIndex(startIndex?: number): Seq<[value: T, index: number]>;
}

export namespace Seq {
  export let enableOptimization = false;
  export let stablePartialSoring = false;
}

export interface SortedSeq<T> extends Seq<T> {
  tap(callback: Selector<T, void>): SortedSeq<T>;

  thenSortBy(valueSelector: (item: T) => unknown, reverse?: boolean): SortedSeq<T>;
}

export interface CachedSeq<T> extends Seq<T> {
  readonly array: ReadonlyArray<T>;

  tap(callback: Selector<T, void>): CachedSeq<T>;
}

export interface IHaveKey<K> {
  readonly key: K;
}

export interface KeyedSeq<K, T> extends IHaveKey<K>, Seq<T> {
}

export interface GroupedSeq<K, T> extends KeyedSeq<K, T> {

  tap(callback: Selector<T, void>): GroupedSeq<K, T>;

  map<U>(mapFn: Selector<T, U>): GroupedSeq<K, U>;
}

export interface MultiGroupedSeq<Ks extends any[], T> extends KeyedSeq<Ks[0], SubGroupedSeq<Ks, T>> {
}

export interface SeqOfGroups<K, T> extends Seq<GroupedSeq<K, T>> {
  mapInGroup<U>(mapFn: (item: T, index: number, key: K) => U): SeqOfGroups<K, U>;

  thenGroupBy<K2>(keySelector: Selector<T, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[K, K2], T>;

  thenGroupBy$<K2 extends object>(keySelector: Selector<T, K2>): SeqOfMultiGroups<[K, K2], T>;

  toMap<K2, V>(keySelector: Selector<GroupedSeq<K, T>, K2>, valueSelector?: Selector<GroupedSeq<K, T>, V>, toComparableKey?: ToComparableKey<K2>): Map<K2, V>;

  toMap(): MapHierarchy<[key: K], T>;

  cache(): this & CachedSeq<GroupedSeq<K, T>>;

  toObject(): ObjectHierarchy<[K], T>;

  toObject(arrayed: true): ObjectHierarchy<[K], T[]>;
}

export interface SeqOfMultiGroups<Ks extends any[], T> extends Seq<MultiGroupedSeq<Ks, T>> {
  aggregate<U>(aggregator: (group: GroupedSeq<Last<Ks>, T>, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U): Seq<U>;

  aggregate<U = T>({reducer, initialValue}: {
    reducer: (previousValue: U,
              currentValue: T,
              currentIndex: number,
              group: GroupedSeq<Last<Ks>, T>,
              keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U;
    initialValue?: U;
  }): Seq<U>;

  mapInGroup<U>(mapFn: (item: T, index: number, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U): SeqOfMultiGroups<Ks, U>;

  thenGroupBy<K2>(keySelector: Selector<T, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[...Ks, K2], T>;

  thenGroupBy$<K2 extends object>(keySelector: Selector<T, K2>): SeqOfMultiGroups<[...Ks, K2], T>;

  toMap(): MapHierarchy<Ks, T>;

  toMap<K, V>(keySelector: Selector<MultiGroupedSeq<Ks, T>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, T>, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  cache(): this & CachedSeq<MultiGroupedSeq<Ks, T>>;

  toObject(): ObjectHierarchy<Ks, T>;

  toObject(arrayed: true): ObjectHierarchy<Ks, T[]>;

  ungroup<U>(aggregator: (group: GroupedSeq<Last<Ks>, T>, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U): SeqOfGroupsWithoutLast<Ks, U>;
}

export type SubGroupedSeq<Ks extends any[], T> = Ks extends [infer K1, infer K2, infer K3, ...infer KRest]
  ? MultiGroupedSeq<[K2, K3, ...KRest], T>
  : GroupedSeq<Ks[1], T>;

export type SeqOfGroupsWithoutLast<Ks extends any[], T> = Ks extends [...infer KRest, infer KLast]
  ? KRest extends [infer K1, infer K2, ...infer Rest]?
    SeqOfMultiGroups<[...KRest], T>:
    SeqOfGroups<Ks[0], T>
  : SeqOfGroups<Ks[0], T>;

export type Last<Ts extends any[]> = Ts extends [...infer Rest, infer Last]
  ? Last
  : Ts[0];

export type Headless<Ts extends any[]> = Ts extends [infer Head, ...infer Rest]? Rest: Ts;

export type Tailless<Ts extends any[]> = Ts extends [...infer Rest, infer Last]? Rest: Ts;

export type Reverse<T extends any[], R extends any[] = []> = ReturnType<T extends [infer F, ...infer L]? () => Reverse<L, [F, ...R]>: () => R>;

export interface SeqFactory {
  <T, U = T, TSeq extends Iterable<T> = Iterable<T>>(
    source?: Iterable<T>,
    generator?: (source: TSeq, iterationContext: IterationContext) => Iterator<U>,
    tags?: readonly [tag: symbol, value: any][]): Seq<U>;
}

export interface CachedSeqFactory {
  <T>(source: Iterable<T>, now?: boolean): CachedSeq<T>;
}

export interface SortedSeqFactory {
  <T, K = T>(items: Iterable<T>,
             keySelector?: (x: T) => K,
             comparer?: Comparer<K>,
             descending?: boolean,
             top?: number,
             opts?: { stable?: boolean; }): SortedSeq<T>;
}

export interface SeqOfGroupsFactory {
  <K, T = K, U = T>(source: Iterable<T>,
                    keySelector?: Selector<T, K>,
                    toComparableKey?: ToComparableKey<K>,
                    valueSelector?: (x: T, index: number, key: K) => U): SeqOfGroups<K, U>
}

export interface FilterMapSeqFactory {
  <T, U = T>(source: Iterable<T>, map: { map: Selector<T, U> }): Seq<U>;

  <T>(source: Iterable<T>, filter: { filter: Condition<T> }): Seq<T>;

  <T, S extends T>(source: Iterable<T>, filter: { filter: (item: T, index: number) => item is S }): Seq<S>;
}

export const factories: {
  readonly Seq: SeqFactory;
  readonly CachedSeq: CachedSeqFactory;
  readonly SortedSeq: SortedSeqFactory;
  readonly SeqOfGroups: SeqOfGroupsFactory;
  readonly FilterMapSeq: FilterMapSeqFactory;
} = <any>{};
