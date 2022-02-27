import {factories, Seq} from "./seq";
import {generate, SeqTags} from "./common";

let _random: Seq<number>
let _randomOptimized: Seq<number>
let _empty: Seq<any>;

export function internalEmpty<T = any>(_ofType?: T): Seq<T> {
  return _empty ?? (_empty = factories.Seq(undefined, undefined, [[SeqTags.$maxCount, 0]])) as unknown as Seq<T>;
}

function initRandom(optimized: boolean): Seq<number> {
  const tags: [symbol, any][] = optimized ? [[SeqTags.$optimize, true]] : [];
  tags.push([SeqTags.$maxCount, Number.POSITIVE_INFINITY]);
  return factories.Seq(undefined, function* randomize() {
    while (true) yield Math.random();
  }, tags);
}

export function randomInternal(optimized: boolean): Seq<number> {
  return optimized ?
    _randomOptimized ?? (_randomOptimized = initRandom(true)) :
    _random ?? (_random = initRandom(false));
}

export function asSeqInternal<T>(itemsProvider: Iterable<T> | (() => Iterator<T>), optimized = Seq.enableOptimization): Seq<T> {
  const tags: [symbol, any][] = optimized ? [[SeqTags.$optimize, true]] : [];

  if (typeof itemsProvider !== 'function' && SeqTags.isSeq<T>(itemsProvider)) {
    const isSameOptimizationFlag = SeqTags.optimize(itemsProvider) === optimized;
    if (isSameOptimizationFlag) return itemsProvider;
  } else if (typeof itemsProvider === 'function') itemsProvider = generate(itemsProvider);

  return factories.Seq<T>(itemsProvider, undefined, tags);
}
