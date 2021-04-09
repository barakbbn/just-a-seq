import {Condition, Selector, Seq} from "./seq";
import {SeqBase} from "./seq-base";

function isFilter(x: any): x is { filter: Condition<any>; } {
  return 'filter' in x;
}

class FilterMapChain {
  static FILTERED_OUT = {};

  constructor(private readonly chain: ({ filter: Condition<any>; } | { map: Selector<any, any>; })[]) {
  }

  static from(filterOrMap: { filter: Condition<any>; } | { map: Selector<any, any>; }): FilterMapChain {
    return new FilterMapChain([filterOrMap]);
  }

  filter(condition: Condition<any>): FilterMapChain {
    return new FilterMapChain([...this.chain, {filter: condition}]);
  }

  map(selector: Selector<any, any>): FilterMapChain {
    return new FilterMapChain([...this.chain, {map: selector}]);
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

export class FilterMapSeqImpl<T, U = T> extends SeqBase<U> {
  constructor(private readonly source: Iterable<T>, private readonly filterMapChain: FilterMapChain) {
    super();
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
}
