import {Seq} from "../../lib";
import {assert} from "chai";

export abstract class SeqBase_Deferred_GetIterator_Tests {
  readonly run = () => describe('SeqBase - Deferred functionality should not perform immediate execution', () => {
    const testGetIterator = (onSeq: (seq: Seq<any>) => void) => {
      const iterable = {
        getIteratorWasCalled: false,
        [Symbol.iterator](): Iterator<any> {
          this.getIteratorWasCalled = true;
          return [0][Symbol.iterator]();
        }
      };
      const seq = this.createSut(iterable);
      onSeq(seq);
      assert.isFalse(iterable.getIteratorWasCalled);
    };

    describe('as()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.as<number>());
      });
    });

    describe('append()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.append(1));
      });
    });

    describe('cache()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.cache());
      });
    });

    describe('chunk()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.chunk(2));
      });
    });

    describe('concat()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.concat$([2]));
      });
    });

    describe('diffDistinct()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.diffDistinct([2]));
      });
    });

    describe('diff()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.diff([2]));
      });
    });

    describe('distinct()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.distinct());
      });
    });

    describe('entries()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.entries());
      });
    });

    describe('filter()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.filter(() => true));
      });
    });

    describe('flat()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.flat(5));
      });
    });

    describe('flatMap()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.flatMap(() => [1, 2]));
      });
    });

    describe('groupBy()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.groupBy(() => 1,));
      });
    });

    describe('groupJoin()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.groupJoin([1], () => 1, () => 1));
      });
    });

    describe('innerJoin()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.innerJoin([1], () => 1, () => 1, () => 1));
      });
    });

    describe('ifEmpty()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.ifEmpty(1));
      });
    });

    describe('insert()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.insert(1));
      });
    });

    describe('insertBefore()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.insertBefore(() => true));
      });
    });

    describe('insertAfter()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.insertAfter(() => true));
      });
    });

    describe('intersect()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.intersect([1]));
      });
    });

    describe('intersperse()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.intersperse(','));
      });
    });

    describe('map()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.map(() => 1));
      });
    });

    describe('ofType()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.ofType(Number));
      });
    });

    // describe('orderBy()', () => {
    //   it('should not get iterator', function () {
    //     testGetIterator(sut => sut.orderBy(x => x));
    //   });
    // });

    // describe('orderByDescending()', () => {
    //   it('should not get iterator', function () {
    //     testGetIterator(sut => sut.orderByDescending(x => x));
    //   });
    // });

    describe('prepend()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.prepend([1]));
      });
    });

    describe('push()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.push(1));
      });
    });

    describe('remove()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.remove([1]));
      });
    });

    describe('removeAll()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.removeAll([1]));
      });
    });

    describe('removeFalsy()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.removeFalsy());
      });
    });

    describe('removeNulls()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.removeNulls());
      });
    });

    describe('repeat()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.repeat(2));
      });
    });

    describe('reverse()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.reverse());
      });
    });

    describe('skip()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.skip(2));
      });
    });

    describe('skipFirst()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.skipFirst());
      });
    });

    describe('skipLast()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.skipLast());
      });
    });

    describe('skipWhile()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.skipWhile(() => false));
      });
    });

    describe('slice()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.slice(0, 2));
      });
    });

    describe('sort()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.sort());
      });
    });

    describe('sortBy()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.sortBy(x => x));
      });
    });

    describe('sorted()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.sorted());
      });
    });

    describe('split()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.split(2));
      });
    });

    describe('take()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.take(2));
      });
    });

    describe('takeLast()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.takeLast(2));
      });
    });

    describe('takeWhile()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.takeWhile(() => true));
      });
    });

    describe('takeOnly()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.takeOnly([1], x => x));
      });
    });

    describe('tap()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.tap(x => x));
      });
    });

    describe('union()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.union([1]));
      });
    });

    describe('zip()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.zip([1]));
      });
    });

    describe('zipAll()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.zipAll([1]));
      });
    });

    describe('zipWithIndex()', () => {
      it('should not get iterator', function () {
        testGetIterator(sut => sut.zipWithIndex());
      });
    });

  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}
