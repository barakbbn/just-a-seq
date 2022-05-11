import {CachedSeq, Condition, Selector} from "./seq";
import {SeqTags, TaggedSeq, tapGenerator} from "./common";
import {SeqBase} from "./seq-base";

export class CachedSeqImpl<T> extends SeqBase<T> implements CachedSeq<T> {
  // We don't tag the sequence with every reasonable tag (i.e. $sourceIsArray, $notAffectingNumberOfItems)
  // In order to avoid optimizations that might override this cacheable sequence from being cached when operated upon
  // i.e. if source is another sequence, then any() will optimize by calling the source sequence.any()
  readonly [SeqTags.$cacheable] = true;

  private _cache?: readonly T[];
  private tapCallbacks: Selector<any, void>[] = [];

  constructor(private source: Iterable<T>) {
    super();

    if (SeqTags.infinite(source)) throw new RangeError('Cannot cache infinite sequence');
  }


  get array(): ReadonlyArray<T> {
    return this.getCached();
  }

  static create<T>(source: Iterable<T>): CachedSeqImpl<T> {
    return new CachedSeqImpl<T>(source);
  }

  any(condition?: Condition<T>): boolean {
    return super.anyOptimized(this.source, condition);
  }

  cache(now?: boolean): CachedSeq<T> {
    if (now && !this._cache) this.consume();
    return this;
  }

  count(condition?: Condition<T>): number {
    if (!condition) return this.getCached().length;
    return super.count(condition);
  }

  hasAtLeast(count: number): boolean {
    if (count <= 0) throw new RangeError('count must be positive');
    return this.getCached().length >= count;
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return this.getCached().includes(itemToFind, fromIndex);
  }

  indexOf(itemToFind: T, fromIndex: number = 0): number {
    return this.getCached().indexOf(itemToFind, fromIndex);
  }

  last(): T | undefined;
  last(fallback: T): T;
  last(fallback?: T): T | undefined {
    const array = this.array;
    return array.length ? array[array.length - 1] : fallback;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    const items = this.getCached();
    return fromIndex == null ?
      items.lastIndexOf(itemToFind) :
      items.lastIndexOf(itemToFind, fromIndex);
  }

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: (item: T) => K = t => t as unknown as K, secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {
    const items = this.array;
    if (Array.isArray(second) && items.length !== second.length) return false;
    return super.sameItems(second, firstKeySelector, secondKeySelector);
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean): boolean {
    const items = this.array;
    if (Array.isArray(second) && items.length !== second.length) return false;
    return super.sameOrderedItems(second, equals);
  }

  startsWith(items: Iterable<T>, keySelector?: (item: T) => unknown): boolean;
  startsWith<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): boolean;
  startsWith<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;
  startsWith<U = T>(items: Iterable<U>, {equals}: { equals(t: T, u: U): unknown; }): boolean;

  startsWith<U, K>(items: Iterable<U>, firstKeySelector?: ((item: T) => K) | { equals(t: T, u: U): unknown; }, secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {
    const array = this.array;
    if (Array.isArray(items)) {
      if (items.length === 0) return true;
      if (array.length < items.length) return false;
    }
    return super.startsWith(items, firstKeySelector as any, secondKeySelector);
  }

  tap(callback: Selector<T, void>): CachedSeq<T> {
    const tappable = new CachedSeqImpl<T>(this);
    const callbacks = [...this.tapCallbacks];
    callbacks.push(callback);
    tappable.tapCallbacks = callbacks;
    return tappable;
  }

  * [Symbol.iterator](): Iterator<T> {
    let iterable: Iterable<T> = this.getCached();
    if (this.tapCallbacks?.length) iterable = tapGenerator(iterable, this.tapCallbacks)
    // TODO: Optimize when iterable is an array that
    yield* iterable;
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + this.getCached().join(separator) + end;
  }

  private getCached(): readonly T[] {
    if (this._cache) return this._cache;
    if (SeqTags.cacheable(this.source)) return this._cache = this.source.array;
    return this._cache = [...this.source];
  }
}
