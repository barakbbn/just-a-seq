import {Comparer, OrderedSeq, Selector} from "./seq";
import {DONT_COMPARE, LEGACY_COMPARER, sameValueZero} from "./common";
import {SeqBase} from "./seq-base";

export class OrderedSeqImpl<T, K = T> extends SeqBase<T> implements OrderedSeq<T> {
  protected readonly comparer?: (a: any, b: any) => number;

  constructor(protected readonly items: Iterable<T> = [],
              comparer?: (a: K, b: K) => number) {
    super();
    this.comparer = comparer;
  }

  static create<T, K = T>(items: Iterable<T> = [],
                          keySelector?: (x: T) => K,
                          comparer?: Comparer<K>,
                          descending: boolean = false): OrderedSeqImpl<T, K> {

    let finalComparer = OrderedSeqImpl.createComparer(keySelector, comparer, descending);
    return new OrderedSeqImpl(items, finalComparer)
  }

  private static createComparer<T, K = T>(keySelector?: (x: T) => K,
                                          comparer?: Comparer<K>,
                                          descending: boolean = false): ((a: any, b: any) => number) | undefined {
    if (comparer === LEGACY_COMPARER) return undefined;
    if (comparer === DONT_COMPARE) return comparer;

    let baseComparer: (a: any, b: any) => number = comparer || OrderedSeqImpl.defaultCompare;
    let finalComparer = baseComparer;
    if (keySelector) {
      finalComparer = descending ?
        (a, b) => baseComparer(keySelector(b), keySelector(a)) :
        (a, b) => baseComparer(keySelector(a), keySelector(b));

    } else if (descending) {
      finalComparer = (a, b) => baseComparer(b, a);
    }
    return finalComparer;
  }

  private static defaultCompare(a: any, b: any): number {
    if (sameValueZero(a, b)) return 0;

    const [aIsNullOrUndefined, bIsNullOrUndefined] = [a == null, b == null];
    if (aIsNullOrUndefined && bIsNullOrUndefined) return a === undefined ? 1 : -1; // undefined is bigger than null
    else if (aIsNullOrUndefined || bIsNullOrUndefined) return aIsNullOrUndefined ? 1 : -1;

    return a > b ? 1 : -1;
  }

  hasAtLeast(count: number): boolean {
    if (count <= 0) throw new RangeError('count must be positive');
    if (Array.isArray(this.items)) return this.items.length >= count;
    return super.hasAtLeast(count);
  }

  thenBy<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T> {
    return this.thenByInternal(keySelector, comparer, false);
  }

  thenByDescending<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T> {
    return this.thenByInternal(keySelector, comparer, true);
  }

  tap(callback: Selector<T, void>, thisArg?: any): OrderedSeq<T> {
    return new OrderedSeqImpl<T, K>(this.tapGenerator(callback, thisArg), this.comparer);
  }

  * [Symbol.iterator](): Iterator<T> {
    if (this.comparer === DONT_COMPARE) {
      yield* this.items;
      return;
    }
    const array = [...this.items];
    yield* array.sort(this.comparer as Comparer<T>);
  }

  private thenByInternal<K>(keySelector: (x: T) => K, comparer?: Comparer<K>, descending: boolean = false): OrderedSeq<T> {
    let nextComparer = OrderedSeqImpl.createComparer(keySelector, comparer, descending)!;
    const baseComparer = this.comparer;
    let finalComparer = baseComparer ?
      (a: any, b: any) => baseComparer(a, b) || nextComparer(a, b) :
      (a: any, b: any) => nextComparer(a, b);
    return new OrderedSeqImpl(this.items, finalComparer);
  }
}
