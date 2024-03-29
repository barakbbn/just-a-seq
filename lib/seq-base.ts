import {internalEmpty} from './internal';
import {
  CachedSeq,
  ComparableType,
  Comparer,
  Condition,
  factories,
  FlatSeq,
  Iterables,
  Selector,
  Seq,
  SeqOfGroups,
  SortedSeq,
  ToComparableKey
} from './seq';
import {
  closeIterator,
  consume,
  Dict,
  entries,
  Gen, generate,
  getIterator,
  IDENTITY,
  IGNORED_ITEM,
  isArray,
  isIterable,
  IterationContext,
  sameValueZero,
  SeqTags,
  TaggedSeq,
  tapIterable
} from './common';
import {Seq as SeqFactory} from './seq-factory';
import {LEGACY_COMPARER} from './sort-util';

export abstract class SeqBase<T> implements Seq<T>, TaggedSeq {

  readonly [SeqTags.$seq] = true;
  readonly length = this.count;

  aggregate<U, TRes>(initialValue: U, aggregator: (previousValue: U, currentValue: T, currentIndex: number) => U, resultSelector: (aggregatedValue: U) => TRes): TRes {
    let previousValue = initialValue;
    for (const {value, index} of entries(this)) {
      previousValue = aggregator(previousValue, value, index);
    }

    return resultSelector(previousValue);
  }

  aggregateRight<U, TRes>(initialValue: U, aggregator: (previousValue: U, currentValue: T, currentIndex: number) => U, resultSelector: (aggregatedValue: U) => TRes): TRes {
    return resultSelector([...this].reduceRight(aggregator, initialValue));
  }

  all(condition: Condition<T>): boolean {
    return this.allInternal(condition);
  }

  any(condition?: Condition<T>): boolean {
    return this.anyInternal(condition);
  }

  as<U>(): Seq<U> {
    return this as unknown as Seq<U>;
  }

  readonly asSeq = (): Seq<T> => {
    return this.createDefaultSeq(this.getSourceForNewSequence(), undefined, [
      [SeqTags.$notAffectingNumberOfItems, true],
      [SeqTags.$notMappingItems, true]]);
  };

  at(index: number, fallback?: T): T | undefined {
    index = Math.trunc(index);
    if (index < 0) {
      const buffer = new CyclicBuffer<T>(-index);
      for (const item of this) buffer.write(item);
      index = buffer.count + index;
      const result = (index < 0)? fallback: buffer.at(index);
      buffer.clear();
      return result;
    }

    for (const item of this) if (0 === index--) return item;

    return fallback;
  }

  append(...items: T[]): Seq<T> {
    return this.generate(function* append(self: Iterable<T>) {
      yield* self;
      yield* items;
    });
  }

  average(): T extends number? number: never;

  average(selector: Selector<T, number>): number;

  average(selector: Selector<T, number> = IDENTITY): number | never {
    let sum = 0;
    let count = 0;
    for (const value of this) sum += selector(value, count++);
    return count? (sum / count): Number.NaN;
  }

  cache(now?: boolean): CachedSeq<T> {
    return this.transferOptimizeTag(factories.CachedSeq(this.getSourceForNewSequence(), now));
  }

  cartesian<Ts extends any[]>(...sources: Iterables<Ts>): Seq<[T, ...Ts]> {
    const result = this.generate(function* permutations(thisSource) {
      const permutation: any[] = new Array(sources.length + 1);

      function* loop(source: Iterables<Ts>[number], depth = -1): Generator<any[]> {
        if (depth === sources.length) {
          yield permutation.slice();
          return;
        }

        depth++;
        const nextSource = sources[depth];
        for (const item of source) {
          permutation[depth] = item;
          yield* loop(nextSource, depth);
        }
      }

      yield* loop(thisSource);
    });

    return result as unknown as Seq<[T, ...Ts]>;

  }

  chunk(size: number, maxChunks: number = Number.MAX_SAFE_INTEGER): Seq<Seq<T>> {
    size = Math.trunc(size);
    if (size <= 0) {
      throw new Error('size parameter must be positive value');
    }

    if (maxChunks < 1) return internalEmpty<Seq<T>>();

    return this.chunkBy(info => ({
      endOfChunk: info.itemNumber === size,
      isLastChunk: info.chunkNumber === maxChunks,
      whatAboutTheItem: 'KeepIt'
    })) as unknown as Seq<Seq<T>>;
  }

  chunkBy<U>(
    splitLogic: (info: {
      item: T;
      index: number;
      itemNumber: number;
      chunkNumber: number;
      userData?: U;
    }) => {
      endOfChunk?: boolean;
      isLastChunk?: boolean;
      whatAboutTheItem?: 'KeepIt' | 'SkipIt' | 'MoveToNextChunk';
      userData?: U;
    },
    shouldStartNewChunk: (info: {
      chunkNumber: number;
      processedItemsCount: number;
      userData?: U;
    }) => boolean = () => true
  ): Seq<CachedSeq<T>> {

    const self = this;
    const optimize = SeqTags.optimize(this);
    return this.generate(function* chunkBy(items, iterationContext) {

      iterationContext.onClose(() => innerSeq?.consume());
      const iterator = iterationContext.closeWhenDone(getIterator(items));

      let innerSeq: CachedSeq<T> | undefined;
      let index = 0;
      let chunkNumber = 0;
      let userData: U | undefined = undefined;

      let next = iterator.next();
      let isLastChunk: boolean | undefined;
      while (!next.done) {
        innerSeq?.consume();
        if (next.done || isLastChunk) break;

        chunkNumber++;

        if (!shouldStartNewChunk({chunkNumber, processedItemsCount: index, userData})) {
          break;
        }

        innerSeq = self.tagAsOptimized(factories.CachedSeq<T>(new Gen(items, function* innerChunkCache() {
          let itemNumber = 1;
          let endOfChunk: boolean | undefined;

          while (!endOfChunk && !next.done) {
            const itemInfo = {item: next.value, index, itemNumber, chunkNumber, userData};

            const resolution = splitLogic(itemInfo);
            ({endOfChunk, isLastChunk, userData} = resolution);
            let whatAboutTheItem = resolution.whatAboutTheItem ?? 'KeepIt';
            if (!endOfChunk && whatAboutTheItem === 'MoveToNextChunk') whatAboutTheItem = 'KeepIt';
            if (whatAboutTheItem === 'KeepIt') {
              yield next.value;
              itemNumber++;
            }

            const shouldStop = isLastChunk && endOfChunk;
            if (!shouldStop && whatAboutTheItem !== 'MoveToNextChunk') {
              next = iterator.next();
              index++;
            }
          }

        })), optimize);

        yield innerSeq;
      }
    });
  }

  chunkByLimit(limit: number, opts?: {
    maxItemsInChunk?: number;
    maxChunks?: number;
  }): T extends number? Seq<Seq<T>>: never;
  chunkByLimit(limit: number, selector: (item: T, index: number, itemNumber: number) => number, opts?: {
    maxItemsInChunk?: number;
    maxChunks?: number;
  }): Seq<Seq<T>>;
  chunkByLimit(limit: number, selectorOrOpts?: ((item: T, index: number, itemNumber: number) => number) | {
    maxItemsInChunk?: number;
    maxChunks?: number;
  }, opts?: { maxItemsInChunk?: number; maxChunks?: number; }): Seq<Seq<T>> {
    const selector = typeof selectorOrOpts !== 'function'?
      IDENTITY:
      selectorOrOpts;

    if (selectorOrOpts && typeof selectorOrOpts === 'object') opts = selectorOrOpts;
    const actualOpts = {maxItemsInChunk: Number.MAX_SAFE_INTEGER, maxChunks: Number.MAX_SAFE_INTEGER, ...opts};
    if (actualOpts.maxItemsInChunk <= 0) {
      throw new Error('maxItemsInChunk parameter must be positive value');
    }
    if (actualOpts.maxChunks < 1) return internalEmpty<Seq<T>>();

    return this.chunkBy<number>(info => {
      const value = selector(info.item, info.index, info.itemNumber);
      const nextValue = (info.userData ?? 0) + value;
      const reachedMaxItems = info.itemNumber === actualOpts.maxItemsInChunk;
      const endOfChunk = nextValue >= limit || reachedMaxItems;
      const takeItem = nextValue <= limit || reachedMaxItems || info.itemNumber === 1;
      const isLastChunk = info.chunkNumber === actualOpts.maxChunks;
      return {
        endOfChunk,
        isLastChunk,
        whatAboutTheItem: takeItem? 'KeepIt': 'MoveToNextChunk',
        userData: endOfChunk? 0: nextValue
      };
    }) as unknown as Seq<Seq<T>>;
  }

  concat(...items: Iterable<T>[]): Seq<T> {
    if (!items.length) return this;
    return this.generate(function* concat(self: Iterable<T>) {
      yield* self;
      for (const part of items) yield* part;
    });
  }

  concat$(...items: (T | Iterable<T>)[]): Seq<T> {
    return this.generate(function* concat(self: Iterable<T>) {
      yield* self;
      for (const part of items) {
        if (isIterable(part, true)) yield* part;
        else yield part;
      }
    });
  }

  consume(): void {
    consume(this);
  }

  count(condition?: Condition<T>): number {
    return this.countInternal(condition);
  }

  diff(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  diff<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): Seq<T | U>;

  diff<U, K>(
    items: Iterable<U>,
    firstKeySelector: (item: T) => K = IDENTITY,
    secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): Seq<T | U> {

    return this.generate(function* diff(self) {

      const second: [U, K][] = Array.from(items, item => [item, secondKeySelector(item)]);

      if (!second.length) {
        yield* self;
        return;
      }

      const secondKeys = new Set<K>(second.map(([_, key]) => key));
      const firstKeys = new Set<K>();

      for (const item of self) {
        const key = firstKeySelector(item);
        if (!secondKeys.has(key)) yield item;
        firstKeys.add(key);
      }
      secondKeys.clear();

      for (const [value, key] of second) {
        if (!firstKeys.has(key)) yield value;
      }

      firstKeys.clear();
      second.length = 0;
    });
  }

  diffDistinct(items: Iterable<T>, keySelector: (item: T) => unknown = IDENTITY): Seq<T> {
    const self = this;
    return this.generate(function* diff() {
      const second: [T, unknown][] = Array.from(items, item => [item, keySelector(item)]);

      if (!second.length) {
        yield* self.distinct(keySelector);
        return;
      }

      const secondKeys = new Set<unknown>(second.map(([_, key]) => key));
      const firstKeys = new Set<unknown>();

      for (const item of self) {
        const key = keySelector(item);
        if (!secondKeys.has(key) && !firstKeys.has(key)) yield item;
        firstKeys.add(key);
      }
      secondKeys.clear();

      for (const [value, key] of second) {
        if (!firstKeys.has(key)) {
          firstKeys.add(key);
          yield value;
        }
      }

      firstKeys.clear();
      second.length = 0;
    });
  }

  diffMatch(second: Iterable<T>): {
    firstMatched: CachedSeq<T>;
    firstDiff: CachedSeq<T>;
    secondMatched: CachedSeq<T>;
    secondDiff: CachedSeq<T>;
  };

  diffMatch(second: Iterable<T>, keySelector: (item: T) => unknown): {
    firstMatched: CachedSeq<T>;
    firstDiff: CachedSeq<T>;
    secondMatched: CachedSeq<T>;
    secondDiff: CachedSeq<T>;
  };

  diffMatch<U = T>(second: Iterable<U>, keySelector: (item: T | U) => unknown): {
    firstMatched: CachedSeq<T>;
    firstDiff: CachedSeq<T>;
    secondMatched: CachedSeq<U>;
    secondDiff: CachedSeq<U>;
  };

  diffMatch<R, U = T>(second: Iterable<U>, keySelector: (item: T | U) => unknown, resultSelector: (firstMatched: CachedSeq<T>, firstDiff: CachedSeq<T>, secondMatched: CachedSeq<U>, secondDiff: CachedSeq<U>) => R): R;

  diffMatch<R, U = T>(
    second: Iterable<U>,
    keySelector: (item: T | U) => unknown = IDENTITY,
    resultSelector?: (firstMatched: CachedSeq<T>, firstDiff: CachedSeq<T>, secondMatched: CachedSeq<U>, secondDiff: CachedSeq<U>) => R
  ): R {

    const self = this;

    const firstMatched: T[] = [];
    const firstDiff: T[] = [];
    const secondMatched: U[] = [];
    const secondDiff: U[] = [];
    const secondByKey: [unknown, U][] = [];
    const keys = new Set<unknown>();
    const matchedKeys = new Set<unknown>();

    let iterated = false;

    function IterateAndPopulateItems(): void {
      if (iterated) return;

      for (const value of second) {
        const key = keySelector(value);
        keys.add(key);
        secondByKey.push([key, value]);
      }

      for (const value of self.getSourceForNewSequence()) {
        const key = keySelector(value);
        const hasMatch = keys.has(key);
        if (hasMatch) {
          firstMatched.push(value);
          matchedKeys.add(key);
        } else {
          firstDiff.push(value);
        }
      }

      keys.clear();

      for (const [k, v] of secondByKey) {
        if (matchedKeys.has(k)) secondMatched.push(v);
        else secondDiff.push(v);
      }

      matchedKeys.clear();
      secondByKey.length = 0;

      iterated = true;
    }

    const firstMatchedGen = generate(function* () {
      IterateAndPopulateItems();
      yield* firstMatched;
    });

    const secondMatchedGen = generate(function* () {
      IterateAndPopulateItems();
      yield* secondMatched;
    });

    const firstDiffGen = generate(function* () {
      IterateAndPopulateItems();
      yield* firstDiff;
    });

    const secondDiffGen = generate(function* () {
      IterateAndPopulateItems();
      yield* secondDiff;
    });

    const firstMatchedSeq = factories.CachedSeq(firstMatchedGen);
    const secondMatchedSeq = factories.CachedSeq(secondMatchedGen);
    const firstDiffSeq = factories.CachedSeq(firstDiffGen);
    const secondDiffSeq = factories.CachedSeq(secondDiffGen);

    return resultSelector?
      resultSelector(firstMatchedSeq, firstDiffSeq, secondMatchedSeq, secondDiffSeq):
      {
        firstMatched: firstMatchedSeq,
        secondMatched: secondMatchedSeq,
        firstDiff: firstDiffSeq,
        secondDiff: secondDiffSeq
      } as unknown as R;
  }

  distinct(keySelector: Selector<T, unknown> = IDENTITY): Seq<T> {
    return this.generate(function* distinct(self) {
      const keys = new Set<unknown>();
      let index = 0;
      for (const item of self) {
        const key = keySelector(item, index++);
        if (keys.has(key)) continue;
        keys.add(key);
        yield item;
      }
      keys.clear();
    });
  }

  distinctUntilChanged(keySelector?: Selector<T, unknown>): Seq<T>;
  distinctUntilChanged({equals}: { equals(prev: T, next: T): unknown; }): Seq<T>;
  distinctUntilChanged(keySelectorOrEquals?: Selector<T, unknown> | { equals(a: T, b: T): unknown; }): Seq<T> {
    const [keySelector, equals]: [Selector<T, any>, (a: any, b: any) => any] =
      typeof keySelectorOrEquals === 'function'?
        [keySelectorOrEquals, sameValueZero]:
        typeof keySelectorOrEquals?.equals === 'function'?
          [IDENTITY, keySelectorOrEquals?.equals]:
          [IDENTITY, sameValueZero];

    return this.generate(function* distinctUntilChanged(self) {
      let prevValue: any = undefined;
      let index = 0;
      for (const item of self) {
        const key = keySelector(item, index);
        if (index > 0 && equals(key, prevValue)) continue;
        prevValue = key;
        index++;
        yield item;
      }
    });
  }

  endsWith(items: Iterable<T>, keySelector?: (item: T) => unknown): boolean;

  endsWith<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): boolean;

  endsWith<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  endsWith<U = T>(items: Iterable<U>, {equals}: { equals(t: T, u: U): unknown; }): boolean;

  endsWith<U, K>(items: Iterable<U>, firstKeySelector?: ((item: T) => K) | {
    equals(t: T, u: U): unknown;
  }, secondKeySelector?: (item: U) => K): boolean {
    if (this === items) return true;

    function isEqualsFunc(param?: any): param is { equals(t: T, u: U): unknown; } {
      return typeof param?.equals === 'function';
    }

    if (!secondKeySelector) secondKeySelector = firstKeySelector as unknown as ((item: U) => K) | undefined;

    let equals: (t: T, u: U) => unknown = isEqualsFunc(firstKeySelector)? firstKeySelector.equals: sameValueZero;

    const first = firstKeySelector && !isEqualsFunc(firstKeySelector)?
      Array.from(this, (item: T) => firstKeySelector(item)):
      Array.from(this) as unknown as K[];

    const useSecondKeySelector = secondKeySelector && !isEqualsFunc(firstKeySelector);

    const second = useSecondKeySelector?
      Array.from(items, (item: U) => secondKeySelector!(item)):
      Array.isArray(items)? items as K[]:
        Array.from(items) as unknown as K[];

    let offset = first.length - second.length;
    if (offset < 0) return false;
    for (const item of second) {
      if (!equals(first[offset++] as unknown as T, item as unknown as U)) return false;
    }
    return true;
  }

  every(condition: Condition<T>): boolean {
    return this.all(condition);
  }

  entries(): Seq<[number, T]> {
    return this.map((item, index) => [index, item]);
  }

  filter(condition: Condition<T>): Seq<T>;

  filter<S extends T>(condition: (item: T, index: number) => item is S): Seq<S> {
    const filter = {filter: condition};
    return factories.FilterMapSeq<T, S>(this.getSourceForNewSequence(), filter);
  }

  findIndex(condition: Condition<T>): number;

  findIndex(fromIndex: number, condition: Condition<T>): number;

  findIndex(fromIndex: number | Condition<T>, condition?: Condition<T>): number {
    return this.findFirstByCondition(fromIndex, condition)[0];
  }

  find<S extends T>(typeGuard: (item: T, index: number) => item is S): S | undefined;

  find<S extends T>(fromIndex: number, typeGuard: (item: T, index: number) => item is S, fallback?: S | undefined): S | undefined;

  find(condition: Condition<T>, fallback?: T | undefined): T | undefined;

  find(fromIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  find<S extends T>(fromIndex: number | ((item: T, index: number) => item is S) | Condition<T>, condition?: ((item: T, index: number) => item is S) | Condition<T> | S | undefined, fallback?: S | undefined): S | undefined {
    return this.findFirstByCondition(fromIndex, condition, fallback)[1];
  }

  findLast<S extends T>(typeGuard: (item: T, index: number) => item is S): S | undefined;

  findLast<S extends T>(tillIndex: number, typeGuard: (item: T, index: number) => item is S, fallback?: S | undefined): S | undefined;

  findLast(condition: Condition<T>, fallback?: T): T | undefined; // Overload

  findLast(tillIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findLast(tillIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): T | undefined {
    return this.findLastByCondition(tillIndex, condition, fallback)[1];
  }

  findLastIndex(condition: Condition<T>): number;

  findLastIndex(tillIndex: number, condition: Condition<T>): number;

  findLastIndex(tillIndex: number | Condition<T>, condition?: Condition<T>): number {
    return this.findLastByCondition(tillIndex, condition)[0];
  }

  first(defaultIfEmpty: T): T;
  first(defaultIfEmpty?: T): T | undefined;
  first(defaultIfEmpty?: T): T | undefined {
    // noinspection LoopStatementThatDoesntLoopJS
    for (const value of this) {
      return value;
    }
    return defaultIfEmpty;
  }

  firstAndRest(defaultIfEmpty?: T): [first: T, second: Seq<T>] & { first: T; rest: Seq<T>; } {
    const first = this.first(defaultIfEmpty) as T;
    const rest = this.skip(1);
    const result: [T, Seq<T>] = [first, rest];
    (result as any).first = first;
    (result as any).rest = rest;
    return result as ([first: T, second: Seq<T>] & { first: T; rest: Seq<T>; });
  }

  flat<T, D extends number = 1>(depth?: D): Seq<FlatSeq<T, D>> {
    const level = depth ?? 1;

    function* flatten<U>(maybeIterable: U, level: number): any {
      if (level >= 0 && isIterable(maybeIterable, true)) {
        for (const item of maybeIterable) {
          yield* flatten(item, level - 1);
        }
      } else yield maybeIterable;
    }

    return this.generate(function* flat(items) {
      yield* flatten(items, level);
    });
  }

  // flatMap<U, R = U>(selector: Selector<T, Iterable<U>>, mapResult?: ((subItem: U, parent: T, index: number) => R)): Seq<R> {
  //   return this.generate(function* flatMap(items) {
  //     for (const {value, index} of entries(items)) {
  //       const subItems = selector(value, index);
  //       if (!isIterable(subItems, true)) {
  //         const finalValue = mapResult? mapResult(subItems, value, index): subItems as unknown as R;
  //         yield finalValue;
  //       } else for (const {value: subValue, index: subIndex} of entries(subItems)) {
  //         const finalValue = mapResult? mapResult(subValue, value, subIndex): subValue as unknown as R;
  //         yield finalValue;
  //       }
  //     }
  //   });
  // }
  flatMap<U>(selector: Selector<T, Iterable<U>>): Seq<U>;

  flatMap<V1, TRes = V1>(
    selector: Selector<T, Iterable<V1>>,
    mapResult: (subItem: V1, parent: T, index: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, TRes = V2>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    mapResult: (lastItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, TRes = V3>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    mapResult: (lastItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, V4, TRes = V4>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    mapResult: (lastItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, V4, V5, TRes = V5>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    mapResult: (lastItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, V4, V5, V6, TRes = V6>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    selector6: (subItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V6>,
    mapResult: (lastItem: V6, parent: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, V4, V5, V6, V7, TRes = V7>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    selector6: (subItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V6>,
    selector7: (subItem: V6, parent: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V7>,
    mapResult: (lastItem: V7, parent: V6, ancestor5: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, V4, V5, V6, V7, V8, TRes = V8>(
    selector1: (item: T, relativeIndex: number, absoluteIndex: number) => Iterable<V1>,
    selector2: (subItem: V1, parent: T, relativeIndex: number, absoluteIndex: number) => Iterable<V2>,
    selector3: (subItem: V2, parent: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V3>,
    selector4: (subItem: V3, parent: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V4>,
    selector5: (subItem: V4, parent: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V5>,
    selector6: (subItem: V5, parent: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V6>,
    selector7: (subItem: V6, parent: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V7>,
    selector8: (subItem: V7, parent: V6, ancestor5: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => Iterable<V8>,
    mapResult: (lastItem: V8, parent: V7, ancestor6: V6, ancestor5: V5, ancestor4: V4, ancestor3: V3, ancestor2: V2, ancestor1: V1, ancestor0: T, relativeIndex: number, absoluteIndex: number) => TRes
  ): Seq<TRes>;

  flatMap<V1, V2, V3, V4, V5, V6, V7, V8, TRes>(
    ...selectorsAndMapResults: (((...args: unknown[]) => Iterable<unknown>) | ((...args: unknown[]) => TRes))[]
  ): any {
    const mapResult = selectorsAndMapResults.length > 1? selectorsAndMapResults.pop() as (...args: unknown[]) => TRes: IDENTITY;
    const selectors = selectorsAndMapResults as ((...args: unknown[]) => Iterable<unknown>)[];

    return this.generate(function* flatHierarchy(items) {
      const absoluteIndexes = new Array<number>(selectorsAndMapResults.length + 1).fill(0);

      for (const entry of entries(recursiveFlatMap(items, 0, []))) {
        yield mapResult(...entry.value, entry.index);
      }

      function* recursiveFlatMap(children: Iterable<unknown>, level: number, context: any[]): Generator<unknown[]> {
        const selector = selectors[level];

        const parents = context.slice();
        parents.unshift(0);
        for (const entry of entries(children)) {
          const subChildren = selector? selector(entry.value, ...context, entry.index, absoluteIndexes[level]++): undefined;
          parents[0] = entry.value;

          if (isIterable(subChildren, true)) {
            yield* recursiveFlatMap(subChildren, level + 1, parents);
          } else {
            if (subChildren !== undefined) parents.unshift(subChildren);
            parents.push(entry.index);
            yield parents;
          }
        }
        parents.length = 0; // Assist in releasing memory
      }
    });
  }

  forEach(callback: (value: T, index: number, breakLoop: object) => unknown): void {
    const breakLoop: any = {};

    for (const {value, index,} of entries(this)) {
      if (callback(value, index, breakLoop) === breakLoop) break;
    }
  }

  groupBy<K>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>): SeqOfGroups<K, T>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey: undefined, valueSelector: (item: T, index: number, key: K) => U): SeqOfGroups<K, U>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey: ToComparableKey<K>, valueSelector: (item: T, index: number, key: K) => U): SeqOfGroups<K, U>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>, valueSelector?: (item: T, index: number, key: K) => U): SeqOfGroups<K, U> {
    return this.transferOptimizeTag(factories.SeqOfGroups(this.getSourceForNewSequence(), keySelector, toComparableKey, valueSelector));
  }

  groupBy$<K extends object>(keySelector: Selector<T, K>): SeqOfGroups<K, T> {
    return this.groupBy(keySelector, JSON.stringify);
  }

  groupJoin<I, K>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>): SeqOfGroups<T, I> {
    return this.groupJoinInternal(this, outerKeySelector, inner, innerKeySelector);
  }

  groupJoinRight<I, K>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>): SeqOfGroups<I, T> {
    return this.groupJoinInternal(inner, innerKeySelector, this, outerKeySelector);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastInternal(count);
  }

  ifEmpty(value: T): Seq<T>;

  ifEmpty({useSequence}: { useSequence: Iterable<T> }): Seq<T>;

  ifEmpty({useFactory}: { useFactory: () => T }): Seq<T>;

  ifEmpty(value: T | { useSequence: Iterable<T> } | { useFactory: () => T }): Seq<T> {
    const isSequence = (v: any): v is { useSequence: Iterable<T> } => v && isIterable(v.useSequence);
    const isFactory = (v: any): v is { useFactory: () => T } => v && typeof (v.useFactory) === 'function';

    if (SeqTags.optimize(this) && SeqTags.empty(this)) return this.createDefaultSeq(
      isSequence(value)? value.useSequence: isFactory(value)? {
        * [Symbol.iterator]() {
          yield value.useFactory();
        }
      }: [value as T]);

    let valueProvider: () => Iterable<T>;
    if (isSequence(value)) valueProvider = (() => value.useSequence);
    else if (isFactory(value)) valueProvider = (() => [value.useFactory()]);
    else valueProvider = (() => [value as T]);

    return this.generate(function* ifEmpty(items, iterationContext) {
      const iterator = iterationContext.closeWhenDone(getIterator(items));
      let next = iterator.next();
      if (next.done) yield* valueProvider();
      else while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    return this.includesInternal(itemToFind, fromIndex);
  }

  includesAll<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean; // Overload

  includesAll<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  includesAll<U, K>(items: Iterable<U>,
                    firstKeySelector: (item: T) => K = IDENTITY,
                    secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {

    const lazyScan = new LazyScanAndMark(this, firstKeySelector);
    try {
      for (const value of items) {
        const key = secondKeySelector(value);
        const exists = lazyScan.everExistedNext(key);
        if (!exists) return false;
      }

      return true;

    } finally {
      lazyScan.dispose();
    }
  }

  includesAny<U = T>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean; // Overload

  includesAny<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  includesAny<U, K>(items: Iterable<U>,
                    firstKeySelector: (item: T) => K = IDENTITY,
                    secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {

    const lazyScan = new LazyScanAndMark(items, secondKeySelector);
    try {
      for (const item of this) {
        const key = firstKeySelector(item);
        if (lazyScan.everExistedNext(key)) return true;
      }
      return false;

    } finally {
      lazyScan.dispose();
    }
  }

  includesSubSequence<U = T>(subSequence: Iterable<U>, keySelector?: (item: T | U) => unknown): boolean;

  includesSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, keySelector?: (item: T | U) => unknown): boolean;

  includesSubSequence<U = T>(subSequence: Iterable<U>, options?: { equals(a: T, b: U): unknown }): boolean; // Overload

  includesSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, options?: {
    equals(a: T, b: U): unknown
  }): boolean; // Overload

  includesSubSequence<U>(subSequence: Iterable<U>,
                         param2?: number | ((item: T) => unknown) | { equals(a: T, b: U): unknown },
                         param3?: ((item: T) => unknown) | { equals(a: T, b: U): unknown }): boolean {

    let fromIndex = (typeof param2 === 'number')? param2: 0;
    let equals = parseEqualsFn(param3) ?? parseEqualsFn(param2) ?? sameValueZero;

    return this.findSubSequence(subSequence, fromIndex, equals)[0] > -1;
  }

  indexOf(itemToFind: T, fromIndex: number = 0): number {
    if (fromIndex >= 0) {
      for (const {value, index} of entries(this)) {
        if (index >= fromIndex && sameValueZero(itemToFind, value)) return index;
      }
      return -1;
    }

    const buffer = new CyclicBuffer<number>(-fromIndex);
    for (const {value, index} of entries(this)) {
      if (sameValueZero(itemToFind, value)) buffer.write(index);
    }

    const foundIndex = buffer.at(0);
    buffer.clear();
    return foundIndex ?? -1;
  }

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, keySelector?: (item: T | U) => unknown): number;

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, keySelector?: (item: T | U) => unknown): number;

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, options?: { equals(a: T, b: U): unknown }): number; // Overload

  indexOfSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, options?: {
    equals(a: T, b: U): unknown
  }): number; // Overload

  indexOfSubSequence<U>(subSequence: Iterable<U>,
                        param2?: number | ((item: T) => unknown) | { equals(a: T, b: U): unknown },
                        param3?: ((item: T) => unknown) | { equals(a: T, b: U): unknown }): number {

    let fromIndex = (typeof param2 === 'number')? param2: 0;
    let equals = parseEqualsFn(param3) ?? parseEqualsFn(param2) ?? sameValueZero;

    return this.findSubSequence(subSequence, fromIndex, equals)[0];
  }

  innerJoin<I, K, R = {
    outer: T;
    inner: I
  }>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>, resultSelector?: (outer: T, inner: I) => R): Seq<R> {
    return this.generate(function* innerJoin(self) {

      const innerMap = new Map<K, I[]>();
      for (const {value: innerValue, index: innerIndex} of entries(inner)) {
        const key = innerKeySelector(innerValue, innerIndex);
        const valuesForKey: I[] = innerMap.get(key) ?? [];
        if (!valuesForKey.length) innerMap.set(key, valuesForKey);
        valuesForKey.push(innerValue);
      }

      for (const {value: outer, index: outerIndex} of entries(self)) {
        const outerKey = outerKeySelector(outer, outerIndex);
        const innerValues = innerMap.get(outerKey)!;
        if (!innerValues) continue;
        for (const inner of innerValues) {
          yield resultSelector? resultSelector(outer, inner): {outer, inner} as unknown as R;
        }
      }
    });
  }

  insert(atIndex: number, ...items: Iterable<T>[]): Seq<T> {
    if (!items || items.length === 0) return this;

    return this.generate(function* insert(self) {
      let iterated = false;
      if (atIndex < 0) atIndex = 0;
      for (const {value, index} of entries(self)) {
        if (index === atIndex) {
          iterated = true;
          for (const seq of items) {
            if (isIterable(seq, true)) yield* seq;
            else yield seq;
          }
        }
        yield value;
      }
      if (!iterated) for (const seq of items) {
        if (isIterable(seq, true)) yield* seq;
        else yield seq;
      }
    });
  }

  insertAfter(condition: Condition<T>, ...items: Iterable<T>[]): Seq<T> {
    if (!items || items.length === 0) return this;

    return this.generate(function* insertAfter(self) {

      let keepChecking = true;
      for (const {value, index} of entries(self)) {
        yield value;
        if (keepChecking && condition(value, index)) {
          keepChecking = false;
          for (const seq of items) {
            if (isIterable(seq, true)) yield* seq;
            else yield seq;
          }
        }
      }
    });
  }

  insertBefore(condition: Condition<T>, ...items: Iterable<T>[]): Seq<T> {
    if (!items || items.length === 0) return this;

    return this.generate(function* insertBefore(self) {
      let keepChecking = true;
      for (const {value, index} of entries(self)) {
        if (keepChecking && condition(value, index)) {
          keepChecking = false;
          for (const seq of items) {
            if (isIterable(seq, true)) yield* seq;
            else yield seq;
          }
        }
        yield value;
      }
    });
  }

  interleave(...others: Iterable<T>[]): Seq<T> {
    return this.generate(function* interleave(self, iterationContext) {
      let iterators = new Set([self, ...others].map(iterable => iterationContext.closeWhenDone(getIterator(iterable))));
      while (iterators.size) {
        for (const iterator of iterators) {
          const next = iterator.next();
          if (next.done) {
            iterator.return?.();
            iterators.delete(iterator);
          } else {
            yield next.value;
          }
        }
      }
    });
  }

  intersect(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T> {
    return this.intersectWith(items, keySelector, keySelector);
  }

  intersectBy<K>(keys: Iterable<K>, keySelector: Selector<T, K>): Seq<T>;

  intersectBy<K>(keys: ReadonlySet<K>, keySelector: Selector<T, K>): Seq<T>;

  intersectBy<K>(keys: ReadonlyMap<K, unknown>, keySelector: Selector<T, K>): Seq<T>;

  intersectBy<K extends object>(second: Iterable<K> | ReadonlySet<K> | ReadonlyMap<K, unknown>, keySelector: Selector<T, K>): Seq<T> {
    return (isHashable(second))?
      this.intersectByKeys(second, keySelector):
      this.intersectWith(second, keySelector, undefined);
  }

  intersperse(separator: T, insideOut?: boolean): Seq<T>;

  intersperse<U>(separator: U, insideOut?: boolean): Seq<T | U>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: {
    prefix?: TPrefix;
    suffix?: TSuffix
  }): Seq<TPrefix | U | TSuffix>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: boolean | {
    prefix?: TPrefix;
    suffix?: TSuffix;
  }): Seq<TPrefix | U | TSuffix> {
    function isOpts(v: any): v is { prefix?: TPrefix; suffix?: TSuffix; } {
      return v && (v.prefix !== undefined || v.suffix !== undefined);
    }

    const {prefix, suffix} = opts === true?
      {prefix: separator, suffix: separator}:
      !isOpts(opts)?
        {prefix: undefined, suffix: undefined}:
        opts;

    return this.generate(function* intersperse(self) {
      let prefixed = prefix === undefined;
      let suffixed = suffix === undefined;
      let isFirst = true;

      for (const item of self) {
        if (!prefixed) {
          prefixed = true;
          yield prefix;
        }
        if (isFirst) isFirst = false;
        else yield separator;

        yield item;
      }

      if (!isFirst && !suffixed) yield suffix;

    }) as unknown as Seq<TPrefix | U | TSuffix>;
  }

  intersperseBy<U>(separatorFactory: (info: {
    prevItem: T;
    hasPervItem: boolean;
    prevItemIndex: number;
    nextItem: T;
    hasNextItem: boolean;
    isPrefixSeparator: boolean;
    isSuffixSeparator: boolean;
  }) => U, separatorAlignment: 'Inner' | 'Outer' | 'Left' | 'Right' = 'Inner'): Seq<T | U> {
    return this.generate(function* intersperseBy(self) {
      let isFirst = true;
      let shouldPrefix = separatorAlignment === 'Outer' || separatorAlignment === 'Left';
      let shouldSuffix = separatorAlignment === 'Outer' || separatorAlignment === 'Right';

      let prevItem: T = undefined as unknown as T;
      let index = 0;
      for (const item of self) {

        if (shouldPrefix) {
          shouldPrefix = false;
          yield separatorFactory({
            prevItem,
            hasPervItem: false,
            prevItemIndex: -1,
            nextItem: item,
            hasNextItem: true,
            isPrefixSeparator: true,
            isSuffixSeparator: false
          });
        }

        if (isFirst) isFirst = false;
        else yield separatorFactory({
          prevItem,
          hasPervItem: true,
          prevItemIndex: index++,
          nextItem: item,
          hasNextItem: true,
          isPrefixSeparator: false,
          isSuffixSeparator: false
        });

        yield item;
        prevItem = item;
      }

      if (shouldSuffix && !isFirst) {
        yield separatorFactory({
          prevItem,
          hasPervItem: true,
          prevItemIndex: index,
          nextItem: undefined as unknown as T,
          hasNextItem: false,
          isPrefixSeparator: false,
          isSuffixSeparator: true
        });
      }
    });
  }

  isEmpty(): boolean {
    if (SeqTags.optimize(this) && SeqTags.empty(this)) return true;
    // noinspection LoopStatementThatDoesntLoopJS
    for (const _ of this) return false;
    return true;
  }

  join(separator?: string): string;

  join(opts: { start?: string; separator?: string; end?: string }): string;

  join(separatorOrOpts?: string | { start?: string; separator?: string; end?: string }): string {
    const safe = (v: any, fallback: any) => v === undefined? fallback: v;

    const {start, separator, end} = (separatorOrOpts === undefined)?
      {start: '', separator: ',', end: ''}:
      (separatorOrOpts && typeof separatorOrOpts === 'object')?
        {
          start: safe(separatorOrOpts.start, ''),
          separator: safe(separatorOrOpts.separator, ','),
          end: safe(separatorOrOpts.end, '')
        }:
        {start: '', separator: separatorOrOpts, end: ''};

    return this.joinInternal(start, separator, end);
  }

  last(): T | undefined;

  last(fallback: T): T;

  last(fallback?: T): T | undefined {
    if (this.isEmpty()) return fallback;
    let lastItem = fallback;
    for (const item of this) lastItem = item;
    return lastItem;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    let index = 0;
    if (fromIndex != null && fromIndex < 0) {
      const buffer = new CyclicBuffer<number>(-fromIndex);
      for (const item of this) {
        if (sameValueZero(itemToFind, item)) buffer.write(index);
        index++;
      }

      const foundIndex = buffer.at(0) ?? -1;
      const positiveFromIndex = index + fromIndex;

      buffer.clear();
      return foundIndex > -1 && foundIndex <= positiveFromIndex? foundIndex: -1;
    }

    let foundIndex = -1;
    for (const item of this) {
      if (sameValueZero(itemToFind, item)) foundIndex = index;
      if (index === fromIndex) break;
      index++;
    }
    return foundIndex;
  }

  map<U = T>(mapFn: Selector<T, U>): Seq<U> {
    const map = {map: mapFn};
    return factories.FilterMapSeq<T, U>(this.getSourceForNewSequence(), map);
  }

  max(): T extends number? number: never;

  max(selector: Selector<T, number>): number;

  max(selector: Selector<T, number> = IDENTITY): number | void {
    const maxItemResult = this.maxItemBySelector(selector);
    return maxItemResult?.[1] ?? Number.NEGATIVE_INFINITY;
  }

  maxItem(selector: Selector<T, number>, options?: { findLast?: boolean; }): T | undefined;

  maxItem({comparer, findLast}: { comparer: (a: T, b: T) => number; findLast?: boolean; }): T | undefined;

  maxItem(selector: Selector<T, number> | { comparer: (a: T, b: T) => number; findLast?: boolean; }, options?: {
    findLast?: boolean;
  }): T | undefined {
    if (typeof selector === 'function') return this.maxItemBySelector(selector, options?.findLast)?.[0];

    if (typeof selector?.comparer === 'function') return this.maxItemByComparer(selector.comparer, selector.findLast);

    throw new Error('selector or comparer parameter must be a function');
  }

  min(): T extends number? number: never;

  min(selector: Selector<T, number>): number;

  min(selector: Selector<T, number> = IDENTITY): number | void {
    const maxItemResult = this.minItemBySelector(selector);
    return maxItemResult?.[1] ?? Number.POSITIVE_INFINITY;
  }

  minItem(selector: Selector<T, number>, options?: { findLast?: boolean; }): T | undefined;

  minItem({comparer}: { comparer: (a: T, b: T) => number; findLast?: boolean; }): T | undefined;

  minItem(selector: Selector<T, number> | { comparer: (a: T, b: T) => number; findLast?: boolean; }, options?: {
    findLast?: boolean;
  }): T | undefined {
    if (typeof selector === 'function') return this.minItemBySelector(selector, options?.findLast)?.[0];

    if (typeof selector?.comparer === 'function') return this.minItemByComparer(selector.comparer, selector.findLast);

    throw new Error('selector or comparer parameter must be a function');
  }

  move(from: number, count: number, to: number): Seq<T> {
    if (from < 0) from = 0;
    if (to < 0) to = 0;
    if (from === to || count <= 0) return this;

    const initialYieldCount = Math.min(from, to);
    const [bufferSize, shiftRightCount] = to > from?
      [count, to - from]:
      [from - to, count];

    return this.generate(function* move(items, iterationContext) {
      const iterator = iterationContext.closeWhenDone(getIterator(items));

      let _next = iterator.next();
      let done = _next.done;

      function nextValue(): T {
        const value = _next.value;
        _next = iterator.next();
        done = _next.done;
        return value;
      }

      for (let i = 0; i < initialYieldCount && !done; i++) yield nextValue();

      const buffer: T[] = new Array<T>(done? 0: bufferSize);
      let counter = 0;

      for (; counter < bufferSize && !done; counter++) buffer[counter] = nextValue();

      buffer.length = counter;

      for (let i = 0; i < shiftRightCount && !done; i++) yield nextValue();

      yield* buffer;
      while (!done) yield nextValue();
    });
  }

  ofType(type: 'number'): Seq<number>;

  ofType(type: 'string'): Seq<string>;

  ofType(type: 'boolean'): Seq<boolean>;

  ofType(type: 'function'): Seq<Function>;

  ofType(type: 'symbol'): Seq<symbol>;

  ofType(type: 'object'): Seq<object>;

  ofType(type: typeof Number): Seq<number>;

  ofType(type: typeof String): Seq<string>;

  ofType(type: typeof Boolean): Seq<boolean>;

  ofType(type: typeof Object): Seq<object>;

  ofType(type: typeof Symbol): Seq<symbol>;

  ofType<V extends new(...ags: any[]) => any>(type: V): Seq<InstanceType<V>>;

  ofType(type: any): Seq<any> {
    let typename: string = '';
    let instanceOf: Function | undefined = undefined;
    switch (type) {
      case Number:
        typename = 'number';
        break;
      case String:
        typename = 'string';
        break;
      case Object:
        typename = 'object';
        break;
      case Boolean:
        typename = 'boolean';
        break;
      case Symbol:
        typename = 'symbol';
        break;
      default:
        if (typeof type === 'string') typename = type;
        else if (typeof type === 'function') instanceOf = type;
        break;
    }

    if (typename) return this.filter(value => typeof value === typename);
    else if (instanceOf) {
      const fn = instanceOf;
      return this.filter(value => value instanceof fn);
    }
    return this.createDefaultSeq<any>();
  }

  padEnd(length: number, value: T): Seq<T> {
    length = Math.max(Math.trunc(length), 0);
    if (length === 0) return this;
    if (SeqTags.optimize(this)) {
      const maxCount = SeqTags.maxCount(this);
      if (maxCount != null) {
        if (length <= maxCount) return this;
        if (maxCount === 0) return SeqFactory.repeat(value, length);
      }
    }

    return this.generate(function* padEnd(items) {
      let counted = 0;
      for (const item of items) {
        yield item;
        counted++;
      }
      for (; length > counted; counted++) yield value;
    });
  }

  padStart(length: number, value: T): Seq<T> {
    length = Math.max(Math.trunc(length), 0);
    if (length === 0) return this;
    if (SeqTags.optimize(this)) {
      const maxCount = SeqTags.maxCount(this);
      if (maxCount != null) {
        if (length <= maxCount) return this;
        if (maxCount === 0) return SeqFactory.repeat(value, length);
      }
    }

    return this.generate(function* padStart(items, iterationContext) {
      const buffer = new Array<T>(length);
      let counted = 0;
      const iterator = iterationContext.closeWhenDone(getIterator(items));
      let next = iterator.next();
      while (!next.done && counted < length) {
        buffer[counted++] = next.value;
        next = iterator.next();
      }
      buffer.length = counted;

      for (; length > counted; counted++) yield value;

      yield* buffer;
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  partition<S extends T>(typeGuard: (item: T, index: number) => item is S): [matched: CachedSeq<S>, unmatched: CachedSeq<T>] & {
    matched: CachedSeq<S>,
    unmatched: CachedSeq<T>;
  };
  partition<S extends T, U>(typeGuard: (item: T, index: number) => item is S, resultSelector: (matched: CachedSeq<S>, unmatched: CachedSeq<T>) => U): U
  partition(condition: Condition<T>): [matched: CachedSeq<T>, unmatched: CachedSeq<T>] & {
    matched: CachedSeq<T>,
    unmatched: CachedSeq<T>
  };
  partition<U>(condition: Condition<T>, resultSelector: (matched: CachedSeq<T>, unmatched: CachedSeq<T>) => U): U;
  partition<S extends T, U = [matched: CachedSeq<S>, unmatched: CachedSeq<T>] & {
    matched: CachedSeq<S>,
    unmatched: CachedSeq<T>;
  }>(
    condition: (item: T, index: number) => item is S,
    resultSelector?: (matched: CachedSeq<S>, unmatched: CachedSeq<T>) => U
  ): U {

    if (!resultSelector) resultSelector = (matched: CachedSeq<S>, unmatched: CachedSeq<T>) => {
      const result: [CachedSeq<S>, CachedSeq<T>] = [matched, unmatched];
      (result as any).matched = matchedSeq;
      (result as any).unmatched = unmatchedSeq;
      return result as unknown as U;
    };
    const matched: S[] = [];
    const unmatched: T[] = [];

    const sourceIterator = new class {
      private index = -1;
      private refCount = 2;
      private _done: boolean | undefined = false;
      private _iter: Iterator<T> | undefined;

      constructor(private source: Iterable<T>) {
      }

      get done(): boolean {
        return !!this._done;
      };

      private get iter() {
        if (!this._iter) this._iter = getIterator(this.source);
        return this._iter;
      }

      iterateNext() {
        const {value, done} = this.iter.next();
        this._done = done;
        this.index++;
        if (!done) {
          if (condition(value, this.index)) matched.push(value);
          else unmatched.push(value);
        }
      }

      release(): void {
        if (this.refCount > 0) {
          this.refCount--;
          if (this.refCount === 0 && this._iter) {
            this._iter.return?.();
            this._iter = undefined;
          }
        }
      }
    }(this.getSourceForNewSequence());

    function* yieldNext(array: any[]): Generator<any, any, any> {
      while (!sourceIterator.done) {
        if (array.length) {
          yield* array;
          array.length = 0;
        }
        sourceIterator.iterateNext();
      }
    }

    const matchedGen = new Gen<S, S, S[]>(matched, function* (array, iterationContext) {
      iterationContext.onClose(() => sourceIterator.release());
      yield* yieldNext(array);
    });

    const unmatchedGen = new Gen<T, T, T[]>(unmatched, function* (array, iterationContext) {
      iterationContext.onClose(() => sourceIterator.release());
      yield* yieldNext(array);
    });

    const matchedSeq = factories.CachedSeq(matchedGen);
    const unmatchedSeq = factories.CachedSeq(unmatchedGen);

    return resultSelector!(matchedSeq, unmatchedSeq);
  }

  partitionWhile(condition: Condition<T>): [first: Seq<T>, second: Seq<T>] & { first: Seq<T>; second: Seq<T>; } {
    let iterator: Iterator<T>;
    let next: IteratorResult<T>;
    const first = factories.CachedSeq<T>(new Gen(this.getSourceForNewSequence(), function* partitionWhileFirst(source) {
      iterator = getIterator(source);
      next = iterator.next();
      let index = 0;
      while (!next.done && condition(next.value, index++)) {
        yield next.value;
        index++;
        next = iterator.next();
      }
    }));

    const second = factories.CachedSeq<T>(new Gen(internalEmpty(), function* partitionWhileSecond(_, iterationContext) {
      first.consume();
      iterationContext.onClose(() => iterator?.return?.());
      // iterationContext.closeWhenDone(iterator);
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    }));

    const result = [first, second] as unknown as ([CachedSeq<T>, CachedSeq<T>] & {
      first: CachedSeq<T>;
      second: CachedSeq<T>;
    });
    result.first = result[0];
    result.second = result[1];

    return result;
  }


  prepend(...items: Iterable<T>[]): Seq<T> {
    return this.insert(0, ...items);
  }

  push(...items: T[]): Seq<T> {
    return this.concat(items);
  }

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T;

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T;

  reduce<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduce<U = T>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {
    const iter = this.getIterator();
    let previous = initialValue;
    let index = initialValue !== undefined? 0: 1;
    let next = iter.next();
    if (previous === undefined) {
      if (next.done) throw TypeError('Reduce of empty sequence with no initial value');
      previous = next.value as unknown as U;
      next = iter.next();
    }

    let current: T;
    while (!next.done) {
      current = next.value;
      previous = reducer(previous, current, index++);
      next = iter.next();
    }

    return previous;
  }

  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T;

  reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T;

  reduceRight<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduceRight<U = T>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {
    const array = [...this];
    if (initialValue === undefined) {
      const overloadReducer = reducer as unknown as (previousValue: T, currentValue: T, currentIndex: number) => T;
      return array.reduceRight(overloadReducer) as unknown as U;
    }
    return array.reduceRight(reducer, initialValue);
  }

  /**
   * Remove first occurrences of items from source sequence
   * @param items
   * @param keySelector
   */
  remove<U>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): Seq<T>;

  remove<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): Seq<T>;

  // Synthetic overload needed for calling by derived class super
  remove<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T>;

  remove<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T> {
    return this.removeInternal(items, firstKeySelector, secondKeySelector, false);
  }

  /**
   * Remove all occurrences of items from source sequence
   * @param items
   * @param keySelector
   */
  removeAll<U>(items: Iterable<U>, keySelector?: (item: T | U) => unknown): Seq<T>;

  removeAll<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): Seq<T>;

  removeAll<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T>;

  removeAll<U, K>(items: Iterable<U>, firstKeySelector?: (item: T | U) => K, secondKeySelector?: (item: U) => K): Seq<T> {
    return this.removeInternal(items, firstKeySelector, secondKeySelector, true);
  }

  removeFalsy(): Seq<T> {
    return this.filter(IDENTITY);
  }

  removeKeys<K>(keys: Iterable<K>, keySelector: (item: T) => K): Seq<T>;

  removeKeys<K>(keys: ReadonlySet<K>, keySelector: (item: T) => K): Seq<T>;

  removeKeys<K>(keys: ReadonlyMap<K, unknown>, keySelector: (item: T) => K): Seq<T>;

  removeKeys<K>(keys: Iterable<K> | ReadonlySet<K> | ReadonlyMap<K, unknown>, keySelector: (item: T) => K): Seq<T> {
    return (isHashable(keys))?
      this.filter(item => !keys.has(keySelector(item))):
      this.removeAll(keys, keySelector, IDENTITY);
  }

  removeNulls(): Seq<T> {
    return this.filter(x => x != null);
  }

  repeat(count: number): Seq<T> {
    count = Math.trunc(count);
    if (count < 0) throw new Error('Count cannot be negative');
    if (count === 0) return internalEmpty<T>();
    if (count === 1) return this;
    return this.generate(function* repeat(self) {
      let counter = count;
      while (counter--) yield* self;
    });
  }

  reverse(): Seq<T> {
    return this.generate(function* reverse(self) {
      const array = [...self];
      for (let index = array.length - 1; index >= 0; index--) {
        yield array[index];
      }
      array.length = 0;
    });
  }

  sameItems<U = T>(second: Iterable<T>, keySelector?: (item: T | U) => unknown): boolean;

  sameItems<U = T, K = T>(second: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  sameItems<U, K>(second: Iterable<U>,
                  firstKeySelector: (item: T | U) => K = t => t as unknown as K,
                  secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {

    const lazyScan = new LazyScanAndMark(second, secondKeySelector);
    try {
      let firstCount = 0;
      for (const value of this) {
        firstCount++;
        const key = firstKeySelector(value /*, firstIndex++ */);
        const exists = lazyScan.includesNext(key);
        if (!exists) return false;
      }

      lazyScan.moveNext();
      const secondStatus = lazyScan.getStatus();
      return secondStatus.done && firstCount === secondStatus.count;

    } finally {
      lazyScan.dispose();
    }
  }

  sameOrderedItems<U = T>(second: Iterable<U>, equals: (first: T, second: U, index: number) => boolean = sameValueZero): boolean {
    const secondIterator = getIterator(second);
    let index = 0;
    let next = secondIterator.next();
    for (const first of this) {
      if (next.done) return false;

      const same = equals(first, next.value, index++);
      if (!same) return false;
      next = secondIterator.next();
    }
    secondIterator.return?.(); // Close the iterator

    return next.done ?? false;
  }

  scan(accumulator: (previousValue: T, currentValue: T, currentIndex: number) => T): Seq<T>;
  scan<U>(accumulator: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): Seq<U>;
  scan<U>(accumulator: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): Seq<U> {

    let actualScanFn: (a: any, b: any, index: number) => any = accumulator;

    if (initialValue === undefined) {
      actualScanFn = (a: any, b: any) => {
        actualScanFn = accumulator;
        return b;
      };
    }

    return this.generate(function* scan(items) {
      if (initialValue !== undefined) yield initialValue;
      let accumulated = initialValue;
      for (const {value, index} of entries(items)) {
        accumulated = actualScanFn(accumulated, value, index);
        yield accumulated!;
      }
    });
  }

  skip(count: number): Seq<T> {
    count = Math.trunc(count);
    if (count <= 0) return this;
    return this.skipWhile((_, index) => index < count);
  }

  skipFirst(): Seq<T> {
    return this.skip(1);
  }

  skipLast(count: number = 1): Seq<T> {
    count = Math.trunc(count);
    if (count <= 0) return this;
    return this.slice(0, -count);
  }

  skipWhile(condition: Condition<T>): Seq<T> {
    return this.generate(function* skipWhile(self: Iterable<T>) {
      let keepSkipping = true;
      for (const {value, index} of entries(self)) {
        if (keepSkipping) {
          if (condition(value, index)) continue;
          else keepSkipping = false;
        }
        yield value;
      }
    });
  }

  slice(start: number, end: number): Seq<T> {
    start = Math.trunc(start);
    end = Math.trunc(end);

    if (end === 0 || end - start === 0) return internalEmpty<T>();

    // Both non negative
    if (start >= 0 && end > 0) return this.generate(function* slice(self) {
      let index = 0;
      for (const item of self) {
        if (index >= start && index < end) yield item;
        index++;
      }
    });

    // Negative skip positive take
    if (start < 0 && end > 0) return this.generate(function* slice(self) {
      const buffer = new CyclicBuffer<T>(-start);
      const length = buffer.writeMany(self);
      start += length;
      if (start < 0) start = 0;
      if (end - start <= 0) return;
      const count = end -= start;
      let index = 0;
      for (const item of buffer) {
        yield item;
        if (++index == count) break;
      }
    });

    // positive skip negative take
    if (start > 0 && end < 0) return this.generate(function* slice(self) {
      const buffer: T[] = [];

      let index = 0;
      for (const item of self) {
        if (index++ < start) continue;
        buffer.push(item);
      }
      end = index + end - start;
      if (end > 0) yield* buffer.slice(undefined, end);
      buffer.length = 0;
    });

    // Both skip, take negative
    return this.generate(function* slice(self) {
      // TODO: consider using Cyclic buffer
      const array = [...self].slice(start, end);
      yield* array;
    });
  }

  some(condition: Condition<T> = () => true): boolean {
    return this.any(condition);
  }

  sort(): Seq<T>;
  sort(comparer: Comparer<T>, opts?: { stable?: boolean; }): Seq<T>;
  sort(comparer: Comparer<T>, top: number, opts?: { stable?: boolean; }): Seq<T>;
  sort(comparer?: Comparer<T>, top?: number, opts?: { stable?: boolean; }): Seq<T>; // needed by derived classes
  sort(comparer?: Comparer<T>, topOrOpts?: number | { stable?: boolean; }, opts?: { stable?: boolean; }): Seq<T> {
    const [top, actualOpts] = topOrOpts == null?
      [undefined, opts]:
      typeof topOrOpts === 'number'?
        [topOrOpts, opts]:
        [undefined, topOrOpts];
    const reverse = top != null && top < 0;
    const count = Math.abs(top ?? Number.POSITIVE_INFINITY);
    return this.sortInternal(this.getSourceForNewSequence(), undefined, comparer ?? LEGACY_COMPARER, reverse, count, actualOpts) as any;
  }

  sortBy(valueSelector: (item: T) => unknown, opts?: { stable?: boolean; }): SortedSeq<T>;
  sortBy(valueSelector: (item: T) => unknown, reverse: boolean, opts?: { stable?: boolean; }): SortedSeq<T>;
  sortBy(valueSelector: (item: T) => unknown, top: number, opts?: { stable?: boolean; }): SortedSeq<T>;
  sortBy(valueSelector: (item: T) => unknown, reverseOrTopOrOpts?: boolean | number | { stable?: boolean; }, opts?: {
    stable?: boolean;
  }): SortedSeq<T>; // needed by derived classes
  sortBy(valueSelector: (item: T) => unknown, reverseOrTopOrOpts?: boolean | number | { stable?: boolean; }, opts?: {
    stable?: boolean;
  }): SortedSeq<T> {
    const [reverse, top, actualOpts] = typeof reverseOrTopOrOpts === 'number'?
      [reverseOrTopOrOpts < 0, Math.abs(reverseOrTopOrOpts), opts]:
      typeof reverseOrTopOrOpts === 'boolean'?
        [reverseOrTopOrOpts, undefined, opts]:
        [false, undefined, reverseOrTopOrOpts];

    const source = this.getSourceForNewSequence();

    return this.sortInternal(source, valueSelector, undefined, reverse, top, actualOpts) as any;
  }

  sorted(opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;
  sorted(reverse: boolean, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;
  sorted(top: number, opts?: { stable?: boolean; }): T extends ComparableType? Seq<T>: never;
  sorted(reverseOrTopOrOpts?: boolean | number | { stable?: boolean; }, opts?: {
    stable?: boolean;
  }): T extends ComparableType? Seq<T>: never; // needed by derived classes
  sorted(reverseOrTopOrOpts?: boolean | number | { stable?: boolean; }, opts?: {
    stable?: boolean;
  }): T extends ComparableType? Seq<T>: never {
    const source = this.getSourceForNewSequence();
    const [reverse, top, actualOpts] = typeof reverseOrTopOrOpts === 'number'?
      [reverseOrTopOrOpts < 0, Math.abs(reverseOrTopOrOpts), opts]:
      typeof reverseOrTopOrOpts === 'boolean'?
        [reverseOrTopOrOpts, undefined, opts]:
        [false, undefined, reverseOrTopOrOpts];

    return this.sortInternal(source, undefined, undefined, reverse, top, actualOpts) as any;
  }

  splice(start: number): Seq<T>;
  splice(start: number, deleteCount: number): Seq<T>;
  splice(start: number, deleteCount: number | undefined, ...items: T[]): Seq<T>;
  splice(start: number, deleteCount?: number, ...itemsToAppend: T[]): Seq<T> {
    start = Math.trunc(start);

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced#deletecount
    if (deleteCount === undefined) {
      deleteCount = arguments.length > 1? 0: Infinity;
    }

    if (deleteCount <= 0 && itemsToAppend.length === 0) {
      return this;
    }

    if (SeqTags.optimize(this)) {
      const maxCount = SeqTags.maxCount(this);
      if (maxCount != null && start >= maxCount) {
        if (itemsToAppend.length === 0) return this;
        return this.concat(itemsToAppend);
      }
    }

    let source: Iterable<T> = this;
    if (start < 0) {
      const array = [...this];
      start = array.length + start;
      source = array;
    }

    return this.generateForSource(source, function* splice(items, iterationContext) {
      let take = start < 0? 0: start;
      let skip = Math.trunc(deleteCount!);

      const iterator = iterationContext.closeWhenDone(getIterator(items));
      let next = iterator.next();

      for (let i = 0; i < take && !next.done; i++) {
        yield next.value;
        next = iterator.next();
      }

      yield* itemsToAppend;

      for (let i = 0; i < skip && !next.done; i++) {
        next = iterator.next();
      }

      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  split(condition: Condition<T>, opts?: {
    keepSeparator?: 'LeftChunk' | 'SeparateChunk' | 'RightChunk';
    maxChunks?: number
  }): Seq<Seq<T>> {

    return this.chunkBy<{ keepSeparator?: 'LeftChunk' | 'SeparateChunk' | 'RightChunk'; }>(info => {
      let userData: any;
      let whatAboutTheItem: 'KeepIt' | 'SkipIt' | 'MoveToNextChunk';

      const hitCondition = !!condition(info.item, info.index);
      const endOfChunk = hitCondition && info.userData?.keepSeparator !== 'RightChunk';
      const isLastChunk = opts?.maxChunks === info.chunkNumber;

      if (info.userData?.keepSeparator !== undefined) whatAboutTheItem = 'KeepIt';
      else if (!endOfChunk) whatAboutTheItem = 'KeepIt';
      else if (opts?.keepSeparator === undefined) whatAboutTheItem = 'SkipIt';
      else if (opts?.keepSeparator === 'LeftChunk') whatAboutTheItem = 'KeepIt';
      else {
        userData = {keepSeparator: opts?.keepSeparator!};
        whatAboutTheItem = 'MoveToNextChunk';
      }

      return {
        endOfChunk,
        whatAboutTheItem,
        isLastChunk,
        userData
      };
    }) as unknown as Seq<Seq<T>>;
  }

  splitAt(index: number): [first: Seq<T>, second: Seq<T>] & { first: Seq<T>; second: Seq<T>; } {
    index = Math.trunc(index);
    let iterator: Iterator<T>;
    let next: IteratorResult<T>;
    const first = factories.CachedSeq<T>(new Gen(this.getSourceForNewSequence(), function* splitAtIndexFirst(source) {
      iterator = getIterator(source);
      next = iterator.next();
      let i = 0;
      while (!next.done && i < index) {
        yield next.value;
        i++;
        next = iterator.next();
      }
    }));

    const second = factories.CachedSeq<T>(new Gen(internalEmpty(), function* splitAtIndexSecond(_, iterationContext) {
      // apply cache
      first.cache(true);
      iterationContext.onClose(() => iterator?.return?.());
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    }));

    const result = [first, second] as unknown as ([Seq<T>, Seq<T>] & { first: Seq<T>; second: Seq<T>; });
    result.first = result[0];
    result.second = result[1];

    return result;
  }

  startsWith(items: Iterable<T>, keySelector?: (item: T) => unknown): boolean;

  startsWith<U>(items: Iterable<U>, keySelector: (item: T | U) => unknown): boolean;

  startsWith<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K, secondKeySelector: (item: U) => K): boolean;

  startsWith<U = T>(items: Iterable<U>, {equals}: { equals(t: T, u: U): unknown; }): boolean;

  startsWith<U, K>(items: Iterable<U>,
                   firstKeySelector: ((item: T) => K) | {
                     equals(t: T, u: U): unknown;
                   } = ((x: T) => x) as unknown as (item: T) => K,
                   secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K): boolean {
    if (this === items) return true;
    if (Array.isArray(items) && items.length === 0) return true;

    function isEqualsFunc(param?: any): param is { equals(t: T, u: U): unknown; } {
      return typeof param?.equals === 'function';
    }

    let equals: (t: T, u: U) => unknown = sameValueZero;
    if (isEqualsFunc(firstKeySelector)) {
      equals = firstKeySelector.equals;
      secondKeySelector = firstKeySelector = (x: any) => x as any;
    }


    const secondIterator = getIterator(items);
    let secondNext = secondIterator.next();
    for (const first of this) {
      if (secondNext.done) return true;
      const firstKey = firstKeySelector?.(first);
      const secondKey = secondKeySelector(secondNext.value);
      const same = equals(firstKey as unknown as T, secondKey as unknown as U);
      if (!same) return false;
      secondNext = secondIterator.next();
    }

    secondIterator.return?.(); // Close iterator

    return secondNext.done ?? false;
  }

  sum(): T extends number? number: never;

  sum(selector: Selector<T, number>): number;

  sum(selector: Selector<T, number> = IDENTITY): number | void {
    let sum = 0;
    let index = 0;
    for (const value of this) sum += selector(value, index++);
    return sum;
  }

  take(count: number): Seq<T> {
    return this.takeInternal(count);
  }

  takeBy<K>(keys: Iterable<K>, keySelector: (item: T) => K): Seq<T>;

  takeBy<K>(keys: ReadonlySet<K>, keySelector: (item: T) => K): Seq<T>;

  takeBy<K>(keys: ReadonlyMap<K, unknown>, keySelector: (item: T) => K): Seq<T>;

  takeBy<K>(keys: Iterable<K> | ReadonlySet<K> | ReadonlyMap<K, unknown>, keySelector: (item: T) => K): Seq<T> {
    return (isHashable(keys))?
      this.filter(item => keys.has(keySelector(item))):
      this.takeItemsInternal(keys, keySelector, IDENTITY, true);
  }

  takeLast(count: number): Seq<T> {
    count = Math.trunc(count);
    if (count <= 0) return internalEmpty<T>();
    return this.generate(function* takeLast(items) {
      if (Array.isArray(items)) {
        let index = items.length - count;
        if (index < 0) index = 0;
        for (; index < items.length; index++) {
          yield items[index];
        }
      } else {
        const buffer = new CyclicBuffer<T>(count);
        buffer.writeMany(items);
        yield* buffer;
      }
    }, [[SeqTags.$maxCount, count]]);
  }

  takeOnly<U = T>(items: Iterable<U>, keySelector: (item: T | U) => unknown): Seq<T>;

  takeOnly(items: Iterable<T>, keySelector?: (item: T) => unknown): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector?: Selector<T, K>, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): Seq<T> {
    return this.takeItemsInternal(items, firstKeySelector, secondKeySelector, false);
  }

  takeWhile(condition: Condition<T>): Seq<T> {
    return this.generate(function* takeWhile(self: Iterable<T>) {
      for (const {value, index} of entries(self)) {
        if (!condition(value, index)) break;
        yield value;
      }
    });
  }

  tap(callback: Selector<T, void>): Seq<T> {
    return this.generate(function* tap(items: Iterable<T>) {
      for (const {value, index} of entries(items)) {
        callback(value, index);
        yield value;
      }
    });
  }

  toArray(): T[] {
    return [...this];
  }

  toMap<K, V>(keySelector: Selector<T, K>, valueSelector: Selector<T, V> = IDENTITY, toComparableKey?: ToComparableKey<K>): Map<K, V> {
    const mappedEntries = this.map((item, index) => [keySelector(item, index), valueSelector(item, index)] as [K, V]);
    return toComparableKey != null?
      new Dict<K, V>(toComparableKey, mappedEntries):
      new Map<K, V>(mappedEntries);
  }

  toMapOfOccurrences<K = T>(keySelector: Selector<T, K> = IDENTITY, toComparableKey?: ToComparableKey<K>): Map<K, number> {

    if (toComparableKey != null) {
      const dict = new Dict<K, number>(toComparableKey);
      for (const {value, index} of entries(this)) {
        dict.addOrUpdate(keySelector(value, index), 1, prev => prev + 1);
      }

      return dict;
    }

    const map = new Map<K, number>();

    for (const {value, index} of entries(this)) {
      const key = keySelector(value, index);
      const prevCount = map.get(key) ?? 0;
      map.set(key, prevCount + 1);
    }

    return map;
  }

  toSet(keySelector?: Selector<T, unknown>): Set<T>;

  toSet<V>(keySelector: Selector<T, unknown>, valueSelector: Selector<T, V>): Set<V>;

  toSet<V>(keySelector?: Selector<T, unknown>, valueSelector: Selector<T, V> = IDENTITY): Set<V> {
    if (!keySelector) return new Set<V>(this as unknown as Iterable<V>);

    const keys = new Set<unknown>();
    const set = new Set<V>();
    let index = 0;
    for (const item of this) {
      const key = keySelector(item, index++);
      if (keys.has(key)) continue;
      keys.add(key);
      set.add(valueSelector(item, index - 1));
    }

    return set;
  }

  toString(): string {
    return this.join({start: '[', end: ']'});
  }

  transform<U = T>(transformer: (seq: Seq<T>) => Seq<U>): Seq<U> {
    return transformer(this);
  }

  traverseBreadthFirst(childrenSelector: (item: T, parent: T, depth: number) => Iterable<T>): Seq<T>;

  traverseBreadthFirst(childrenSelector: (item: T, parent: T, depth: number, filteredOut: boolean) => Iterable<T>,
                       filter: (item: T, parent: T, depth: number) => boolean): Seq<T>;

  traverseBreadthFirst(childrenSelector: (item: T, parent: T, depth: number, filteredOut: boolean) => Iterable<T>,
                       filter?: (item: T, parent: T, depth: number) => boolean): Seq<T> {

    if (!filter) filter = () => true;
    return this.generate(function* tree(items): Generator<T> {
      const queue: { items: Iterable<T>, depth: number, parent: T }[] = [{
        items,
        depth: 0,
        parent: undefined as unknown as T
      }];
      while (queue.length) {
        const nextBatch = queue.shift()!;
        for (const item of nextBatch.items) {
          const includeItem = filter!(item, nextBatch.parent!, nextBatch.depth);
          if (includeItem) yield item;
          const children = childrenSelector(item, nextBatch.parent!, nextBatch.depth, !includeItem);
          queue.push({items: children, parent: item, depth: nextBatch.depth + 1});
        }
      }
    });
  }

  traverseDepthFirst(childrenSelector: (item: T, parent: T, depth: number) => Iterable<T>): Seq<T>;

  traverseDepthFirst(childrenSelector: (item: T, parent: T, depth: number, filteredOut: boolean) => Iterable<T>,
                     filter: (item: T, parent: T, depth: number) => boolean): Seq<T>;

  traverseDepthFirst(childrenSelector: (item: T, parent: T, depth: number, filteredOut: boolean) => Iterable<T>,
                     filter?: (item: T, parent: T, depth: number) => boolean): Seq<T> {

    if (!filter) filter = () => true;
    return this.generate(function* tree(items, iterationContext, parent?: T, depth = 0): Generator<T> {
      for (const item of items) {
        const includeItem = filter!(item, parent!, depth);
        if (includeItem) yield item;
        const children = childrenSelector(item, parent!, depth, !includeItem);
        yield* tree(children, iterationContext, item, depth + 1);
      }
    });
  }

  union(second: Iterable<T>, keySelector?: (value: T) => unknown): Seq<T> {
    return this.unionInternal(second, keySelector, false);
  }

  unionRight(second: Iterable<T>, keySelector?: (value: T) => unknown): Seq<T> {
    return this.unionInternal(second, keySelector, true);
  }

  unshift(...items: T[]): Seq<T> {
    return this.prepend(items);
  }

  window(size: number): Seq<Seq<T>>;

  window(size: number, step: number): Seq<Seq<T>>;

  window(size: number, opts: { leftOverflow?: boolean; rightOverflow?: boolean; padWith?: T; }): Seq<Seq<T>>;

  window(size: number, opts: { exactSize: boolean; }): Seq<Seq<T>>;

  window(size: number, step: number, opts: {
    leftOverflow?: boolean;
    rightOverflow?: boolean;
    padWith?: T;
  }): Seq<Seq<T>>;

  window(size: number, step: number, opts: { exactSize: boolean; }): Seq<Seq<T>>;

  window(size: number, stepOrOpts?: number | {
    leftOverflow?: boolean;
    rightOverflow?: boolean;
    padWith?: T;
    exactSize?: boolean;
  }, opts?: { leftOverflow?: boolean; rightOverflow?: boolean; padWith?: T; exactSize?: boolean; }): Seq<Seq<T>> {
    if (size < 1) return internalEmpty<Seq<T>>();
    const defaultOpts: { leftOverflow?: boolean; rightOverflow?: boolean; padWith?: T; exactSize?: boolean; } = {
      leftOverflow: false,
      rightOverflow: false
    };
    let [step, actualOpts] = typeof stepOrOpts === 'number'?
      [stepOrOpts, opts ?? defaultOpts]:
      stepOrOpts?
        [1, stepOrOpts ?? defaultOpts]:
        [1, opts ?? defaultOpts];

    if (step < 1) step = 1;

    const leftPadding = actualOpts?.leftOverflow && actualOpts?.padWith !== undefined;
    const rightPadding = actualOpts?.rightOverflow && actualOpts?.padWith !== undefined;
    const overflowRight = actualOpts?.rightOverflow && !rightPadding && !actualOpts.exactSize;

    const optimize = SeqTags.optimize(this);
    const createSeq = (window: T[]): Seq<T> => {
      const innerSeq = factories.Seq(Object.freeze(window));
      return this.tagAsOptimized(innerSeq, optimize);
    };

    return this.generate(function* window(items, iterationContext) {
      function* iterate(): Generator<T> {
        let isEmpty = true;

        for (const item of items) {
          yield item;
          isEmpty = false;
        }

        if (isEmpty) return;

        if (rightPadding && size > 1) {
          for (let i = 1; i < size; i++) yield actualOpts.padWith!;
        }
      }

      let window = new SlidingWindow<T>(iterate(), size);
      iterationContext.onClose(() => window.dispose());

      if (leftPadding) window.fill(actualOpts.padWith!);
      const initialSize = actualOpts.leftOverflow? 1: size;
      let lastSlidCount = window.slide(initialSize);

      if (actualOpts.exactSize && window.count < size) return;

      while (lastSlidCount) {

        yield createSeq([...window]);
        if (window.done) break;

        lastSlidCount = window.slide(step);

        const stepsLeft = step - lastSlidCount;
        if (stepsLeft > 0) {
          if (overflowRight) lastSlidCount += window.overflow(stepsLeft);
          else break; // When not overflow right, we expect to have full window slide, otherwise reached end of sequence without enough items
          if (!window.count) break; // in case overflowed over the edge
        }
      }

      while (overflowRight && window.count > step) {
        window.overflow(step);
        yield createSeq([...window]);
      }
    });
  }

  with(index: number, value: T): Seq<T> {
    index = Math.trunc(index);
    if (SeqTags.optimize(this) && SeqTags.empty(this)) return this;
    return this.generate(function* withIndex(self: Iterable<T>, iterationContext: IterationContext) {
      if (index < 0) {
        const bufferSize = -index;
        const buffer = new CyclicBuffer<T>(bufferSize);
        yield* buffer.consumeBuffer(self);
        if (buffer.count == bufferSize) {
          yield value;
          buffer.remove(1);
          yield* buffer;
        } else {
          yield* buffer;
        }
        buffer.clear();

      } else {
        const iterator = iterationContext.closeWhenDone(getIterator(self));
        let next = iterator.next();
        for (let i = index; !next.done && i; i--) {
          yield next.value;
          next = iterator.next();
        }

        if (next.done) return;

        yield value; // yield new value

        next = iterator.next(); // skip to next item instead of replaced one
        while (!next.done) {
          yield next.value;
          next = iterator.next();
        }
      }
    });
  }

  zip<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts>): Seq<[T, T1, ...Ts]> {
    return this.generate(function* zip(self, iterationContext) {
      const allIterables: any[] = [self, items, ...moreItems];
      const iterators = allIterables.map(iterable => iterationContext.closeWhenDone(getIterator(iterable)));
      let next = iterators.map(it => it.next());
      while (next.every(next => !next.done)) {
        yield next.map(next => next.value);
        next = iterators.map(it => it.next());
      }
    }) as any;
  }

  zipAll<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts> | [...Iterables<Ts>, {
    defaults?: [T?, T1?, ...Ts]
  }]): Seq<[T, T1, ...Ts]> {
    const res = this.generate(function* zipAll(self, iterationContext) {
      function isOpts(opts?: any): opts is  { defaults?: [T?, T1?, ...Ts]; } {
        return Array.isArray(opts?.defaults);
      }

      let opts: { defaults?: [T?, T1?, ...Ts]; } | undefined;
      let allIterables = [self, items, ...moreItems].filter(x => x != null) as Iterable<any>[];
      const maybeOpts = moreItems.slice(-1)[0];
      if (isOpts(maybeOpts)) {
        opts = maybeOpts;
        allIterables.pop();
      }
      const defaults = opts?.defaults ?? [];
      const iterators = allIterables.map(iterable => iterationContext.closeWhenDone(getIterator(iterable)));
      let next = iterators.map(it => it.next());
      while (!next.every(next => next.done)) {
        yield next.map((next, i) => next.done? defaults[i]: next.value);
        next = iterators.map(it => it.next());
      }
    });

    return res as any;
  }

  zipWithIndex(startIndex = 0): Seq<[T, number]> {
    return this.map((item, index) => [item, startIndex + index]);
  }

  abstract [Symbol.iterator](): Iterator<T>;

  // noinspection JSUnusedGlobalSymbols
  /**
   * Used by JSON.stringify
   * @see {@link https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior}
   * @param key
   */
  toJSON(key: any): any {
    return this.toJsonOverride(key);
  }

  protected sortInternal<K = T>(source: Iterable<T>, keySelector: ((item: T) => K) | undefined, comparer: Comparer<K> | undefined, reverse: boolean | undefined, top: number | undefined, opts?: {
    stable?: boolean;
  }): SortedSeq<T> {
    if (top && top < 0) throw new Error(`parameter 'top' cannot be negative`);

    const sortedSeq = factories.SortedSeq<T, K>(source, keySelector, comparer, reverse, top, opts);
    return this.transferOptimizeTag(sortedSeq);
  }

  protected findSubSequence<U = T>(subSequence: Iterable<U>, fromIndex: number, equals: (a: T, b: U) => unknown): [number, number] {
    // console.log(`includesSubSequence()`);

    const matcher = new class {
      private iterator: Iterator<U> | undefined;
      private next: IteratorResult<U>;
      private iterable = new class {
        readonly cache: U[] = [];
        private iterator = getIterator(subSequence);
        private next: IteratorResult<U> | undefined = undefined;
        private index = 0;

        get isEmpty(): boolean {
          return this.cache.length === 0;
        }

        * iterate() {
          yield* this.cache;
          if (this.next && this.next.done) return;
          this.next = this.iterator.next();
          while (!this.next.done) {
            const item = this.next.value;
            this.cache.push(item);
            yield item;
            this.next = this.iterator.next();
            this.index++;
          }
        }
      };

      get done(): boolean {
        return this.next?.done ?? false;
      }

      get isEmpty(): boolean {
        return this.done && this.iterable.isEmpty;
      }

      matchNextKey(item: T): { match?: unknown; done?: boolean } {
        // console.log(`matchNextKey(${key})`);
        if (!this.iterator) {
          this.iterator = this.iterable.iterate();
          this.next = this.iterator.next();
        }
        // console.log('matchNextKey.next', this.next);
        if (this.next.done) return {done: true};

        const match = equals(item, this.next.value);
        // console.log(`matchNextKey.match(${key} , ${this.next.value}) = ${match}`);
        this.next = this.iterator.next();
        if (!match) this.iterator = undefined;
        return {match};
      }
    };

    let index = -1;
    let matchStartIndex = 0;
    let match: boolean = false;
    for (const item of this) {
      index++;
      if (index < fromIndex) continue;

      const matchResult = matcher.matchNextKey(item);
      if (matchResult.done) {
        index--;
        break;
      }
      if (!match && matchResult.match) matchStartIndex = index;
      match = matchResult.match as boolean;
    }

    return (matcher.done && (match || matcher.isEmpty))? [matchStartIndex, index]: [-1, -1];
  }

  protected allInternal(condition: (x: T, index: number) => unknown) {
    let index = 0;
    for (const item of this) if (!condition(item, index++)) return false;
    return true;
  }

  protected anyInternal(condition?: Condition<T>) {
    let index = 0;
    for (const item of this) if (condition? condition(item, index++): true) return true;
    return false;
  }

  protected countInternal(condition?: Condition<T>): number {
    let count = 0;
    let index = 0;
    if (condition) {
      for (const item of this) if (condition(item, index++)) count++;
    } else for (const item of this) count++;
    return count;
  }

  protected hasAtLeastInternal(count: number): boolean {
    count = Math.trunc(count);
    if (count <= 0) throw new RangeError('count must be positive');
    for (const item of this) {
      count--;
      if (count === 0) return true;
    }
    return false;
  }

  protected includesInternal(itemToFind: T, fromIndex: number) {
    let index = 0;

    if (fromIndex >= 0) {
      for (const item of this) if (index++ >= fromIndex && sameValueZero(item, itemToFind)) return true;
      return false;
    }

    let foundIndex = Number.NaN;
    for (const item of this) {
      if (sameValueZero(item, itemToFind)) foundIndex = index;
      index++;
    }

    return foundIndex >= fromIndex + index;
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + [...this].join(separator) + end;
  }

  protected takeInternal(count: number): Seq<T> {
    count = Math.trunc(count);
    if (count <= 0) return internalEmpty<T>();

    return this.generate(function* take(items) {
      for (const {value, index} of entries(items)) {
        yield value;
        if (index + 1 === count) break;
      }
    }, [[SeqTags.$maxCount, count]]);
  }

  protected allOptimized(source: Iterable<any>, condition: Condition<T>): boolean {

    if (!SeqTags.optimize(this)) return this.allInternal(condition);
    if (SeqTags.infinite(this)) throw RangeError('Cannot check all items of infinite sequence');
    if (SeqTags.empty(this)) return true;

    // We assume that if condition argument is a function that doesn't accept index parameter (2nd parameter)
    // (Also assuming not getting wise with 2nd parameter having default value)
    // then the order of items is not important, and we optimize by working on the source
    if (condition.length > 1 || !SeqTags.notAffectingNumberOfItems(this) || !SeqTags.notMappingItems(this)) {
      return this.allInternal(condition);
    }
    if (SeqTags.isSeq(source)) return source.all(condition);
    if (Array.isArray(source)) return source.every(condition); // We assume Array.every is faster
    return this.allInternal(condition);
  }

  protected anyOptimized(source: Iterable<any>, condition?: Condition<T>): boolean {
    if (!SeqTags.optimize(this)) return this.anyInternal(condition);
    if (SeqTags.empty(this)) return false;
    const paramsCount = condition?.length ?? 0;
    const affectsCount = !SeqTags.notAffectingNumberOfItems(this);
    // We assume that if condition argument is a function that doesn't accept index parameter (2nd parameter)
    // (Also assuming not getting wise with 2nd parameter having default value)
    // then the order of items is not important, and we optimize by working on the source
    if (paramsCount > 1 || affectsCount) {
      return this.anyInternal(condition);
    }
    if (!condition) {
      if (SeqTags.infinite(this)) return true;
      if (Array.isArray(source)) return source.length > 0;
    }
    if (SeqTags.notMappingItems(this)) {
      if (SeqTags.isSeq(source)) return source.any(condition);
      if (Array.isArray(source) && condition) return source.some(condition); // We assume Array.some is faster
    }
    return this.anyInternal(condition);
  }

  protected countOptimized(source: Iterable<any>, condition?: Condition<T>): number {
    if (!SeqTags.optimize(this)) return this.countInternal(condition);
    if (SeqTags.infinite(this)) throw RangeError('Cannot count infinite sequence');
    if (SeqTags.empty(this)) return 0;

    const paramsCount = condition?.length ?? 0;
    const affectsCount = !SeqTags.notAffectingNumberOfItems(this);
    // We assume that if condition argument is a function that doesn't accept index parameter (2nd parameter)
    // (Also assuming not getting wise with 2nd parameter having default value)
    // then the order of items is not important, and we optimize by working on the source
    if (paramsCount > 1 || affectsCount) return this.countInternal(condition);
    if (!condition && Array.isArray(source)) return source.length;
    if (SeqTags.isSeq(source) && (!condition || SeqTags.notMappingItems(this))) {
      return source.count(condition);
    }
    return this.countInternal(condition);
  }

  protected hasAtLeastOptimized(source: Iterable<any>, count: number): boolean {
    count = Math.trunc(count);
    if (count <= 0) throw new RangeError('count must be positive');
    if (!SeqTags.optimize(this)) return this.hasAtLeastInternal(count);
    const maxCount = SeqTags.maxCount(this);
    if (maxCount != null && maxCount < count) return false;

    if (SeqTags.notAffectingNumberOfItems(this)) {
      if (Array.isArray(source)) return source.length >= count;
      if (SeqTags.isSeq(source)) return source.hasAtLeast(count);
    }
    return this.hasAtLeastInternal(count);
  }

  protected includesOptimized(source: Iterable<any>, itemToFind: T, fromIndex: number): boolean {
    if (SeqTags.optimize(this) && SeqTags.notAffectingNumberOfItems(this) && SeqTags.notMappingItems(this)) {
      if (Array.isArray(source)) return source.length? source.includes(itemToFind, fromIndex): false;
      if (SeqTags.isSeq(source)) return source.includes(itemToFind, fromIndex);
    }
    return this.includesInternal(itemToFind, fromIndex);
  }

  protected generate<U, TSeq extends Iterable<T> = Iterable<T>>(
    generator: (items: TSeq, iterationContext: IterationContext) => Iterator<U>,
    tags?: readonly [symbol, any][]): Seq<U> {

    return this.generateForSource(this.getSourceForNewSequence(), generator, tags);
  }

  protected generateForSource<S, U, TSeq extends Iterable<S> = Iterable<S>>(
    source: Iterable<S>,
    generator: (items: TSeq, iterationContext: IterationContext) => Iterator<U>,
    tags?: readonly [symbol, any][]): Seq<U> {

    return this.createDefaultSeq(source, generator, tags);
  }

  protected getIterator(): Iterator<T> {
    return getIterator(this);
  }

  protected tapGenerator(callback: Selector<T, void>): Iterable<T> {
    return tapIterable(this, callback);
  }

  protected findFirstByConditionInternal<S extends T>(fromIndex: number, condition: | Condition<T> | ((item: T, index: number) => item is S), fallback?: S): [index: number, first: S | undefined] {
    let index = -1;
    for (const item of this) {
      index++;
      if (index < fromIndex) continue;
      if (condition(item, index)) return [index, item];
    }

    return [-1, fallback];
  }

  protected findLastByConditionInternal(tillIndex: number, condition: Condition<T>, fallback?: T): [index: number, last: T | undefined] {
    let index = -1;
    let found: [index: number, item: T] = [-1, fallback as T];
    for (const item of this) {
      index++;
      if (index > tillIndex) break;
      if (condition(item, index)) found = [index, item];
    }

    return found;
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this;
  }

  protected createDefaultSeq<T, U = T, TSeq extends Iterable<T> = Iterable<T>>(
    source?: Iterable<T>,
    generator?: (source: TSeq, iterationContext: IterationContext) => Iterator<U>,
    tags?: readonly [symbol, any][]): Seq<U> {
    const optimize = SeqTags.optimize(this);
    tags = optimize? [...tags ?? [], [SeqTags.$optimize, true]]: tags;

    return factories.Seq(source, generator as (source: TSeq) => Iterator<U>, tags);
  }

  protected transferOptimizeTag<TSeq extends Seq<any>>(to: TSeq): TSeq {
    if (SeqTags.optimize(this)) this.tagAsOptimized(to);
    return to;
  }

  protected tagAsOptimized<TSeq extends Seq<any>>(seq: TSeq, optimize: boolean = true): TSeq {
    if (optimize) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }

  protected toJsonOverride(key: any): any {
    const source = this.getSourceForNewSequence();
    return isArray(source)? source: [...source];
  }

  private intersectByKeys<K>(keys: ReadonlyMap<K, unknown> | ReadonlySet<K>, keySelector: Selector<T, K> = IDENTITY): Seq<T> {
    return this.generate(function* intersectByKeys(self) {
      const iteratedSet = new Set<K>();

      for (const {value, index} of entries(self)) {
        const key = keySelector(value, index);
        if (iteratedSet.has(key) || !keys.has(key)) continue;
        yield value;
        iteratedSet.add(key);
      }
      iteratedSet.clear();
    });
  }

  private intersectWith<U = T, K = T>(second: Iterable<U>, firstKeySelector?: Selector<T, K>, secondKeySelector?: Selector<U, K>): Seq<T> {
    return this.generate(function* intersectWith(self, iterationContext) {

      const lazyScan = new LazyScanAndMark(second, secondKeySelector);
      iterationContext.onClose(() => lazyScan.dispose());

      for (const {value: first, index} of entries(self)) {
        const firstKey = firstKeySelector? firstKeySelector(first, index): first;
        if (lazyScan.noneRepeatedNext(firstKey)) yield first;
      }

      lazyScan.dispose();
    });
  }

  private unionInternal(second: Iterable<T>, keySelector: ((value: T) => unknown) | undefined, rightToLeft: boolean): Seq<T> {
    const [left, right] = rightToLeft? [second, this]: [this, second];
    return this.generateForSource(left, function* union() {
      function* concat() {
        yield* left;
        yield* right;
      }

      const keys = new Set<unknown>();
      for (const item of concat()) {
        const key = keySelector? keySelector(item): item;
        if (keys.has(key)) continue;
        keys.add(key);
        yield item;
      }
      keys.clear();
    });
  }

  private maxItemBySelector(selector: Selector<T, number>, findLast = false): [T, number] | undefined {
    let max = Number.NEGATIVE_INFINITY;
    let maxItem: T;
    let index = 0;
    for (const item of this) {
      const v = selector(item, index++);
      if (max < v || findLast && max <= v) {
        max = v;
        maxItem = item;
      }
    }
    return index? [maxItem!, max]: undefined;
  }

  private maxItemByComparer(comparer: (a: T, b: T) => number, findLast = false): T | undefined {
    let maxItem: any = undefined;
    for (const item of this) {
      if (maxItem === undefined) {
        maxItem = item;
        continue;
      }
      const compared = comparer(maxItem, item);
      if (compared < 0 || findLast && compared === 0) maxItem = item;
    }
    return maxItem;
  }

  private minItemBySelector(selector: Selector<T, number>, findLast = false): [T, number] | undefined {
    let min = Number.POSITIVE_INFINITY;
    let minItem: T;
    let index = 0;
    for (const item of this) {
      const v = selector(item, index++);
      if (min > v || findLast && min >= v) {
        min = v;
        minItem = item;
      }
    }
    return index? [minItem!, min]: undefined;
  }

  private minItemByComparer(comparer: (a: T, b: T) => number, findLast = false): T | undefined {
    let minItem: any = undefined;
    for (const item of this) {
      if (minItem === undefined) {
        minItem = item;
        continue;
      }
      const compared = comparer(minItem, item);
      if (compared > 0 || findLast && compared === 0) minItem = item;
    }
    return minItem;
  }

  private groupJoinInternal<TOut, TIn, K>(outers: Iterable<TOut>, outerKeySelector: Selector<TOut, K>, inners: Iterable<TIn>, innerKeySelector: Selector<TIn, K>): SeqOfGroups<TOut, TIn> {
    // TODO: Think if can optimize or make more lazy
    function* leftOuterJoin(self: Iterable<TOut>) {
      const innersMap = new Map<K, TIn[]>();
      for (const {value: inner, index: index} of entries(inners)) {
        const key = innerKeySelector(inner, index);
        const valuesForKey: TIn[] = innersMap.get(key) ?? [];
        if (!valuesForKey.length) innersMap.set(key, valuesForKey);
        valuesForKey.push(inner);
      }

      for (const {value: outer, index} of entries(self)) {
        const outerKey = outerKeySelector(outer, index);
        const inners = innersMap.get(outerKey) ?? [IGNORED_ITEM];
        for (const inner of inners) yield {outer, inner};
      }
    }

    const gen = new Gen(outers, leftOuterJoin);
    return this.transferOptimizeTag(factories.SeqOfGroups(gen, ({outer}) => outer, undefined, ({inner}) => inner));
  }

  private findFirstByCondition<S extends T>(fromIndex: number | ((item: T, index: number) => item is S) | Condition<T>, condition?: ((item: T, index: number) => item is S) | Condition<T> | S | undefined, fallback?: S | undefined): [index: number, first: S | undefined] {
    [fromIndex, condition, fallback] = (typeof fromIndex === 'number')?
      [fromIndex, condition as (item: T, index: number) => item is S, fallback]:
      [0, fromIndex, condition as S | undefined];

    if (fromIndex < 0) fromIndex = 0;

    return this.findFirstByConditionInternal(fromIndex, condition, fallback);
  }

  private findLastByCondition(tillIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): [index: number, last: T | undefined] {
    [tillIndex, condition, fallback] = (typeof tillIndex === 'number')?
      [tillIndex, condition as Condition<T>, fallback]:
      [Number.NaN, tillIndex, condition as T | undefined];

    return this.findLastByConditionInternal(tillIndex, condition, fallback);
  }

  private removeInternal<U, K>(items: Iterable<U>, firstKeySelector: (item: T) => K = IDENTITY, secondKeySelector: (item: U) => K = firstKeySelector as unknown as (item: U) => K, all: boolean): Seq<T> {
    return this.generate(function* remove(self, iterationContext) {
      const lazyScan = new LazyScanAndMark(items, secondKeySelector);
      iterationContext.onClose(() => lazyScan.dispose());

      for (const item of self) {
        const key = firstKeySelector(item);
        const exists = all?
          lazyScan.everExistedNext(key):
          lazyScan.includesNext(key);
        if (!exists) yield item;
      }

      lazyScan.dispose();
    });
  }

  private takeItemsInternal<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K> = IDENTITY, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>, all: boolean): Seq<T> {
    return this.generate(function* takeItemsInternal(self, iterationContext) {
      const lazyScan = new LazyScanAndMark(items, secondKeySelector);
      iterationContext.onClose(() => lazyScan.dispose());


      let firstIndex = 0;
      for (const first of self) {
        const key = firstKeySelector? firstKeySelector(first, firstIndex++): first as unknown as K;
        const exists = all?
          lazyScan.everExistedNext(key):
          lazyScan.includesNext(key);
        if (exists) yield first;
      }

      lazyScan.dispose();
    });
  }
}

class CyclicBuffer<T> implements Iterable<T> {
  private buffer: T[];
  private start = -1;
  private end = -1;

  constructor(size: number) {
    this.buffer = new Array<T>(size);
  }

  get isFull(): boolean {
    return this.count === this.bufferSize;
  }

  get count(): number {
    if (this.start < 0) return 0;
    if (this.end >= this.start) return this.end - this.start + 1;
    return this.bufferSize;
  }

  private get bufferSize(): number {
    return this.buffer.length;
  }

  write(value: T): this {
    this.end = (this.end + 1) % this.bufferSize;
    this.buffer[this.end] = value;
    if (this.end === this.start) this.start = (this.start + 1) % this.bufferSize;
    if (this.start < 0) this.start = 0;

    return this;
  }

  at(index: number): T | undefined {
    index = (this.start + index) % this.bufferSize;
    return this.buffer[index];
  }

  * [Symbol.iterator](): Iterator<T> {
    if (this.start < 0) return;
    let [index1, count1] = [this.start, this.end < this.start? this.bufferSize: this.end + 1];
    let [index2, count2] = [0, this.end < this.start? (this.end + 1): 0];

    while (index1 < count1) yield this.buffer[index1++];
    while (index2 < count2) yield this.buffer[index2++];
  }

  clear() {
    this.buffer = [];
    this.start = this.end = -1;
  }

  writeMany(values: Iterable<T>): number {
    let count = 0;
    for (const value of values) {
      this.write(value);
      count++;
    }
    return count;
  }

  fill(value: T, count?: number): this {
    if (count == null) count = this.bufferSize;
    const emptySpace = this.bufferSize - this.count;
    const actualFillCount = count == null? emptySpace: Math.min(count, emptySpace);
    for (let i = 0; i < actualFillCount; i++) this.write(value);
    return this;
  }

  remove(count: number): number {
    let removed = 0;
    if (this.count <= count) {
      removed = this.count;
      this.clear();
      return removed;
    }

    while (count--) {
      if (this.start === this.end) {
        this.start = this.end = -1;
        break;
      }
      this.start = (this.start + 1) % this.bufferSize;
      removed++;
    }
    return removed;
  }

  * consumeBuffer(values: Iterable<T>) {
    let shouldDrop = false;
    for (const value of values) {
      shouldDrop ||= this.isFull;
      if (shouldDrop) {
        const droppedValue = this.at(0)!;
        this.write(value);
        yield droppedValue;
      } else {
        this.write(value);
      }
    }
  }
}

class SlidingWindow<T> implements Iterable<T> {

  private readonly buffer: CyclicBuffer<T>;
  private iterator: Iterator<T>;
  private _done = false;

  constructor(private readonly source: Iterable<T>, private readonly windowSize: number) {
    this.buffer = new CyclicBuffer<T>(windowSize);
  }

  get done(): boolean {
    return this._done;
  }

  get count(): number {
    return this.buffer.count;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.buffer[Symbol.iterator]();
  }

  fill(value: T, count?: number): this {
    this.buffer.fill(value, count);
    return this;
  }

  slide(count: number): number {
    const iterator = this.iterator ||= getIterator(this.source);
    const res = this.slideInternal(iterator, count);
    this._done ||= res.done;
    return res.writtenCount;
  }

  overflow(count: number): number {
    return this.buffer.remove(count);
  }

  dispose(): void {
    closeIterator(this.iterator);
  }

  private slideInternal(iterator: Iterator<T>, count: number): { done: boolean; writtenCount: number } {
    if (count < 1) return {done: false, writtenCount: 0};

    let counted = 0;
    let next = iterator.next();
    while (!next.done) {
      this.buffer.write(next.value);
      counted++;
      if (counted === count) break;
      next = iterator.next();
    }

    return {done: !!next.done, writtenCount: counted};
  }
}

function parseEqualsFn(param?: number | ((item: any) => any) | {
  equals(a: any, b: any): unknown
}): ((a: any, b: any) => unknown) | undefined {
  return (typeof param === 'function')?
    (a: any, b: any) => sameValueZero(param(a), param(b)):
    (typeof param === 'object' && typeof param.equals === 'function')?
      param.equals:
      undefined;
}

function isHashable<K>(maybeHashable: unknown): maybeHashable is (ReadonlySet<K> | ReadonlyMap<K, unknown>) {
  return maybeHashable instanceof Map || maybeHashable instanceof Set;
}

class LazyScanAndMark {
  private keysCounter = new Map<unknown, number>();
  private iterator: Iterator<unknown>;
  private next: IteratorResult<unknown, unknown>;
  private index = 0;
  private itemsCount = 0;

  constructor(private items: Iterable<unknown>, private keySelector: Selector<any, unknown> = IDENTITY) {
  }

  getStatus(): { empty: boolean; done: boolean; count: number; } {
    return {
      empty: this.checkIsEmpty(),
      done: !!this.next?.done,
      count: this.itemsCount
    };
  }

  includesNext(key: unknown): boolean {
    let counter = this.keysCounter.get(key) ?? 0;
    if (counter) {
      if (counter === 1) this.keysCounter.delete(key);
      else this.keysCounter.set(key, counter - 1);
      return true;
    }

    while (!this.moveNext().done) {
      const second = this.next.value;
      const secondKey = this.keySelector(second, this.index++);

      const match = sameValueZero(key, secondKey);
      if (match) return true;
      counter = this.keysCounter.get(secondKey) ?? 0;
      this.keysCounter.set(secondKey, counter + 1);
    }

    return false;
  };

  everExistedNext(key: unknown): boolean {
    let existed = this.keysCounter.has(key);
    if (existed) return true;

    while (!this.moveNext().done) {
      const second = this.next.value;
      const secondKey = this.keySelector(second, this.index++);
      this.keysCounter.set(secondKey, 1);

      const match = sameValueZero(key, secondKey);
      if (match) return true;
    }

    return false;
  };

  noneRepeatedNext(key: unknown): boolean {
    let count = this.keysCounter.get(key) ?? 0;
    if (count > 0) {
      this.keysCounter.set(key, -1);
      return true;
    }

    while (!this.moveNext().done) {
      const second = this.next.value;
      const secondKey = this.keySelector(second, this.index++);

      if (this.keysCounter.has(secondKey)) continue;


      const match = sameValueZero(key, secondKey);
      this.keysCounter.set(secondKey, match? -1: 1);
      if (match) return true;
    }

    return false;
  };

  dispose(): void {
    this.keysCounter.clear();
    closeIterator(this.iterator);
  }

  moveNext(): IteratorResult<unknown, unknown> {
    if (!this.iterator) {
      this.iterator = getIterator(this.items);
    }
    if (!this.next?.done) {
      this.next = this.iterator.next();
      if (!this.next.done) this.itemsCount++;
    }

    return this.next;
  }

  private checkIsEmpty(): boolean {
    if (!this.next) this.moveNext();
    return this.itemsCount === 0;
  }
}


