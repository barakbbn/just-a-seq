import {CachedSeq, Condition, Selector} from "./seq";
import {tapGenerator} from "./common";
import {SeqBase} from "./seq-base";

export class CachedSeqImpl<T> extends SeqBase<T> implements CachedSeq<T> {
  private _cache?: T[];
  private tapCallback: Selector<T, void>;

  constructor(private source: Iterable<T>) {
    super();
  }

  get array(): ReadonlyArray<T> {
    return this.getCached();
  }

  protected get items(): Iterable<T> {
    return this.source;
    // if (this._cache !== undefined) return this._cache;
    // return this._cache = SeqBase.isArray(this.source) ? this.source : [...this.source];
  }

  static create<T>(source: Iterable<T>): CachedSeqImpl<T> {
    return new CachedSeqImpl<T>(source);
  }

  cache(now?: boolean): CachedSeq<T> {
    if (now && !this._cache) this.consume();
    return this;
  }

  count(condition: Condition<T> = () => true): number {
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
    return array[array.length - 1] ?? fallback;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    const items = this.getCached();
    return fromIndex == null ?
      items.lastIndexOf(itemToFind) :
      items.lastIndexOf(itemToFind, fromIndex);
  }

  sameItems<K>(second: Iterable<T>, keySelector?: Selector<T, K>): boolean {
    const items = this.array;
    if (Array.isArray(second) && items.length !== second.length) return false;
    return super.sameItems(second, keySelector);
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean): boolean {
    const items = this.array;
    if (Array.isArray(second) && items.length !== second.length) return false;
    return super.sameOrderedItems(second, equals);
  }

  startsWith<K>(items: Iterable<T>, keySelector: Selector<T, K> = t => t as unknown as K): boolean {
    const array = this.array;
    if (SeqBase.isArray(items)) {
      if (items.length === 0) return true;
      if (array.length < items.length) return false;
    }
    return super.startsWith(items, keySelector);
  }

  tap(callback: Selector<T, void>, thisArg?: any): CachedSeq<T> {
    const tappable = this.createTappableSeq();
    tappable.tapCallback = thisArg ? callback.bind(thisArg) : callback;
    return tappable;
  }

  * [Symbol.iterator](): Iterator<T> {
    const array = this.getCached();
    const iterable = this.tapCallback ? tapGenerator(array, this.tapCallback) : array;
    yield* iterable;
  }

  protected createTappableSeq(): CachedSeqImpl<T> {
    return new CachedSeqImpl<T>(this);
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + this.getCached().join(separator) + end;
  }

  private getCached(): T[] {
    if (this._cache) return this._cache;
    if (SeqBase.isArray(this.source)) this._cache = this.source;
    if (isCachedSeq(this.source)) this._cache = this.source.array as T[];
    else this._cache = [...this.source];
    return this._cache;
  }
}

function isCachedSeq<U>(seq: Iterable<U>): seq is CachedSeq<U> {
  return seq && Object.getOwnPropertyDescriptor(seq, 'array')?.get != null;
}
