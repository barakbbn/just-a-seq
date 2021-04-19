import {Condition, Selector, Seq} from "./seq";
import {SeqBase} from "./seq-base";
import {entries, Gen, sameValueZero, SeqTags, TaggedSeq} from "./common";

function isFilter(x: any): x is { filter: Condition<any>; } {
  return 'filter' in x;
}

function isMap(x: any): x is { filter: Condition<any>; } {
  return 'map' in x;
}

class FilterMapChain {
  static FILTERED_OUT = {};
  hasFilter: boolean;
  hasMap: boolean;

  constructor(private readonly chain: ({ filter: Condition<any>; } | { map: Selector<any, any>; })[], {
    hasFilter,
    hasMap
  }: { hasFilter?: boolean; hasMap?: boolean; } = {}) {
    this.hasFilter = hasFilter ?? false;
    this.hasMap = hasMap ?? false;
  }

  static from(filterOrMap: { filter: Condition<any>; } | { map: Selector<any, any>; }): FilterMapChain {
    return new FilterMapChain([filterOrMap], {
      hasFilter: isFilter(filterOrMap),
      hasMap: isMap(filterOrMap)
    });
  }

  clone(): FilterMapChain {
    return new FilterMapChain([...this.chain]);
  }

  filter(condition: Condition<any>): FilterMapChain {
    return new FilterMapChain([...this.chain, {filter: condition}], {
      hasFilter: true,
      hasMap: this.hasMap
    });
  }

  map(selector: Selector<any, any>): FilterMapChain {
    return new FilterMapChain([...this.chain, {map: selector}], {
      hasFilter: this.hasFilter,
      hasMap: true
    });
  }

  * apply(source: Iterable<any>): Generator<any> {
    const indexes = Array.from<number>({length: this.chain.length}).fill(0);
    for (let value of source) {
      for (let i = 0; i < this.chain.length; i++) {
        const action = this.chain[i];
        if (isFilter(action)) {
          if (!action.filter(value, indexes[i]++)) value = FilterMapChain.FILTERED_OUT;

        } else value = action.map(value, indexes[i]++);
      }

      if (value !== FilterMapChain.FILTERED_OUT) yield value;
    }
  }
}

export class FilterMapSeqImpl<T, U = T> extends SeqBase<U> implements TaggedSeq {

  constructor(private readonly source: Iterable<T>, private readonly filterMapChain: FilterMapChain) {
    super();
  }

  get [SeqTags.$notMappingItems](): boolean {
    return !this.filterMapChain.hasMap;
  }

  get [SeqTags.$notAffectingNumberOfItems](): boolean {
    return !this.filterMapChain.hasFilter;
  }

  static create<T>(source: Iterable<T>, filter: { filter: Condition<T> }): FilterMapSeqImpl<T>;

  static create<T, U = T>(source: Iterable<T>, map: { map: Selector<T, U> }): FilterMapSeqImpl<T, U>;

  static create<T, U = T>(source: Iterable<T>, filterOrMap: { filter: Condition<any>; } | { map: Selector<any, any>; }): FilterMapSeqImpl<T, U> {
    return new FilterMapSeqImpl(source, FilterMapChain.from(filterOrMap))
  }

  [Symbol.iterator](): Iterator<U> {
    return this.filterMapChain.apply(this.source);
  }

  filter(condition: Condition<U>): Seq<U> {
    return new FilterMapSeqImpl<T, U>(this.source, this.filterMapChain.filter(condition));
  }

  map<V = U>(selector: Selector<U, V>): Seq<V> {
    return new FilterMapSeqImpl<T, V>(this.source, this.filterMapChain.map(selector));
  }

  any(condition?: Condition<U>): boolean {
    return this.anyOptimized(this.source, condition);
  }

  count(condition: Condition<U> = () => true): number {
    return this.countOptimized(this.source, condition);
  }

  hasAtLeast(count: number): boolean {
    return this.hasAtLeastOptimized(this.source, count);
  }

  last(): U | undefined;
  last(fallback: U): U;
  last(fallback?: U): U | undefined {
    if (!SeqTags.optimize(this) || !Array.isArray(this.source)) return super.last();
    const reverseSource = this.reverseSource(this.source);
    // noinspection LoopStatementThatDoesntLoopJS
    for (const item of this.filterMapChain.apply(reverseSource)) {
      return item;
    }
    return fallback;
  }

  lastIndexOf(itemToFind: U, fromIndex?: number): number {
    if (!SeqTags.optimize(this) || !Array.isArray(this.source) || this.filterMapChain.hasFilter) {
      return super.lastIndexOf(itemToFind, fromIndex);
    }
    const reverseSource = this.reverseSource(this.source, fromIndex);
    for (const {value, index} of entries(this.filterMapChain.apply(reverseSource))) {
      if (sameValueZero(itemToFind, value)) return this.source.length - index;
    }
    return -1;
  }

  findLast(condition: Condition<U>, fallback?: U | undefined): U | undefined;

  findLast(tillIndex: number, condition: Condition<U>, fallback?: U | undefined): U | undefined;

  findLast(tillIndex: number | Condition<U>, condition?: Condition<U> | U | undefined, fallback?: U | undefined): U | undefined {
    [tillIndex, condition, fallback] = (typeof tillIndex === "number") ?
      [tillIndex, condition as Condition<U>, fallback] :
      [Number.NaN, tillIndex, condition as U | undefined];

    if (!SeqTags.optimize(this) || !Array.isArray(this.source)) {
      return super.findLast(tillIndex, condition, fallback);
    }

    const reverseSource = this.reverseSource(this.source);
    for (const {value, index} of entries(this.filterMapChain.apply(reverseSource))) {
      if (condition(value, index)) return value;
    }
    return fallback;
  }

  skipLast(count: number = 1): Seq<U> {
    if (count <= 0) return this;

    if (!SeqTags.optimize(this) || !Array.isArray(this.source) || this.filterMapChain.hasFilter) {
      return super.skipLast(count);
    }

    const source: Iterable<T> = new Gen(this.source, function* skipLast(source: T[]) {
      const length = source.length - count;
      for (let i = 0; i < length; i++) yield source[i];
    });

    return  new FilterMapSeqImpl<T, U>(source, this.filterMapChain.clone());
  }

  takeLast(count: number): Seq<U> {
    if (!SeqTags.optimize(this) || !Array.isArray(this.source) || this.filterMapChain.hasFilter) {
      return super.takeLast(count);
    }
    if (this.source.length <= 0) return this;
    if (count > this.source.length) return this;

    const source: Iterable<T> = new Gen(this.source, function* takeLast(source: T[]) {
      const startIndex = source.length - count;
      for (let i = startIndex; i < source.length; i++) yield source[i];
    });

    return  new FilterMapSeqImpl<T, U>(source, this.filterMapChain.clone());
  }

  findLastIndex(condition: Condition<U>): number;

  findLastIndex(tillIndex: number, condition: Condition<U>): number;

  findLastIndex(tillIndex: number | Condition<U>, condition?: Condition<U>): number {
    [tillIndex, condition] = (typeof tillIndex === "number") ?
      [tillIndex, condition as Condition<U>] :
      [Number.NaN, tillIndex];

    if (!SeqTags.optimize(this) || !Array.isArray(this.source) || this.filterMapChain.hasFilter) {
      return super.findLastIndex(tillIndex, condition);
    }

    const reverseSource = this.reverseSource(this.source);
    for (const {value, index} of entries(this.filterMapChain.apply(reverseSource))) {
      if (condition(value, index)) return this.source.length - index;
    }
    return -1;
  }


  private* reverseSource(source: U[], fromIndex = source.length - 1): Generator<U> {
    if (fromIndex >= source.length) fromIndex = source.length - 1;
    else if (fromIndex < 0) fromIndex += source.length;
    if (fromIndex <= 0) return;
    for (let i = fromIndex; i >= 0; i--) yield source[i];
  }
}
