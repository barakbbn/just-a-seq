import {CachedSeq, Selector} from "./seq";
import {tapGenerator} from "./common";
import {SeqBase} from "./seq-impl";

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

  * [Symbol.iterator](): Iterator<T> {
    const array = this.getCached();
    const iterable = this.tapCallback ? tapGenerator(array, this.tapCallback) : array;
    yield* iterable;
  }

  tap(callback: Selector<T, void>, thisArg?: any): CachedSeq<T> {
    const tappable = this.createTappableSeq();
    tappable.tapCallback = callback;
    return tappable;
  }

  protected createTappableSeq(): CachedSeqImpl<T> {
    return new CachedSeqImpl<T>(this);
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
