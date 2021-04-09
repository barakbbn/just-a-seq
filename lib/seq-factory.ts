import {generate, SeqTags} from "./common";
import {factories, Seq} from "./seq";

let _empty: Seq<any>;

let _random: Seq<number>

export function empty<T = any>(_ofType?: T): Seq<T> {
  return _empty ?? (_empty = factories.Seq(undefined, undefined, [[SeqTags.$maxCount, 0]])) as unknown as Seq<T>;
}

export function range(start: number, end?: number, step: number = 1): Seq<number> {
  if (Number.isNaN(start)) throw new Error('start parameter cannot be NaN');
  if (!Number.isFinite(start)) throw new Error(`start parameter cannot be Infinite`);
  if (step === 0) throw new Error('step parameter cannot be zero');
  if (Number.isNaN(step)) throw new Error('step parameter cannot be NaN');
  if (!Number.isFinite(step)) throw new Error(`step parameter cannot be Infinite`);

  const tags: [symbol, any][] | undefined = end === undefined ? [[SeqTags.$maxCount, Number.POSITIVE_INFINITY]] : undefined;

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

export function indexes(count: number): Seq<number> {
  return range(0, count - 1);
}

export function repeat<T>(value: T, count: number): Seq<T> {
  if (count < 0) throw new Error('count must be positive');
  return factories.Seq<T>(generate(function* repeat() {
    while (count--) yield value;
  }), undefined, [[SeqTags.$maxCount, count]])
}

export function random(): Seq<number> {
  return _random ?? (_random = factories.Seq(undefined, function* randomize() {
    while (true) yield Math.random();
  }, [[SeqTags.$maxCount, Number.POSITIVE_INFINITY]]));
}

export function asSeq<T>(items: Iterable<T>): Seq<T>;
export function asSeq<T>(generator: () => Iterator<T>): Seq<T>;
export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>)): Seq<T> {
  if (typeof itemsProvider !== "function") return factories.Seq(itemsProvider);
  return factories.Seq<T>(generate(itemsProvider));
}
