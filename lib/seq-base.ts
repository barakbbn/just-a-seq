import {
  CachedSeq,
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
} from "./seq";
import {
  consume,
  entries,
  Gen,
  getIterator,
  IGNORED_ITEM,
  isIterable,
  IterationContext,
  LEGACY_COMPARER,
  sameValueZero,
  SeqTags,
  TaggedSeq,
  tapIterable
} from "./common";
import {empty} from "./seq-factory";

export abstract class SeqBase<T> implements Seq<T>, TaggedSeq {
  readonly [SeqTags.$seq] = true;

  readonly length = this.count;

  all(condition: Condition<T>): boolean {
    let index = 0;
    for (const item of this) if (!condition(item, index++)) return false;
    return true;
  }

  any(condition?: Condition<T>): boolean {
    return this.anyInternal(condition);
  }

  as<U>(): Seq<U> {
    return this as unknown as Seq<U>;
  }

  readonly asSeq = (): Seq<T> => {
    return this.createDefaultSeq(this.getSourceForNewSequence(), undefined, [
      [SeqTags.$notAffectingNumberOfItems, true]]);
  };

  at(index: number, fallback?: T): T | undefined {
    if (index < 0) {
      const buffer = new CyclicBuffer<T>(-index);
      for (const item of this) buffer.write(item);
      index = buffer.count + index;
      const result = (index < 0) ? fallback : buffer.at(index);
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

  average(): T extends number ? number : never;

  average(selector: Selector<T, number>): number;

  average(selector: Selector<T, number> = x => x as unknown as number): number | never {
    let sum = 0;
    let count = 0;
    for (const value of this) sum += selector(value, count++);
    return count ? (sum / count) : Number.NaN;
  }

  cache(now?: boolean): CachedSeq<T> {
    return this.transferOptimizeTag(factories.CachedSeq(this.getSourceForNewSequence(), now));
  }

  chunk(size: number): Seq<Seq<T>> {
    if (size < 1) return empty<Seq<T>>();
    const self = this;
    const optimize = SeqTags.optimize(this);
    return this.generate(function* chunk(items, iterationContext) {
      if (Array.isArray(items)) {
        for (let skip = 0; skip < items.length; skip += size) {
          yield self.createDefaultSeq<T>(items).slice(skip, skip + size);
        }

      } else {
        let innerSeq: Seq<T> | undefined;
        iterationContext.onClose(() => innerSeq?.consume())
        const iterator = iterationContext.closeWhenDone(getIterator(items));
        let next = iterator.next();
        while (!next.done) {
          innerSeq?.consume();
          if (next.done) break;
          innerSeq = self.tagAsOptimized(factories.CachedSeq<T>(new Gen(items, function* innerChunkCache() {
            let count = 0;
            while (size > count++ && !next.done) {
              yield next.value;
              next = iterator.next();
            }
          })), optimize);
          yield innerSeq;
        }
      }
    });
  }

  concat(...items: Iterable<T>[]): Seq<T> {
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

  count(condition: Condition<T> = () => true): number {
    return this.countInternal(condition);
  }

  diff<K = T>(items: Iterable<T>, keySelector: (item: T) => K = x => x as unknown as K): Seq<T> {
    return this.generate(function* diff(self) {
      const firstKeys = new Set<K>();
      const second: [T, K][] = Array.isArray(items) ? new Array<[T, K]>(items.length) : [];

      let index = 0;
      for (const item of items) second[index++] = [item, keySelector(item)];

      if (index === 0) {
        yield* self;
        return;
      }

      const secondKeys = new Set<K>(second.map(([_, key]) => key));

      for (const item of self) {
        const key = keySelector(item);
        if (!secondKeys.has(key)) yield item;
        firstKeys.add(key);
      }

      for (const [value, key] of second) {
        if (!firstKeys.has(key)) yield value;
      }

      secondKeys.clear();
      firstKeys.clear();
    });
  }

  diffDistinct<K>(items: Iterable<T>, keySelector: (item: T) => K = x => x as unknown as K): Seq<T> {
    const self = this;
    return this.generate(function* diff() {
      const firstKeys = new Set<K>();
      const second: [T, K][] = Array.isArray(items) ? new Array<[T, K]>(items.length) : [];
      let index = 0;
      for (const item of items) second[index++] = [item, keySelector(item)];

      if (index === 0) {
        yield* self.distinct(keySelector);
        return;
      }

      const secondKeys = new Set<K>(second.map(([_, key]) => key));

      for (const item of self) {
        const key = keySelector(item);
        if (!secondKeys.has(key) && !firstKeys.has(key)) yield item;
        firstKeys.add(key);
      }

      for (const [value, key] of second) {
        if (!firstKeys.has(key)) {
          firstKeys.add(key);
          yield value;
        }
      }

      secondKeys.clear();
      firstKeys.clear();
    });
  }

  distinct<K>(keySelector: Selector<T, K> = x => x as unknown as K): Seq<T> {
    return this.generate(function* distinct(self) {
      const keys = new Set<K>();
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

  endsWith<K>(items: Iterable<T>, keySelector?: (item: T) => K): boolean {
    const first = Array.from(this, keySelector as Selector<T, K>)
    const second = (!keySelector && Array.isArray(items)) ? items : Array.from(items, keySelector as Selector<T, K>);

    let offset = first.length - second.length;
    if (offset < 0) return false;
    for (const item of second) {
      if (!sameValueZero(first[offset++], item)) return false;
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

  first(defaultIfEmpty?: T): T | undefined {
    // noinspection LoopStatementThatDoesntLoopJS
    for (const value of this) {
      return value;
    }
    return defaultIfEmpty;
  }

  firstAndRest(defaultIfEmpty?: T): [T, Seq<T>] {
    return [this.first(defaultIfEmpty) as T, this.skip(1)];
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

  flatMap<U, R = U>(selector: Selector<T, Iterable<U>>, mapResult?: ((subItem: U, parent: T, index: number) => R)): Seq<R> {
    return this.generate(function* flatMap(items) {
      for (const {value, index} of entries(items)) {
        const subItems = selector(value, index);
        if (!isIterable(subItems, true)) {
          const finalValue = mapResult ? mapResult(subItems, value, index) : subItems as unknown as R;
          yield finalValue;
        } else for (const {value: subValue, index: subIndex} of entries(subItems)) {
          const finalValue = mapResult ? mapResult(subValue, value, subIndex) : subValue as unknown as R;
          yield finalValue;
        }
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

  groupBy<K, U>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>, valueSelector?: Selector<T, U>): SeqOfGroups<K, U>;

  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>, valueSelector?: Selector<T, U>): SeqOfGroups<K, U> {
    return this.transferOptimizeTag(factories.SeqOfGroups(this.getSourceForNewSequence(), keySelector, toComparableKey, valueSelector))
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
      isSequence(value) ? value.useSequence : isFactory(value) ? {
        * [Symbol.iterator]() {
          yield value.useFactory();
        }
      } : [value as T]);

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

  includesAll<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  includesAll<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  includesAll<U, K>(items: Iterable<T> | Iterable<U>, keySelector: Selector<T, K> = t => t as unknown as K, secondKeySelector: Selector<U, K> = keySelector as unknown as Selector<U, K>): boolean {
    const secondKeys = new Set<K>();
    let index = 0;
    for (const item of this) {
      if (secondKeys.size === 0) {
        let secondIndex = 0;
        for (const item of items) secondKeys.add(secondKeySelector(item as U, secondIndex++));
        if (secondKeys.size === 0) return true;
      }
      const key = keySelector(item as T, index++);
      secondKeys.delete(key);
      if (secondKeys.size === 0) return true;
    }
    return false;
  }

  includesAny<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  includesAny<U, K>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  includesAny<U, K>(items: Iterable<T> | Iterable<U>, keySelector: Selector<T, K> = t => t as unknown as K, secondKeySelector: Selector<U, K> = keySelector as unknown as Selector<U, K>): boolean {
    let secondKeys = new Set<K>();
    let index = 0;
    for (const item of this) {
      if (secondKeys.size === 0) {
        let secondIndex = 0;
        for (const item of items) secondKeys.add(secondKeySelector(item as U, secondIndex++));
        if (secondKeys.size === 0) return false;
      }
      const key = keySelector(item as T, index++);
      if (secondKeys.has(key)) {
        secondKeys.clear();
        return true;
      }
    }
    return false;
  }

  includesSubSequence<K>(subSequence: Iterable<T>, keySelector?: (item: T) => K): boolean;

  includesSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: (item: T) => K): boolean;

  includesSubSequence<K = T>(subSequence: Iterable<T>, fromIndex?: number | ((item: T) => K), keySelector?: (item: T) => K): boolean {
    if (typeof fromIndex !== "number") [fromIndex, keySelector] = [0, fromIndex as (item: T) => K];
    return this.findSubSequence(subSequence, fromIndex, keySelector)[0] > -1;
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

  indexOfSubSequence<K>(subSequence: Iterable<T>, keySelector?: (item: T) => K): number;

  indexOfSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: (item: T) => K): number;

  indexOfSubSequence<K = T>(subSequence: Iterable<T>, fromIndex?: number | ((item: T) => K), keySelector?: (item: T) => K): number {
    if (typeof fromIndex !== "number") [fromIndex, keySelector] = [0, fromIndex as (item: T) => K];

    return this.findSubSequence(subSequence, fromIndex, keySelector)[0];
  }

  innerJoin<I, K, R = { outer: T; inner: I }>(inner: Iterable<I>, outerKeySelector: Selector<T, K>, innerKeySelector: Selector<I, K>, resultSelector?: (outer: T, inner: I) => R): Seq<R> {
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
          yield resultSelector ? resultSelector(outer, inner) : {outer, inner} as unknown as R;
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

  intersect<K = T>(items: Iterable<T>, keySelector: (item: T) => K = x => x as unknown as K): Seq<T> {
    return this.generate(function* intersect(self) {
      let secondKeys = new Set<K>();
      for (const second of items) secondKeys.add(keySelector(second));
      for (const first of self) {
        const key = keySelector(first);
        const exists = secondKeys.has(key);
        if (exists) {
          yield first;
          secondKeys.delete(key);
        }
      }
    });
  }

  intersperse(separator: T, insideOut?: boolean): Seq<T>;

  intersperse<U>(separator: U, insideOut?: boolean): Seq<T | U>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: { prefix?: TPrefix; suffix?: TSuffix }): Seq<TPrefix | U | TSuffix>;

  intersperse<U = T, TPrefix = T, TSuffix = T>(separator: U, opts?: boolean | { prefix?: TPrefix; suffix?: TSuffix; }): Seq<TPrefix | U | TSuffix> {
    function isOpts(v: any): v is { prefix?: TPrefix; suffix?: TSuffix; } {
      return v && (v.prefix !== undefined || v.suffix !== undefined);
    }

    const {prefix, suffix} = opts === true ?
      {prefix: separator, suffix: separator} :
      !isOpts(opts) ?
        {prefix: undefined, suffix: undefined} :
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

  isEmpty(): boolean {
    if (SeqTags.optimize(this) && SeqTags.empty(this)) return true;
    // noinspection LoopStatementThatDoesntLoopJS
    for (const _ of this) return false;
    return true;
  }

  join(separator?: string): string;

  join(opts: { start?: string; separator?: string; end?: string }): string;

  join(separatorOrOpts?: string | { start?: string; separator?: string; end?: string }): string {
    const safe = (v: any, fallback: any) => v === undefined ? fallback : v;

    const {start, separator, end} = (separatorOrOpts === undefined) ?
      {start: '', separator: ',', end: ''} :
      typeof separatorOrOpts === 'string' || separatorOrOpts === null ?
        {start: '', separator: separatorOrOpts, end: ''} :
        typeof separatorOrOpts === 'object' ?
          {
            start: safe(separatorOrOpts.start, ''),
            separator: safe(separatorOrOpts.separator, ','),
            end: safe(separatorOrOpts.end, '')
          } :
          {start: '', separator: separatorOrOpts, end: ''};

    return this.joinInternal(start, separator, end);
  }

  last(): T | undefined;

  last(fallback: T): T;

  last(fallback?: T): T | undefined {
    if (SeqTags.optimize(this) && SeqTags.empty(this)) return fallback;
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
      return foundIndex > -1 && foundIndex <= positiveFromIndex ? foundIndex : -1;
    }

    let foundIndex = -1;
    for (const item of this) {
      if (sameValueZero(itemToFind, item)) foundIndex = index;
      if (index === fromIndex) break;
      index++
    }
    return foundIndex;
  }

  map<U = T>(mapFn: Selector<T, U>): Seq<U> {
    const map = {map: mapFn};
    return factories.FilterMapSeq<T, U>(this.getSourceForNewSequence(), map);
  }

  max(): T extends number ? number : never;

  max(selector: Selector<T, number>): number;

  max(selector: Selector<T, number> = x => x as unknown as number): number | void {
    let max = Number.NEGATIVE_INFINITY;
    let index = 0;
    for (const value of this) {
      const v = selector(value, index++);
      if (max < v) max = v;
    }
    return max;
  }

  min(): T extends number ? number : never;

  min(selector: Selector<T, number>): number;

  min(selector: Selector<T, number> = x => x as unknown as number): number | void {
    let min = Number.POSITIVE_INFINITY;
    let index = 0;
    for (const value of this) {
      const v = selector(value, index++);
      if (min > v) min = v;
    }
    return min;
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

  prepend(...items: Iterable<T>[]): Seq<T> {
    return this.insert(0, ...items);
  }

  push(...items: T[]): Seq<T> {
    return this.concat(items);
  }

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T;

  // orderBy<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T> {
  //   return factories.OrderedSeq(this, keySelector, comparer);
  // }
  //
  // orderByDescending<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T> {
  //   return factories.OrderedSeq(this, keySelector, comparer, true);
  // }

  reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T;

  reduce<U>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U;

  reduce<U = T>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {
    const iter = this.getIterator();
    let previous = initialValue;
    let index = initialValue !== undefined ? 0 : 1;
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
  remove<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T> {
    return this.removeInternal(items, keySelector, false);
  }

  /**
   * Remove all occurrences of items from source sequence
   * @param items
   * @param keySelector
   */
  removeAll<K>(items: Iterable<T>, keySelector?: (item: T) => K): Seq<T> {
    return this.removeInternal(items, keySelector, true);
  }

  removeFalsy(): Seq<T> {
    return this.generate(function* removeFalsy(self) {
      for (const item of self) {
        if (item) yield item;
      }
    });
  }

  removeNulls(): Seq<T> {
    return this.generate(function* removeNulls(self) {
      for (const item of self) {
        if (item != null) yield item;
      }
    });
  }

  repeat(count: number): Seq<T> {
    if (count <= 0) throw new Error('Count must be positive');
    if (count === 1) return this;
    return this.generate(function* repeat(self) {
      while (count--) yield* self;
    })
  }

  reverse(): Seq<T> {
    return this.generate(function* reverse(self) {
      const array = [...self];
      for (let index = array.length - 1; index >= 0; index--) {
        yield array[index];
      }
      array.length = 0;
    })
  }

  sameItems<K>(second: Iterable<T>, keySelector?: (item: T) => K): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K> = t => t as unknown as K, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): boolean {
    let secondIndex = 0;
    let secondKeys = new Map<K, number>();
    for (const item of second) {
      const key = secondKeySelector(item, secondIndex++);
      const count = secondKeys.get(key) ?? 0;
      secondKeys.set(key, count + 1);
    }
    let firstIndex = 0;
    for (const item of this) {
      const key = firstKeySelector(item, firstIndex++);
      const secondCounter = secondKeys.get(key);
      if (secondCounter === undefined) return false;
      if (secondCounter === 1) secondKeys.delete(key);
      else secondKeys.set(key, secondCounter - 1);
    }
    return secondKeys.size === 0;
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

    return next.done ?? false;
  }

  skip(count: number): Seq<T> {
    if (count <= 0) return this;
    return this.skipWhile((_, index) => index < count);
  }

  skipFirst(): Seq<T> {
    return this.skip(1);
  }

  skipLast(count: number = 1): Seq<T> {
    if (count <= 0) return empty<T>();
    return this.generate(function* skipLast(items) {
      const array: T[] = Array.isArray(items) ? items : [...items];
      for (let i = 0; i < array.length - count; i++) yield array[i];
    })
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
    if (end === 0 || end - start === 0) return empty<T>();

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

  sort(comparer?: Comparer<T>): SortedSeq<T> {
    return factories.SortedSeq(this.getSourceForNewSequence(), undefined, comparer || LEGACY_COMPARER);
  }

  sortBy<U = T>(valueSelector: (item: T) => U, reverse = false): SortedSeq<T> {
    return factories.SortedSeq(this.getSourceForNewSequence(), valueSelector, undefined, reverse);
  }

  sorted(reverse = false): Seq<T> {
    return factories.SortedSeq(this.getSourceForNewSequence(), undefined, undefined, reverse);
  }

  split(atIndex: number): [Seq<T>, Seq<T>];

  split(condition: Condition<T>): [Seq<T>, Seq<T>];

  split(atIndexOrCondition: number | Condition<T>): [Seq<T>, Seq<T>] {
    return (typeof atIndexOrCondition === 'number') ?
      this.splitAtIndex(atIndexOrCondition) :
      this.splitByCondition(atIndexOrCondition);
  }

  startsWith<K>(items: Iterable<T>, keySelector: (item: T) => K = t => t as unknown as K): boolean {
    if (Array.isArray(items) && items.length === 0) return true;

    const secondIterator = getIterator(items);
    let secondNext = secondIterator.next();
    for (const first of this) {
      if (secondNext.done) return true;
      const firstKey = keySelector(first);
      const secondKey = keySelector(secondNext.value);
      const same = sameValueZero(firstKey, secondKey);
      if (!same) return false;
      secondNext = secondIterator.next();
    }

    return secondNext.done ?? false;
  }

  sum(): T extends number ? number : never;

  sum(selector: Selector<T, number>): number;

  sum(selector: Selector<T, number> = x => x as unknown as number): number | void {
    let sum = 0;
    let index = 0;
    for (const value of this) sum += selector(value, index++);
    return sum;
  }

  take(count: number): Seq<T> {
    return this.takeInternal(count);
  }

  takeLast(count: number): Seq<T> {
    if (count <= 0) return empty<T>();
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

  takeOnly<K = T>(items: Iterable<T>, keySelector: (item: T) => K): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector?: Selector<U, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): Seq<T> {
    return this.generate(function* takeOnly(self, iterationContext) {
      const map = new Map<K, number>();
      const secondIterator = iterationContext.closeWhenDone(getIterator(items));
      let secondNext = secondIterator.next();
      if (secondNext.done) return; // empty
      let secondIndex = 0;
      const removeFromSecond = (firstKey: K): boolean => {
        let secondCount = map.get(firstKey);
        if (secondCount) {
          if (secondCount === 1) map.delete(firstKey);
          else map.set(firstKey, secondCount - 1);
          return true;
        }
        while (!secondNext.done) {
          const second = secondNext.value;
          const secondKey = secondKeySelector(second, secondIndex++);
          secondNext = secondIterator.next();
          if (sameValueZero(firstKey, secondKey)) return true;
          secondCount = map.get(secondKey) || 0;
          map.set(secondKey, secondCount + 1);
        }

        return false;
      };

      let firstIndex = 0;
      for (const first of self) {
        const firstKey = firstKeySelector(first, firstIndex++);
        const removed = removeFromSecond(firstKey);
        if (removed) yield first;
      }
    });
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

  toMap<K, V>(keySelector: Selector<T, K>, valueSelector: Selector<T, V> = t => t as unknown as V, toComparableKey?: ToComparableKey<K>): Map<K, V> {
    if (!toComparableKey) {
      return new Map<K, V>(this.map((item, index) => [keySelector(item, index), valueSelector(item, index)]));
    }

    const keys = new Set<ReturnType<ToComparableKey<K>>>();
    const map = new Map<K, V>();
    let index = 0;
    for (const item of this) {
      const key = keySelector(item, index);
      const stringKey = toComparableKey(key);
      if (!keys.has(stringKey)) {
        keys.add(stringKey);
        const value = valueSelector(item, index);
        map.set(key, value);
      }

      index++;
    }

    return map;
  }

  toSet<K>(keySelector?: Selector<T, K>): Set<T> {
    if (!keySelector) return new Set<T>(this);

    const keys = new Set<K>();
    const set = new Set<T>();
    let index = 0;
    for (const item of this) {
      const key = keySelector(item, index++);
      if (keys.has(key)) continue;
      keys.add(key);
      set.add(item);
    }

    return set;
  }

  toString(): string {
    return this.join({start: '[', end: ']'});
  }

  transform<U = T>(transformer: (seq: Seq<T>) => Seq<U>): Seq<U> {
    return transformer(this);
  }

  union<K>(second: Iterable<T>, opts?: { preferSecond?: boolean; }): Seq<T>;
  union<K>(second: Iterable<T>, keySelector?: (value: T) => K, opts?: { preferSecond?: boolean; }): Seq<T>;

  union<K>(second: Iterable<T>, keySelectorOrOpts?: ((value: T) => K) | { preferSecond?: boolean; }, opts?: { preferSecond?: boolean; }): Seq<T> {
    const isOpts = (value: any): value is { preferSecond?: boolean; } => typeof value?.['preferSecond'] === "boolean";
    let keySelector: (value: T) => K = x => x as unknown as K;
    if(isOpts(keySelectorOrOpts)) {
      opts = keySelectorOrOpts;
    } else {
      keySelector = keySelectorOrOpts ?? keySelector;
    }

    const [left, right] = opts?.preferSecond?[second,this]:[this, second];
    return this.generateForSource(left, function * union() {
      function *concat(){
        yield *left;
        yield *right;
      }
      const keys = new Set<K>();
      for (const item of concat()) {
        const key = keySelector(item);
        if (keys.has(key)) continue;
        keys.add(key);
        yield item;
      }
      keys.clear();
    })
  }

  unshift(...items: T[]): Seq<T> {
    return this.prepend(items);
  }

  zip<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts>): Seq<[T, T1, ...Ts]> {
    return this.generate(function* zip(self, iterationContext) {
      const allIterables: any[] = [self, items, ...moreItems];
      const iterables = allIterables.map(iterator => iterationContext.closeWhenDone(getIterator(iterator)));
      let next = iterables.map(it => it.next());
      while (next.every(next => !next.done)) {
        yield next.map(next => next.value);
        next = iterables.map(it => it.next());
      }
    }) as any;
  }

  zipAll<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts> | [...Iterables<Ts>, { defaults?: [T?, T1?, ...Ts] }]): Seq<[T, T1, ...Ts]> {
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
      const iterables = allIterables.map(iterator => iterationContext.closeWhenDone(getIterator(iterator)));
      let next = iterables.map(it => it.next());
      while (!next.every(next => next.done)) {
        yield next.map((next, i) => next.done ? defaults[i] : next.value);
        next = iterables.map(it => it.next());
      }
    });

    return res as any;
  }

  zipWithIndex<U = T>(): Seq<[T, number]> {
    return this.map((item, index) => [item, index]);
  }

  abstract [Symbol.iterator](): Iterator<T>;

  findSubSequence<K = T>(subSequence: Iterable<T>, fromIndex: number, keySelector?: (item: T) => K): [number, number] {
    // console.log(`includesSubSequence()`);

    const matcher = new class {
      private iterator: Iterator<K> | undefined;
      private next: IteratorResult<K>;
      private iterable = new class {
        readonly cache: K[] = [];
        private iterator = getIterator(subSequence);
        private next: IteratorResult<T> | undefined = undefined;

        get isEmpty(): boolean {
          return this.cache.length === 0;
        }

        * iterate() {
          yield* this.cache;
          if (this.next && this.next.done) return;
          this.next = this.iterator.next();
          while (!this.next.done) {
            const key = keySelector ? keySelector(this.next.value) : this.next.value as unknown as K;
            this.cache.push(key);
            yield key;
            this.next = this.iterator.next();
          }
        }
      };

      get done(): boolean {
        return this.next?.done ?? false;
      }

      get isEmpty(): boolean {
        return this.done && this.iterable.isEmpty;
      }

      matchNextKey(key: K): { match?: boolean; done?: boolean } {
        // console.log(`matchNextKey(${key})`);
        if (!this.iterator) {
          this.iterator = this.iterable.iterate();
          this.next = this.iterator.next();
        }
        // console.log('matchNextKey.next', this.next);
        if (this.next.done) return {done: true};

        const match = sameValueZero(key, this.next.value);
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

      const firstKey = keySelector ? keySelector(item) : item as unknown as K;
      const matchResult = matcher.matchNextKey(firstKey);
      if (matchResult.done) {
        index--;
        break;
      }
      if (!match && matchResult.match) matchStartIndex = index;
      match = matchResult.match as boolean;
    }

    return (matcher.done && (match || matcher.isEmpty)) ? [matchStartIndex, index] : [-1, -1];
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

  protected anyInternal(condition?: Condition<T>) {
    let index = 0;
    for (const item of this) if (condition ? condition(item, index++) : true) return true;
    return false;
  }

  protected countInternal(condition: Condition<T> = () => true): number {
    let count = 0;
    let index = 0;
    for (const item of this) {
      if (condition(item, index++)) count++;
    }
    return count;
  }

  protected hasAtLeastInternal(count: number): boolean {
    if (count <= 0) throw new RangeError('count must be positive');
    for (const item of this) {
      count--;
      if (count === 0) return true;
    }
    return false;
  }

  protected joinInternal(start: string, separator: string, end: string): string {
    return start + [...this].join(separator) + end;
  }

  protected takeInternal(count: number): Seq<T> {
    if (count <= 0) return empty<T>();

    return this.generate(function* take(items) {
      for (const {value, index} of entries(items)) {
        yield value;
        if (index + 1 === count) break;
      }
    }, [[SeqTags.$maxCount, count]]);
  }

  protected anyOptimized(source: Iterable<any>, condition?: Condition<T>): boolean {
    if (!SeqTags.optimize(this)) return this.anyInternal(condition);
    if (SeqTags.empty(this)) return false;

    if (!condition) {
      if (SeqTags.infinite(this)) return true;
      if (SeqTags.notAffectingNumberOfItems(this)) {
        if (Array.isArray(source)) return source.length > 0;
        if (SeqTags.isSeq(source)) return source.any();
      }
    }

    return this.anyInternal(condition);
  }

  protected countOptimized(source: Iterable<any>, condition: Condition<T> = () => true): number {
    if (!SeqTags.optimize(this)) return this.countInternal(condition);
    if (SeqTags.infinite(this)) throw RangeError('Cannot count infinite sequence');
    if (SeqTags.empty(this)) return 0;

    if (!condition && SeqTags.notAffectingNumberOfItems(this)) {
      if (Array.isArray(source)) return source.length;
      if (SeqTags.isSeq(source)) return source.count();
    }
    return this.countInternal(condition);
  }

  protected hasAtLeastOptimized(source: Iterable<any>, count: number): boolean {
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

  protected includesOptimized(source: Iterable<any>, itemToFind: T, fromIndex: number = 0): boolean {
    if (SeqTags.optimize(this) && SeqTags.notAffectingNumberOfItems(this) && SeqTags.notMappingItems(this)) {
      if (Array.isArray(source) && source.length) return source.includes(itemToFind, fromIndex);
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

  protected findFirstByConditionInternal<S extends T>(fromIndex: number, condition: | Condition<T> | ((item: T, index: number) => item is S), fallback?: S): [index:number, first:S | undefined] {
    let index = -1;
    for (const item of this) {
      index++;
      if (index < fromIndex) continue;
      if (condition(item, index)) return [index, item];
    }

    return [-1, fallback];
  }

  protected findLastByConditionInternal(tillIndex: number, condition: Condition<T>, fallback?: T): [index:number, last:T | undefined] {
    let index = -1;
    let found: [number, T] = [-1, fallback as T];
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
    tags = optimize ? [...tags ?? [], [SeqTags.$optimize, true]] : tags;

    return factories.Seq(source, generator, tags);
  }

  protected transferOptimizeTag<TSeq extends Seq<any>>(to: TSeq): TSeq {
    if (SeqTags.optimize(this)) this.tagAsOptimized(to);
    return to;
  }

  protected tagAsOptimized<TSeq extends Seq<any>>(seq: TSeq, optimize: boolean = true): TSeq {
    if (optimize) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
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
    return this.transferOptimizeTag(factories.SeqOfGroups(gen, ({outer}) => outer, undefined, ({inner}) => inner))
  }

  private findFirstByCondition<S extends T>(fromIndex: number | ((item: T, index: number) => item is S) | Condition<T>, condition?: ((item: T, index: number) => item is S) | Condition<T> | S | undefined, fallback?: S | undefined): [index:number, first:S | undefined] {
    [fromIndex, condition, fallback] = (typeof fromIndex === "number") ?
      [fromIndex, condition as (item: T, index: number) => item is S, fallback] :
      [0, fromIndex, condition as S | undefined];

    if (fromIndex < 0) fromIndex = 0;

    return this.findFirstByConditionInternal(fromIndex, condition, fallback);
  }

  private findLastByCondition(tillIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): [index:number, last:T | undefined] {
    [tillIndex, condition, fallback] = (typeof tillIndex === "number") ?
      [tillIndex, condition as Condition<T>, fallback] :
      [Number.NaN, tillIndex, condition as T | undefined];

    return this.findLastByConditionInternal(tillIndex, condition, fallback);
  }

  private removeInternal<K>(items: Iterable<T>, keySelector: (item: T) => K = x => x as unknown as K, all: boolean = false): Seq<T> {
    return this.generate(function* remove(self) {
      const keys = new Map<K, number>();
      for (const second of items) {
        const key = keySelector(second);
        const occurrencesCount = (keys.get(key) ?? 0) + 1;
        keys.set(key, occurrencesCount);
      }

      for (const item of self) {
        const key = keySelector(item);
        if (keys.has(key)) {
          const occurrencesCount = keys.get(key) ?? 0;
          if (!all) {
            if (occurrencesCount < 2) keys.delete(key);
            else keys.set(key, occurrencesCount - 1);
          }
          continue;
        }
        yield item;
      }
      keys.clear();
    });
  }

  private splitAtIndex(atIndex: number): [Seq<T>, Seq<T>] {
    let iterator: Iterator<T>;
    let next: IteratorResult<T>;
    const first = factories.CachedSeq<T>(new Gen(this.getSourceForNewSequence(), function* splitAtIndexFirst(source) {
      iterator = getIterator(source);
      next = iterator.next();
      let index = 0;
      while (!next.done && index < atIndex) {
        yield next.value;
        index++;
        next = iterator.next();
      }
    }));

    const second = this.generate(function* splitAtIndexSecond() {
      // apply cache
      first.array;
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }

    });

    return [first, second];
  }

  private splitByCondition(condition: Condition<T>): [Seq<T>, Seq<T>] {
    let iterator: Iterator<T>;
    let next: IteratorResult<T>;
    const first = factories.CachedSeq<T>(new Gen(this.getSourceForNewSequence(), function* splitAtIndexFirst(source) {
      iterator = getIterator(source);
      next = iterator.next();
      let index = 0;
      while (!next.done && condition(next.value, index++)) {
        yield next.value;
        index++;
        next = iterator.next();
      }
    }));

    const second = this.generate(function* splitAtIndexSecond() {
      first.consume();
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }

    });

    return [first, second];
  }
}

class CyclicBuffer<T> implements Iterable<T> {
  private buffer: T[];
  private start = -1;
  private end = -1;

  constructor(size: number) {
    this.buffer = new Array<T>(size);
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
    if (index >= this.bufferSize) return undefined;
    index = (this.start + index) % this.bufferSize;
    return this.buffer[index];
  }

  * [Symbol.iterator](): Iterator<T> {
    if (this.start < 0) return;
    let [index1, count1] = [this.start, this.end < this.start ? this.bufferSize : this.end + 1];
    let [index2, count2] = [0, this.end < this.start ? (this.end + 1) : 0];

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
}
