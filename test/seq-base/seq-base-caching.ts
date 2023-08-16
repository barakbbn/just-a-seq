import {Seq} from "../../lib";
import {assert} from "chai";
import {describe, it} from "mocha";
import {array, TestableArray} from "../test-data";
import {TestIt, typeOf} from "../test-harness";
import {SeqTags} from '../../lib/common';

export abstract class SeqBase_CachedSeq_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - cache()', () => {
    const it1 = (title: string, testFn: (input: Iterable<any> & { getIteratorCount: number; }) => void) => {
      const source = array.oneToTen;
      const iterable = {
        getIteratorCount: 0,
        * [Symbol.iterator](): Iterator<any> {
          this.getIteratorCount++;
          yield* source;
        }
      };
      const testableArray = new TestableArray(...source);
      const seq = this.createSut(source) as Seq<number> & { getIteratorCount: number; };
      seq.getIteratorCount = 0;
      const prevIteratorFn = seq[Symbol.iterator].bind(seq);
      seq[Symbol.iterator] = function (): Iterator<number> {
        seq.getIteratorCount++;
        return prevIteratorFn();
      };
      if (SeqTags.cacheable(seq)) {
        const arrayPropertyName = typeOf(seq).array;
        const prevArrayGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(seq), arrayPropertyName)?.get?.bind(seq);
        assert(prevArrayGetter);
        Object.defineProperty(seq, arrayPropertyName, {
          get(): any {
            seq.getIteratorCount++;
            return prevArrayGetter();
          }
        });
      }

      it(title + ' - array source', () => testFn(testableArray));
      it(title + ' - iterable source', () => testFn(iterable));
      it(title + ' - sequence source', () => testFn(seq));
    };
    const test = (input: Iterable<any> & { getIteratorCount: number; }, onSeq: (seq: Seq<any>) => any) => {
      function tryIterate(maybeIterable?: any): boolean {
        if (typeof maybeIterable !== 'object' || typeof maybeIterable[Symbol.iterator] !== 'function') return false;
        for (const item of maybeIterable) {
          if (!tryIterate(item)) return true;
        }
        return false;
      }

      const seq = this.createSut(input).cache();
      let maybeIterable = onSeq(seq);
      tryIterate(maybeIterable);
      maybeIterable = onSeq(seq);
      tryIterate(maybeIterable);
      assert.strictEqual(input.getIteratorCount, 1);
    };
    this.it1('should return itself if calling cache again', array.oneToTen, input => {
      const expected = this.createSut(input).cache();
      const actual = expected.cache();

      assert.strictEqual(actual, expected);
    });

    describe('should cache items also when further chained with other operations', () => {
      it1('as()', (input) => test(input, sut => sut.as<number>()));

      it1('append()', (input) => test(input, sut => sut.append(1)));

      it1('cache()', (input) => test(input, sut => sut.cache()));

      it1('chunk()', (input) => test(input, sut => sut.chunk(2)));

      it1('concat()', (input) => test(input, sut => sut.concat([2])));

      it1('concat$()', (input) => test(input, sut => sut.concat$([2])));

      it1('diffDistinct()', (input) => test(input, sut => sut.diffDistinct([2])));

      it1('diff()', (input) => test(input, sut => sut.diff([2])));

      it1('distinct()', (input) => test(input, sut => sut.distinct()));

      it1('distinctUntilChanged()', (input) => test(input, sut => sut.distinctUntilChanged()));

      it1('entries()', (input) => test(input, sut => sut.entries()));

      it1('filter()', (input) => test(input, sut => sut.filter(() => true)));

      it1('flat()', (input) => test(input, sut => sut.flat(5)));

      it1('flatMap()', (input) => test(input, sut => sut.flatMap(() => [1, 2])));

      it1('groupBy()', (input) => test(input, sut => sut.groupBy(() => 1,)));

      it1('groupJoin()', (input) => test(input, sut => sut.groupJoin([1], () => 1, () => 1)));

      it1('innerJoin()', (input) => test(input, sut => sut.innerJoin([1], () => 1, () => 1, () => 1)));

      it1('ifEmpty()', (input) => test(input, sut => sut.ifEmpty(1)));

      it1('insert()', (input) => test(input, sut => sut.insert(1)));

      it1('insertAfter()', (input) => test(input, sut => sut.insertAfter(() => true)));

      it1('insertBefore()', (input) => test(input, sut => sut.insertBefore(() => true)));

      it1('interleave()', (input) => test(input, sut => sut.interleave([1])));

      it1('intersect()', (input) => test(input, sut => sut.intersect([1])));

      it1('intersperse()', (input) => test(input, sut => sut.intersperse(',')));

      it1('intersperseBy()', (input) => test(input, sut => sut.intersperseBy(() => ',')));

      it1('map()', (input) => test(input, sut => sut.map(() => 1)));

      it1('move()', (input) => test(input, sut => sut.move(0, 1, 2)));

      it1('ofType()', (input) => test(input, sut => sut.ofType(Number)));

      it1('padEnd()', (input) => test(input, sut => sut.padEnd(3, 0)));

      it1('padStart()', (input) => test(input, sut => sut.padStart(3, -1)));

      it1('prepend()', (input) => test(input, sut => sut.prepend([1])));

      it1('push()', (input) => test(input, sut => sut.push(1)));

      it1('remove()', (input) => test(input, sut => sut.remove([1])));

      it1('removeAll()', (input) => test(input, sut => sut.removeAll([1])));

      it1('removeFalsy()', (input) => test(input, sut => sut.removeFalsy()));

      it1('removeNulls()', (input) => test(input, sut => sut.removeNulls()));

      it1('repeat()', (input) => test(input, sut => sut.repeat(2)));

      it1('reverse()', (input) => test(input, sut => sut.reverse()));

      it1('scan()', (input) => test(input, sut => sut.scan((prev, curr) => prev + curr)));

      it1('skip()', (input) => test(input, sut => sut.skip(2)));

      it1('skipFirst()', (input) => test(input, sut => sut.skipFirst()));

      it1('skipLast()', (input) => test(input, sut => sut.skipLast()));

      it1('skipWhile()', (input) => test(input, sut => sut.skipWhile(() => false)));

      it1('slice()', (input) => test(input, sut => sut.slice(0, 2)));

      it1('sort()', (input) => test(input, sut => sut.sort()));

      it1('sortBy()', (input) => test(input, sut => sut.sortBy(x => x)));

      it1('sorted()', (input) => test(input, sut => sut.sorted()));

      it1('splice()', (input) => test(input, sut => sut.splice(2, 2, -1)));

      it1('split()', (input) => test(input, sut => sut.split(x => x)));

      it1('splitAt()', (input) => test(input, sut => sut.splitAt(2)));

      it1('take()', (input) => test(input, sut => sut.take(2)));

      it1('takeBy()', (input) => test(input, sut => sut.takeBy([1], x => x)));

      it1('takeLast()', (input) => test(input, sut => sut.takeLast(2)));

      it1('takeWhile()', (input) => test(input, sut => sut.takeWhile(() => true)));

      it1('takeOnly()', (input) => test(input, sut => sut.takeOnly([1], x => x)));

      it1('tap()', (input) => test(input, sut => sut.tap(x => x)));

      it1('traverseBreadthFirst()', (input) => test(input, sut => sut.traverseBreadthFirst((x, parent, depth) => depth < 3? [x]: [])));

      it1('traverseDepthFirst()', (input) => test(input, sut => sut.traverseDepthFirst((x, parent, depth) => depth < 3? [x]: [])));

      it1('union()', (input) => test(input, sut => sut.union([1])));

      it1('unshift()', (input) => test(input, sut => sut.unshift(1)));

      it1('window()', (input) => test(input, sut => sut.window(1)));

      it1('with()', (input) => test(input, sut => sut.with(1, 2)));

      it1('zip()', (input) => test(input, sut => sut.zip([1])));

      it1('zipAll()', (input) => test(input, sut => sut.zipAll([1])));

      it1('zipWithIndex()', (input) => test(input, sut => sut.zipWithIndex()));
    });
  });
}
