import {generate, SeqTags} from "./common";
import {factories, Seq as ISeq} from "./seq";
import {asSeqInternal, internalEmpty, randomInternal} from "./internal";


export function asSeq<T>(items: Iterable<T>): ISeq<T>;
export function asSeq<T>(generator: () => Iterator<T>): ISeq<T>;
export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>)): ISeq<T> {
  return asSeqInternal(itemsProvider);
}

export type Seq<T> = ISeq<T>;
export namespace Seq {

  export const empty = internalEmpty;

  export function range(start: number, end?: number, step: number = 1): ISeq<number> {
    if (Number.isNaN(start)) throw new Error('start parameter cannot be NaN');
    if (!Number.isFinite(start)) throw new Error(`start parameter cannot be Infinite`);
    if (step === 0) throw new Error('step parameter cannot be zero');
    if (Number.isNaN(step)) throw new Error('step parameter cannot be NaN');
    if (!Number.isFinite(step)) throw new Error(`step parameter cannot be Infinite`);

    const tags: [symbol, any][] = [];
    if (end === undefined) tags.push([SeqTags.$maxCount, Number.POSITIVE_INFINITY]);
    if (ISeq.enableOptimization) tags.push([SeqTags.$optimize, true]);

    return factories.Seq(generate(function* range() {
      if (end !== undefined && start > end && step > 0) step *= -1;
      let index = 0;
      let value = start + step * index++;
      yield value;
      while (true) {
        value = start + step * index++;
        if (end !== undefined && (step < 0 && value < end || step > 0 && value > end)) break;
        yield value;
      }
    }), undefined, tags);
  }

  export function indexes(count: number): ISeq<number> {
    return range(0, count - 1);
  }

  export function repeat<T>(value: T, count: number): ISeq<T> {
    if (count < 0) throw new Error('count must be positive');
    const tags: [symbol, any][] = [[SeqTags.$maxCount, count]];
    if (ISeq.enableOptimization) tags.push([SeqTags.$optimize, true]);

    return factories.Seq<T>(generate(function* repeat() {
      while (count--) yield value;
    }), undefined, tags)
  }

  export function random(): ISeq<number> {
    return randomInternal(Seq.enableOptimization);
  }
}

export declare namespace Seq {
  export let enableOptimization: boolean;

  export function asSeq<T>(items: Iterable<T>): ISeq<T>;
  export function asSeq<T>(generator: () => Iterator<T>): ISeq<T>;
  export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>)): ISeq<T>;
}
Seq.asSeq = asSeq as any;

Object.defineProperty(Seq, 'enableOptimization', {
  get(): any {
    return ISeq.enableOptimization;
  }, set(v: any) {
    ISeq.enableOptimization = v;
  }
})
