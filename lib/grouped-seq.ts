import {
  CachedSeq,
  ComparableType,
  GroupedSeq, KeyedSeq,
  Last,
  MapHierarchy,
  MultiGroupedSeq,
  ObjectHierarchy,
  Selector, Seq,
  SeqOfGroupsWithoutLast,
  SeqOfMultiGroups,
  ToComparableKey, Tailless
} from "./seq";
import {consume, Dict, EMPTY_ARRAY, entries, Gen, IGNORED_ITEM, IterationContext, SeqTags, TaggedSeq} from "./common";
import {SeqBase} from "./seq-base";


class MultiKeysTuple<Ks extends any[] = any[]> extends Array<any> {
  get first(): Ks[0] {
    return this[0];
  }

  get outer(): Ks[0] {
    return this[0];
  }

  get last(): Last<Ks> {
    return this[this.length - 1];
  }

  get inner(): Last<Ks> {
    return this[this.length - 1];
  }

  get parent(): Last<Tailless<Ks>> {
    return this[this.length - 2];
  }
}

function toMultiKeysTuple<Ks extends any[] = any[]>(from: Ks): Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; } {
  return MultiKeysTuple.from(from) as (Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; });
}

export class GroupedSeqImpl<K, T> extends SeqBase<T> implements GroupedSeq<K, T> {
  constructor(
    public readonly key: K,
    protected items: Iterable<T>,
    public readonly ancestorKeys: readonly unknown[] = []) {
    super();
    SeqTags.setTagsIfMissing(this, [[SeqTags.$group, true]]);
  }

  static create<K, T>(key: K, items: Iterable<T>) {
    return new GroupedSeqImpl<K, T>(key, items);
  }

  tap(callback: Selector<T, void>): GroupedSeq<K, T> {
    return new GroupedSeqImpl<K, T>(this.key, this.tapGenerator(callback), this.ancestorKeys);
  }

  map<U = T>(mapFn: Selector<T, U>): GroupedSeq<K, U> {
    return new GroupedSeqImpl<K, U>(this.key, new Gen(this, function* map(self: Iterable<T>) {
      for (const {value, index} of entries(self)) yield mapFn(value, index);
    }), this.ancestorKeys);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}

class GroupingSelector {
  constructor(public readonly key?: Selector<any, any>,
              public readonly comparableKeySelector?: ToComparableKey<any>,
              private readonly values?: ReadonlyArray<(x: unknown, index: number, keys: any) => unknown>,
              public readonly aggregator?: (group: GroupedSeq<any, any>, keys: any[]) => any) {
  }

  static from(keySelector?: Selector<any, any>, toComparableKey?: ToComparableKey<any>, valueSelector?: (x: unknown, index: number, keys: any[]) => unknown): GroupingSelector {
    return new GroupingSelector(keySelector, toComparableKey, valueSelector? [valueSelector]: undefined);
  }

  selectKeyAndComparable(value: any, index: number): { key: any; comparable: any } {
    const key = this.selectKey(value, index);
    const comparable = this.toComparableKey(key);
    return {key, comparable};
  }

  toComparableKey(key: any): ComparableType {
    return this.comparableKeySelector? this.comparableKeySelector(key): key;
  }

  selectValue(value: any, index: number, keys: unknown[] | unknown): any {
    return this.values?.reduce((v, selector) => {
      if (v === IGNORED_ITEM) return value;
      return selector(v, index, keys);
    }, value) ?? value;
  }

  clone(opts: {
    addedValueSelectors?: readonly ((item: any, index: number, keys: readonly any[]) => unknown)[];
    aggregator?: (group: GroupedSeq<any, any>, keys: any[]) => any;
  } = {}): GroupingSelector {

    const values = opts.addedValueSelectors?.length?
      (this.values ?? []).concat(opts.addedValueSelectors):
      this.values;
    const aggregator = opts.aggregator ?? this.aggregator;
    return new GroupingSelector(this.key, this.comparableKeySelector, values, aggregator);
  }

  private selectKey(value: any, index: number): any {
    return this.key? this.key(value, index): value;
  }

}

class Container {
  private _array: any[] = [];
  private readonly map: Map<unknown, Container>;
  private isRoot = false;

  constructor(public readonly isLast: boolean,
              public readonly key?: unknown,
              public readonly comparable?: any,
              public readonly ancestorKeys: readonly unknown[] = [],
              private readonly aggregator?: (group: GroupedSeq<any, any>, keys: any[]) => any) {
    if (!isLast) this.map = new Map<any, any>();
  }

  get array(): readonly any[] {
    return this._array;
  };

  static createRootContainer(): Container {
    const container = new Container(false, undefined, undefined, []);
    container.isRoot = true;
    return container;
  }

  getOrAddChildContainer(isLast: boolean, key: any, comparable: any, ancestorKeys: readonly unknown[], aggregator?: (group: GroupedSeq<any, any>, keys: any[]) => any): Container {
    console.assert(this.map, 'Cannot call getOrAddChild on leaf container');
    let container = this.map.get(comparable);
    if (!container) {
      container = new Container(isLast, key, comparable, ancestorKeys, aggregator);
      this.map.set(comparable, container);
      this._array.push(container);
    }
    return container;
  }

  addItem(item: any): void {
    this._array.push(item);
  }

  getAllKeys(): unknown[] {
    return this.isRoot? []: [...this.ancestorKeys, this.key];
  }

  aggregate(group: GroupedSeq<unknown, unknown>): unknown {
    return this.aggregator? this.aggregator(group, toMultiKeysTuple(this.getAllKeys())): group;
  }
}

export class SeqOfMultiGroupsImpl<Ks extends any[], TIn, TOut = TIn>
  extends SeqBase<MultiGroupedSeq<Ks, TOut>>
  implements SeqOfMultiGroups<Ks, TOut>, CachedSeq<MultiGroupedSeq<Ks, TOut>> {

  private tapCallbacks: Selector<any, void>[] = [];
  private _cache: MultiGroupedSeq<Ks, TOut>[];

  constructor(protected source: Iterable<TIn>,
              protected selectors: GroupingSelector[],
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
                                        valueSelector?: (item: TIn, index: number, key: K) => TOut): SeqOfMultiGroupsImpl<[K], TIn, TOut> {
    const selector = GroupingSelector.from(keySelector, toComparableKey, valueSelector as any);
    return new SeqOfMultiGroupsImpl<[K], TIn, TOut>(source, [selector]);
  }

  ungroupAll<U>(aggregator: (group: GroupedSeq<Last<Ks>, TOut>, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U): Seq<U>
  ungroupAll<U = TOut>({reducer, initialValue}: {
    reducer: (previousValue: U,
              currentValue: TOut,
              currentIndex: number,
              group: GroupedSeq<Last<Ks>, TOut>,
              keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U;
    initialValue?: U;
  }): Seq<U>;
  ungroupAll<U>(aggregator:
                  ((group: GroupedSeq<Last<Ks>, TOut>, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U) |
                  {
                    reducer: (previousValue: U,
                              currentValue: TOut,
                              currentIndex: number,
                              group: GroupedSeq<Last<Ks>, TOut>,
                              keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U;
                    initialValue?: U;
                  }): Seq<U> {


    function* traverseLeaves(source: Iterable<any>): Generator<GroupedSeqImpl<Last<Ks>, TOut>> {
      for (const entry of source) {
        const isGroup = SeqTags.group(entry);
        if (!isGroup) {
          yield source as unknown as GroupedSeqImpl<Last<Ks>, TOut>;
          return;
        }
        yield* traverseLeaves(entry);
      }
    }

    const actualAggregator = typeof aggregator === 'function'?
      aggregator:
      (group: GroupedSeq<Last<Ks>, TOut>, keys: any) => group.reduce<U>(
        (_1, _2, _3) => aggregator.reducer(_1, _2, _3, group, keys),
        aggregator.initialValue as unknown as U);

    return this.generate(function* aggregate(items) {
      for (const entry of items) {
        if (!SeqTags.group(entry)) break;
        for (const leaf of traverseLeaves(entry)) {
          const keys = toMultiKeysTuple<Ks>([...leaf.ancestorKeys, leaf.key] as Ks);
          const value = actualAggregator(leaf, keys);
          yield value;
        }
      }
    });
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

    return instance;
  }

  mapInGroup<U>(mapFn: (item: TOut, index: number, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U): any {
    const lastSelector = this.selectors.slice(-1)[0];
    const newLastSelector = lastSelector.clone({
      addedValueSelectors: [mapFn as unknown as (item: any, index: number, keys: readonly any[]) => unknown]
    });
    const selectors = this.selectors.slice(0, this.selectors.length - 1).concat(newLastSelector);
    const instance = new SeqOfMultiGroupsImpl(this.source, selectors);
    instance.tapCallbacks = this.tapCallbacks;

    return instance;
  }

  thenGroupBy<K2>(keySelector: Selector<TOut, K2>, toComparableKey?: ToComparableKey<K2>): SeqOfMultiGroups<[...Ks, K2], TOut> {
    const newSelector = GroupingSelector.from(keySelector, toComparableKey);
    return new SeqOfMultiGroupsImpl<[...Ks, K2], TIn, TOut>(
      this.source,
      [...this.selectors, newSelector],
    );
  }

  thenGroupBy$<K2 extends object>(keySelector: Selector<TOut, K2>): SeqOfMultiGroups<[...Ks, K2], TOut> {
    return this.thenGroupBy(keySelector, JSON.stringify);
  }

  tap(callback: Selector<MultiGroupedSeq<Ks, TOut>, void>): any {
    const tappable = new SeqOfMultiGroupsImpl(this.source, this.selectors);
    tappable.tapCallbacks.push(callback);
    return tappable;
  }

  toMap(): MapHierarchy<Ks, TOut>;

  toMap<K, V>(keySelector: Selector<MultiGroupedSeq<Ks, TOut>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, TOut>, V>, toComparableKey?: ToComparableKey<K>): Map<K, V>;

  toMap<K, V>(keySelector?: Selector<MultiGroupedSeq<Ks, TOut>, K>, valueSelector?: Selector<MultiGroupedSeq<Ks, TOut>, V>, toComparableKey?: ToComparableKey<K>): any {
    if (keySelector) return super.toMap(keySelector, valueSelector, toComparableKey);
    return new HierarchyTransformer(this, this.selectors.filter(s => !s.aggregator)).toMap();
  }

  toObject(): ObjectHierarchy<Ks, TOut>;
  toObject(arrayed: true): ObjectHierarchy<Ks, TOut[]>;
  toObject(arrayed?: boolean): ObjectHierarchy<Ks, TOut | TOut[]> {
    const hierarchyTransformer = new HierarchyTransformer(this, this.selectors.filter(s => !s.aggregator));

    return arrayed?
      hierarchyTransformer.toObjectArray():
      hierarchyTransformer.toObjectSingle();
  }

  * [Symbol.iterator](): any {
    const self = this;
    yield* new Gen(this.source, function* (source, iterationContext) {
      yield* self.sessionIterator(iterationContext);
    });
    // return this.lazyIterator();
  }

  ungroup<U = TOut>(aggregator: (group: GroupedSeq<Last<Ks>, TOut>, keys: Ks & { outer: Ks[0]; inner: Last<Ks>; parent: Last<Tailless<Ks>>; }) => U): SeqOfGroupsWithoutLast<Ks, U> {

    let indexOfLastSelectorWithoutAggregation = -1;
    for (let i = this.selectors.length - 1; i >= 0; i--) {
      if (!this.selectors[i].aggregator) {
        indexOfLastSelectorWithoutAggregation = i;
        break;
      }
    }
    if (indexOfLastSelectorWithoutAggregation < 0) throw new Error('Cannot ungroup already fully ungrouped sequence');
    const lastSelectorWithoutAggregation = this.selectors[indexOfLastSelectorWithoutAggregation];

    const newLastSelector = lastSelectorWithoutAggregation.clone({aggregator: aggregator as any});

    const newSelectors = [...this.selectors];
    newSelectors[indexOfLastSelectorWithoutAggregation] = newLastSelector;

    const instance = new SeqOfMultiGroupsImpl<any, TIn, U>(this.source, newSelectors);

    return instance as unknown as SeqOfGroupsWithoutLast<Ks, U>;
  }

  // flatInner(): SeqOfGroupsWithoutLast<Ks, TOut> {
  //
  //   const lastSelector = this.selectors.slice(-1)[0];
  //   let taillessSelectors = this.selectors.slice(0, -1);
  //   if (lastSelector.values?.length) {
  //     const tailSelector = taillessSelectors.slice(-1)[0];
  //     console.assert(tailSelector);
  //     const newTailSelector = tailSelector.clone({
  //       addedValueSelectors: lastSelector.values
  //     });
  //     taillessSelectors = taillessSelectors.slice(0, -1).concat(newTailSelector);
  //   }
  //   const instance = new SeqOfMultiGroupsImpl<ExcludeLast<Ks>, TIn, TOut>(this.source, taillessSelectors);
  //
  //   return instance as unknown as SeqOfGroupsWithoutLast<Ks, TOut>;
  // }

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

  protected toJsonOverride(key: any): any {
    return new HierarchyTransformer(this, this.selectors.filter(s => !s.aggregator)).toObjectArray();
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
        if (yielded) consume(generated);
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
          const seq = new GroupedSeqImpl(
            container.key,
            new SeqOfGroupsGenerator(container, this.optimize),
            container.ancestorKeys);
          if (this.optimize) (seq as TaggedSeq)[SeqTags.$optimize] = true;
          const aggregated = container.aggregate(seq) as GroupedSeq<any, any>;
          yield aggregated;
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
          // then localNext will still equal `next` and it's safe to call sessionIterator.next()
          // Otherwise, don't next() since caller might already do that.
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
        const keys = [...ancestorKeys, key];
        const keyOrMultiKeys = (keys.length === 1)? key: toMultiKeysTuple(keys);
        item = selector.selectValue(item, entry.index, keyOrMultiKeys);

        currentContainer = currentContainer.getOrAddChildContainer(isLast, key, comparable, ancestorKeys, selector.aggregator);

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
  constructor(
    private seqOfGroups: SeqOfMultiGroups<Ks, TOut>,
    private readonly selectors: GroupingSelector[]) {
  }

  private static isValidPropertyKey(key: any): boolean {
    const expectedTypes: readonly string[] = ['number', 'string', 'symbol', "bigint", 'boolean'] as const;
    return key == null || expectedTypes.lastIndexOf(typeof key) > -1;
  }

  toMap<K, V>(): Map<any, any> {
    const comparableKeySelector = this.selectors[0].comparableKeySelector;
    const rootContainer: Map<any, any> = comparableKeySelector? new Dict(comparableKeySelector): new Map();

    this.materialize(
      rootContainer,
      (groupedSeq: KeyedSeq<any, any>, parentContainer: Map<any, any>, depth) => {
        const comparableKeySelector = this.selectors[depth + 1]?.comparableKeySelector;
        const container = comparableKeySelector? new Dict(comparableKeySelector): new Map();
        if (parentContainer) parentContainer.set(groupedSeq.key, container);
        return container;
      },
      (groupedSeq: KeyedSeq<any, any>, parentContainer: Map<any, any>): void => {
        parentContainer.set(groupedSeq.key, groupedSeq.filter(x => x !== IGNORED_ITEM).toArray() as unknown as any);
      });

    return rootContainer;
  }

  toObjectSingle(): ObjectHierarchy<Ks, TOut[]> {
    const obj: any = {};
    this.materialize<any, TOut[]>(
      obj,
      (groupedSeq: KeyedSeq<any, any>, parentContainer: any, depth) => {
        const container = {};
        if (parentContainer) {
          const comparableKeySelector = this.selectors[depth].comparableKeySelector;
          const validKey = `${HierarchyTransformer.isValidPropertyKey(groupedSeq.key) || !comparableKeySelector? groupedSeq.key: comparableKeySelector(groupedSeq.key)}`;
          parentContainer[validKey] = container;
        }
        return container;
      },
      (groupedSeq: KeyedSeq<any, any>, parentContainer: any, depth) => {
        const comparableKeySelector = this.selectors[depth].comparableKeySelector;
        const validKey = `${HierarchyTransformer.isValidPropertyKey(groupedSeq.key) || !comparableKeySelector? groupedSeq.key: comparableKeySelector(groupedSeq.key)}`;
        parentContainer[validKey] = groupedSeq.filter(x => x !== IGNORED_ITEM).last();
      }
    );

    return obj;
  }

  toObjectArray(): ObjectHierarchy<Ks, TOut[]> {
    const obj: any = {};
    this.materialize<any, TOut[]>(
      obj,
      (groupedSeq: KeyedSeq<any, any>, parentContainer: any, depth) => {
        const container = {};
        if (parentContainer) {
          const comparableKeySelector = this.selectors[depth].comparableKeySelector;
          const validKey = `${HierarchyTransformer.isValidPropertyKey(groupedSeq.key) || !comparableKeySelector? groupedSeq.key: comparableKeySelector(groupedSeq.key)}`;
          parentContainer[validKey] = container;
        }
        return container;
      },
      (groupedSeq: KeyedSeq<any, any>, parentContainer: any, depth) => {
        const comparableKeySelector = this.selectors[depth].comparableKeySelector;
        const validKey = `${HierarchyTransformer.isValidPropertyKey(groupedSeq.key) || !comparableKeySelector? groupedSeq.key: comparableKeySelector(groupedSeq.key)}`;
        parentContainer[validKey] = groupedSeq.filter(x => x !== IGNORED_ITEM).toArray();
      }
    );

    return obj;
  }

  private materialize<TContainer extends object, V>(
    initialContainer: TContainer,
    createContainer: (groupedSeq: KeyedSeq<any, any>, parentContainer: TContainer, depth: number) => TContainer,
    setValue: (groupedSeq: KeyedSeq<any, any>, parentContainer: TContainer, depth: number) => void
  ): void {

    const source = this.seqOfGroups;
    const groupedSeqToContainerMap = new Map<unknown, TContainer>([[source, initialContainer]]);
    const maxDepthIndex = this.selectors.length - 1;

    function* traverse(source: Iterable<any>, context: { depth: number; } = {depth: 0}): Generator<{ groupedSeq: KeyedSeq<any, any>; parent: Iterable<any>; depth: number; isLeaf: boolean; }, void, undefined> {
      for (const entry of entries(source)) {
        const isLeaf = context.depth === maxDepthIndex;
        yield {groupedSeq: entry.value, parent: source, depth: context.depth, isLeaf};
        if (!isLeaf) yield* traverse(entry.value, {depth: context.depth + 1});
      }
    }

    for (const {groupedSeq, parent, depth, isLeaf} of traverse(source)) {
      const parentContainer = groupedSeqToContainerMap.get(parent)!;
      console.assert(parentContainer);
      if (isLeaf) {
        setValue(groupedSeq, parentContainer, depth);
      } else if (!groupedSeqToContainerMap.has(groupedSeq)) {
        groupedSeqToContainerMap.set(groupedSeq, createContainer(groupedSeq, parentContainer, depth));
      }
    }
  }
}

