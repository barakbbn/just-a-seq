import {factories, Seq} from "./seq";
import {SeqTags} from "./common";

let _random: Seq<number>
let _randomOptimized: Seq<number>

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

