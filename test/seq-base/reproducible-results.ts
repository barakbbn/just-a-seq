import {TestHarness, TestIt} from '../test-harness';
import {Seq} from '../../lib';
import {assert} from 'chai';
import {array} from '../test-data';
import {describe} from 'mocha';

export abstract class SeqBase_Reproducible_Results_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Reproducible results', () => {

    const testN = (title: string, onSeq: (seq: Seq<number>) => any) => {
      return test1(title, [0,1,1,2,3,10,9,9,5,8], onSeq);
    };
    const test1 = <T>(title: string, source: T[], onSeq: (seq: Seq<T>) => any) => {
      it(`${title} should produce same results when iterated twice`, () => {
        const seq = this.createSut(source);
        const maybeIterable = onSeq(seq);
        const expected = TestHarness.materialize(maybeIterable);
        const actual = TestHarness.materialize(maybeIterable);
        assert.deepEqual(actual, expected);
      });
    };

    const testN2 = (title: string, onSeq: (seq: Seq<number>, second: Iterable<number>) => any) => {
      return test2(title, [0,1,1,2,3,10,9,9,5,8], [1,2,3,3,3,9,5,8], onSeq);
    };
    const test2 = <T, U>(title: string, first: T[], second: U[], onSeq: (seq: Seq<T>, second: Iterable<U>) => any) => {
      it(`${title} should produce same results when iterated twice`, () => {
        const seq = this.createSut(first);
        const maybeIterable = onSeq(seq, second);
        const expected = TestHarness.materialize(maybeIterable);
        const actual = TestHarness.materialize(maybeIterable);
        assert.deepEqual(actual, expected);
      });
    };

    testN('aggregate()', seq => seq.aggregate(0, (prev, curr) => prev + curr, x => x));
    testN('aggregateRight()', seq => seq.aggregateRight(0, (prev, curr) => prev + curr, x => x));
    testN('all()', seq => seq.all(n => n > 5));
    testN('any()', seq => seq.any(n => n > 5));
    testN('at()', seq => seq.at(-1));
    testN('average()', seq => seq.average());
    testN('append()', seq => seq.append(-1));
    testN2('cartesian()', (seq, other) => seq.cartesian(other));
    testN('chunk()', seq => seq.chunk(5));
    testN('chunkBySum()', seq => seq.chunkByLimit(5));
    testN('chunkBy()', seq => seq.chunkBy(() => ({})));
    testN2('concat()', (seq, other) => seq.concat(other));
    testN2('concat$()', (seq, other) => seq.concat$(other));
    testN('consume()', seq => seq.consume());
    testN('count()', seq => seq.count(n => n > 5));
    testN2('diffDistinct()', (seq, other) => seq.diffDistinct(other));
    testN2('diff()', (seq, other) => seq.diff(other));
    testN('distinct()', seq => seq.distinct());
    testN('distinctUntilChanged()', seq => seq.distinctUntilChanged());
    testN2('endsWith()', (seq, other) => seq.endsWith(other));
    testN('entries()', seq => seq.entries());
    testN('filter()', seq => seq.filter(() => true));
    testN('find()', seq => seq.find(n => n > 5));
    testN('findIndex()', seq => seq.findIndex(n => n > 5));
    testN('findLastIndex()', seq => seq.findLastIndex(n => n > 5));
    testN('findLast()', seq => seq.findLast(n => n > 5));
    testN('first()', seq => seq.first(-1));
    testN('firstAndRest()', seq => seq.firstAndRest(-1)[1]);
    testN('flat()', seq => seq.flat(3));
    test1('flatMap()', array.folders, seq => seq.flatMap(f => f.subFolders));
    test1('flatMap<V1, V2>()', array.folders, seq => seq.flatMap(f => f.subFolders, f => f.subFolders, f => f.name));
    testN('forEach()', seq => seq.forEach(n => n));
    testN('groupBy()', seq => seq.groupBy(n => n % 3));
    testN('groupBy().thenGroupBy()', seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2));
    testN('groupBy().thenGroupBy().ungroup()', seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroup(g => g.first()));
    testN('groupBy().thenGroupBy().ungroupAll()', seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroupAll(g => g.first()));
    testN2('groupJoin()', (seq, other) => seq.groupJoin(other, n => n, n => n));
    testN2('groupJoinRight()', (seq, other) => seq.groupJoinRight(other, n => n, n => n));
    testN('hasAtLeast()', seq => seq.hasAtLeast(9));
    testN('ifEmpty()', seq => seq.ifEmpty(1));
    testN('includes()', seq => seq.includes(5));
    testN2('includesAll()', (seq, other) => seq.includesAll(other));
    testN2('includesAny()', (seq, other) => seq.includesAny(other));
    testN2('includesSubSequence()', (seq, other) => seq.includesSubSequence(other));
    testN('indexOf()', seq => seq.indexOf(5));
    testN2('indexOfSubSequence()', (seq, other) => seq.indexOfSubSequence(other));
    testN2('innerJoin()', (seq, other) => seq.innerJoin(other, n => n, n => n));
    testN2('insert()', (seq, other) => seq.insert(0, other));
    testN2('insertAfter()', (seq, other) => seq.insertAfter(n => n > 5, other));
    testN2('insertBefore()', (seq, other) => seq.insertBefore(n => n > 5, other));
    testN2('interleave()', (seq, other) => seq.interleave(other));
    testN2('intersect()', (seq, other) => seq.intersect(other));
    testN('intersperse()', seq => seq.intersperse(','));
    testN('intersperseBy()', seq => seq.intersperseBy(() => ','));
    testN('isEmpty()', seq => seq.isEmpty());
    testN('join()', seq => seq.join());
    testN('last()', seq => seq.last());
    testN('lastIndexOf()', seq => seq.lastIndexOf(-1));
    testN('map()', seq => seq.map(n => n - n));
    testN('move()', seq => seq.move(0, 1, 2));
    testN('padEnd()', seq => seq.padEnd(11, 0));
    testN('padStart()', seq => seq.padStart(2, -1));
    testN('partition({matched})', seq => seq.partition(() => true).matched);
    testN('partition({unmatched})', seq => seq.partition(() => false).unmatched);
    testN('partition({matched+unmatched})', seq => seq.partition(() => false, (matched, unmatched) => matched.zip(unmatched)));
    testN('partitionWhile()', seq => seq.partitionWhile(x => x < 5));
    testN('partitionWhile().first', seq => seq.partitionWhile(x => x < 5).first);
    testN('partitionWhile().second', seq => seq.partitionWhile(x => x < 5).second);
    testN('max()', seq => seq.max());
    test1('maxItem(selector)', array.grades, seq => seq.maxItem(x => x.grade));
    test1('maxItem(comparer)', array.grades, seq => seq.maxItem({comparer: (a, b) => a.grade - b.grade}));
    testN('min()', seq => seq.min());
    test1('minItem(selector)', array.grades, seq => seq.minItem(x => x.grade));
    test1('minItem(comparer)', array.grades, seq => seq.minItem({comparer: (a, b) => a.grade - b.grade}));
    testN2('prepend()', (seq, other) => seq.prepend(other));
    testN('reduce()', seq => seq.reduce((prev, curr) => prev + curr));
    testN('reduceRight()', seq => seq.reduceRight((prev, curr) => prev + curr));
    testN2('remove()', (seq, other) => seq.remove(other));
    testN2('removeAll()', (seq, other) => seq.removeAll(other));
    testN('removeFalsy()', seq => seq.removeFalsy());
    testN('removeNulls()', seq => seq.removeNulls());
    testN('repeat()', seq => seq.repeat(2));
    testN('reverse()', seq => seq.reverse());
    testN2('sameItems()', (seq, other) => seq.sameItems(other));
    test2('sameOrderedItems() => true', array.zeroToTen, array.zeroToTen, (seq, other) => seq.sameOrderedItems(other));
    test2('sameOrderedItems() => first is longer', array.zeroToTen, array.oneToNine, (seq, other) => seq.sameOrderedItems(other));
    test2('sameOrderedItems() => second is longer', array.oneToNine, array.zeroToTen, (seq, other) => seq.sameOrderedItems(other));
    testN('scan()', seq => seq.scan((prev, curr) => prev + curr, 0));
    testN('skip()', seq => seq.skip(1));
    testN('skipFirst()', seq => seq.skipFirst());
    testN('skipLast()', seq => seq.skipLast());
    testN('skipWhile()', seq => seq.skipWhile(() => true));
    testN('slice()', seq => seq.slice(0, 5));
    testN('sort()', seq => seq.sort());
    testN('sortBy()', seq => seq.sortBy(x => x));
    testN('sorted()', seq => seq.sorted());
    testN('split()', seq => seq.split(x => x < 5));
    testN('splitAt()', seq => seq.splitAt(4));
    testN('splitAt().first', seq => seq.splitAt(4).first);
    testN('splitAt().second', seq => seq.splitAt(4).second);
    testN2('startsWith()', (seq, other) => seq.startsWith(other));
    test2('startsWith() => first is longer', array.zeroToTen, array.oneToNine, (seq, other) => seq.startsWith(other));
    test2('startsWith() => second is longer', array.oneToNine, array.zeroToTen, (seq, other) => seq.startsWith(other));
    testN('sum()', seq => seq.sum());
    testN('take()', seq => seq.take(10));
    testN2('takeBy()', (seq, other) => seq.takeBy(other, n => n));
    testN('takeLast()', seq => seq.takeLast(10));
    testN('takeWhile()', seq => seq.takeWhile(() => true));
    testN2('takeOnly()', (seq, other) => seq.takeOnly(other, n => n));
    testN('tap()', seq => seq.tap(n => n));
    testN('toArray()', seq => seq.toArray());
    testN('toMap()', seq => seq.toMap(n => n % 3));
    testN('toMapOfOccurrences()', seq => seq.toMapOfOccurrences(n => n % 3));
    testN('toSet()', seq => seq.toSet());
    test1('traverseBreadthFirst()', array.folders, seq => seq.traverseBreadthFirst((x, parent, depth) => depth < 3? [x]: []));
    test1('traverseDepthFirst()', array.folders, seq => seq.traverseDepthFirst((x, parent, depth) => depth < 3? [x]: []));
    testN2('union()', (seq, other) => seq.union(other));
    testN2('unionRight()', (seq, other) => seq.unionRight(other));
    testN2('unshift()', (seq, other) => seq.unshift(...other));
    testN('window()', seq => seq.window(1));
    testN('with()', seq => {
      return seq.with(1, 2);
    });
    testN2('zip()', (seq, other) => seq.zip(other));
    testN2('zipAll()', (seq, other) => seq.zipAll(other));
    testN('zipWithIndex()', seq => seq.zipWithIndex());


  });
}
