import {factories, Seq} from "./seq";
import {generate, SeqTags} from "./common";

let _random: Seq<number>
let _randomOptimized: Seq<number>
let _empty: Seq<any>;

export function internalEmpty<T>(_ofType?: T): Seq<T> {
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

export function asSeqInternal<T>(itemsProvider: Iterable<T>[] | [() => Iterator<T>], optimized = Seq.enableOptimization): Seq<T> {
  function isGenerator(itemsProvider: Iterable<T>[] | [() => Iterator<T>]): itemsProvider is [() => Iterator<T>] {
    return typeof itemsProvider[0] === 'function';
  }

  const tags: [symbol, any][] = optimized ? [[SeqTags.$optimize, true]] : [];
  let seq: Seq<T> | undefined = undefined;

  const [first, ...rest] = isGenerator(itemsProvider) ? [generate(itemsProvider[0])] : itemsProvider;
  if (SeqTags.isSeq<T>(first)) {
    const isSameOptimizationFlag = SeqTags.optimize(first) === optimized;
    if (isSameOptimizationFlag) seq = first;
  }

  if (!seq) seq = factories.Seq<T>(first, undefined, tags);
  return rest.length ? seq.concat(...rest) : seq;
}
