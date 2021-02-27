import {
  CachedSeq,
  ComparableType,
  factories,
  GroupedSeq,
  MapHierarchy,
  MultiGroupedSeq,
  Selector,
  SeqOfMultiGroups,
  ToComparableKey
} from "./seq";
import {entries, Gen, IGNORED_ITEM} from "./common";
import {SeqBase} from "./seq-base";

export class GroupedSeqImpl<K, T> extends SeqBase<T> implements GroupedSeq<K, T> {
  constructor(public readonly key: K, protected items: Iterable<T>) {
    super();
  }

  static create<K, T>(key: K, items: Iterable<T>) {
    return new GroupedSeqImpl<K, T>(key, items);
  }

  tap(callback: Selector<T, void>, thisArg?: any): GroupedSeq<K, T> {
    return new GroupedSeqImpl<K, T>(this.key, this.tapGenerator(callback, thisArg));
  }

  map<U = T>(mapFn: Selector<T, U>): GroupedSeq<K, U> {
    return new GroupedSeqImpl<K, U>(this.key, new Gen(this, function* map(self: Iterable<T>) {
      for (const {value, index} of entries(self)) yield mapFn(value, index);
    }));
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}

class GroupingSelector {
  constructor(public readonly key?: Selector<any, any>,
              public readonly toComparable?: ToComparableKey<any>,
              public readonly values?: ReadonlyArray<Selector<any, any>>) {
  }

  static from(keySelector?: Selector<any, any>, toComparableKey?: ToComparableKey<any>, valueSelector?: Selector<any, any>): GroupingSelector {
    return new GroupingSelector(keySelector, toComparableKey, valueSelector ? [valueSelector] : undefined);
  }

  selectKeyAndComparable(value: any, index: number): { key: any; comparable: any } {
    const key = this.selectKey(value, index);
    const comparable = this.toComparable?.(key) ?? key;
    return {key, comparable};
  }

  selectValue(value: any, index: number): any {
    return this.values?.reduce((v, selector) => {
      if (v === IGNORED_ITEM) return value;
      return selector(v, index);
    }, value) ?? value;
  }

  concatValueSelector(valueSelector: Selector<any, any>): GroupingSelector {
    const values = (this.values ?? []).concat(valueSelector);
    return new GroupingSelector(this.key, this.toComparable, values);
  }

  private selectKey(value: any, index: number): any {
    return this.key?.(value, index) ?? value;
  }

}

class ContainerGenerator implements Iterable<any[] | Container> {
  private lastLength = 0;

  constructor(public readonly container: Container) {
  }

  * [Symbol.iterator](): Generator<any[] | Container> {
    while (this.lastLength < this.container.array.length) yield this.container.array[this.lastLength++];
  }
}

class Container {
  readonly array: any[] | Container[] = [];
  private readonly map: Map<any, any>;

  constructor(public readonly isLast: boolean, public readonly key?: any, public readonly comparable?: any) {
    if (!isLast) this.map = new Map<any, any>();
  }

  getOrAddChild(isLast: boolean, key: any, comparable: any): Container {
    if (!this.map) throw Error('Cannot call getOrAddChild on leaf container');
    let container = this.map.get(comparable);
    if (!container) {
      container = new Container(isLast, key, comparable);
      this.map.set(comparable, container);
      this.array.push(container);
    }
    return container;
  }
}

export class SeqOfMultiGroupsImpl<Ks extends any[], TIn, TOut = TIn>
  extends SeqBase<MultiGroupedSeq<Ks, TOut>>
  implements SeqOfMultiGroups<Ks, TOut>, CachedSeq<MultiGroupedSeq<Ks, TOut>> {

  key: any;
  private tapCallbacks: Selector<any, void>[] = [];
  private _cache: MultiGroupedSeq<Ks, TOut>[];
  private cacheable: boolean = false;

  constructor(protected source: Iterable<TIn>,
              protected selectors: GroupingSelector[] = []) {
    super();
  }

  get array(): ReadonlyArray<MultiGroupedSeq<Ks, TOut>> {
    if (!this.cacheable) throw Error('Instance is not cacheable');
    if (!this._cache) this.getIterator().next();
    return this._cache;
  }

  static create<K, TIn = K, TOut = TIn>(source: Iterable<TIn>,
                                        keySelector?: Selector<TIn, K>,
                                        toComparableKey?: ToComparableKey<K>,
                                        valueSelector?: Selector<TIn, TOut>) {
    const selector = GroupingSelector.from(keySelector, toComparableKey, valueSelector);
    return new SeqOfMultiGroupsImpl<[K], TIn, TOut>(source, [selector]);
  }

  cache(now?: boolean): any {
    if (this.cacheable) {
      if (now && !this._cache) this.consume();
      return this;
    }

    const instance = new SeqOfMultiGroupsImpl(
      this.source,
      this.selectors
    );
    instance.cacheable = true;
    instance.tapCallbacks = this.tapCallbacks;
    instance.key = this.key;

    return instance;
  }

  hasAtLeast(count: number): boolean {
    if (count <= 0) throw new RangeError('count must be positive');
    if (Array.isArray(this.source)) return this.source.length >= count;
    return super.hasAtLeast(count);
  }

  mapInGroup<U>(mapFn: Selector<TOut, U>): any {
    const lastSelector = this.selectors.slice(-1)[0];
    const newLastSelector = lastSelector.concatValueSelector(mapFn);
    const selectors = this.selectors.slice(0, this.selectors.length - 1).concat(newLastSelector);
    const instance = new SeqOfMultiGroupsImpl(this.source, selectors);
    instance.key = this.key;
    instance.tapCallbacks = this.tapCallbacks;

    return instance;
  }

  thenGroupBy<K2>(keySelector?: Selector<TOut, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[...Ks, K2], TOut> {
    const newSelector = GroupingSelector.from(keySelector, toComparableKey);
    return new SeqOfMultiGroupsImpl<[...Ks, K2], TIn, TOut>(
      this.source,
      [...this.selectors, newSelector],
    );
  }

  tap(callback: Selector<MultiGroupedSeq<Ks, TOut>, void>, thisArg?: any): any {
    const tappable = new SeqOfMultiGroupsImpl(this.source, this.selectors);
    tappable.tapCallbacks.push(callback);
    tappable.key = this.key;
    return tappable;
  }

  toMap(): MapHierarchy<Ks, TOut>;

  toMap<K, V>(keySelector: Selector<MultiGroupedSeq<Ks, TOut>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, TOut>, V>, toStringKey?: ToComparableKey<K>): Map<K, V>;

  toMap<K, V>(keySelector?: Selector<MultiGroupedSeq<Ks, TOut>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, TOut>, V>, toStringKey?: ToComparableKey<K>): any {
    if (keySelector) return super.toMap(keySelector, valueSelector, toStringKey);

    const map = new Map<ComparableType, { key: any, items: any[] | Map<ComparableType, any>, realMap?: Map<any, any>; }>();
    const realMap = new Map<any, any[] | Map<ComparableType, any>>();

    for (const entry of entries(this.source)) {
      let currentMap = map;
      let currentRealMap = realMap ? realMap : undefined;

      for (const {value: selector, index} of entries(this.selectors)) {
        const isLast = (this.selectors.length - 1) === index;
        const {key, comparable} = selector.selectKeyAndComparable(entry.value, entry.index);
        let group = currentMap.get(comparable);

        if (!group) {
          group = {key, items: isLast ? [] : new Map(), realMap: isLast ? undefined : new Map()};
          currentMap.set(comparable, group);
          currentRealMap?.set(key, group.realMap ?? group.items);
        }

        if (isLast) {
          const value = selector.selectValue(entry.value, entry.index);
          (group.items as any[]).push(value);
        } else {
          currentMap = group.items as Map<ComparableType, any>;
          currentRealMap = group.realMap;
        }
      }
    }
    return realMap;
  }

  [Symbol.iterator](): any {
    return this.sessionIterator();
    // return this.lazyIterator();
  }

  // private* lazyIterator(): any {
  //   const isLastSeqOfGroups = this.selectors.length == 1;
  //
  //   const keys = new Set<ComparableType>();
  //   const selector = this.selectors[0];
  //   for (const entry of entries(this.source)) {
  //     const {key, comparable} = selector.selectKeyAndComparable(entry.value, entry.index);
  //     if (keys.has(comparable)) continue;
  //
  //     keys.add(comparable);
  //     const generator = new Gen(this.source, function* filerSameKey(source) {
  //       for (const subEntry of entries(source)) {
  //         const {comparable: subComparable} = selector.selectKeyAndComparable(subEntry.value, subEntry.index);
  //         if (sameValueZero(subComparable, comparable)) {
  //           yield selector.selectValue(subEntry.value, subEntry.index);
  //         }
  //       }
  //     });
  //
  //     if (isLastSeqOfGroups) yield new factories.GroupedSeq(key, generator);
  //     else {
  //       const subGroup = new SeqOfMultiGroupsImpl<SkipFirst<Ks>, TIn, TOut>(
  //         generator,
  //         this.selectors.slice(1) as any,
  //       );
  //       subGroup.key = key;
  //       this.tapCallbacks.forEach(callback => callback(subGroup, keys.size - 1));
  //       yield subGroup;
  //     }
  //   }
  // }

  private* sessionIterator() {
    if (this._cache) {
      yield* this._cache;
      return;
    }
    const sessionIterator = this.coreIterator();

    class GroupedSeqGenerator implements Iterable<any> {
      private readonly containerGenerator: ContainerGenerator;

      constructor(private readonly container: Container) {
        this.containerGenerator = new ContainerGenerator(this.container);
      }

      * [Symbol.iterator](): any {
        if (this.container.isLast) yield* this.containerGenerator;
        else for (const container of this.containerGenerator as Iterable<Container>) {
          yield factories.GroupedSeq(container.key, new Generator(container))
        }
      }
    }

    class Generator implements Iterable<any> {
      constructor(private readonly container: Container) {
      }

      * [Symbol.iterator](): any {
        const groupedSeqGenerator = new GroupedSeqGenerator(this.container);
        yield* groupedSeqGenerator;
        while (!next.done) {
          const localNext: any = next;
          yield* groupedSeqGenerator;
          if (localNext === next) next = sessionIterator.next();
        }
        yield* groupedSeqGenerator;
      }
    }

    let next = sessionIterator.next();
    const rootContainer: Container = next.value.rootContainer;
    const generator = new Generator(rootContainer);

    let generated: Iterable<any> = generator;
    if (this.cacheable) generated = this._cache = [...generator];
    for (const entry of entries(generated)) {
      this.tapCallbacks.forEach(callback => callback(entry.value, entry.index));
      yield entry.value;
    }
  }

  private* coreIterator(): Generator<{ entry: { index: number; value: any }; containers: Container[]; rootContainer: Container }> {
    const rootContainer = new Container(false);

    for (const entry of entries(this.source)) {

      let currentContainer = rootContainer;
      let item: any = entry.value;
      const containers: Container[] = [];

      for (const {value: selector, index} of entries(this.selectors)) {
        const isLast = (this.selectors.length - 1) === index;
        const {key, comparable} = selector.selectKeyAndComparable(item, entry.index);
        item = selector.selectValue(item, entry.index);

        currentContainer = currentContainer.getOrAddChild(isLast, key, comparable);
        containers.push(currentContainer);

        if (isLast && item != IGNORED_ITEM) currentContainer.array.push(item);
      }

      yield {rootContainer, containers, entry: {value: item, index: entry.index}};
    }
  }
}



