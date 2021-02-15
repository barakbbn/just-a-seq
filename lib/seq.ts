export type Class<T = any> = new (...args: any) => T;
export type ValidBool = boolean | string | number | symbol | object | null | undefined;
export type Condition<T> = (x: T, index: number) => ValidBool;

export type Selector<T, U> = (x: T, index: number) => U;

export type Comparer<T> = (a: T, b: T) => number;
export type ComparableType = string | number | boolean | undefined | null;
export type ToComparableKey<T> = (x: T) => ComparableType;
export type MapHierarchy<Ks extends any[], T> = Ks extends [infer K1, ...infer KRest] ? Map<K1, KRest extends [infer K2, ...any[]] ? MapHierarchy<KRest, T> : T[]> : never;
export type SkipFirst<Ks extends any[]> = Ks extends [infer Head, ...infer Tail] ? Tail extends any[] ? Tail : Head : never;
export type Iterables<Ts extends any[]> = { [k in keyof Ts]: Iterable<Ts[k]> }

export interface Seq<T> extends Iterable<T> {
  // same as every
  all(condition: Condition<T>): boolean; // C#

  // same as some
  any(condition?: Condition<T>): boolean; // C#

  as<U>(): Seq<U>; //Cast

  asSeq(): Seq<T>; // Wrap in basic Seq implementation

  at(index: number, fallback?: T): T | undefined; //item at index

  append(...items: T[]): Seq<T>;

  average(): T extends number ? number : never; // Overload

  average(selector: Selector<T, number>): number;

  cache(now?: boolean): CachedSeq<T>; // remember, cache, checkpoint, snapshot, persist, save, materialize, execute, evaluate

  chunk(count: number): Seq<Seq<T>>;

  concat(...items: Iterable<T>[]): Seq<T>;

  consume(): void;

  count(condition?: Condition<T>): number;

  diffDistinct<K>(items: Iterable<T>, keySelector?: Selector<T, K>): Seq<T>;

  diff<K = T>(items: Iterable<T>, keySelector?: Selector<T, K>): Seq<T>;

  distinct<K = T>(keySelector?: Selector<T, K>): Seq<T>;

  endsWith<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  // Array.entries()
  entries(): Seq<[number, T]>;

  every(condition: Condition<T>): boolean; // JS

  filter(condition: Condition<T>): Seq<T>; // JS, Scala

  find(condition: Condition<T>, fallback?: T | undefined): T | undefined; // Overload

  find(fromIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findIndex(condition: Condition<T>): number; // Overload

  findIndex(fromIndex: number, condition: Condition<T>): number;

  findLastIndex(condition: Condition<T>): number;  // Overload

  findLastIndex(tillIndex: number, condition: Condition<T>): number;

  findLast(condition: Condition<T>, fallback?: T): T | undefined; // Overload

  findLast(tillIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  first(fallback?: T): T | undefined; // take(1) ?? fallback; use find() to get first by condition

  firstAndRest(defaultIfEmpty?: T): [T, Seq<T>];

  // flatMapTree<R = T>(getNext: Selector<T, T | undefined>, resultSelector?: (x: T, index: number) => R, stopCondition?: Condition<T>): Seq<T>;
  //
  // flatMapTree<U = T, R = T>(getNext: Selector<T, U | undefined>, continueWhile: Condition<U>, resultSelector: (x: U, index: number) => R): Seq<R>;

  flatMap<R>(selector?: Selector<T, Iterable<R>>): Seq<R>; // JS2019, Scala

  // forEachTree<U = T>(getNext: Selector<T, U | undefined>, stopCondition: Condition<U>, callback: (x: U, index: number) => void): void;

  flatMap<U, R>(selector: Selector<T, Iterable<U>>, mapResult?: (subItem: U, parent: T, index: number) => R): Seq<R>;  // JS2019, Scala (extra C#)

  forEach(callback: (x: T, index: number, breakLoop: object) => void, thisArg?: any): void;

  groupBy<K>(keySelector: Selector<T, K>, toPrimitiveKey?: ToComparableKey<K>): SeqOfGroups<K, T>;

  groupBy<K, U>(keySelector: Selector<T, K>, toPrimitiveKey?: ToComparableKey<K>, valueSelector?: Selector<T, U>): SeqOfGroups<K, U>;

  groupJoin<I>(inner: Iterable<I>, outerKeySelector: ToComparableKey<T>, innerKeySelector: ToComparableKey<I>): SeqOfGroups<T, I>;

  groupJoinRight<I>(inner: Iterable<I>, outerKeySelector: ToComparableKey<T>, innerKeySelector: ToComparableKey<I>): SeqOfGroups<I, T>;

  hasAtLeast(count: number): boolean;

  ifEmpty(value?: T): Seq<T>; // Overload
  ifEmpty({useSequence}: { useSequence: Iterable<T>; }): Seq<T>; // Overload
  ifEmpty({useFactory}: { useFactory: () => T; }): Seq<T>;

  includes(item: T, fromIndex?: number): boolean; // consider contains. //instead of equality func, call some

  includesAll<K = T>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean; // Overload
  includesAll<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  includesAny<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean; // Overload
  includesAny<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  includesSubSequence<K>(subSequence: Iterable<T>, keySelector?: Selector<T, K>): boolean; // Overload
  includesSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: Selector<T, K>): boolean;

  indexOf(item: T, fromIndex?: number): number;

  indexOfSubSequence<K>(subSequence: Iterable<T>, keySelector?: Selector<T, K>): number; // Overload
  indexOfSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: Selector<T, K>): number;

  innerJoin<I, R = { outer: T; inner: I }>(inner: Iterable<I>, outerKeySelector: ToComparableKey<T>, innerKeySelector: ToComparableKey<I>, resultSelector?: (outer: T, inner: I) => R): Seq<R>;

  insert(atIndex: number, items: Iterable<T>): Seq<T>;  // Overload
  insert(atIndex: number, ...items: T[]): Seq<T>;

  insertBefore(condition: Condition<T>, items: Iterable<T>): Seq<T>;  // Overload
  insertBefore(condition: Condition<T>, ...items: T[]): Seq<T>;

  insertAfter(condition: Condition<T>, items: Iterable<T>): Seq<T>;  // Overload
  insertAfter(condition: Condition<T>, ...items: T[]): Seq<T>;

  intersect<K>(items: Iterable<T>, keySelector?: Selector<T, K>): Seq<T>;

  // Intersperses a value (separator) between the items in the source sequence
  // Like join(), but return a sequence instead of string
  intersperse(separator: T, insideOut?: boolean): Seq<T>;

  intersperse<U>(separator: U, insideOut?: boolean): Seq<T | U>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: { prefix?: TPrefix; suffix?: TSuffix }): Seq<TPrefix | U | TSuffix>;

  isEmpty(): boolean;

  join(separator?: string): string; // Overload
  join(opts: { start?: string; separator?: string, end?: string; }): string;

  last(): T | undefined; // Overload
  last(fallback: T): T;

  lastIndexOf(itemToFind: T, fromIndex?: number): number;

  map<U = T>(mapFn: Selector<T, U>): Seq<U>;

  max(): T extends number ? number : void; // Overload
  max(selector: Selector<T, number>): number;

  min(): T extends number ? number : void; // Overload
  min(selector: Selector<T, number>): number;

  ofType(type: 'number'): Seq<number>; // Overload
  ofType(type: 'string'): Seq<string>; // Overload
  ofType(type: 'boolean'): Seq<boolean>; // Overload
  ofType(type: 'function'): Seq<Function>; // Overload
  ofType(type: 'symbol'): Seq<Symbol>; // Overload
  ofType(type: 'object'): Seq<object>; // Overload
  ofType(type: typeof Number): Seq<number>; // Overload
  ofType(type: typeof String): Seq<string>; // Overload
  ofType(type: typeof Boolean): Seq<boolean>; // Overload
  ofType(type: typeof Object): Seq<object>; // Overload
  ofType(type: typeof Symbol): Seq<Symbol>; // Overload
  ofType<V extends Class>(type: V): Seq<InstanceType<V>>;

  orderBy<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  orderByDescending<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  prepend(...items: T[]): Seq<T>;

  prepend(items: Iterable<T>): Seq<T>;

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

  sameItems<K>(second: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  sameOrderedItems<U = T>(second: Iterable<U>, equals?: (first: T, second: U, index: number) => boolean): boolean;

  skip(count: number): Seq<T>;

  skipFirst(): Seq<T>;

  skipLast(count?: number): Seq<T>;

  skipWhile(condition: Condition<T>): Seq<T>;

  slice(start: number, endNotIncluding: number): Seq<T>;

  some(condition?: Condition<T>): boolean;

  // Behaves like Array.sort, which unless comparer specified, perform toString for comparing items
  // So try to avoid it. prefer using sorted() or orderBy()
  sort(comparer?: Comparer<T>): OrderedSeq<T>;

  sorted(reverse?: boolean): OrderedSeq<T>;

  split(atIndex: number): [Seq<T>, Seq<T>]; // Overload
  split(condition: Condition<T>): [Seq<T>, Seq<T>];

  startsWith<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  sum(): T extends number ? number : void; // Overload
  sum(selector: Selector<T, number>): number;

  take(count: number): Seq<T>; // negative count is like takeLast

  takeLast(count: number): Seq<T>

  takeWhile(condition: Condition<T>): Seq<T>;

  takeOnly<K = T>(items: Iterable<T>, keySelector: Selector<T, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector?: Selector<U, K>): Seq<T>;

  tap(callback: Selector<T, void>, thisArg?: any): Seq<T>;

  toArray(): T[];

  toMap<K, V>(keySelector: Selector<T, K>, valueSelector?: Selector<T, V>, toStringKey?: ToComparableKey<K>): Map<K, V>;

  toSet<K>(keySelector?: Selector<T, K>): Set<T>;

  toString(separator?: string): string; // Overload
  toString(opts: { start?: string; separator?: string, end?: string; }): string;

  transform<U = T>(transformer: (seq: Seq<T>) => Seq<U>): Seq<U>;

  union<K>(second: Iterable<T>, keySelector?: (value: T) => K): Seq<T>;

  zip<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts>): Seq<[T, T1, ...Ts]>;

  zipAll<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts> | [...Iterables<Ts>, { defaults?: [T?, T1?, ...Ts] }]): Seq<[T, T1, ...Ts]>;

  zipWithIndex<U = T>(): Seq<[T, number]>;
}

export interface OrderedSeq<T> extends Seq<T> {
  thenBy<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  thenByDescending<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T>;

  tap(callback: Selector<T, void>, thisArg?: any): OrderedSeq<T>;
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


export interface CachedSeqFactory {
  <T>(source: Iterable<T>, now?: boolean): CachedSeq<T>;
}

export interface OrderedSeqFactory {
  <T, K = T>(items: Iterable<T>,
             keySelector?: (x: T) => K,
             comparer?: Comparer<K>,
             descending?: boolean): OrderedSeq<T>;
}

export interface GroupedSeqFactory {
  <K, T>(key: K, items: Iterable<T>): GroupedSeq<K, T>;
}

export const factories: {
  Seq: SeqFactory;
  CachedSeq: CachedSeqFactory;
  OrderedSeq: OrderedSeqFactory;
  GroupedSeq: GroupedSeqFactory;
  SeqOfGroups: SeqOfGroupsFactory;
} = <any>{};

export interface SeqOfGroupsFactory {
  <K, T = K, U = T>(source: Iterable<T>,
                    keySelector?: Selector<T, K>,
                    toComparableKey?: ToComparableKey<K>,
                    valueSelector?: Selector<T, U>): SeqOfGroups<K, U>
}

export interface SeqOfGroups<K, T> extends Seq<GroupedSeq<K, T>> {
  tap(callback: Selector<GroupedSeq<K, T>, void>, thisArg?: any): this;

  mapInGroup<U>(mapFn: Selector<T, U>): SeqOfGroups<K, U>;

  thenGroupBy<K2>(keySelector?: Selector<T, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[K, K2], T>;

  toMap<K, V>(keySelector: Selector<GroupedSeq<K, T>, K>, valueSelector?: Selector<GroupedSeq<K, T>, V>, toStringKey?: ToComparableKey<K>): Map<K, V>;

  toMap(): MapHierarchy<[K], T>;

  cache(): this & CachedSeq<GroupedSeq<K, T>>
}

export type NarrowGroupedSeq<Ks extends any[], T> = Ks extends [infer K1, infer K2, infer K3, ...infer KRest]
  ? MultiGroupedSeq<[K2, K3, ...KRest], T>
  : GroupedSeq<Ks[1], T>;

export interface MultiGroupedSeq<Ks extends any[], T> extends Seq<NarrowGroupedSeq<Ks, T>> {
  readonly key: Ks[0];
}

export interface SeqOfMultiGroups<Ks extends any[], T> extends Seq<MultiGroupedSeq<Ks, T>> {
  tap(callback: Selector<MultiGroupedSeq<Ks, T>, void>, thisArg?: any): this;

  mapInGroup<U>(mapFn: Selector<T, U>): SeqOfMultiGroups<Ks, U>;

  thenGroupBy<K2>(keySelector?: Selector<T, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[...Ks, K2], T>;

  toMap(): MapHierarchy<Ks, T>;

  toMap<K, V>(keySelector: Selector<MultiGroupedSeq<Ks, T>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, T>, V>, toStringKey?: ToComparableKey<K>): Map<K, V>;

  cache(): this & CachedSeq<MultiGroupedSeq<Ks, T>>
}

export interface SeqFactory {
  <T>(source?: Iterable<T>): Seq<T>;
}
