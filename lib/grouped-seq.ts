import {
  CachedSeq,
  ComparableType,
  factories,
  GroupedSeq,
  MapHierarchy,
  MultiGroupedSeq,
  ObjectHierarchy,
  Selector,
  SeqOfGroupsWithoutLast,
  SeqOfMultiGroups,
  ToComparableKey
} from "./seq";
import {consume, EMPTY_ARRAY, entries, Gen, IGNORED_ITEM, IterationContext, SeqTags, TaggedSeq} from "./common";
import {SeqBase} from "./seq-base";

export class GroupedSeqImpl<K, T> extends SeqBase<T> implements GroupedSeq<K, T> {
  constructor(public readonly key: K, protected items: Iterable<T>) {
    super();
  }

  static create<K, T>(key: K, items: Iterable<T>) {
    return new GroupedSeqImpl<K, T>(key, items);
  }

  tap(callback: Selector<T, void>): GroupedSeq<K, T> {
    return new GroupedSeqImpl<K, T>(this.key, this.tapGenerator(callback));
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
              public readonly values?: ReadonlyArray<(x: unknown, index: number, ...keys: any[]) => unknown>) {
  }

  static from(keySelector?: Selector<any, any>, toComparableKey?: ToComparableKey<any>, valueSelector?: (x: unknown, index: number, ...keys: any[]) => unknown): GroupingSelector {
    return new GroupingSelector(keySelector, toComparableKey, valueSelector ? [valueSelector] : undefined);
  }

  selectKeyAndComparable(value: any, index: number): { key: any; comparable: any } {
    const key = this.selectKey(value, index);
    const comparable = this.toComparable ? this.toComparable(key) : key;
    return {key, comparable};
  }

  selectValue(value: any, index: number, keys: readonly unknown[]): any {
    return this.values?.reduce((v, selector) => {
      if (v === IGNORED_ITEM) return value;
      return selector(v, index, ...keys);
    }, value) ?? value;
  }

  concatValueSelector<Ks extends any[]>(valueSelector: (item: any, index: number, ...keys: readonly any[]) => unknown): GroupingSelector {
    const values = (this.values ?? []).concat(valueSelector);
    return new GroupingSelector(this.key, this.toComparable, values);
  }

  private selectKey(value: any, index: number): any {
    return this.key ? this.key(value, index) : value;
  }

}

class Container {
  private _array: any[] = [];
  private readonly map: Map<unknown, Container>;
  private isRoot = false;

  constructor(public readonly isLast: boolean,
              public readonly key?: unknown,
              public readonly comparable?: any,
              public ancestorKeys: readonly unknown[] = []) {
    if (!isLast) this.map = new Map<any, any>();
  }

  get array(): readonly any[] {
    return this._array;
  };

  static createRootContainer(): Container {
    const container = new Container(false);
    container.isRoot = true;
    return container;
  }

  getOrAddChild(isLast: boolean, key: any, comparable: any, ancestorKeys: readonly unknown[]): Container {
    if (!this.map) throw Error('Cannot call getOrAddChild on leaf container');
    let container = this.map.get(comparable);
    if (!container) {
      container = new Container(isLast, key, comparable, ancestorKeys);
      this.map.set(comparable, container);
      this._array.push(container);
    }
    return container;
  }

  addItem(item: any): void {
    this._array.push(item)
  }

  getAllKeys(): readonly unknown[] {
    return this.isRoot ? [] : [this.key, ...this.ancestorKeys];
  }
}

export class SeqOfMultiGroupsImpl<Ks extends any[], TIn, TOut = TIn>
  extends SeqBase<MultiGroupedSeq<Ks, TOut>>
  implements SeqOfMultiGroups<Ks, TOut>, CachedSeq<MultiGroupedSeq<Ks, TOut>> {

  key: any;
  private tapCallbacks: Selector<any, void>[] = [];
  private _cache: MultiGroupedSeq<Ks, TOut>[];

  constructor(protected source: Iterable<TIn>,
              protected selectors: GroupingSelector[] = [],
              private cacheable = false) {
    super();
  }

  // TaggedSeq
  get [SeqTags.$cacheable](): boolean {
    return this.cacheable;
  }

  get array(): ReadonlyArray<MultiGroupedSeq<Ks, TOut>> {
    if (!this.cacheable) throw Error('Instance is not cacheable');
    if (!this._cache) this.getIterator().next();
    return this._cache;
  }

  static create<K, TIn = K, TOut = TIn>(source: Iterable<TIn>,
                                        keySelector?: Selector<TIn, K>,
                                        toComparableKey?: ToComparableKey<K>,
                                        valueSelector?: (item: TIn, index: number, key: K) => TOut) {
    const selector = GroupingSelector.from(keySelector, toComparableKey, valueSelector as any);
    return new SeqOfMultiGroupsImpl<[K], TIn, TOut>(source, [selector]);
  }

  cache(now?: boolean): any {
    if (this.cacheable) {
      if (now && !this._cache) this.cacheNow();
      return this;
    }

    const instance = new SeqOfMultiGroupsImpl(
      this.source,
      this.selectors,
      true
    );

    instance.tapCallbacks.push(...this.tapCallbacks);
    instance.key = this.key;

    return instance;
  }

  mapInGroup<U>(mapFn: (item: TOut, index: number, ...keys: Ks) => U): any {
    const lastSelector = this.selectors.slice(-1)[0];
    const newLastSelector = lastSelector.concatValueSelector(mapFn as unknown as (item: any, index: number, ...keys: readonly any[]) => unknown);
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

  tap(callback: Selector<MultiGroupedSeq<Ks, TOut>, void>): any {
    const tappable = new SeqOfMultiGroupsImpl(this.source, this.selectors);
    tappable.tapCallbacks.push(callback);
    tappable.key = this.key;
    return tappable;
  }

  toMap(): MapHierarchy<Ks, TOut>;

  toMap<K, V>(keySelector: Selector<MultiGroupedSeq<Ks, TOut>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, TOut>, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  toMap<K, V>(keySelector?: Selector<MultiGroupedSeq<Ks, TOut>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, TOut>, V>, toComparableKey?: ToComparableKey<K>): any {
    if (keySelector) return super.toMap(keySelector, valueSelector, toComparableKey);
    return new HierarchyTransformer(this.source, this.selectors).toMap();
  }

  toObject(): ObjectHierarchy<Ks, TOut>;
  toObject(arrayed: true): ObjectHierarchy<Ks, TOut[]>;
  toObject(arrayed?: boolean): ObjectHierarchy<Ks, TOut | TOut[]> {
    const hierarchyTransformer = new HierarchyTransformer(this.source, this.selectors);
    return arrayed ? hierarchyTransformer.toObjectArray() : hierarchyTransformer.toObjectSingle();
  }

  * [Symbol.iterator](): any {
    const self = this;
    yield* new Gen(this.source, function* (source, iterationContext) {
      yield* self.sessionIterator(iterationContext);
    });
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

  protected toJsonOverride(): any {
    return new HierarchyTransformer(this.source, this.selectors).toObjectArray();
  }

  private* sessionIterator(iterationContext: IterationContext) {
    if (this._cache) {
      yield* this._cache;
      return;
    }
    let yielded = false;
    let generated: Iterable<any> = EMPTY_ARRAY;

    if (!this.cacheable) {
      iterationContext.onClose(() => {
        if (yielded) consume(generated)
      });
    }
    let sessionIterator = iterationContext.closeWhenDone(this.coreIterator());

    class ContainerGenerator<T> implements Iterable<T | Container> {
      private lastLength = 0;

      constructor(public readonly container: Container) {
      }

      get isLast(): boolean {
        return this.container.isLast;
      }

      * [Symbol.iterator](): Generator<T | Container> {
        while (this.lastLength < this.container.array.length) yield this.container.array[this.lastLength++];
      }
    }

    class GroupedSeqGenerator implements Iterable<GroupedSeq<any, any> | TOut> {
      private readonly containerGenerator: ContainerGenerator<TOut>;

      constructor(container: Container, private optimize: boolean) {
        this.containerGenerator = new ContainerGenerator<TOut>(container);
      }

      * [Symbol.iterator](): Generator<GroupedSeq<any, any> | TOut> {
        if (this.containerGenerator.isLast) yield* (this.containerGenerator as any);
        else for (const container of this.containerGenerator as Iterable<Container>) {
          const seq = factories.GroupedSeq(container.key, new SeqOfGroupsGenerator(container, this.optimize))
          if (this.optimize) (seq as TaggedSeq)[SeqTags.$optimize] = true;
          yield seq;
        }
      }
    }

    class SeqOfGroupsGenerator implements Iterable<any> {
      constructor(private readonly container: Container, private optimize: boolean) {
      }

      * [Symbol.iterator](): any {
        const groupedSeqGenerator = new GroupedSeqGenerator(this.container, this.optimize);
        yield* groupedSeqGenerator;
        while (!next.done) {
          const localNext: any = next;
          yield* groupedSeqGenerator;
          // If no one manipulated the iteration (i.e. the caller that iterating us, manipulated the iteration)
          // then localNext will still equals `next` and it's safe to call sessionIterator.next()
          // Otherwise, don't next() since caller might already done that.
          if (localNext === next) next = sessionIterator.next();
        }
        yield* groupedSeqGenerator;
      }
    }

    let next = sessionIterator.next();
    if (!next.done) {
      const rootContainer: Container = next.value.rootContainer;
      generated = new SeqOfGroupsGenerator(rootContainer, SeqTags.optimize(this));
    }

    if (this.cacheable) generated = this._cache = [...generated];
    for (const entry of entries(generated)) {
      this.tapCallbacks.forEach(callback => callback(entry.value, entry.index));
      yielded = true;
      yield entry.value;
    }
  }

  private* coreIterator(): Generator<{ entry: { index: number; value: any }; containers: Container[]; rootContainer: Container }> {
    const rootContainer = Container.createRootContainer();

    for (const entry of entries(this.source)) {

      let currentContainer = rootContainer;
      let item: any = entry.value;
      const containers: Container[] = [];

      for (const {value: selector, index} of entries(this.selectors)) {
        const isLast = (this.selectors.length - 1) === index;
        const {key, comparable} = selector.selectKeyAndComparable(item, entry.index);
        const ancestorKeys = currentContainer.getAllKeys();
        item = selector.selectValue(item, entry.index, [key, ...ancestorKeys]);

        currentContainer = currentContainer.getOrAddChild(isLast, key, comparable, ancestorKeys);
        containers.push(currentContainer);

        if (isLast && item !== IGNORED_ITEM) currentContainer.addItem(item);
      }

      yield {rootContainer, containers, entry: {value: item, index: entry.index}};
    }
  }

  private cacheNow() {
    // noinspection LoopStatementThatDoesntLoopJS
    for (const _ of this) break;
  }
}

class HierarchyTransformer<Ks extends any[], TIn, TOut = TIn> {
  constructor(private readonly source: Iterable<TIn>, private readonly selectors: GroupingSelector[]) {
  }

  private static isValidPropertyKey(key: any): boolean {
    const expectedTypes: readonly string[] = ['number', 'string', 'symbol', "bigint", 'boolean'] as const;
    return key == null || expectedTypes.lastIndexOf(typeof key) > -1;
  }

  toMap<K, V>(): Map<any, any> {
    return this.materializeHierarchy<Map<any, Map<ComparableType, any>>, V[]>(
      (parentContainer?: Map<any, Map<ComparableType, any>>, key?: any) => {
        const container = new Map();
        if (parentContainer) parentContainer.set(key, container);
        return container;
      },
      (container: Map<any, Map<ComparableType, any>>, key: any, comparableKey: ComparableType, prev, value): V[] => {
        if (prev === undefined) {
          prev = [];
          container.set(key, prev as unknown as any);
        }
        if (value !== IGNORED_ITEM) prev.push(value as V);
        return prev;
      }
    );
  }

  toObjectSingle(): ObjectHierarchy<Ks, TOut> {
    return this.materializeHierarchy<any, TOut>(
      (parentContainer?: any, key?: any, comparableKey?: ComparableType) => {
        const container = {};
        if (parentContainer) {
          const validKey = `${HierarchyTransformer.isValidPropertyKey(key) ? key : comparableKey}`;
          parentContainer[validKey] = container;
        }
        return container;
      },
      (container: any, key: any, comparableKey: ComparableType, perv, value): TOut => {
        if (value !== IGNORED_ITEM) {
          const validKey = `${HierarchyTransformer.isValidPropertyKey(key) ? key : comparableKey}`;
          container[validKey] = value as TOut;
        }
        return value as TOut;
      }
    );
  }

  toObjectArray(): ObjectHierarchy<Ks, TOut[]> {
    return this.materializeHierarchy<any, TOut[]>(
      (parentContainer?: any, key?: any, comparableKey?: ComparableType) => {
        const container = {};
        if (parentContainer) {
          const validKey = `${HierarchyTransformer.isValidPropertyKey(key) ? key : comparableKey}`;
          parentContainer[validKey] = container;
        }
        return container;
      },
      (container: any, key: any, comparableKey: ComparableType, prev, value) => {
        if (prev === undefined) {
          const validKey = `${HierarchyTransformer.isValidPropertyKey(key) ? key : comparableKey}`;
          prev = [];
          container[validKey] = prev;
        }
        if (value !== IGNORED_ITEM) prev.push(value as TOut)
        return prev;
      }
    );
  }

  private materializeHierarchy<TContainer extends object, V>(
    createContainer: (parentContainer?: TContainer, key?: unknown, comparableKey?: ComparableType) => TContainer,
    setValue: (container: TContainer, key: unknown, comparableKey: ComparableType, prev: V | undefined, value: unknown) => V): TContainer {

    const map = new Map<ComparableType, { key: any; value?: V; subMap?: Map<ComparableType, any>; container?: TContainer; }>();
    const rootContainer = createContainer();

    for (const entry of entries(this.source)) {
      let item = entry.value;
      let currentMap = map;
      let currentContainer = rootContainer;
      const keys: unknown[] = [];
      for (const {value: selector, index} of entries(this.selectors)) {
        const isLast = (this.selectors.length - 1) === index;
        const {key, comparable} = selector.selectKeyAndComparable(item, entry.index);
        keys.unshift(key);
        item = selector.selectValue(item, entry.index, keys);

        let group = currentMap.get(comparable);

        if (!group) {
          group = {key, subMap: isLast ? undefined : new Map()};
          currentMap.set(comparable, group);
          if (!isLast) group.container = createContainer(currentContainer, key, comparable);
        }

        if (isLast) {
          group.value = setValue(currentContainer, key, comparable, group.value, item);
        } else {
          currentMap = group.subMap!;
          currentContainer = group.container!;
        }
      }
    }
    return rootContainer;
  }
}

