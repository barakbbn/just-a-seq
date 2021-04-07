import {IterationContext} from "./common";

export type Class<T = any> = new (...args: any) => T;
export type Condition<T> = (x: T, index: number) => unknown;

export type Selector<T, U> = (x: T, index: number) => U;

export type Comparer<T> = (a: T, b: T) => number;
export type ComparableType = string | number | boolean | undefined | null;
export type ToComparableKey<T> = (x: T) => ComparableType;
export type MapHierarchy<Ks extends any[], T> = Ks extends [infer K1, ...infer KRest] ? Map<K1, KRest extends [infer K2, ...any[]] ? MapHierarchy<KRest, T> : T[]> : never;
export type Iterables<Ts extends any[]> = { [k in keyof Ts]: Iterable<Ts[k]> }

// Based on Typescript lib FlatArray
export type FlatSeq<Arr, Depth extends number> = {
  "done": Arr,
  "recur": Arr extends Iterable<infer InnerArr>
    ? FlatSeq<InnerArr, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][Depth]>
    : Arr
}[Depth extends 0 ? "done" : "recur"];

export interface Seq<T> extends Iterable<T> {
  // same as every
  all(condition: Condition<T>): boolean; // C#

  // same as some()
  any(condition?: Condition<T>): boolean; // C#

  append(...items: T[]): Seq<T>;

  as<U>(): Seq<U>; //Cast

  asSeq(): Seq<T>; // Wrap in basic Seq implementation

  at(index: number, fallback?: T): T | undefined; //item at index

  average(): T extends number ? number : never; // Overload

  average(selector: Selector<T, number>): number;

  cache(now?: boolean): CachedSeq<T>; // remember, cache, checkpoint, snapshot, persist, save, materialize, execute, evaluate

  chunk(count: number): Seq<Seq<T>>;

  concat(...items: Iterable<T>[]): Seq<T>;

  // Behaves same as Array.concat including the quirks
  concat$(...items: (T | Iterable<T>)[]): Seq<T>;

  consume(): void;

  count(condition?: Condition<T>): number;

  diff<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T>;

  diffDistinct<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T>;

  distinct<K = T>(keySelector?: Selector<T, K>): Seq<T>;

  endsWith<K>(items: Iterable<T>, keySelector?: (item: T) => K): boolean;

  entries(): Seq<[number, T]>;

  every(condition: Condition<T>): boolean;

  // It seems the order of the overloads affects Typescript recognizing the right signature
  filter<S extends T>(typeGuard: (item: T, index: number) => item is S, thisArg?: any): Seq<S>;

  filter(condition: Condition<T>): Seq<T>;

  find(condition: Condition<T>, fallback?: T | undefined): T | undefined; // Overload

  find(fromIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findIndex(condition: Condition<T>): number; // Overload

  findIndex(fromIndex: number, condition: Condition<T>): number;

  findLast(condition: Condition<T>, fallback?: T): T | undefined; // Overload

  findLast(tillIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findLastIndex(condition: Condition<T>): number;  // Overload

  findLastIndex(tillIndex: number, condition: Condition<T>): number;

  first(defaultIfEmpty?: T): T | undefined;

  firstAndRest(defaultIfEmpty?: T): [T, Seq<T>];

  flat<D extends number>(depth?: D): Seq<FlatSeq<T, D>>;

  flatMap<U, R = U>(selector: Selector<T, Iterable<U>>, mapResult?: (subItem: U, parent: T, index: number) => R): Seq<R>;  // JS2019, Scala (extra C#)

  forEach(callback: (value: T, index: number, breakLoop: object) => void, thisArg?: any): void;

  groupBy<K>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>): SeqOfGroups<K, T>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>, valueSelector?: Selector<T, U>): SeqOfGroups<K, U>;

  groupJoin<I, K>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>): SeqOfGroups<T, I>;

  groupJoinRight<I, K>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>): SeqOfGroups<I, T>;

  hasAtLeast(count: number): boolean;

  ifEmpty(value: T): Seq<T>; // Overload
  ifEmpty({useSequence}: { useSequence: Iterable<T>; }): Seq<T>; // Overload
  ifEmpty({useFactory}: { useFactory: () => T; }): Seq<T>;

  includes(itemToFind: T, fromIndex?: number): boolean;

  includesAll<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean; // Overload
  includesAll<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  includesAny<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean; // Overload
  includesAny<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  includesSubSequence<K>(subSequence: Iterable<T>, keySelector?: (item: T) => K): boolean; // Overload
  includesSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: (item: T) => K): boolean;

  indexOf(item: T, fromIndex?: number): number;

  indexOfSubSequence<K>(subSequence: Iterable<T>, keySelector?: (item: T) => K): number; // Overload
  indexOfSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: (item: T) => K): number;

  innerJoin<I, K, R = { outer: T; inner: I }>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>, resultSelector?: (outer: T, inner: I) => R): Seq<R>;

  insert(atIndex: number, ...items: Iterable<T>[]): Seq<T>;  // Overload

  insertAfter(condition: Condition<T>, ...items: Iterable<T>[]): Seq<T>;  // Overload

  insertBefore(condition: Condition<T>, ...items: Iterable<T>[]): Seq<T>;  // Overload

  intersect<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T>;

  // Intersperses a value (separator) between the items in the source sequence
  // Like join(), but return a sequence instead of string
  intersperse(separator: T, insideOut?: boolean): Seq<T>;

  intersperse<U>(separator: U, insideOut?: boolean): Seq<T | U>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: { prefix?: TPrefix; suffix?: TSuffix }): Seq<TPrefix | T | U | TSuffix>;

  isEmpty(): boolean;

  join(separator?: string): string; // Overload
  join(opts: { start?: string; separator?: string, end?: string; }): string;

  last(): T | undefined; // Overload
  last(fallback: T): T;

  lastIndexOf(itemToFind: T, fromIndex?: number): number;

  length(): number;

  map<U = T>(mapFn: Selector<T, U>): Seq<U>;

  max(): T extends number ? number : never; // Overload
  max(selector: Selector<T, number>): number;

  min(): T extends number ? number : never; // Overload
  min(selector: Selector<T, number>): number;

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

  // orderBy<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  // orderByDescending<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  prepend(...items: Iterable<T>[]): Seq<T>;

  push(...items: T[]): Seq<T>;

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T; // Overload
  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T; // Overload
  reduce<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T; // Overload
  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T; // Overload
  reduceRight<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  remove<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T>;

  removeAll<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T>;

  removeFalsy(): Seq<T>;

  removeNulls(): Seq<T>;

  repeat(count: number): Seq<T>;

  reverse(): Seq<T>;

  sameItems<K>(second: Iterable<T>, keySelector?: (item: T) => K): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  sameOrderedItems<U = T>(second: Iterable<U>, equals?: (first: T, second: U, index: number) => boolean): boolean;

  skip(count: number): Seq<T>;

  skipFirst(): Seq<T>;

  skipLast(count?: number): Seq<T>;

  skipWhile(condition: Condition<T>): Seq<T>;

  slice(start: number, end: number): Seq<T>;

  some(condition?: Condition<T>): boolean;

  // Behaves like Array.sort, which unless comparer specified, perform toString for comparing items
  // So try to avoid it. prefer using sorted() or orderBy()
  sort(comparer?: Comparer<T>): Seq<T>;

  sortBy<U = T>(valueSelector: (item: T) => U, reverse?: boolean): SortedSeq<T>;

  sorted(reverse?: boolean): Seq<T>;

  split(atIndex: number): [Seq<T>, Seq<T>]; // Overload
  split(condition: Condition<T>): [Seq<T>, Seq<T>];

  startsWith<K>(items: Iterable<T>, keySelector?: (item: T) => K): boolean;

  sum(): T extends number ? number : never; // Overload
  sum(selector: Selector<T, number>): number;

  take(count: number): Seq<T>; // negative count is like takeLast

  takeLast(count: number): Seq<T>

  takeOnly<K = T>(items: Iterable<T>, keySelector: (item: T) => K): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector?: Selector<U, K>): Seq<T>;

  takeWhile(condition: Condition<T>): Seq<T>;

  tap(callback: Selector<T, void>, thisArg?: any): Seq<T>;

  toArray(): T[];

  toMap<K, V = T>(keySelector: Selector<T, K>, valueSelector?: Selector<T, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  toSet<K>(keySelector?: Selector<T, K>): Set<T>;

  toString(separator?: string): string; // Overload
  toString(opts: { start?: string; separator?: string, end?: string; }): string;

  transform<U = T>(transformer: (seq: Seq<T>) => Seq<U>): Seq<U>;

  union<K>(second: Iterable<T>, keySelector?: (value: T) => K): Seq<T>;

  unshift(...items: T[]): Seq<T>;

  zip<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts>): Seq<[T, T1, ...Ts]>;

  zipAll<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts> | [...Iterables<Ts>, { defaults?: [T?, T1?, ...Ts] }]): Seq<[T, T1, ...Ts]>;

  zipWithIndex<U = T>(): Seq<[T, number]>;
}

export interface SortedSeq<T> extends Seq<T> {
  tap(callback: Selector<T, void>, thisArg?: any): SortedSeq<T>;

  // thenBy<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  // thenByDescending<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  thenSortBy<U>(valueSelector: (item: T) => U, reverse?: boolean): SortedSeq<T>;
}

export interface CachedSeq<T> extends Seq<T> {
  readonly array: ReadonlyArray<T>;

  tap(callback: Selector<T, void>, thisArg?: any): CachedSeq<T>;
}

export interface IHaveKey<K> {
  readonly key: K;
}

export interface GroupedSeq<K, T> extends Seq<T>, IHaveKey<K> {

  tap(callback: Selector<T, void>, thisArg?: any): GroupedSeq<K, T>;

  map<U>(mapFn: Selector<T, U>): GroupedSeq<K, U>;
}

export interface SeqOfGroups<K, T> extends Seq<GroupedSeq<K, T>> {
  tap(callback: Selector<GroupedSeq<K, T>, void>, thisArg?: any): this;

  mapInGroup<U>(mapFn: Selector<T, U>): SeqOfGroups<K, U>;

  thenGroupBy<K2>(keySelector?: Selector<T, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[K, K2], T>;

  toMap<K, V>(keySelector: Selector<GroupedSeq<K, T>, K>, valueSelector?: Selector<GroupedSeq<K, T>, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  toMap(): MapHierarchy<[K], T>;

  cache(): this & CachedSeq<GroupedSeq<K, T>>
}

export interface MultiGroupedSeq<Ks extends any[], T> extends Seq<SubGroupedSeq<Ks, T>> {
  readonly key: Ks[0];
}

export interface SeqOfMultiGroups<Ks extends any[], T> extends Seq<MultiGroupedSeq<Ks, T>> {
  tap(callback: Selector<MultiGroupedSeq<Ks, T>, void>, thisArg?: any): this;

  mapInGroup<U>(mapFn: Selector<T, U>): SeqOfMultiGroups<Ks, U>;

  thenGroupBy<K2>(keySelector?: Selector<T, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[...Ks, K2], T>;

  toMap(): MapHierarchy<Ks, T>;

  toMap<K, V>(keySelector: Selector<MultiGroupedSeq<Ks, T>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, T>, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  cache(): this & CachedSeq<MultiGroupedSeq<Ks, T>>
}

export type SubGroupedSeq<Ks extends any[], T> = Ks extends [infer K1, infer K2, infer K3, ...infer KRest]
  ? MultiGroupedSeq<[K2, K3, ...KRest], T>
  : GroupedSeq<Ks[1], T>;

export interface SeqFactory {
  <T, U = T, TSeq extends Iterable<T> = Iterable<T>>(
    source?: Iterable<T>,
    generator?: (source: TSeq, iterationContext: IterationContext) => Iterator<U>,
    tags?: readonly [symbol, any][]): Seq<U>;
}

export interface CachedSeqFactory {
  <T>(source: Iterable<T>, now?: boolean): CachedSeq<T>;
}

export interface SortedSeqFactory {
  <T, K = T>(items: Iterable<T>,
             keySelector?: (x: T) => K,
             comparer?: Comparer<K>,
             descending?: boolean): SortedSeq<T>;
}

export interface GroupedSeqFactory {
  <K, T>(key: K, items: Iterable<T>): GroupedSeq<K, T>;
}

export interface SeqOfGroupsFactory {
  <K, T = K, U = T>(source: Iterable<T>,
                    keySelector?: Selector<T, K>,
                    toComparableKey?: ToComparableKey<K>,
                    valueSelector?: Selector<T, U>): SeqOfGroups<K, U>
}

export const factories: {
  Seq: SeqFactory;
  CachedSeq: CachedSeqFactory;
  SortedSeq: SortedSeqFactory;
  GroupedSeq: GroupedSeqFactory;
  SeqOfGroups: SeqOfGroupsFactory;
} = <any>{};
