import {describe} from "mocha";
import {Seq} from "../../lib";
import {assert} from "chai";
import {array} from "../test-data";
import {TestIt} from "../test-harness";

export abstract class SeqBase_Immutable_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Immutable', () => {
    const testImmutable = <T>(title: string, source: T[], onSeq: (seq: Seq<T>) => any) => {

      it(`${title} should not change source input`, () => {
        const sourceBeforeTest = [...source];
        const seq = this.createSut(source);
        const maybeIterable = onSeq(seq);
        if (maybeIterable && typeof maybeIterable[Symbol.iterator] === 'function') {
          for (const _ of maybeIterable) {
          }
        }
        assert.deepEqual(source, sourceBeforeTest);
      });
    };

    testImmutable('aggregate()', array.oneToTen, seq => seq.aggregate(0, (prev, curr) => prev + curr, x => x));
    testImmutable('aggregateRight()', array.oneToTen, seq => seq.aggregateRight(0, (prev, curr) => prev + curr, x => x));
    testImmutable('all()', array.oneToTen, seq => seq.all(n => n + 1));
    testImmutable('any()', array.oneToTen, seq => seq.any(() => 0));
    testImmutable('at()', array.oneToTen, seq => seq.at(-1));
    testImmutable('average()', array.oneToTen, seq => seq.average());
    testImmutable('append()', array.oneToTen, seq => seq.append(-1));
    testImmutable('cartesian()', array.oneToTen, seq => seq.cartesian(array.tenZeros));
    testImmutable('chunk()', array.oneToTen, seq => seq.chunk(5));
    testImmutable('chunkBySum()', array.oneToTen, seq => seq.chunkByLimit(5));
    testImmutable('chunkBy()', array.oneToTen, seq => seq.chunkBy(() => ({})));
    testImmutable('concat()', array.oneToTen, seq => seq.concat(array.tenZeros));
    testImmutable('concat$()', array.oneToTen, seq => seq.concat$(array.tenZeros));
    testImmutable('consume()', array.oneToTen, seq => seq.consume());
    testImmutable('count()', array.oneToTen, seq => seq.count(() => true));
    testImmutable('diffDistinct()', array.zeroToNine, seq => seq.diffDistinct(array.oneToTen));
    testImmutable('diff()', array.zeroToNine, seq => seq.diff(array.oneToTen));
    testImmutable('distinct()', array.tenOnes, seq => seq.distinct());
    testImmutable('distinctUntilChanged()', array.tenOnes, seq => seq.distinctUntilChanged());
    testImmutable('endsWith()', array.oneToTen, seq => seq.endsWith([9, 10]));
    testImmutable('entries()', array.oneToTen, seq => seq.entries());
    testImmutable('filter()', array.oneToTen, seq => seq.filter(() => true));
    testImmutable('find()', array.oneToTen, seq => seq.find(() => false));
    testImmutable('findIndex()', array.oneToTen, seq => seq.findIndex(() => false));
    testImmutable('findLastIndex()', array.oneToTen, seq => seq.findLastIndex(() => false));
    testImmutable('findLast()', array.oneToTen, seq => seq.findLast(() => false));
    testImmutable('first()', array.oneToTen, seq => seq.first(-1));
    testImmutable('firstAndRest()', array.oneToTen, seq => seq.firstAndRest(-1)[1]);
    testImmutable('flat()', array.strings, seq => seq.flat(3));
    testImmutable('flatMap()', array.folders, seq => seq.flatMap(f => f.subFolders));
    testImmutable('flatMap<V1, V2>()', array.folders, seq => seq.flatMap(f => f.subFolders, f => f.subFolders, f => f.name));
    testImmutable('forEach()', array.oneToTen, seq => seq.forEach(n => n));
    testImmutable('groupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3));
    testImmutable('groupBy().thenGroupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2));
    testImmutable('groupBy().thenGroupBy().ungroup()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroup(g => g.first()));
    testImmutable('groupBy().thenGroupBy().ungroupAll()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroupAll(g => g.first()));
    testImmutable('groupJoin()', array.oneToTen, seq => seq.groupJoin(array.tenOnes, n => n, n => n));
    testImmutable('groupJoinRight()', array.oneToTen, seq => seq.groupJoinRight(array.tenOnes, n => n, n => n));
    testImmutable('hasAtLeast()', array.oneToTen, seq => seq.hasAtLeast(10));
    testImmutable('ifEmpty()', array.oneToTen, seq => seq.ifEmpty(-1));
    testImmutable('includes()', array.oneToTen, seq => seq.includes(-1));
    testImmutable('includesAll()', array.oneToTen, seq => seq.includesAll(array.oneToTen));
    testImmutable('includesAny()', array.oneToTen, seq => seq.includesAny(array.tenZeros));
    testImmutable('includesSubSequence()', array.oneToTen, seq => seq.includesSubSequence(array.oneToTen));
    testImmutable('indexOf()', array.oneToTen, seq => seq.indexOf(-1));
    testImmutable('indexOfSubSequence()', array.oneToTen, seq => seq.indexOfSubSequence(array.oneToTen));
    testImmutable('innerJoin()', array.oneToTen, seq => seq.innerJoin(array.oneToTen, n => n, n => n));
    testImmutable('insert()', array.oneToTen, seq => seq.insert(0, array.oneToTen));
    testImmutable('insertAfter()', array.oneToTen, seq => seq.insertAfter(n => n > 5, array.oneToTen));
    testImmutable('insertBefore()', array.oneToTen, seq => seq.insertBefore(n => n > 5, array.oneToTen));
    testImmutable('interleave()', array.oneToTen, seq => seq.interleave(array.oneToTen));
    testImmutable('intersect()', array.oneToTen, seq => seq.intersect(array.oneToTen));
    testImmutable('intersperse()', array.oneToTen, seq => seq.intersperse(','));
    testImmutable('intersperseBy()', array.oneToTen, seq => seq.intersperse(() => ','));
    testImmutable('isEmpty()', array.oneToTen, seq => seq.isEmpty());
    testImmutable('join()', array.oneToTen, seq => seq.join());
    testImmutable('last()', array.oneToTen, seq => seq.last());
    testImmutable('lastIndexOf()', array.oneToTen, seq => seq.lastIndexOf(-1));
    testImmutable('map()', array.oneToTen, seq => seq.map(n => n - n));
    testImmutable('move()', array.oneToTen, seq => seq.move(0, 1, 2));
    testImmutable('max()', array.oneToTen, seq => seq.max());
    testImmutable('padEnd()', array.oneToTen, seq => seq.padEnd(11, 0));
    testImmutable('padStart()', array.oneToTen, seq => seq.padStart(2, -1));
    testImmutable('partition({matched}})', array.grades, seq => seq.partition(() => true).matched);
    testImmutable('partition({unmatched}})', array.grades, seq => seq.partition(() => false).unmatched);
    testImmutable('partition({matched+unmatched}})', array.grades, seq => seq.partition(() => false, (matched, unmatched) => matched.zip(unmatched)));
    testImmutable('partitionWhile()', array.grades, seq => seq.partitionWhile(() => true));
    testImmutable('partitionWhile().first', array.grades, seq => seq.partitionWhile(() => false).first);
    testImmutable('partitionWhile().second', array.grades, seq => seq.partitionWhile(() => false).second);
    testImmutable('maxItem(selector)', array.grades, seq => seq.maxItem(x => x.grade));
    testImmutable('maxItem(comparer)', array.grades, seq => seq.maxItem({comparer: (a, b) => a.grade - b.grade}));
    testImmutable('min()', array.oneToTen, seq => seq.min());
    testImmutable('minItem(selector)', array.grades, seq => seq.minItem(x => x.grade));
    testImmutable('minItem(comparer)', array.grades, seq => seq.minItem({comparer: (a, b) => a.grade - b.grade}));
    testImmutable('prepend()', array.oneToTen, seq => seq.prepend([0, -1, -2]));
    testImmutable('reduce()', array.oneToTen, seq => seq.reduce((prev, curr) => prev + curr));
    testImmutable('reduceRight()', array.oneToTen, seq => seq.reduceRight((prev, curr) => prev + curr));
    testImmutable('remove()', array.oneToTen, seq => seq.remove([0]));
    testImmutable('removeAll()', array.oneToTen, seq => seq.removeAll([0]));
    testImmutable('removeFalsy()', array.zeroToTen, seq => seq.removeFalsy());
    testImmutable('removeNulls()', array.zeroToTen, seq => seq.removeNulls());
    testImmutable('repeat()', array.zeroToTen, seq => seq.repeat(1));
    testImmutable('reverse()', array.zeroToTen, seq => seq.reverse());
    testImmutable('sameItems()', array.zeroToTen, seq => seq.sameItems(array.zeroToTen));
    testImmutable('sameOrderedItems()', array.zeroToTen, seq => seq.sameOrderedItems(array.zeroToTen));
    testImmutable('scan()', array.zeroToTen, seq => seq.scan((prev, curr) => prev + curr, 0));
    testImmutable('skip()', array.zeroToTen, seq => seq.skip(1));
    testImmutable('skipFirst()', array.zeroToTen, seq => seq.skipFirst());
    testImmutable('skipLast()', array.zeroToTen, seq => seq.skipLast());
    testImmutable('skipWhile()', array.zeroToTen, seq => seq.skipWhile(() => true));
    testImmutable('slice()', array.zeroToTen, seq => seq.slice(0, 5));
    testImmutable('sort()', array.zeroToTen, seq => seq.sort());
    testImmutable('sortBy()', array.zeroToTen, seq => seq.sortBy(x => x));
    testImmutable('sorted()', array.zeroToTen, seq => seq.sorted());
    testImmutable('splice()', array.zeroToTen, seq => seq.splice(2, 2,  -1));
    testImmutable('split()', array.zeroToTen, seq => seq.split(x => x).reduce((a, b) => [...a, ...b], [1]));
    testImmutable('splitAt()', array.zeroToTen, seq => seq.splitAt(4).reduce((a, b) => [...a, ...b], [1]));
    testImmutable('startsWith()', array.zeroToTen, seq => seq.startsWith(array.zeroToTen));
    testImmutable('sum()', array.zeroToTen, seq => seq.sum());
    testImmutable('take()', array.zeroToTen, seq => seq.take(10));
    testImmutable('takeBy()', array.zeroToTen, seq => seq.takeBy(array.zeroToTen, n => n));
    testImmutable('takeLast()', array.zeroToTen, seq => seq.takeLast(10));
    testImmutable('takeWhile()', array.zeroToTen, seq => seq.takeWhile(() => true));
    testImmutable('takeOnly()', array.zeroToTen, seq => seq.takeOnly(array.zeroToTen, n => n));
    testImmutable('tap()', array.zeroToTen, seq => seq.tap(n => n));
    testImmutable('toArray()', array.zeroToTen, seq => seq.toArray());
    testImmutable('toMap()', array.zeroToTen, seq => seq.toMap(n => n % 3));
    testImmutable('toSet()', array.zeroToTen, seq => seq.toSet());
    testImmutable('traverseBreadthFirst()', array.zeroToTen, seq => seq.traverseBreadthFirst((x, parent, depth) => depth < 3? [x]: []));
    testImmutable('traverseDepthFirst()', array.zeroToTen, seq => seq.traverseDepthFirst((x, parent, depth) => depth < 3? [x]: []));
    testImmutable('union()', array.oneToTen, seq => seq.union(array.zeroToNine));
    testImmutable('unionRight()', array.oneToTen, seq => seq.unionRight(array.zeroToNine));
    testImmutable('unshift()', array.oneToTen, seq => seq.unshift(0, -1, -2));
    testImmutable('zip()', array.oneToTen, seq => seq.zip(array.zeroToNine));
    testImmutable('window()', array.oneToTen, seq => seq.window(1));
    testImmutable('with()', array.oneToTen, seq => seq.with(1, 2));
    testImmutable('zipAll()', array.oneToTen, seq => seq.zipAll(array.zeroToTen));
    testImmutable('zipWithIndex()', array.oneToTen, seq => seq.zipWithIndex());
  });
}
