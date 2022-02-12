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

  all(condition: Condition<T>): boolean {
    return this.tapCallbacks.length ?
      super.all(condition) :
      super.allOptimized(this.source, condition);
  }

  any(condition?: Condition<T>): boolean {
    return this.tapCallbacks.length ?
      super.any(condition) :
      this.anyOptimized(this.source, condition);
  }

  average(): T extends number ? number : never;

  average(selector: Selector<T, number>): number;

  average(selector?: Selector<T, number>): number | never {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.average(selector as any);
    }
    return this.sourceToSeq().average(selector as any);
  }

  count(condition?: Condition<T>): number {
    return this.tapCallbacks.length ?
      super.count(condition) :
      super.countOptimized(this.source, condition);
  }

  distinct<K>(keySelector: Selector<T, K> = x => x as unknown as K): Seq<T> {
    if (this.tapCallbacks.length || (keySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.distinct(keySelector);
    }
    const source = this.sourceToSeq().distinct(keySelector);
    return new SortedSeqImpl(source, this.comparer);
  }

  filter(condition: Condition<T>): Seq<T> {
    if (this.tapCallbacks.length || condition.length > 1 || !SeqTags.optimize(this)) {
      return super.filter(condition);
    }
    const source = this.sourceToSeq().filter(condition);
    return new SortedSeqImpl(source, this.comparer);
  }

  hasAtLeast(count: number): boolean {
    return this.tapCallbacks.length ?
      super.hasAtLeast(count) :
      this.hasAtLeastOptimized(this.source, count);
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return this.tapCallbacks.length ?
      super.includes(itemToFind, fromIndex) :
      this.includesOptimized(this.source, itemToFind, fromIndex);
  }

  includesAll<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean; // Overload
  includesAll<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;
  includesAll<U, K>(items: Iterable<U>,
                    firstKeySelector: (item: T) => K = t => t as unknown as K,
                    secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {
    if (this.tapCallbacks.length || !SeqTags.optimize(this)) {
      return super.includesAll(items as any, firstKeySelector, secondKeySelector);
    }
    return this.sourceToSeq().includesAll(items as any, firstKeySelector, secondKeySelector);
  }

  includesAny<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean; // Overload
  includesAny<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;
  includesAny<U, K>(items: Iterable<T> | Iterable<U>, keySelector?: Selector<T, K>, secondKeySelector?: Selector<U, K>): boolean {
    if (this.tapCallbacks.length || (keySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.includesAny(items as any, keySelector as any, secondKeySelector as any);
    }
    return this.sourceToSeq().includesAny(items as any, keySelector as any, secondKeySelector as any);
  }

  max(): T extends number ? number : never;

  max(selector: Selector<T, number>): number;

  max(selector?: Selector<T, number>): number | void {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.max(selector as any);
    }
    return this.sourceToSeq().max(selector as any);
  }

  min(): T extends number ? number : never;

  min(selector: Selector<T, number>): number;

  min(selector?: Selector<T, number>): number | void {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.min(selector as any);
    }
    return this.sourceToSeq().min(selector as any);
  }

  remove<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T> {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.remove(items, firstKeySelector, secondKeySelector);
    }
    const source = this.sourceToSeq().remove(items, firstKeySelector as (item: T) => K, secondKeySelector as (item: U) => K);
    return new SortedSeqImpl(source, this.comparer);
  }

  removeAll<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T> {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.removeAll(items, firstKeySelector, secondKeySelector);
    }
    const source = this.sourceToSeq().removeAll(items, firstKeySelector as (item: T) => K, secondKeySelector as (item: U) => K);
    return new SortedSeqImpl(source, this.comparer);
  }

  sameItems<K>(second: Iterable<T>, keySelector?: (item: T) => K): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector?: Selector<T, K>, secondKeySelector?: Selector<U, K>): boolean {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.sameItems(second, firstKeySelector as any, secondKeySelector as any);
    }
    return this.sourceToSeq().sameItems(second, firstKeySelector as any, secondKeySelector as any);
  }

  sum(): T extends number ? number : never;

  sum(selector: Selector<T, number>): number;

  sum(selector?: Selector<T, number>): number | void {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.sum(selector as any);
    }
    return this.sourceToSeq().sum(selector as any);
  }

  takeOnly<U = T>(items: Iterable<U>, keySelector: (item: T | U) => unknown): Seq<T>;
  takeOnly(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;
  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector?: Selector<T, K>, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): Seq<T> {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.takeOnly(items, firstKeySelector as Selector<T, K>, secondKeySelector);
    }
    const source = this.sourceToSeq().takeOnly(items, firstKeySelector as Selector<T, K>, secondKeySelector);
    return new SortedSeqImpl(source, this.comparer);
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

  private sourceToSeq(): Seq<T> {
    return SeqTags.isSeq(this.source) ?
      this.source :
      this.createDefaultSeq(this.source, undefined, [
        [SeqTags.$notAffectingNumberOfItems, true],
        [SeqTags.$notMappingItems, true]]);
  }
}
