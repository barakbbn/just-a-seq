import {Comparer, Condition, factories, Selector, Seq, SortedSeq} from "./seq";
import {DONT_COMPARE, EMPTY_ARRAY, entries, LEGACY_COMPARER, sameValueZero, SeqTags} from "./common";
import {SeqBase} from "./seq-base";

export class SortedSeqImpl<T, K = T> extends SeqBase<T> implements SortedSeq<T> {
  readonly [SeqTags.$sorted] = true;

  protected readonly comparer?: (a: any, b: any) => number;
  protected tapCallbacks: Selector<any, void>[] = [];

  constructor(protected readonly source: Iterable<T> = EMPTY_ARRAY,
              comparer?: (a: K, b: K) => number) {
    super();
    this.comparer = comparer;
  }

  // TaggedSeq
  get [SeqTags.$notAffectingNumberOfItems](): boolean {
    return !this.tapCallbacks.length;
  }

  get [SeqTags.$notMappingItems](): boolean {
    return !this.tapCallbacks.length;
  }

  static create<T, K = T>(items: Iterable<T> = [],
                          keySelector?: (x: T) => K,
                          comparer?: Comparer<K>,
                          descending: boolean = false): SortedSeqImpl<T, K> {

    let finalComparer = SortedSeqImpl.createComparer(keySelector, comparer, descending);
    return new SortedSeqImpl(items, finalComparer)
  }

  private static createComparer<T, K = T>(keySelector?: (x: T) => K,
                                          comparer?: Comparer<K>,
                                          descending: boolean = false): ((a: any, b: any) => number) | undefined {
    if (comparer === LEGACY_COMPARER) return undefined;
    if (comparer === DONT_COMPARE) return comparer;

    let baseComparer: (a: any, b: any) => number = comparer || SortedSeqImpl.defaultCompare;
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

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return this.tapCallbacks.length ?
      super.includes(itemToFind, fromIndex) :
      this.includesOptimized(this.source, itemToFind, fromIndex);

  }

  count(condition: Condition<T> = () => true): number {
    return super.countOptimized(this.source, condition);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastOptimized(this.source, count);
  }

  // thenBy<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): SortedSeq<T> {
  //   return this.thenByInternal(keySelector, comparer, false);
  // }

  thenSortBy<U>(valueSelector: (item: T) => U, reverse = false): SortedSeq<T> {
    return this.thenByInternal(valueSelector, undefined, reverse);
  }

  // thenByDescending<K>(keySelector: (x: T) => K, comparer?: Comparer<K>): SortedSeq<T> {
  //   return this.thenByInternal(keySelector, comparer, true);
  // }

  tap(callback: Selector<T, void>,): SortedSeq<T> {
    const instance = new SortedSeqImpl<T, K>(this.source, this.comparer);
    instance.tapCallbacks.push(...this.tapCallbacks, callback);

    return instance;
  }

  * [Symbol.iterator](): Iterator<T> {
    const items: Iterable<T> = (this.comparer === DONT_COMPARE) ?
      this.source :
      [...this.source].sort(this.comparer as Comparer<T>);

    if (this.tapCallbacks.length) for (const entry of entries(items)) {
      this.tapCallbacks.forEach(callback => callback(entry.value, entry.index));
      yield entry.value;
    }
    else yield* items;
  }

  sortBy<U = T>(valueSelector: (item: T) => U, reverse: boolean = false): SortedSeq<T> {
    const optimize = SeqTags.optimize(this);
    if (this.tapCallbacks.length || !optimize) return super.sortBy(valueSelector, reverse);
    return this.transferOptimizeTag(factories.SortedSeq(this.source, valueSelector, undefined, reverse));
  }

  sorted(reverse = false): Seq<T> {
    const optimize = SeqTags.optimize(this);
    if (this.tapCallbacks.length || !optimize) return super.sorted(reverse);
    return this.transferOptimizeTag(factories.SortedSeq(this.source, undefined, undefined, reverse));
  }

  private thenByInternal<K>(keySelector: (x: T) => K, comparer?: Comparer<K>, descending: boolean = false): SortedSeq<T> {
    let nextComparer = SortedSeqImpl.createComparer(keySelector, comparer, descending)!;
    const baseComparer = this.comparer;
    let finalComparer = baseComparer ?
      (a: any, b: any) => baseComparer(a, b) || nextComparer(a, b) :
      (a: any, b: any) => nextComparer(a, b);
    const instance = new SortedSeqImpl(this.source, finalComparer);
    instance.tapCallbacks.push(...this.tapCallbacks);

    return instance;
  }
}
