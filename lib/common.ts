import {CachedSeq, ComparableType, KeyedSeq, Seq, SortedSeq} from "./seq";

export interface IterationContext {
  closeWhenDone<V, TIter extends Iterator<V>>(iterator: TIter): TIter;

  onClose(action: () => void): void;
}

class IterationContextImpl implements IterationContext {
  private onCloseActions: (() => void)[];

  closeWhenDone<V, TIter extends Iterator<V>>(iterator: TIter): TIter {
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

export class CloseableIterator<T, U = T, TSeq extends Iterable<T> = Iterable<T>> implements Iterator<U> {
  private iterator: Iterator<U>;
  private done = false;
  private iterationContext = new IterationContextImpl();

  constructor(private source: TSeq,
              private generator: (seq: TSeq, iterationContext: IterationContext) => Iterator<U>) {
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
    return done? this.return(value): {value};
  }
}

export class Gen<T, U = T, TSeq extends Iterable<T> = Iterable<T>> implements Iterable<U> {

  constructor(private seq: TSeq, private generator: (seq: TSeq, iterationContext: IterationContext) => Iterator<U>) {
  }

  [Symbol.iterator](): Iterator<U> {
    return new CloseableIterator<T, U, TSeq>(this.seq, this.generator);
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

export function tapIterable<T>(items: Iterable<T>, callback: (item: T, index: number) => void): Iterable<T> {
  return {
    [Symbol.iterator]() {
      return tapGenerator(items, [callback]);
    }
  }
}

export function isIterable<R>(item: any, ignoreIfString = false): item is Iterable<R> {
  return item && typeof item[Symbol.iterator] === 'function' && (!ignoreIfString || typeof item !== 'string');
}

export function* entries<T>(items: Iterable<T>): Generator<{ value: T; index: number; }> {
  let index = 0;
  for (const value of items) yield {value, index: index++};
}

export function consume(iterable: Iterable<any>): void {
  for (const _ of iterable) {
  }
}

export const IGNORED_ITEM: any = new class IGNORED_ITEM {};
export const EMPTY_ARRAY: readonly any[] = []

export function isArray<T>(iterable: Iterable<T>): iterable is Array<T> {
  return Array.isArray(iterable);
}

export class SeqTags {
  static readonly $optimize: unique symbol = Symbol('optimize');

  static readonly $seq: unique symbol = Symbol('seq');
  static readonly $cacheable: unique symbol = Symbol('cacheable');
  static readonly $sorted: unique symbol = Symbol('sorted');
  static readonly $notAffectingNumberOfItems: unique symbol = Symbol('notAffectingNumberOfItems');
  static readonly $maxCount: unique symbol = Symbol('maxCount');
  static readonly $notMappingItems: unique symbol = Symbol('notMappingItems');
  static readonly $group: unique symbol = Symbol('group');

  static getTag<Tag extends keyof TaggedSeq>(seq: object, tag: Tag): TaggedSeq[Tag] {
    const guard = (seq: any): seq is TaggedSeq => seq;
    return guard(seq)? seq[tag]: undefined;
  }

  static optimize<T>(seq: Iterable<T>): boolean {
    const isNot = !this.getTag(seq, this.$optimize);
    return !isNot;
  }

  static isSeq<T>(seq: Iterable<T>): seq is Seq<T>;
  static isSeq<T>(value: any): value is Seq<T> {
    const isNot = !this.getTag(value, this.$seq);
    return !isNot;
  }

  static cacheable<T>(seq: Iterable<T>): seq is CachedSeq<T> {
    const isNot = !this.getTag(seq, this.$cacheable);
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

  static notMappingItems(seq: Iterable<any>): boolean | unknown {
    const isNot = !this.getTag(seq, this.$notMappingItems)
    return !isNot;
  }

  static setTagsIfMissing(on: TaggedSeq, tags: readonly [symbol, any][]): void {
    for (const [tag, value] of tags) {
      if (tag in on) continue;
      (on as any)[tag] = value
    }
  }

  static group<K, T>(seq: Iterable<T>): seq is KeyedSeq<K, T> {
    const isNot = !this.getTag(seq, this.$group);
    return !isNot;
  }

}

export interface TaggedSeq {
  [SeqTags.$optimize]?: boolean;
  [SeqTags.$seq]?: boolean;
  [SeqTags.$cacheable]?: boolean;
  [SeqTags.$sorted]?: boolean;
  [SeqTags.$notAffectingNumberOfItems]?: boolean;
  [SeqTags.$maxCount]?: number;
  [SeqTags.$notMappingItems]?: boolean;
  [SeqTags.$group]?: boolean;
}

export const IDENTITY = <T>(v: unknown): T => v as T;

export class Dict<K = any, V = any> extends Map<K, V> {
  private lastSet: [ComparableType, [K, V]] | undefined = undefined;
  private readonly comparableKeySelector: (key: K) => ComparableType;

  constructor(toComparableKey: (key: K) => ComparableType, entries?: readonly (readonly [K, V])[] | null);

  constructor(toComparableKey: (key: K) => ComparableType, iterable: Iterable<readonly [K, V]>);

  constructor(toComparableKey: (key: K) => ComparableType, entries?: readonly (readonly [K, V])[] | null | Iterable<readonly [K, V]>) {

    super();
    this.comparableKeySelector = toComparableKey;
    if (entries) {
      for (const entry of entries) this.set(...entry);
    }
  }

  static caseInsensitive<V = any>(): Dict<string, V> {
    return new Dict<string, V>(k => k?.toLocaleLowerCase() ?? k);
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  clear(): void {
    super.clear();
    this.lastSet = undefined;
  }

  delete(key: K): boolean {
    const comparable = this.toComparableKey<K>(key);
    if (this.lastSet && sameValueZero(comparable, this.lastSet[0])) this.lastSet = undefined;
    return super.delete(comparable);
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    super.forEach(v => callbackfn((v as unknown as [K, V])[1], (v as unknown as [K, V])[0], this));
  }

  get(key: K): V | undefined {
    return (super.get(this.toComparableKey<K>(key)) as unknown as [K, V])?.[1];
  }

  has(key: K): boolean {
    return super.has(this.toComparableKey<K>(key));
  }

  * keys(): IterableIterator<K> {
    for (const v of super.values()) yield (v as unknown as [K, V])[0];
  }

  set(key: K, value: V): this {
    const comparable = this.toComparableKey(key);
    if (this.lastSet && sameValueZero(comparable, this.lastSet[0])) {
      this.lastSet[1][1] = value;
    } else {
      this.lastSet = [comparable, [key, value]];
      super.set(...(this.lastSet as unknown as [K, V]));
    }

    return this;
  }

  * values(): IterableIterator<V> {
    for (const v of super.values()) yield (v as unknown as [K, V])[1];
  }

  entries(): IterableIterator<[K, V]> {
    return super.values() as unknown as IterableIterator<[K, V]>;
  }

  addOrUpdate(key: K, value: V, update: (value: V) => V): this {
    const comparable = this.toComparableKey<K>(key);
    if (this.lastSet && sameValueZero(comparable, this.lastSet[0])) {
      this.lastSet[1][1] = update(this.lastSet[1][1]);
    } else {
      let entry = super.get(comparable) as unknown as [K, V];
      if (entry) entry[1] = update(entry[1]);
      else {
        entry = [key, value];
        super.set(comparable, entry as unknown as V);
      }
      this.lastSet = [comparable as unknown as ComparableType, entry];
    }

    return this;
  }

  private toComparableKey<AS = ComparableType>(key: K): AS {
    return this.comparableKeySelector(key) as unknown as AS;
  }
}

