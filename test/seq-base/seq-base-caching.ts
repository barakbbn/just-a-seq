import {Seq} from "../../lib";
import {assert} from "chai";
import {describe, it} from "mocha";
import {array, TestableArray} from "../test-data";
import {TestIt} from "../test-harness";

export abstract class SeqBase_CachedSeq_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - cache()', () => {
    const it1 = (title: string, testFn: (input: Iterable<any> & { getIteratorCount: number; }) => void) => {
      const iterable = {
        getIteratorCount: 0,
        [Symbol.iterator](): Iterator<any> {
          this.getIteratorCount++;
          return [0][Symbol.iterator]();
        }
      };
      const testableArray = new TestableArray(...array.oneToTen);

      it(title + ' - array source', () => testFn(testableArray));
      it(title + ' - generator source', () => testFn(iterable));
    }
    const testIteratedOnce = (input: Iterable<any> & { getIteratorCount: number; }, onSeq: (seq: Seq<any>) => any) => {
      function tryIterate(maybeIterable?: any): boolean {
        if (typeof maybeIterable !== 'object' || typeof maybeIterable[Symbol.iterator] !== 'function') return false;
        for (const item of maybeIterable) {
          if (!tryIterate(item)) return true;
        }
        return false
      }

      const seq = this.createSut(input).cache();
      let maybeIterable = onSeq(seq);
      tryIterate(maybeIterable);
      maybeIterable = onSeq(seq);
      tryIterate(maybeIterable);
      assert.strictEqual(input.getIteratorCount, 1);
    }
    it('should return same instance if calling cache again', () => {
      const expected = this.createSut().cache();
      const actual = expected.cache();

      assert.strictEqual(actual, expected);
    });

    describe('should cache items also when further chained with other operations', () => {
      it1('as()', (input) => {
        testIteratedOnce(input, sut => sut.as<number>());
      });

      it1('append()', (input) => {
        testIteratedOnce(input, sut => sut.append(1));
      });

      it1('cache()', (input) => {
        testIteratedOnce(input, sut => sut.cache());
      });

      it1('chunk()', (input) => {
        testIteratedOnce(input, sut => sut.chunk(2));
      });

      it1('concat()', (input) => {
        testIteratedOnce(input, sut => sut.concat([2]));
      });

      it1('concat$()', (input) => {
        testIteratedOnce(input, sut => sut.concat$([2]));
      });

      it1('diffDistinct()', (input) => {
        testIteratedOnce(input, sut => sut.diffDistinct([2]));
      });

      it1('diff()', (input) => {
        testIteratedOnce(input, sut => sut.diff([2]));
      });

      it1('distinct()', (input) => {
        testIteratedOnce(input, sut => sut.distinct());
      });

      it1('entries()', (input) => {
        testIteratedOnce(input, sut => sut.entries());
      });

      it1('filter()', (input) => {
        testIteratedOnce(input, sut => sut.filter(() => true));
      });

      it1('flat()', (input) => {
        testIteratedOnce(input, sut => sut.flat(5));
      });

      it1('flatMap()', (input) => {
        testIteratedOnce(input, sut => sut.flatMap(() => [1, 2]));
      });

      it1('groupBy()', (input) => {
        testIteratedOnce(input, sut => sut.groupBy(() => 1,));
      });

      it1('groupJoin()', (input) => {
        testIteratedOnce(input, sut => sut.groupJoin([1], () => 1, () => 1));
      });

      it1('innerJoin()', (input) => {
        testIteratedOnce(input, sut => sut.innerJoin([1], () => 1, () => 1, () => 1));
      });

      it1('ifEmpty()', (input) => {
        testIteratedOnce(input, sut => sut.ifEmpty(1));
      });

      it1('insert()', (input) => {
        testIteratedOnce(input, sut => sut.insert(1));
      });

      it1('insertBefore()', (input) => {
        testIteratedOnce(input, sut => sut.insertBefore(() => true));
      });

      it1('insertAfter()', (input) => {
        testIteratedOnce(input, sut => sut.insertAfter(() => true));
      });

      it1('intersect()', (input) => {
        testIteratedOnce(input, sut => sut.intersect([1]));
      });

      it1('intersperse()', (input) => {
        testIteratedOnce(input, sut => sut.intersperse(','));
      });

      it1('map()', (input) => {
        testIteratedOnce(input, sut => sut.map(() => 1));
      });

      it1('ofType()', (input) => {
        testIteratedOnce(input, sut => sut.ofType(Number));
      });

      it1('prepend()', (input) => {
        testIteratedOnce(input, sut => sut.prepend([1]));
      });

      it1('push()', (input) => {
        testIteratedOnce(input, sut => sut.push(1));
      });

      it1('remove()', (input) => {
        testIteratedOnce(input, sut => sut.remove([1]));
      });

      it1('removeAll()', (input) => {
        testIteratedOnce(input, sut => sut.removeAll([1]));
      });

      it1('removeFalsy()', (input) => {
        testIteratedOnce(input, sut => sut.removeFalsy());
      });

      it1('removeNulls()', (input) => {
        testIteratedOnce(input, sut => sut.removeNulls());
      });

      it1('repeat()', (input) => {
        testIteratedOnce(input, sut => sut.repeat(2));
      });

      it1('reverse()', (input) => {
        testIteratedOnce(input, sut => sut.reverse());
      });

      it1('skip()', (input) => {
        testIteratedOnce(input, sut => sut.skip(2));
      });

      it1('skipFirst()', (input) => {
        testIteratedOnce(input, sut => sut.skipFirst());
      });

      it1('skipLast()', (input) => {
        testIteratedOnce(input, sut => sut.skipLast());
      });

      it1('skipWhile()', (input) => {
        testIteratedOnce(input, sut => sut.skipWhile(() => false));
      });

      it1('slice()', (input) => {
        testIteratedOnce(input, sut => sut.slice(0, 2));
      });

      it1('sort()', (input) => {
        testIteratedOnce(input, sut => sut.sort());
      });

      it1('sortBy()', (input) => {
        testIteratedOnce(input, sut => sut.sortBy(x => x));
      });

      it1('sorted()', (input) => {
        testIteratedOnce(input, sut => sut.sorted());
      });

      it1('split()', (input) => {
        testIteratedOnce(input, sut => sut.split(x => x));
      });

      it1('splitAt()', (input) => {
        testIteratedOnce(input, sut => sut.splitAt(2));
      });

      it1('take()', (input) => {
        testIteratedOnce(input, sut => sut.take(2));
      });

      it1('takeLast()', (input) => {
        testIteratedOnce(input, sut => sut.takeLast(2));
      });

      it1('takeWhile()', (input) => {
        testIteratedOnce(input, sut => sut.takeWhile(() => true));
      });

      it1('takeOnly()', (input) => {
        testIteratedOnce(input, sut => sut.takeOnly([1], x => x));
      });

      it1('tap()', (input) => {
        testIteratedOnce(input, sut => sut.tap(x => x));
      });

      it1('union()', (input) => {
        testIteratedOnce(input, sut => sut.union([1]));
      });

      it1('unshift()', (input) => {
        testIteratedOnce(input, sut => sut.unshift(1));
      });

      it1('zip()', (input) => {
        testIteratedOnce(input, sut => sut.zip([1]));
      });

      it1('zipAll()', (input) => {
        testIteratedOnce(input, sut => sut.zipAll([1]));
      });

      it1('zipWithIndex()', (input) => {
        testIteratedOnce(input, sut => sut.zipWithIndex());
      });
    });
  });
}
