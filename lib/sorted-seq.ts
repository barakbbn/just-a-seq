import {ComparableType, Comparer, Condition, Selector, Seq, SortedSeq} from "./seq";
import {
  EMPTY_ARRAY,
  entries, isArray,
  SeqTags
} from "./common";
import {SeqBase} from "./seq-base";
import {
  createComparer,
  DONT_COMPARE,
  LEGACY_COMPARER,
  partialBinaryInsertionSort,
  partialQuickSort
} from "./sort-util";

export class SortedSeqImpl<T, K = T> extends SeqBase<T> implements SortedSeq<T> {

  readonly [SeqTags.$sorted] = true;
  protected readonly comparer?: (a: any, b: any) => number;
  protected tapCallbacks: Selector<any, void>[] = [];

  constructor(protected readonly source: Iterable<T>,
              comparer?: (a: K, b: K) => number,
              protected topCount = Number.POSITIVE_INFINITY,
              protected opts?: { stable?: boolean; }) {
    super();
    this.topCount = Math.floor(topCount);
    this.comparer = comparer;
  }

  get [SeqTags.$maxCount](): number | undefined {
    return Number.isFinite(this.topCount)? Math.abs(this.topCount): undefined;
  }

  // TaggedSeq
  get [SeqTags.$notAffectingNumberOfItems](): boolean {
    return !this.tapCallbacks.length;
  }

  get [SeqTags.$notMappingItems](): boolean {
    return !this.tapCallbacks.length;
  }

  static create<T, K = T>(items: Iterable<T>,
                          keySelector?: (x: T) => K,
                          comparer?: Comparer<K>,
                          reverse = false,
                          topCount = Number.POSITIVE_INFINITY,
                          opts?: { stable?: boolean; }): SortedSeqImpl<T, K> {

    let finalComparer = createComparer(keySelector, comparer, reverse);
    return new SortedSeqImpl(items, finalComparer, topCount, opts);
  }

  all(condition: Condition<T>): boolean {
    return this.tapCallbacks.length?
      super.all(condition):
      super.allOptimized(this.source, condition);
  }

  any(condition?: Condition<T>): boolean {
    return this.tapCallbacks.length?
      super.any(condition):
      this.anyOptimized(this.source, condition);
  }

  average(): T extends number? number: never;

  average(selector: Selector<T, number>): number;

  average(selector?: Selector<T, number>): number | never {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.average(selector as any);
    }
    return this.sourceToSeq().average(selector as any);
  }

  count(condition?: Condition<T>): number {
    return this.tapCallbacks.length?
      super.count(condition):
      super.countOptimized(this.source, condition);
  }

  distinct(keySelector: Selector<T, unknown> = x => x): Seq<T> {
    if (this.tapCallbacks.length || (keySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.distinct(keySelector);
    }
    const source = this.sourceToSeq().distinct(keySelector);
    return this.transferOptimizeTag(new SortedSeqImpl(source, this.comparer, this.topCount, this.opts));
  }

  filter(condition: Condition<T>): Seq<T> {
    if (this.tapCallbacks.length || condition.length > 1 || !SeqTags.optimize(this)) {
      return super.filter(condition);
    }
    const source = this.sourceToSeq().filter(condition);
    return this.transferOptimizeTag(new SortedSeqImpl(source, this.comparer, this.topCount, this.opts));
  }

  hasAtLeast(count: number): boolean {
    return this.tapCallbacks.length?
      super.hasAtLeast(count):
      this.hasAtLeastOptimized(this.source, count);
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return this.tapCallbacks.length?
      super.includes(itemToFind, fromIndex):
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

  max(): T extends number? number: never;

  max(selector: Selector<T, number>): number;

  max(selector?: Selector<T, number>): number | void {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.max(selector as any);
    }
    return this.sourceToSeq().max(selector as any);
  }

  min(): T extends number? number: never;

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
    return this.transferOptimizeTag(new SortedSeqImpl(source, this.comparer, this.topCount, this.opts));
  }

  removeAll<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T> {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.removeAll(items, firstKeySelector, secondKeySelector);
    }
    const source = this.sourceToSeq().removeAll(items, firstKeySelector as (item: T) => K, secondKeySelector as (item: U) => K);
    return this.transferOptimizeTag(new SortedSeqImpl(source, this.comparer, this.topCount, this.opts));
  }

  sameItems<K>(second: Iterable<T>, keySelector?: (item: T) => K): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector?: Selector<T, K>, secondKeySelector?: Selector<U, K>): boolean {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.sameItems(second, firstKeySelector as any, secondKeySelector as any);
    }
    return this.sourceToSeq().sameItems(second, firstKeySelector as any, secondKeySelector as any);
  }

  sum(): T extends number? number: never;

  sum(selector: Selector<T, number>): number;

  sum(selector?: Selector<T, number>): number | void {
    if (this.tapCallbacks.length || (selector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.sum(selector as any);
    }
    return this.sourceToSeq().sum(selector as any);
  }

  take(count: number): Seq<T> {
    if (count < 0) count = 0;
    if (this.tapCallbacks.length || this.topCount < 0) return super.take(count);

    if (this.topCount > count) {
      return this.transferOptimizeTag(new SortedSeqImpl(this.source, this.comparer, count, this.opts));
    }
    return this;
  }

  takeLast(count: number): Seq<T> {
    if (count < 0) count = 0;
    if (this.tapCallbacks.length || this.topCount > 0) return super.takeLast(count);

    if (this.topCount + count < 0) {
      return this.transferOptimizeTag(new SortedSeqImpl(this.source, this.comparer, -count, this.opts));
    }
    return this;
  }

  takeOnly<U = T>(items: Iterable<U>, keySelector: (item: T | U) => unknown): Seq<T>;

  takeOnly(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector?: Selector<T, K>, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): Seq<T> {
    if (this.tapCallbacks.length || (firstKeySelector?.length ?? 0) > 1 || !SeqTags.optimize(this)) {
      return super.takeOnly(items, firstKeySelector as Selector<T, K>, secondKeySelector);
    }
    const source = this.sourceToSeq().takeOnly(items, firstKeySelector as Selector<T, K>, secondKeySelector);
    return this.transferOptimizeTag(new SortedSeqImpl(source, this.comparer, this.topCount, this.opts));
  }

  thenSortBy(valueSelector: (item: T) => unknown, reverse = false): SortedSeq<T> {
    return this.thenByInternal(valueSelector, undefined, reverse);
  }

  tap(callback: Selector<T, void>,): SortedSeq<T> {
    const instance = this.transferOptimizeTag(new SortedSeqImpl<T, K>(this.source, this.comparer, undefined, this.opts));
    instance.tapCallbacks.push(...this.tapCallbacks, callback);

    return instance;
  }

  * [Symbol.iterator](): Iterator<T> {
    const items = this.getSortedItems();

    if (this.tapCallbacks.length) for (const entry of entries(items)) {
      this.tapCallbacks.forEach(callback => callback(entry.value, entry.index));
      yield entry.value;
    }
    else yield* items;
  }

  sort(comparer?: Comparer<T>): Seq<T>;
  sort(comparer: Comparer<T>, top?: number, opts?: { stable?: boolean; }): Seq<T>;
  sort(comparer?: Comparer<T>, top?: number, opts?: { stable?: boolean; }): Seq<T> {
    if (top) top = Math.trunc(top);
    const optimize = SeqTags.optimize(this);
    const count = Math.abs(top ?? Number.POSITIVE_INFINITY);

    if (this.tapCallbacks.length || !optimize || Number.isFinite(this.topCount) || Number.isFinite(count)) {
      return super.sort(comparer, top, opts);
    }

    const reverse = top != null && top < 0;
    return this.sortInternal(this.source, undefined, comparer ?? LEGACY_COMPARER, reverse, count, opts);
  }

  sortBy(valueSelector: (item: T) => unknown, reverse?: boolean): SortedSeq<T>;
  sortBy(valueSelector: (item: T) => unknown, top?: number, opts?: { stable?: boolean; }): SortedSeq<T>;

  sortBy(valueSelector: (item: T) => unknown, reverseOrTop?: boolean | number, opts?: { stable?: boolean; }): SortedSeq<T>

  sortBy(valueSelector: (item: T) => unknown, reverseOrTop?: boolean | number, opts?: { stable?: boolean; }): SortedSeq<T> {
    const optimize = SeqTags.optimize(this);
    const [reverse, top] = typeof reverseOrTop === 'number'?
      [reverseOrTop < 0, Math.abs(reverseOrTop)]:
      [reverseOrTop, Number.POSITIVE_INFINITY];

    if (this.tapCallbacks.length || !optimize || Number.isFinite(this.topCount) || Number.isFinite(top)) {
      return super.sortBy(valueSelector, reverseOrTop, opts);
    }

    return this.sortInternal(this.source, valueSelector, undefined, reverse, top, opts);
  }

  sorted(): T extends ComparableType? Seq<T>: never;
  sorted(reverse: boolean): T extends ComparableType? Seq<T>: never;
  sorted(top: number, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;

  sorted(reverseOrTop?: boolean | number, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;

  sorted(reverseOrTop?: boolean | number, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never {
    const optimize = SeqTags.optimize(this);
    const [reverse, top] = typeof reverseOrTop === 'number'?
      [reverseOrTop < 0, Math.abs(reverseOrTop)]:
      [reverseOrTop, Number.POSITIVE_INFINITY];

    if (this.tapCallbacks.length || !optimize || Number.isFinite(this.topCount) || Number.isFinite(top)) {
      return super.sorted(reverseOrTop, opts);
    }

    return this.sortInternal(this.source, undefined, undefined, reverse, top, opts) as any;
  }

  private thenByInternal<K>(keySelector: (x: T) => K, comparer: Comparer<K> | undefined, reverse: boolean): SortedSeq<T> {
    const nextComparer = createComparer(keySelector, comparer, reverse);

    const baseComparer = this.comparer;
    const finalComparer = nextComparer? baseComparer?
        (a: any, b: any) => baseComparer(a, b) || nextComparer(a, b):
        (a: any, b: any) => nextComparer(a, b):
      baseComparer;

    const instance = this.transferOptimizeTag(new SortedSeqImpl(this.source, finalComparer, this.topCount, this.opts));
    instance.tapCallbacks.push(...this.tapCallbacks);

    return instance;
  }

  private sourceToSeq(): Seq<T> {
    return SeqTags.isSeq(this.source)?
      this.source:
      this.createDefaultSeq(this.source, undefined, [
        [SeqTags.$notAffectingNumberOfItems, true],
        [SeqTags.$notMappingItems, true]]);
  }

  private getSortedItems(): Iterable<T> {
    const comparer = this.comparer as Comparer<T>;

    if (!Number.isFinite(this.topCount)) return comparer === DONT_COMPARE?
      this.source:
      (isArray(this.source)? this.source.slice(): [...this.source]).sort(comparer);

    const count = Math.abs(this.topCount);

    if (count < 1) return EMPTY_ARRAY;

    const maxLength = (isArray(this.source)? this.source.length: SeqTags.maxCount(this.source)) ?? Number.POSITIVE_INFINITY;

    const MAX_ARRAY_OPTIMAL_SIZE = 10 * 1024;

    const topOptimized = () => {
      let array = isArray(this.source)? this.source.slice(): [...this.source];

      if (comparer === DONT_COMPARE) {
        if (array.length > count) {
          if (this.topCount < 0 /* take last */) array.splice(0, array.length - count);
          else array.length = count;
        }

      } else array = array.length > count?
        partialQuickSort(array, this.topCount, comparer ?? LEGACY_COMPARER):
        array.sort(comparer);

      return array;
    };

    const topUnoptimized = () => {
      if (comparer === DONT_COMPARE) {
        const seq = this.createDefaultSeq(this.source);
        return this.topCount < 0? seq.takeLast(count): seq.take(count);
      }

      const adaptedComparer = this.topCount < 0?
        createComparer<T>(undefined, comparer, true):
        comparer;

      const sorted = partialBinaryInsertionSort(this.source, count, adaptedComparer ?? LEGACY_COMPARER, this.opts);
      if (this.topCount > 0) return sorted;

      // take last
      return {
        * [Symbol.iterator]() {
          for (let i = sorted.length - 1; i >= 0; i--) yield sorted[i];
        }
      }
    };

    return (!this.opts?.stable && maxLength <= Math.max(MAX_ARRAY_OPTIMAL_SIZE, count))?
      topOptimized():
      topUnoptimized();
  }
}
