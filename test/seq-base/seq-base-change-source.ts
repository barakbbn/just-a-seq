import {SeqBase} from "../../lib/seq-base";
import {describe, it} from "mocha";
import {array, generator} from "../test-data";
import {Seq} from "../../lib";
import {assert} from "chai";
import {TestIt} from "../test-harness";

class TestHarness<T> {
  expected: { longer: any; empty: any; shorter: any };
  private readonly prototype: T[];

  constructor(source: T[] = []) {
    this.prototype = source.slice()
  }

  materialize(value: any): any {
    function isIterable(value: any): value is Iterable<any> {
      return value && typeof value !== 'string' && typeof value[Symbol.iterator] === 'function';
    }

    function* deepToArray(iterable: Iterable<any>): Generator<any> {
      for (const item of iterable) yield isIterable(item)? [...deepToArray(item)]: item;
    }

    return isIterable(value)? [...deepToArray(value)]: value;
  }

  makeShort(source: T[]) {
    source.splice(0, source.length, ...this.prototype.slice(1, -1));
    return source;
  }

  makeLong(source: T[] = []) {
    source.splice(0, source.length, ...[
      ...this.prototype.slice(-3),
      ...this.prototype.slice(1, -1),
      ...this.prototype.slice(0, 3)].reverse());
    return source;
  }

  makeEmpty(source: T[]) {
    return source.splice(0);
  }

  initExpected(createExpected: (seq: Iterable<T>) => any): void {
    if (this.expected) return;
    this.expected = {
      empty: this.materialize(createExpected([])),
      shorter: this.materialize(createExpected(this.makeShort(this.prototype.slice()))),
      longer: this.materialize(createExpected(this.makeLong(this.prototype.slice())))
    };
  }
}

export abstract class SeqBase_Change_Source_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Change source', () => {
    const test = <T>(title: string, source: T[], onSeq: (seq: Seq<T>) => any) => {
      const testHarness = new TestHarness(source)

      const withSource = (input: T[], source: Iterable<T>) => {
        testHarness.initExpected(input => onSeq(this.createSut(input)));

        const sut = this.createSut(source);
        testHarness.materialize(onSeq(sut));

        testHarness.makeEmpty(input);
        const empty = testHarness.materialize(onSeq(sut));
        assert.deepEqual(empty, testHarness.expected.empty);
        testHarness.makeShort(input);
        const shorter = testHarness.materialize(onSeq(sut));
        assert.deepEqual(shorter, testHarness.expected.shorter);
        testHarness.makeEmpty(input);
        const emptyAgain = testHarness.materialize(onSeq(sut));
        assert.deepEqual(emptyAgain, testHarness.expected.empty);
        testHarness.makeLong(input);
        const longer = testHarness.materialize(onSeq(sut));
        assert.deepEqual(longer, testHarness.expected.longer);
      };

      it(title + ' - array source', () => {
        const input = source.slice();
        withSource(input, input);
      });

      it(title + ' - generator source', () => {
        const input = source.slice();
        withSource(input, generator.from(input));
      });

      it(title + ' - sequence source', () => {
        const input = source.slice();
        withSource(input, this.createSut(input));
      });
    };

    const test2 = <T, U>(title: string, first: T[], second: U[], onSeq: (seq: Seq<T>, second: Iterable<U>) => any) => {
      const testHarness = new TestHarness(first)

      const withSource = (input: T[], first: Iterable<T>, second: Iterable<U>) => {
        testHarness.initExpected(input => onSeq(this.createSut(input), second));

        const sut = this.createSut(first);
        testHarness.materialize(onSeq(sut, second));

        testHarness.makeEmpty(input);
        const empty = testHarness.materialize(onSeq(sut, second));
        assert.deepEqual(empty, testHarness.expected.empty);
        testHarness.makeShort(input);
        const shorter = testHarness.materialize(onSeq(sut, second));
        assert.deepEqual(shorter, testHarness.expected.shorter);
        testHarness.makeEmpty(input);
        const emptyAgain = testHarness.materialize(onSeq(sut, second));
        assert.deepEqual(emptyAgain, testHarness.expected.empty);
        testHarness.makeLong(input);
        const longer = testHarness.materialize(onSeq(sut, second));
        assert.deepEqual(longer, testHarness.expected.longer);
      };

      it(title + ' - first array, second array', () => {
        const input = first.slice();
        withSource(input, input, second.slice());
      });

      it(title + ' - first array, second generator', () => {
        const input = first.slice();
        withSource(input, input, generator.from(second));
      });

      it(title + ' - first array, second sequence', () => {
        const input = first.slice();
        withSource(input, input, this.createSut(second));
      });

      it(title + ' - first generator, second array', () => {
        const input = first.slice();
        withSource(input, generator.from(input), second.slice());
      });

      it(title + ' - first generator, second generator', () => {
        const input = first.slice();
        withSource(input, generator.from(input), generator.from(second));
      });

      it(title + ' - first generator, second sequence', () => {
        const input = first.slice();
        withSource(input, generator.from(input), this.createSut(second));
      });

      it(title + ' - first sequence, second array', () => {
        const input = first.slice();
        withSource(input, this.createSut(input), second.slice());
      });

      it(title + ' - first sequence, second generator', () => {
        const input = first.slice();
        withSource(input, this.createSut(input), generator.from(second));
      });

      it(title + ' - first sequence, second sequence', () => {
        const input = first.slice();
        withSource(input, this.createSut(input), this.createSut(second));
      });
    };

    test('all()', array.oneToTen, seq => seq.all(n => n > 5));
    test('any()', array.oneToTen, seq => seq.any(n => n > 5));
    test('at()', array.oneToTen, seq => seq.at(-1));
    test('average()', array.oneToTen, seq => seq.average());
    test('append()', array.oneToTen, seq => seq.append(-1));
    test('chunk()', array.oneToTen, seq => seq.chunkBy(() => {
    }));
    test('chunkBy()', array.oneToTen, seq => seq.chunkBy(() => {
    }));
    test('chunkBySum()', array.oneToTen, seq => seq.chunkByLimit(5));
    test2('concat()', array.oneToTen, array.tenZeros, (seq, other) => seq.concat(other));
    test2('concat$()', array.oneToTen, array.tenZeros, (seq, other) => seq.concat$(other));
    test('count(condition)', array.oneToTen, seq => seq.count(n => n > 5));
    test('count()', array.oneToTen, seq => seq.count());
    test2('diffDistinct()', array.zeroToNine, array.oneToTen, (seq, other) => seq.diffDistinct(other));
    test2('diff()', array.zeroToNine, array.oneToTen, (seq, other) => seq.diff(other));
    test('distinct()', array.tenOnes, seq => seq.distinct());
    test2('endsWith()', array.oneToTen, [9, 10], (seq, other) => seq.endsWith(other));
    test('entries()', array.oneToTen, seq => seq.entries());
    test('filter()', array.oneToTen, seq => seq.filter(n => n % 2));
    test('find()', array.oneToTen, seq => seq.find(n => n > 5));
    test('findIndex()', array.oneToTen, seq => seq.findIndex(n => n > 5));
    test('findLastIndex()', array.oneToTen, seq => seq.findLastIndex(n => n > 5));
    test('findLast()', array.oneToTen, seq => seq.findLast(n => n > 5));
    test('first()', array.oneToTen, seq => seq.first(-1));
    test('firstAndRest()', array.oneToTen, seq => seq.firstAndRest(-1)[1]);
    test('flat()', array.strings, seq => seq.flat(3));
    test('flatMap()', array.folders, seq => seq.flatMap(f => f.subFolders));
    test('flatHierarchy()', array.folders, seq => seq.flatHierarchy(f => f.subFolders, f => f.subFolders, f => f.name));
    test('forEach()', array.oneToTen, seq => seq.forEach(n => n));
    test('groupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3));
    test('groupBy().thenGroupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2));
    test('groupBy().thenGroupBy().ungroup()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroup(g => g.first()));
    test('groupBy().thenGroupBy().aggregate()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).aggregate(g => g.first()));
    test2('groupJoin()', array.oneToTen, array.tenOnes, (seq, other) => seq.groupJoin(other, n => n, n => n));
    test2('groupJoinRight()', array.oneToTen, array.tenOnes, (seq, other) => seq.groupJoinRight(other, n => n, n => n));
    test('hasAtLeast()', array.oneToTen, seq => seq.hasAtLeast(9));
    test('ifEmpty()', array.oneToTen, seq => seq.ifEmpty(1));
    test('includes()', array.oneToTen, seq => seq.includes(5));
    test2('includesAll()', array.zeroToTen, array.oneToTen, (seq, other) => seq.includesAll(other));
    test2('includesAny()', array.oneToTen, [5, 9], (seq, other) => seq.includesAny(other));
    test2('includesSubSequence()', array.zeroToTen, array.oneToTen, (seq, other) => seq.includesSubSequence(other));
    test('indexOf()', array.oneToTen, seq => seq.indexOf(5));
    test2('indexOfSubSequence()', array.zeroToTen, array.oneToTen, (seq, other) => seq.indexOfSubSequence(other));
    test2('innerJoin()', array.oneToTen, array.oneToTen, (seq, other) => seq.innerJoin(other, n => n, n => n));
    test2('insert()', array.oneToTen, array.oneToTen, (seq, other) => seq.insert(0, other));
    test2('insertAfter()', array.oneToTen, array.oneToTen, (seq, other) => seq.insertAfter(n => n > 5, other));
    test2('insertBefore()', array.oneToTen, array.oneToTen, (seq, other) => seq.insertBefore(n => n > 5, other));
    test2('intersect()', array.oneToTen, array.oneToTen, (seq, other) => seq.intersect(other));
    test('intersperse()', array.oneToTen, seq => seq.intersperse(','));
    test('isEmpty()', array.oneToTen, seq => seq.isEmpty());
    test('join()', array.oneToTen, seq => seq.join());
    test('last()', array.oneToTen, seq => seq.last());
    test('lastIndexOf()', array.oneToTen, seq => seq.lastIndexOf(-1));
    test('map()', array.oneToTen, seq => seq.map(n => n - n));
    test('matchBy({matched})', array.oneToTen, seq => seq.matchBy(() => true).matched);
    test('matchBy({unmatched})', array.oneToTen, seq => seq.matchBy(() => false).unmatched);
    test('matchBy({matched+unmatched})', array.oneToTen, seq => {
      const matchResults = seq.matchBy(() => false);
      return matchResults.matched.zip(matchResults.unmatched)
    });
    test('max()', array.oneToTen, seq => seq.max());
    test('min()', array.oneToTen, seq => seq.min());
    test2('prepend()', array.oneToTen, [0, -1, -2], (seq, other) => seq.prepend(other));
    test('reduce()', array.oneToTen, seq => seq.reduce((prev, curr) => prev + curr, 0));
    test('reduceRight()', array.oneToTen, seq => seq.reduceRight((prev, curr) => prev + curr, 0));
    test2('remove()', array.oneToTen, [1, 2], (seq, other) => seq.remove(other));
    test2('removeAll()', array.oneToTen, [1, 2], (seq, other) => seq.removeAll(other));
    test('removeFalsy()', array.zeroToTen, seq => seq.removeFalsy());
    test('removeNulls()', array.zeroToTen, seq => seq.removeNulls());
    test('repeat()', array.zeroToTen, seq => seq.repeat(1));
    test('reverse()', array.zeroToTen, seq => seq.reverse());
    test2('sameItems()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.sameItems(other));
    test2('sameOrderedItems()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.sameOrderedItems(other));
    test('skip()', array.zeroToTen, seq => seq.skip(1));
    test('skipFirst()', array.zeroToTen, seq => seq.skipFirst());
    test('skipLast()', array.zeroToTen, seq => seq.skipLast());
    test('skipWhile()', array.zeroToTen, seq => seq.skipWhile(() => true));
    test('slice()', array.zeroToTen, seq => seq.slice(0, 5));
    test('sort()', array.zeroToTen, seq => seq.sort());
    test('sortBy()', array.zeroToTen, seq => seq.sortBy(x => x));
    test('sorted()', array.zeroToTen, seq => seq.sorted());
    test('split()', array.zeroToTen, seq => seq.split(4).reduce((a, b) => [...a, ...b], [1]));
    test2('startsWith()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.startsWith(other));
    test('sum()', array.zeroToTen, seq => seq.sum());
    test('take()', array.zeroToTen, seq => seq.take(10));
    test('takeLast()', array.zeroToTen, seq => seq.takeLast(10));
    test('takeWhile()', array.zeroToTen, seq => seq.takeWhile(() => true));
    test2('takeOnly()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.takeOnly(other, n => n));
    test('tap()', array.zeroToTen, seq => seq.tap(n => n));
    test('toArray()', array.zeroToTen, seq => seq.toArray());
    test('toMap()', array.zeroToTen, seq => seq.toMap(n => n % 3));
    test('toMapOfOccurrences()', array.zeroToTen, seq => seq.toMapOfOccurrences(n => n % 3));
    test('toSet()', array.zeroToTen, seq => seq.toSet());
    test2('union()', array.oneToTen, array.zeroToNine, (seq, other) => seq.union(other));
    test2('unionRight()', array.oneToTen, array.zeroToNine, (seq, other) => seq.unionRight(other));
    test2('unshift()', array.oneToTen, [0, -1, -2], (seq, other) => seq.unshift(...other));
    test2('zip()', array.oneToTen, array.zeroToNine, (seq, other) => seq.zip(other));
    test2('zipAll()', array.oneToTen, array.zeroToTen, (seq, other) => seq.zipAll(other));
    test('zipWithIndex()', array.oneToTen, seq => seq.zipWithIndex());
  });
}
