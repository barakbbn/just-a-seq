import {
  entries,
  Gen,
  getIterator,
  groupItems,
  IGNORED_ITEM,
  isIterable,
  LEGACY_COMPARER,
  mapAsArray,
  sameValueZero,
  tapGenerator
} from './common'

import {
  CachedSeq,
  ComparableType,
  Comparer,
  Condition,
  factories,
  Iterables,
  OrderedSeq,
  Selector,
  Seq,
  SeqOfGroups,
  ToComparableKey
} from './seq'


export abstract class SeqBase<T> implements Seq<T> {

  protected abstract get items(): Iterable<T>;

  protected static isArray<T>(items: Iterable<T>): items is Array<T> {
    return Array.isArray(items);
  }

  all(condition: Condition<T>): boolean {
    let index = 0;
    for (const item of this) if (!condition(item, index++)) return false;
    return true;
  }

  any(condition?: Condition<T>): boolean {
    let index = 0;
    for (const item of this) if (condition?.(item, index++) ?? true) return true;
    return false;
  }

  as<U>(): Seq<U> {
    return this as unknown as Seq<U>;
  }

  readonly asSeq = (): Seq<T> => {
    return factories.Seq(this);
  };

  at(index: number, fallback?: T): T | undefined {

    if (SeqBase.isArray(this.items)) {
      if (index < 0) index = this.items.length + index;
      if (index < 0) return fallback;
      return this.items[index] ?? fallback;
    }

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
    return factories.CachedSeq(this, now);
  }

  chunk(size: number): Seq<Seq<T>> {
    if (size < 1) return factories.Seq<Seq<T>>();
    const self = this;
    return this.generate(function* chunk() {
      const items = self.items;
      if (SeqBase.isArray(items)) {
        for (let skip = 0; skip < items.length; skip += size) {
          yield factories.Seq<T>(items.slice(skip, skip + size));
        }

      } else {
        let innerSeq: Seq<T> | undefined;
        const iterator = getIterator(self);
        let next = iterator.next();
        while (!next.done) {
          if (innerSeq) innerSeq.consume();
          if (next.done) break;

          innerSeq = factories.CachedSeq<T>(new Gen(self, function* innerChunkCache() {
            let count = 0;
            while (size > count++ && !next.done) {
              yield next.value;
              next = iterator.next();
            }
          }));
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

  consume(): void {
    if (SeqBase.isArray(this.items)) return;
    const iterator = this.getIterator();
    while (!iterator.next().done) {
    }
  }

  count(condition: Condition<T> = () => true): number {
    let count = 0;
    let index = 0;
    for (const item of this) {
      if (condition(item, index++)) count++;
    }
    return count;
  }

  diff<K = T>(items: Iterable<T>, keySelector: Selector<T, K> = x => x as unknown as K): Seq<T> {
    return this.generate(function* diff(self) {
      const firstKeys = new Set<K>();
      const second: [T, K][] = Array.isArray(items) ? new Array<[T, K]>(items.length) : [];

      let index = 0;
      for (const item of items) second[index] = [item, keySelector(item, index++)];

      if (index === 0) {
        yield* self;
        return;
      }

      const secondKeys = new Set<K>(second.map(([_, key]) => key));

      index = 0;
      for (const item of self) {
        const key = keySelector(item, index++);
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

  diffDistinct<K = T>(items: Iterable<T>, keySelector: Selector<T, K> = x => x as unknown as K): Seq<T> {
    const self = this;
    return this.generate(function* diff() {
      const firstKeys = new Set<K>();
      const second: [T, K][] = Array.isArray(items) ? new Array<[T, K]>(items.length) : [];
      let index = 0;
      for (const item of items) second[index] = [item, keySelector(item, index++)];

      if (index === 0) {
        yield* self.distinct(keySelector);
        return;
      }

      const secondKeys = new Set<K>(second.map(([_, key]) => key));

      index = 0;
      for (const item of self) {
        const key = keySelector(item, index++);
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

  endsWith<K>(items: Iterable<T>, keySelector?: Selector<T, K>): boolean {
    const first = mapAsArray<T, K>(this.items, keySelector);
    const second = mapAsArray<T, K>(items, keySelector);

    let offset = first.length - second.length;
    if (offset < 0) return false;
    for (const item of second) {
      if (!sameValueZero(first[offset++], item)) return false;
    }
    return true;
  }

  every(condition: Condition<T>): boolean {
    let index = 0;
    for (const item of this) {
      if (!condition(item, index++)) return false;
    }

    return true;
  }

  entries(): Seq<[number, T]> {
    return this.map((item, index) => [index, item]);
  }

  filter(condition: Condition<T>): Seq<T> {
    return this.generate(function* filter(self) {
      for (const {value, index} of entries(self)) if (condition(value, index)) yield value;
    });

    // return this.generate(function* filter(self) {
    //   let index = 0;
    //   for (const item of self) if (condition(item, index++)) yield item;
    // });
  }

  findIndex(condition: Condition<T>): number;

  findIndex(fromIndex: number, condition: Condition<T>): number;

  findIndex(fromIndex: number | Condition<T>, condition?: Condition<T>): number {
    return this.findInternal(fromIndex, condition)[0];
  }

  find(condition: Condition<T>, fallback?: T | undefined): T | undefined;

  find(fromIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  find(fromIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): T | undefined {
    return this.findInternal(fromIndex, condition, fallback)[1];
  }

  findLast(condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findLast(tillIndex: number, condition: Condition<T>, fallback?: T | undefined): T | undefined;

  findLast(tillIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): T | undefined {
    return this.findLastInternal(tillIndex, condition, fallback)[1];
  }

  findLastIndex(condition: Condition<T>): number;

  findLastIndex(tillIndex: number, condition: Condition<T>): number;

  findLastIndex(tillIndex: number | Condition<T>, condition?: Condition<T>): number {
    return this.findLastInternal(tillIndex, condition)[0];
  }

  first(fallback?: T): T | undefined {
    const next = this.getIterator().next();
    return next.done ? fallback : next.value;
  }

  firstAndRest(defaultIfEmpty?: T): [T, Seq<T>] {
    return [this.first(defaultIfEmpty) as T, this.skip(1)];
  }

  flatMap<R>(selector?: Selector<T, Iterable<R>>): Seq<R>;

  flatMap<U, R>(selector: Selector<T, Iterable<U>>, mapResult?: (subItem: U, parent: T, index: number) => R): Seq<R>;

  flatMap<U, R = U>(selector?: Selector<T, Iterable<U>>, mapResult?: ((subItem: U, parent: T, index: number) => R)): Seq<R> {
    const self = this;
    return factories.Seq(this.generate(function* flatMap() {
      let index = 0;
      for (const item of self) {
        const subItems = selector ? selector(item, index++) : isIterable<U>(item) ? item : undefined;
        if (subItems) {
          if (mapResult) {
            let subIndex = 0;
            for (const subItem of subItems) yield mapResult(subItem, item, subIndex++);
          } else yield* (subItems as unknown as Iterable<R>);
        }
      }
    }));
  }

  forEach(callback: (value: T, index: number, breakLoop: object) => void, thisArg?: any): void {
    if (thisArg) callback = callback.bind(thisArg);
    const breakLoop: any = {};

    for (const {value, index,} of entries(this)) {
      if (callback(value, index, breakLoop) === breakLoop) break;
    }

    // let index = 0;
    // const iterator = this.getIterator();
    // let next = iterator.next();
    // let value = next.value;
    //
    // while (!next.done) {
    //   next = iterator.next();
    //   const shouldBreak: any = callback(value, index++, next.done ?? false, breakLoop);
    //   if (shouldBreak === breakLoop) break;
    //   value = next.value;
    // }
  }


  groupBy<K>(keySelector: Selector<T, K>, toPrimitiveKey?: ToComparableKey<K>): SeqOfGroups<K, T>;
  groupBy<K, U>(keySelector: Selector<T, K>, toPrimitiveKey?: ToComparableKey<K>, valueSelector?: Selector<T, U>): SeqOfGroups<K, U>;
  groupBy<K, U = T>(keySelector: Selector<T, K>, toComparableKey?: ToComparableKey<K>, valueSelector?: Selector<T, U>): SeqOfGroups<K, U> {
    return factories.SeqOfGroups(this, keySelector, toComparableKey, valueSelector);
  }

  groupJoin<I>(inner: Iterable<I>, outerKeySelector: ToComparableKey<T>, innerKeySelector: ToComparableKey<I>): SeqOfGroups<T, I> {
    return this.groupJoinInternal(this, outerKeySelector, inner, innerKeySelector);
  }

  groupJoinRight<I>(inner: Iterable<I>, outerKeySelector: ToComparableKey<T>, innerKeySelector: ToComparableKey<I>): SeqOfGroups<I, T> {
    return this.groupJoinInternal<I, T>(inner, innerKeySelector, this, outerKeySelector);
  }

  hasAtLeast(count: number): boolean {
    if (count <= 0) throw new RangeError('count must be positive');
    if (Array.isArray(this.items)) return this.items.length >= count;
    for (const item of this) {
      count--;
      if (count === 0) return true;
    }
    return false;
  }

  ifEmpty(value?: T): Seq<T>;

  ifEmpty({useSequence}: { useSequence: Iterable<T> }): Seq<T>;

  ifEmpty({useFactory}: { useFactory: () => T }): Seq<T>;

  ifEmpty(value?: T | { useSequence: Iterable<T> } | { useFactory: () => T }): Seq<T> {
    const isSequence = (v: any): v is { useSequence: Iterable<T> } => v && isIterable(v.useSequence);
    const isFactory = (v: any): v is { useFactory: () => T } => v && typeof (v.useFactory) === 'function';

    let valueProvider: () => Iterable<T>;
    if (isSequence(value)) valueProvider = (() => value.useSequence);
    else if (isFactory(value)) valueProvider = (() => [value.useFactory()]);
    else valueProvider = (() => [value as T]);

    return this.generate(function* ifEmpty(self) {
      const iterator: Iterator<T> = self[Symbol.iterator]();
      let next: IteratorResult<T, T> = iterator.next();
      if (next.done) yield* valueProvider();
      else while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  includes(itemToFind: T, fromIndex: number = 0): boolean {
    if (SeqBase.isArray(this.items)) {
      return this.items.includes(itemToFind, fromIndex);
    }

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

  includesSubSequence<K>(subSequence: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  includesSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: Selector<T, K>): boolean;

  includesSubSequence<K = T>(subSequence: Iterable<T>, fromIndex?: number | Selector<T, K>, keySelector?: Selector<T, K>): boolean {
    if (typeof fromIndex !== "number") [fromIndex, keySelector] = [0, fromIndex as Selector<T, K>];
    return this.findSubSequence(subSequence, fromIndex, keySelector)[0] > -1;
  }

  indexOf(itemToFind: T, fromIndex: number = 0): number {
    if (Array.isArray(this.items)) {
      return this.items.indexOf(itemToFind, fromIndex);
    }

    let index = 0;

    if (fromIndex >= 0) {
      for (const item of this) {
        if (index >= fromIndex && sameValueZero(itemToFind, item)) return index;
        index++;
      }
      return -1;
    }

    const buffer = new CyclicBuffer<number>(-fromIndex);
    for (const item of this) {
      if (sameValueZero(itemToFind, item)) buffer.write(index);
      index++;
    }

    const foundIndex = buffer.at(0);
    buffer.clear();
    return foundIndex ?? -1;
  }

  indexOfSubSequence<K>(subSequence: Iterable<T>, keySelector?: Selector<T, K>): number;

  indexOfSubSequence<K>(subSequence: Iterable<T>, fromIndex: number, keySelector?: Selector<T, K>): number;

  indexOfSubSequence<K = T>(subSequence: Iterable<T>, fromIndex?: number | Selector<T, K>, keySelector?: Selector<T, K>): number {
    if (typeof fromIndex !== "number") [fromIndex, keySelector] = [0, fromIndex as Selector<T, K>];

    return this.findSubSequence(subSequence, fromIndex, keySelector)[0];
  }

  innerJoin<I, R = { outer: T; inner: I }>(inner: Iterable<I>, outerKeySelector: ToComparableKey<T>, innerKeySelector: ToComparableKey<I>, resultSelector?: (outer: T, inner: I) => R): Seq<R> {
    return this.generate(function* innerJoin(self) {
      const innerGrouped = groupItems<ComparableType, I>(inner, innerKeySelector);
      for (const outer of self) {
        const outerKey = outerKeySelector(outer);
        if (!innerGrouped.has(outerKey)) continue;
        const innerGroup = innerGrouped.get(outerKey)!;
        for (const inner of innerGroup.items) {
          yield resultSelector ? resultSelector(outer, inner) : {outer, inner} as unknown as R;
        }
      }
    });
  }

  insert(atIndex: number, ...items: T[]): Seq<T>;

  insert(atIndex: number, items: Iterable<T>): Seq<T>;

  insert(atIndex: number, ...items: (T | Iterable<T>)[]): Seq<T> {
    if (!items || items.length === 0) return this;

    return this.generate(function* insert(self) {
      const toInsert = (items.length === 1 && typeof items[0] !== 'string' && isIterable(items[0])) ? items[0] as Iterable<T> : items as T[];
      let index = -1;
      if (atIndex < 0) atIndex = 0;
      for (const item of self) {
        index++;
        if (index === atIndex) yield* toInsert;
        yield item;
      }
      if (index < atIndex) yield* toInsert;
    });
  }

  insertBefore(condition: Condition<T>, ...items: T[]): Seq<T>;

  insertBefore(condition: Condition<T>, items: Iterable<T>): Seq<T>;

  insertBefore(condition: Condition<T>, ...items: (T | Iterable<T>)[]): Seq<T> {
    if (!items || items.length === 0) return this;

    return this.generate(function* insertBefore(self) {
      const toInsert = (items.length === 1 && typeof items[0] !== 'string' && isIterable(items[0])) ? items[0] as Iterable<T> : items as T[];
      let index = 0;
      const iterator = getIterator(self);
      let next = iterator.next();
      while (!next.done) {
        if (condition(next.value, index++)) break;
        yield next.value;
        next = iterator.next();
      }
      if (!next.done) yield* toInsert;
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  insertAfter(condition: Condition<T>, ...items: T[]): Seq<T>;

  insertAfter(condition: Condition<T>, items: Iterable<T>): Seq<T>;

  insertAfter(condition: Condition<T>, ...items: (T | Iterable<T>)[]): Seq<T> {
    if (!items || items.length === 0) return this;

    return this.generate(function* insertAfter(self) {
      const toInsert = (items.length === 1 && typeof items[0] !== 'string' && isIterable(items[0])) ? items[0] as Iterable<T> : items as T[];
      let index = 0;
      const iterator = getIterator(self);
      let next = iterator.next();
      while (!next.done) {
        const match = (condition(next.value, index++));
        yield next.value;
        if (match) break;
        next = iterator.next();
      }
      if (!next.done) {
        yield* toInsert;
        next = iterator.next();
      }
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  intersect<K = T>(items: Iterable<T>, keySelector: Selector<T, K> = x => x as unknown as K): Seq<T> {
    return this.generate(function* intersect(self) {
      let secondIndex = 0;
      let secondKeys = new Set<K>();
      for (const item of items) secondKeys.add(keySelector(item, secondIndex++));
      let firstIndex = 0;
      for (const item of self) {
        const key = keySelector(item, firstIndex++);
        const exists = secondKeys.has(key);
        if (exists) {
          yield item;
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
      const iterator = getIterator(self);
      let next = iterator.next();

      if (!next.done && prefix !== undefined) yield prefix;
      const hasSuffix = !next.done && suffix !== undefined;

      do {
        yield next.value;
        next = iterator.next();
        if (!next.done) yield separator;
      } while (!next.done);

      if (hasSuffix) yield suffix;

    }) as unknown as Seq<TPrefix | U | TSuffix>;
  }

  isEmpty(): boolean {
    return this.getIterator().next().done ?? false;
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

    return start + ((SeqBase.isArray(this.items)) ? this.items : [...this]).join(separator) + end;
  }

  last(): T | undefined;

  last(fallback: T): T;

  last(fallback?: T): T | undefined {
    if (Array.isArray(this.items)) return this.items[this.items.length - 1] ?? fallback;
    let lastItem = fallback;
    for (const item of this) lastItem = item;
    return lastItem;
  }

  lastIndexOf(itemToFind: T, fromIndex?: number): number {
    if (Array.isArray(this.items)) return fromIndex == null ?
      this.items.lastIndexOf(itemToFind) :
      this.items.lastIndexOf(itemToFind, fromIndex);

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
    return this.generate(function* map(self: Iterable<T>) {
      for (const {value, index} of entries(self)) yield mapFn(value, index);
    });

    // return this.generate(function* map(self: Iterable<T>) {
    //   let index = 0;
    //   for (const item of self) yield mapFn(item, index++);
    // });
  }

  max(): T extends number ? number : void;

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

  min(): T extends number ? number : void;

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

  ofType(type: 'symbol'): Seq<Symbol>;

  ofType(type: 'object'): Seq<object>;

  ofType(type: typeof Number): Seq<number>;

  ofType(type: typeof String): Seq<string>;

  ofType(type: typeof Boolean): Seq<boolean>;

  ofType(type: typeof Object): Seq<object>;

  ofType(type: typeof Symbol): Seq<Symbol>;

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
    return factories.Seq<any>();
  }

  orderBy<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T> {
    return factories.OrderedSeq(this.items, keySelector, comparer);
  }

  orderByDescending<K = T>(keySelector: (x: T) => K, comparer?: Comparer<K>): OrderedSeq<T> {
    return factories.OrderedSeq(this.items, keySelector, comparer, true);
  }

  prepend(...items: T[]): Seq<T>;

  prepend(items: Iterable<T>): Seq<T>;

  prepend(...items: (T | Iterable<T>)[]): Seq<T> {
    return this.insert(0, ...items as T[]);
    // return this.generate(function* prepend(self) {
    //   const prepend = (items.length === 1 && typeof items[0] !== 'string' && isIterable(items[0])) ? items[0] : items as T[];
    //   yield* prepend;
    //   yield* self;
    // });
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
    return this.generate(function* removeFalsy(self) {
      for (const item of self) {
        if (item != null) yield item;
      }
    });
  }

  repeat(count: number): Seq<T> {
    if (count <= 0) throw new Error('Count must be positive');
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

  sameItems<K>(second: Iterable<T>, keySelector?: Selector<T, K>): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K>): boolean;

  sameItems<U, K>(second: Iterable<U>, firstKeySelector: Selector<T, K> = t => t as unknown as K, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): boolean {
    if (Array.isArray(this.items) && Array.isArray(second) && this.items.length !== second.length) return false;
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
    if (Array.isArray(this.items) && Array.isArray(second) && this.items.length !== second.length) return false;
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
    if (count === 0) return this;
    if (SeqBase.isArray(this.items)) return factories.Seq<T>(this.items.slice(count));

    if (count < 0) {
      return this.generate(function* skipNegative(self) {
        const buffer = new CyclicBuffer<T>(-count);
        buffer.writeMany(self);
        yield* buffer;
        buffer.clear();
      });
    }

    return this.skipWhile((_, index) => index < count);
  }

  skipFirst(): Seq<T> {
    return this.skip(1);
  }

  skipLast(count: number = 1): Seq<T> {
    if (count <= 0) return factories.Seq<T>();
    const self = this;
    return this.generate(function* skipLast() {
      const items = self.items;
      const array: T[] = Array.isArray(items) ? items : [...items];
      yield* array.slice(0, -count);
    })
  }

  skipWhile(condition: Condition<T>): Seq<T> {
    return this.generate(function* skipWhile(self: Iterable<T>) {
      let index = 0;
      const iterator = getIterator(self);
      let next = iterator.next();
      while (!next.done) {
        if (!condition(next.value, index++)) break;
        next = iterator.next();
      }
      while (!next.done) {
        yield next.value;
        next = iterator.next();
      }
    });
  }

  slice(start: number, end: number): Seq<T> {
    if (end === 0 || end - start === 0) return factories.Seq<T>();
    if (Array.isArray(this.items)) {
      const length = this.items.length;
      if (start < 0) start = length + start;
      if (start < 0) start = 0;

      if (end < 0) end = length + end;
      if (end <= 0) return factories.Seq<T>();
    }

    // TODO: Handle Array separately


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
      const array = [...self].slice(start, end);
      yield* array;
    });
  }

  some(condition: Condition<T> = () => true): boolean {
    let index = 0;
    for (const item of this) {
      if (condition(item, index++)) return true;
    }

    return false;
  }

  sort(comparer?: Comparer<T>): OrderedSeq<T> {
    return factories.OrderedSeq(this, undefined, comparer || LEGACY_COMPARER);
  }

  sorted(reverse?: boolean): OrderedSeq<T> {
    return factories.OrderedSeq(this, undefined, undefined, !!reverse);
  }

  split(atIndex: number): [Seq<T>, Seq<T>];

  split(condition: Condition<T>): [Seq<T>, Seq<T>];

  split(atIndexOrCondition: number | Condition<T>): [Seq<T>, Seq<T>] {
    return (typeof atIndexOrCondition === 'number') ?
      this.splitAtIndex(atIndexOrCondition) :
      this.splitByCondition(atIndexOrCondition);
  }

  startsWith<K>(items: Iterable<T>, keySelector: Selector<T, K> = t => t as unknown as K): boolean {
    if (SeqBase.isArray(items)) {
      if (items.length === 0) return true;
      if (SeqBase.isArray(this.items) && this.items.length < items.length) return false;
    }

    let index = 0;
    const secondIterator = getIterator(items);
    let secondNext = secondIterator.next();
    for (const first of this) {
      if (secondNext.done) return true;
      const firstKey = keySelector(first, index);
      const secondKey = keySelector(secondNext.value, index);
      const same = sameValueZero(firstKey, secondKey);
      if (!same) return false;
      index++;
      secondNext = secondIterator.next();
    }

    return secondNext.done ?? false;
  }

  sum(): T extends number ? number : void;

  sum(selector: Selector<T, number>): number;

  sum(selector: Selector<T, number> = x => x as unknown as number): number | void {
    let sum = 0;
    let index = 0;
    for (const value of this) sum += selector(value, index++);
    return sum;
  }

  take(count: number): Seq<T> {
    if (count === 0) return factories.Seq<T>();
    if (SeqBase.isArray(this.items)) return factories.Seq<T>(this.items.slice(0, count));

    if (count < 0) {
      return this.generate(function* takeNegative(self) {
        yield* [...self].slice(0, count);
      });
    }

    return this.takeWhile((_, index) => index < count);
  }

  takeLast(count: number): Seq<T> {
    if (count <= 0) return factories.Seq<T>();
    const self = this;
    return this.generate(function* takeLast() {
      const items = self.items;
      if (SeqBase.isArray(items)) {
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
    });
  }

  takeOnly<K = T>(items: Iterable<T>, keySelector: Selector<T, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector?: Selector<U, K>): Seq<T>;

  takeOnly<U, K = T>(items: Iterable<U>, firstKeySelector: Selector<T, K>, secondKeySelector: Selector<U, K> = firstKeySelector as unknown as Selector<U, K>): Seq<T> {
    return this.generate(function* takeOnly(self) {
      const map = new Map<K, number>();
      const secondIterator = getIterator(items);
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
      let index = 0;
      const iterator = getIterator(self);
      let next = iterator.next();
      while (!next.done) {
        if (!condition(next.value, index++)) break;
        yield next.value;
        next = iterator.next();
      }
    });
  }

  tap(callback: Selector<T, void>, thisArg?: any): Seq<T> {
    return factories.Seq(this.tapGenerator(callback, thisArg));
  }

  toArray(): T[] {
    return [...this.items];
  }

  toMap<K, V>(keySelector: Selector<T, K>, valueSelector: Selector<T, V> = t => t as unknown as V, toStringKey?: ToComparableKey<K>): Map<K, V> {
    if (!toStringKey) {
      return new Map<K, V>(this.map((item, index) => [keySelector(item, index), valueSelector(item, index)]));
    }

    const keys = new Set<ReturnType<ToComparableKey<K>>>();
    const map = new Map<K, V>();
    let index = 0;
    for (const item of this) {
      const key = keySelector(item, index);
      const stringKey = toStringKey(key);
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

  toString(separator?: string): string; // Overload

  toString(opts: { start?: string; separator?: string, end?: string; }): string;

  toString(separatorOrOpts?: string | { start?: string; separator?: string; end?: string }): string {
    return this.join(separatorOrOpts as any);
  }

  transform<U = T>(transformer: (seq: Seq<T>) => Seq<U>): Seq<U> {
    return transformer(this);
  }

  union<K>(second: Iterable<T>, keySelector?: (value: T) => K): Seq<T> {
    return this.concat(second).distinct(keySelector);
  }

  zip<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts>): Seq<[T, T1, ...Ts]> {
    return this.generate(function* zip(self) {
      const allIterables: any[] = [self, items, ...moreItems];
      const iterables = allIterables.map(getIterator);
      let nexts = iterables.map(it => it.next());
      while (nexts.every(next => !next.done)) {
        yield nexts.map(next => next.value);
        nexts = iterables.map(it => it.next());
      }
    }) as any;
  }

  zipAll<T1, Ts extends any[]>(items: Iterable<T1>, ...moreItems: Iterables<Ts> | [...Iterables<Ts>, { defaults?: [T?, T1?, ...Ts] }]): Seq<[T, T1, ...Ts]> {
    const res = this.generate(function* zipAll(self) {
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
      const iterables = allIterables.map(getIterator);
      let nexts = iterables.map(it => it.next());
      while (!nexts.every(next => next.done)) {
        yield nexts.map((next, i) => next.done ? defaults[i] : next.value);
        nexts = iterables.map(it => it.next());
      }
    });

    return res as any;
  }

  zipWithIndex<U = T>(): Seq<[T, number]> {
    return this.map((item, index) => [item, index]);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  public findSubSequence<K = T>(subSequence: Iterable<T>, fromIndex: number, keySelector?: Selector<T, K>): [number, number] {
    // console.log(`includesSubSequence()`);

    const matcher = new class {
      private iterator: Iterator<K> | undefined;
      private next: IteratorResult<K>;
      private iterable = new class {
        readonly cache: K[] = [];
        private iterator = getIterator(subSequence);
        private next: IteratorResult<T> | undefined = undefined;
        private index = -1;

        get isEmpty(): boolean {
          return this.cache.length === 0;
        }

        * iterate() {
          yield* this.cache;
          if (this.next && this.next.done) return;
          this.next = this.iterator.next();
          while (!this.next.done) {
            this.index++;
            const key = keySelector ? keySelector(this.next.value, this.index) : this.next.value as unknown as K;
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

      const firstKey = keySelector ? keySelector(item, index) : item as unknown as K;
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

  protected generate<U>(generator: (self: Iterable<T>) => Generator<U>): Seq<U> {
    return factories.Seq<U>(new Gen(this, generator));
  }

  protected getIterator(): Iterator<T> {
    return getIterator(this);
  }

  protected tapGenerator(callback: Selector<T, void>, thisArg?: any): Iterable<T> {
    return tapGenerator(this, callback, thisArg);
  }

  private groupJoinInternal<TOut, TIn>(outers: Iterable<TOut>, outerKeySelector: ToComparableKey<TOut>, inners: Iterable<TIn>, innerKeySelector: ToComparableKey<TIn>): SeqOfGroups<TOut, TIn> {
    // TODO: Think if can optimise or make more lazy
    function* leftOuterJoin(self: Iterable<TOut>) {
      const groups = groupItems<ComparableType, TIn, TIn>(inners, innerKeySelector);
      for (const outer of self) {
        const outerKey = outerKeySelector(outer);
        const inners = groups.has(outerKey) ? groups.get(outerKey)!.items : [IGNORED_ITEM];
        for (const inner of inners) yield {outer, inner};
      }
    }

    const gen = new Gen(outers, leftOuterJoin);
    return factories.SeqOfGroups(gen, ({outer}) => outer, undefined, ({inner}) => inner);
  }

  private findInternal(fromIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): [number, T | undefined] {
    [fromIndex, condition, fallback] = (typeof fromIndex === "number") ?
      [fromIndex, condition as Condition<T>, fallback] :
      [0, fromIndex, condition as T | undefined];

    if (fromIndex < 0) fromIndex = 0;

    if (Array.isArray(this.items)) {
      if (fromIndex >= this.items.length) return [-1, fallback];
      for (let index = fromIndex; index < this.items.length; index++) {
        const item = this.items[index];
        if (condition(item, index)) return [index, item];
      }
    }

    let index = -1;
    for (const item of this) {
      index++;
      if (index < fromIndex) continue;
      if (condition(item, index)) return [index, item];
    }

    return [-1, fallback];
  }

  private findLastInternal(tillIndex: number | Condition<T>, condition?: Condition<T> | T | undefined, fallback?: T | undefined): [number, T | undefined] {
    [tillIndex, condition, fallback] = (typeof tillIndex === "number") ?
      [tillIndex, condition as Condition<T>, fallback] :
      [Number.NaN, tillIndex, condition as T | undefined];

    if (Array.isArray(this.items)) {
      const array = this.items;
      if (tillIndex < 0 || array.length === 0) return [-1, fallback];
      if (Number.isNaN(tillIndex) || tillIndex >= array.length) tillIndex = array.length - 1;
      for (let index = tillIndex; index >= 0; index--) {
        const item = array[index];
        if (condition(item, index)) return [index, item];
      }
    }

    let index = -1;
    let found: [number, T] = [-1, fallback as T];
    for (const item of this) {
      index++;
      if (index > tillIndex) break;
      if (condition(item, index)) found = [index, item];
    }

    return found;
  }

  private removeInternal<K>(items: Iterable<T>, keySelector: (item: T) => K = x => x as unknown as K, all: boolean = false): Seq<T> {
    return this.generate(function* remove(self) {
      const keys = new Map<K, number>();
      let secondConsumed: boolean;
      const second = getIterator(items);

      function searchKey(key: K): boolean {
        if (secondConsumed) return false;
        let next = second.next();
        while (!next.done) {
          const key2 = keySelector(next.value);
          const occurrencesCount = (keys.get(key2) ?? 0) + 1;
          keys.set(key2, occurrencesCount);
          if (sameValueZero(key, key2)) return true;
          next = second.next();
        }
        secondConsumed = true;
        return false;
      }

      for (const item of self) {
        const key = keySelector(item);
        if (keys.has(key) || searchKey(key)) {
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
    const first = factories.CachedSeq<T>(new Gen(this, function* splitAtIndexFirst(source) {
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
      first.consume();
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
    const first = factories.CachedSeq<T>(new Gen(this, function* splitAtIndexFirst(source) {
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

export class SeqImpl<T = any> extends SeqBase<T> {
  constructor(protected readonly items: Iterable<T> = []) {
    super();
  }

  static create<T>(items: Iterable<T> = []): SeqImpl<T> {
    return new SeqImpl(items);
  }

  cache(now?: boolean): CachedSeq<T> {
    // Using this.items instead of this, is potentially more optimized in case this.items is an array
    // Since the CachedSeq take advantage of that. while using this as the source, is Generator function *[Symbol.iterator]().
    // (Alternatively, could override function *[Symbol.iterator]() and return this.items as is in case it's array)
    return factories.CachedSeq(this.items, now);
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
    if (Array.isArray(values)) {
      this.buffer = values.slice(-this.bufferSize);
      this.start = 0;
      this.end = this.bufferSize - 1;
      return values.length;
    } else {
      let count = 0;
      for (const value of values) {
        this.write(value);
        count++;
      }
      return count;
    }
  }
}


