import {generate} from "./common";
import {factories, Seq} from "./seq";

const _empty = factories.Seq();

const _random = factories.Seq(generate(function* randomize() {
  while (true) yield Math.random();
}));

export function empty<T = any>(_ofType?: T): Seq<T> {
  return _empty as unknown as Seq<T>;
}

export function range(start: number, end?: number, step: number = 1): Seq<number> {
  if (step === 0) throw new Error('step parameter cannot be zero');
  if (Number.isNaN(start)) throw new Error('start parameter cannot be NaN');
  if (!Number.isFinite(start)) throw new Error(`step cannot be ${start}`);

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
  }));
}

export function indexes(count: number): Seq<number> {
  return range(0, count - 1);
}

export function repeat<T>(value: T, count: number): Seq<T> {
  if (count < 0) throw new Error('count must be positive');
  return factories.Seq<T>(generate(function* repeat() {
    while (count--) yield value;
  }))
}

export function random(): Seq<number> {
  return _random;
}

export function asSeq<T>(items: Iterable<T>): Seq<T>;
export function asSeq<T>(generator: () => Generator<T>, thisArg?: any): Seq<T>;
export function asSeq<T>(itemsProvider: Iterable<T> | (() => Iterator<T>), thisArg?: any): Seq<T> {
  if (typeof itemsProvider !== "function") return factories.Seq(itemsProvider);
  if (thisArg) itemsProvider = itemsProvider.bind(thisArg);
  return factories.Seq<T>(generate(itemsProvider));
}
