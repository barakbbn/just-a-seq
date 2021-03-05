import {SeqBase} from "../../lib/seq-base";
import {describe} from "mocha";
import {Seq} from "../../lib";
import {assert} from "chai";
import {array} from "../test-data";

export abstract class SeqBase_Close_Iterator_Tests {
  readonly run = () => describe('SeqBase - Close Iterator', () => {
    const test = <T>(title: string, source: T[], onSeq: (seq: Seq<T>) => any) => {
      it(`${title} should close source iterator`, () => {
        const closeable = {
          closed: 0,
          iterated: false,
          [Symbol.iterator]() {
            const self = this;
            return new class Iterator2 implements Iterator<T> {
              iterator: Iterator<T>;
              return(value?: any): IteratorReturnResult<any> {
                self.closed++;
                if( typeof this.iterator?.return === 'function') this.iterator?.return?.(value);
                return {done: true, value};
              }
              next():IteratorResult<T>{
                if(self.closed) return {done: true, value: undefined};
                if(!this.iterator) this.iterator=source[Symbol.iterator]();
                self.iterated = true;
                const {value, done} = this.iterator.next();
                return done? this.return(value): {value};
              }
            };
          }
        }
        const seq = this.createSut(closeable);
        const maybeIterable = onSeq(seq);
        if (maybeIterable && typeof maybeIterable[Symbol.iterator] === 'function') {
          // noinspection LoopStatementThatDoesntLoopJS
          for (const _ of maybeIterable) {
            break;
          }
        }
        assert.isTrue(!closeable.iterated || closeable.closed > 0);
        if (closeable.closed > 1) it.skip(`${title} closed iterator ${closeable.closed} times`, () => {
        });
      });
    };

    test('all()', array.oneToTen, seq => seq.all(n => n > 5));
    test('any()', array.oneToTen, seq => seq.any(n => n > 5));
    test('at()', array.oneToTen, seq => seq.at(-1));
    test('average()', array.oneToTen, seq => seq.average());
    test('append()', array.oneToTen, seq => seq.append(-1));
    test('chunk()', array.oneToTen, seq => seq.chunk(5));
    test('concat()', array.oneToTen, seq => seq.concat(array.tenZeros));
    test('consume()', array.oneToTen, seq => seq.consume());
    test('count()', array.oneToTen, seq => seq.count(n => n > 5));
    test('diffDistinct()', array.zeroToNine, seq => seq.diffDistinct(array.oneToTen));
    test('diff()', array.zeroToNine, seq => seq.diff(array.oneToTen));
    test('distinct()', array.tenOnes, seq => seq.distinct());
    test('endsWith()', array.oneToTen, seq => seq.endsWith([9, 10]));
    test('entries()', array.oneToTen, seq => seq.entries());
    test('filter()', array.oneToTen, seq => seq.filter(() => true));
    test('find()', array.oneToTen, seq => seq.find(n => n > 5));
    test('findIndex()', array.oneToTen, seq => seq.findIndex(n => n > 5));
    test('findLastIndex()', array.oneToTen, seq => seq.findLastIndex(n => n > 5));
    test('findLast()', array.oneToTen, seq => seq.findLast(n => n > 5));
    test('first()', array.oneToTen, seq => seq.first(-1));
    test('firstAndRest()', array.oneToTen, seq => seq.firstAndRest(-1)[1]);
    test('flat()', array.strings, seq => seq.flat(3));
    test('flatMap()', array.folders, seq => seq.flatMap(f => f.subFolders));
    test('forEach()', array.oneToTen, seq => seq.forEach(n => n));
    test('groupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3));
    test('groupJoin()', array.oneToTen, seq => seq.groupJoin(array.tenOnes, n => n, n => n));
    test('groupJoinRight()', array.oneToTen, seq => seq.groupJoinRight(array.tenOnes, n => n, n => n));
    test('hasAtLeast()', array.oneToTen, seq => seq.hasAtLeast(9));
    test('ifEmpty()', array.oneToTen, seq => seq.ifEmpty(1));
    test('includes()', array.oneToTen, seq => seq.includes(5));
    test('includesAll()', array.zeroToTen, seq => seq.includesAll(array.oneToTen));
    test('includesAny()', array.oneToTen, seq => seq.includesAny([5,9]));
    test('includesSubSequence()', array.zeroToTen, seq => seq.includesSubSequence(array.oneToTen));
    test('indexOf()', array.oneToTen, seq => seq.indexOf(5));
    test('indexOfSubSequence()', array.zeroToTen, seq => seq.indexOfSubSequence(array.oneToTen));
    test('innerJoin()', array.oneToTen, seq => seq.innerJoin(array.oneToTen, n => n, n => n));
    test('insert()', array.oneToTen, seq => seq.insert(0, array.oneToTen));
    test('insertAfter()', array.oneToTen, seq => seq.insertAfter(n => n > 5, array.oneToTen));
    test('insertBefore()', array.oneToTen, seq => seq.insertBefore(n => n > 5, array.oneToTen));
    test('intersect()', array.oneToTen, seq => seq.intersect(array.oneToTen));
    test('intersperse()', array.oneToTen, seq => seq.intersperse(','));
    test('isEmpty()', array.oneToTen, seq => seq.isEmpty());
    test('join()', array.oneToTen, seq => seq.join());
    test('last()', array.oneToTen, seq => seq.last());
    test('lastIndexOf()', array.oneToTen, seq => seq.lastIndexOf(-1));
    test('map()', array.oneToTen, seq => seq.map(n => n - n));
    test('max()', array.oneToTen, seq => seq.max());
    test('min()', array.oneToTen, seq => seq.min());
    test('orderBy()', array.oneToTen, seq => seq.orderBy(n => n, (a, b) => b - a));
    test('orderByDescending()', array.oneToTen, seq => seq.orderByDescending(n => n, (a, b) => b - a));
    test('prepend()', array.oneToTen, seq => seq.prepend(0, -1, -2));
    test('reduce()', array.oneToTen, seq => seq.reduce((prev, curr) => prev + curr));
    test('reduceRight()', array.oneToTen, seq => seq.reduceRight((prev, curr) => prev + curr));
    test('remove()', array.oneToTen, seq => seq.remove([0]));
    test('removeAll()', array.oneToTen, seq => seq.removeAll([0]));
    test('removeFalsy()', array.zeroToTen, seq => seq.removeFalsy());
    test('removeNulls()', array.zeroToTen, seq => seq.removeNulls());
    test('repeat()', array.zeroToTen, seq => seq.repeat(1));
    test('reverse()', array.zeroToTen, seq => seq.reverse());
    test('sameItems()', array.zeroToTen, seq => seq.sameItems(array.zeroToTen));
    test('sameOrderedItems()', array.zeroToTen, seq => seq.sameOrderedItems(array.zeroToTen));
    test('skip()', array.zeroToTen, seq => seq.skip(1));
    test('skipFirst()', array.zeroToTen, seq => seq.skipFirst());
    test('skipLast()', array.zeroToTen, seq => seq.skipLast());
    test('skipWhile()', array.zeroToTen, seq => seq.skipWhile(() => true));
    test('slice()', array.zeroToTen, seq => seq.slice(0, 5));
    test('sort()', array.zeroToTen, seq => seq.sort());
    test('sorted()', array.zeroToTen, seq => seq.sorted());
    test('split()', array.zeroToTen, seq => seq.split(4).reduce((a, b) => [...a, ...b], [1]));
    test('startsWith()', array.zeroToTen, seq => seq.startsWith(array.zeroToTen));
    test('sum()', array.zeroToTen, seq => seq.sum());
    test('take()', array.zeroToTen, seq => seq.take(10));
    test('takeLast()', array.zeroToTen, seq => seq.takeLast(10));
    test('takeWhile()', array.zeroToTen, seq => seq.takeWhile(() => true));
    test('takeOnly()', array.zeroToTen, seq => seq.takeOnly(array.zeroToTen, n => n));
    test('tap()', array.zeroToTen, seq => seq.tap(n => n));
    test('toArray()', array.zeroToTen, seq => seq.toArray());
    test('toMap()', array.zeroToTen, seq => seq.toMap(n => n % 3));
    test('toSet()', array.zeroToTen, seq => seq.toSet());
    test('union()', array.oneToTen, seq => seq.union(array.zeroToNine));
    test('zip()', array.oneToTen, seq => seq.zip(array.zeroToNine));
    test('zipAll()', array.oneToTen, seq => seq.zipAll(array.zeroToTen));
    test('zipWithIndex()', array.oneToTen, seq => seq.zipWithIndex());
  });

  protected abstract createSut<T>(input?: Iterable<T>): SeqBase<T>;

}
