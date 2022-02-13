import {Seq} from "../../lib";
import {assert} from "chai";
import {TestableArray} from "../test-data";

export abstract class SeqBase_Deferred_GetIterator_Tests {
  constructor(protected optimized: boolean) {
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
        getIteratorWasCalled: false,
        [Symbol.iterator](): Iterator<any> {
          this.getIteratorWasCalled = true;
          return [0][Symbol.iterator]();
        }
      };

      test(title + ' - generator', iterable, () => iterable.getIteratorWasCalled);
      const array = new TestableArray(0, 1, 2);
      test(title + ' - array', array, () => array.getIteratorCount > 0);
    };

    describe('as()', () => testGetIterator(sut => sut.as<number>()));

    describe('append()', () => testGetIterator(sut => sut.append(1)));

    describe('cache()', () => testGetIterator(sut => sut.cache()));

    describe('chunk()', () => testGetIterator(sut => sut.chunk(2)));

    describe('concat()', () => testGetIterator(sut => sut.concat([2])));

    describe('concat$()', () => testGetIterator(sut => sut.concat$([2])));

    describe('diffDistinct()', () => testGetIterator(sut => sut.diffDistinct([2])));

    describe('diff()', () => testGetIterator(sut => sut.diff([2])));

    describe('distinct()', () => testGetIterator(sut => sut.distinct()));

    describe('entries()', () => testGetIterator(sut => sut.entries()));

    describe('filter()', () => testGetIterator(sut => sut.filter(() => true)));

    describe('flat()', () => testGetIterator(sut => sut.flat(5)));

    describe('flatMap()', () => testGetIterator(sut => sut.flatMap(() => [1, 2])));

    describe('flatHierarchy()', () => testGetIterator(sut => sut.flatHierarchy(() => [1, 2], () => [3, 4], (a1, a2, a3) => ({
      a1,
      a2,
      a3
    }))));

    describe('groupBy()', () => testGetIterator(sut => sut.groupBy(() => 1,)));

    describe('groupJoin()', () => testGetIterator(sut => sut.groupJoin([1], () => 1, () => 1)));

    describe('innerJoin()', () => testGetIterator(sut => sut.innerJoin([1], () => 1, () => 1, () => 1)));

    describe('ifEmpty()', () => testGetIterator(sut => sut.ifEmpty(1)));

    describe('insert()', () => testGetIterator(sut => sut.insert(1)));

    describe('insertBefore()', () => testGetIterator(sut => sut.insertBefore(() => true)));

    describe('insertAfter()', () => testGetIterator(sut => sut.insertAfter(() => true)));

    describe('intersect()', () => testGetIterator(sut => sut.intersect([1])));

    describe('intersperse()', () => testGetIterator(sut => sut.intersperse(',')));

    describe('map()', () => testGetIterator(sut => sut.map(() => 1)));

    describe('matchBy()', () => testGetIterator(sut => sut.matchBy(x => x)));

    describe('matchBy().matched', () => testGetIterator(sut => sut.matchBy(x => x).matched));

    describe('matchBy().unmatched', () => testGetIterator(sut => sut.matchBy(x => x).unmatched));

    describe('ofType()', () => testGetIterator(sut => sut.ofType(Number)));

    describe('prepend()', () => testGetIterator(sut => sut.prepend([1])));

    describe('push()', () => testGetIterator(sut => sut.push(1)));

    describe('remove()', () => testGetIterator(sut => sut.remove([1])));

    describe('removeAll()', () => testGetIterator(sut => sut.removeAll([1])));

    describe('removeFalsy()', () => testGetIterator(sut => sut.removeFalsy()));

    describe('removeNulls()', () => testGetIterator(sut => sut.removeNulls()));

    describe('repeat()', () => testGetIterator(sut => sut.repeat(2)));

    describe('reverse()', () => testGetIterator(sut => sut.reverse()));

    describe('skip()', () => testGetIterator(sut => sut.skip(2)));

    describe('skipFirst()', () => testGetIterator(sut => sut.skipFirst()));

    describe('skipLast()', () => testGetIterator(sut => sut.skipLast()));

    describe('skipWhile()', () => testGetIterator(sut => sut.skipWhile(() => false)));

    describe('slice()', () => testGetIterator(sut => sut.slice(0, 2)));

    describe('sort()', () => testGetIterator(sut => sut.sort()));

    describe('sortBy()', () => testGetIterator(sut => sut.sortBy(x => x)));

    describe('sorted()', () => testGetIterator(sut => sut.sorted()));

    describe('split(at)', () => testGetIterator(sut => sut.split(2)));

    describe('split(at)[0]', () => testGetIterator(sut => sut.split(2)[0]));

    describe('split(at)[1]', () => testGetIterator(sut => sut.split(2)[1]));

    describe('split(condition)', () => testGetIterator(sut => sut.split(x => x)));

    describe('split(condition)[0]', () => testGetIterator(sut => sut.split(x => x)[0]));

    describe('split(condition)[1]', () => testGetIterator(sut => sut.split(x => x)[1]));

    describe('take()', () => testGetIterator(sut => sut.take(2)));

    describe('takeLast()', () => testGetIterator(sut => sut.takeLast(2)));

    describe('takeWhile()', () => testGetIterator(sut => sut.takeWhile(() => true)));

    describe('takeOnly()', () => testGetIterator(sut => sut.takeOnly([1], x => x)));

    describe('tap()', () => testGetIterator(sut => sut.tap(x => x)));

    describe('union()', () => testGetIterator(sut => sut.union([1])));

    describe('unionRight()', () => testGetIterator(sut => sut.unionRight([1])));

    describe('unshift()', () => testGetIterator(sut => sut.unshift(1)));

    describe('zip()', () => testGetIterator(sut => sut.zip([1])));

    describe('zipAll()', () => testGetIterator(sut => sut.zipAll([1])));

    describe('zipWithIndex()', () => testGetIterator(sut => sut.zipWithIndex()));

  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}
