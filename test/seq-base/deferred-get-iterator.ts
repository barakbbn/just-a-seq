import {Seq} from "../../lib";
import {assert} from "chai";
import {TestableArray} from "../test-data";
import {TestableDerivedSeq, TestIt} from "../test-harness";

export abstract class SeqBase_Deferred_GetIterator_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Deferred functionality should not perform immediate execution', () => {
    const testGetIterator = (onSeq: (seq: Seq<any>) => void) => {
      const title = 'should not get iterator';
      const test = (title: string, input: Iterable<any>, wasIterated: () => boolean) => {
        it(title, () => {
          const seq = this.createSut(input);
          onSeq(seq);
          assert.isFalse(wasIterated());
        });
      };

      const iterable = {
        wasIterated: false,
        * [Symbol.iterator](): Iterator<any> {
          this.wasIterated = true;
          yield 0;
        }
      };

      const array = new TestableArray(0, 1, 2);
      const seq = new TestableDerivedSeq();

      test(title + ' - generator', iterable, () => iterable.wasIterated);
      test(title + ' - array', array, () => array.getIteratorCount > 0);
      test(title + ' - seq', seq, () => seq.wasIterated);
    };

    describe('as()', () => testGetIterator(sut => sut.as<number>()));

    describe('append()', () => testGetIterator(sut => sut.append(1)));

    describe('cache()', () => testGetIterator(sut => sut.cache()));

    describe('cartesian()', () => testGetIterator(sut => sut.cartesian([2])));

    describe('chunk()', () => testGetIterator(sut => sut.chunk(2)));

    describe('chunkBy()', () => testGetIterator(sut => sut.chunkBy(() => ({
      whatAboutTheItem: 'KeepIt',
      endOfChunk: false
    }))));

    describe('chunkBySum()', () => testGetIterator(sut => sut.chunkByLimit(2)));

    describe('concat()', () => testGetIterator(sut => sut.concat([2])));

    describe('concat$()', () => testGetIterator(sut => sut.concat$([2])));

    describe('diffDistinct()', () => testGetIterator(sut => sut.diffDistinct([2])));

    describe('diff()', () => testGetIterator(sut => sut.diff([2])));

    describe('distinct()', () => testGetIterator(sut => sut.distinct()));

    describe('distinctUntilChanged()', () => testGetIterator(sut => sut.distinctUntilChanged()));

    describe('entries()', () => testGetIterator(sut => sut.entries()));

    describe('filter()', () => testGetIterator(sut => sut.filter(() => true)));

    describe('flat()', () => testGetIterator(sut => sut.flat(5)));

    describe('flatMap<U>()', () => testGetIterator(sut => sut.flatMap(() => [1, 2])));
    describe('flatMap<V1, R>()', () => testGetIterator(sut => sut.flatMap(() => [1, 2], (a1, a2) => ({
      a1,
      a2
    }))));
    describe('flatMap<V1, V2, R>()', () => testGetIterator(sut => sut.flatMap(() => [1, 2], () => [3, 4], (a1, a2, a3) => ({
      a1,
      a2,
      a3
    }))));

    describe('groupBy()', () => testGetIterator(sut => sut.groupBy(() => 1,)));
    describe('groupBy().thanGroupBy()', () => testGetIterator(sut => sut.groupBy(() => 1).thenGroupBy(() => 2)));
    describe('groupBy().thanGroupBy().thanGroupBy()', () => testGetIterator(sut => sut.groupBy(() => 1).thenGroupBy(() => 2).thenGroupBy(() => 3)));
    describe('groupBy().thanGroupBy().ungroup()', () => testGetIterator(sut => sut.groupBy(() => 1).thenGroupBy(() => 2).ungroup(g => g.first())));
    describe('groupBy().thanGroupBy().ungroupAll()', () => testGetIterator(sut => sut.groupBy(() => 1).thenGroupBy(() => 2).ungroupAll(g => g.first())));

    describe('groupJoin()', () => testGetIterator(sut => sut.groupJoin([1], () => 1, () => 1)));

    describe('innerJoin()', () => testGetIterator(sut => sut.innerJoin([1], () => 1, () => 1, () => 1)));

    describe('ifEmpty()', () => testGetIterator(sut => sut.ifEmpty(1)));

    describe('insert()', () => testGetIterator(sut => sut.insert(1)));

    describe('insertAfter()', () => testGetIterator(sut => sut.insertAfter(() => true)));

    describe('insertBefore()', () => testGetIterator(sut => sut.insertBefore(() => true)));

    describe('interleave()', () => testGetIterator(sut => sut.interleave([1])));

    describe('intersect()', () => testGetIterator(sut => sut.intersect([1])));

    describe('intersperse()', () => testGetIterator(sut => sut.intersperse(',')));

    describe('intersperseBy()', () => testGetIterator(sut => sut.intersperseBy(() => ',')));

    describe('map()', () => testGetIterator(sut => sut.map(() => 1)));

    describe('move()', () => testGetIterator(sut => sut.move(0,1,2)));

    describe('padEnd()', () => testGetIterator(sut => sut.padEnd(1, 0)));

    describe('partition()', () => testGetIterator(sut => sut.partition(x => x)));

    describe('partition().matched', () => testGetIterator(sut => sut.partition(x => x).matched));

    describe('partition().unmatched', () => testGetIterator(sut => sut.partition(x => x).unmatched));

    describe('partitionWhile()', () => testGetIterator(sut => sut.partitionWhile(x => x)));

    describe('partitionWhile()[0]', () => testGetIterator(sut => sut.partitionWhile(x => x)[0]));

    describe('partitionWhile()[1]', () => testGetIterator(sut => sut.partitionWhile(x => x)[1]));

    describe('ofType()', () => testGetIterator(sut => sut.ofType(Number)));

    describe('prepend()', () => testGetIterator(sut => sut.prepend([1])));

    describe('push()', () => testGetIterator(sut => sut.push(1)));

    describe('remove()', () => testGetIterator(sut => sut.remove([1])));

    describe('removeAll()', () => testGetIterator(sut => sut.removeAll([1])));

    describe('removeFalsy()', () => testGetIterator(sut => sut.removeFalsy()));

    describe('removeNulls()', () => testGetIterator(sut => sut.removeNulls()));

    describe('repeat()', () => testGetIterator(sut => sut.repeat(2)));

    describe('reverse()', () => testGetIterator(sut => sut.reverse()));

    describe('scan()', () => testGetIterator(sut => sut.scan((prev, curr) => prev + curr, 0)));

    describe('skip()', () => testGetIterator(sut => sut.skip(2)));

    describe('skipFirst()', () => testGetIterator(sut => sut.skipFirst()));

    describe('skipLast()', () => testGetIterator(sut => sut.skipLast()));

    describe('skipWhile()', () => testGetIterator(sut => sut.skipWhile(() => false)));

    describe('slice()', () => testGetIterator(sut => sut.slice(0, 2)));

    describe('sort()', () => testGetIterator(sut => sut.sort()));

    describe('sortBy()', () => testGetIterator(sut => sut.sortBy(x => x)));

    describe('sorted()', () => testGetIterator(sut => sut.sorted()));

    describe('splitAt()', () => testGetIterator(sut => sut.splitAt(2)));

    describe('splitAt()[0]', () => testGetIterator(sut => sut.splitAt(2)[0]));

    describe('splitAt()[1]', () => testGetIterator(sut => sut.splitAt(2)[1]));

    describe('split(condition)', () => testGetIterator(sut => sut.split(x => x)));

    describe('take()', () => testGetIterator(sut => sut.take(2)));

    describe('takeBy()', () => testGetIterator(sut => sut.takeBy([1], x => x)));

    describe('takeLast()', () => testGetIterator(sut => sut.takeLast(2)));

    describe('takeWhile()', () => testGetIterator(sut => sut.takeWhile(() => true)));

    describe('takeOnly()', () => testGetIterator(sut => sut.takeOnly([1], x => x)));

    describe('tap()', () => testGetIterator(sut => sut.tap(x => x)));

    describe('traverseBreadthFirst()', () => testGetIterator(sut => sut.traverseBreadthFirst((x, parent, depth) => depth < 3? [x]: [])));

    describe('traverseDepthFirst()', () => testGetIterator(sut => sut.traverseDepthFirst((x, parent, depth) => depth < 3? [x]: [])));

    describe('union()', () => testGetIterator(sut => sut.union([1])));

    describe('unionRight()', () => testGetIterator(sut => sut.unionRight([1])));

    describe('unshift()', () => testGetIterator(sut => sut.unshift(1)));

    describe('window()', () => testGetIterator(sut => sut.window(1)));

    describe('with()', () => testGetIterator(sut => sut.with(1, 2)));

    describe('zip()', () => testGetIterator(sut => sut.zip([1])));

    describe('zipAll()', () => testGetIterator(sut => sut.zipAll([1])));

    describe('zipWithIndex()', () => testGetIterator(sut => sut.zipWithIndex()));

  });
}
