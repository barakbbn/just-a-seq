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

export abstract class SeqBase_Deferred_Change_Source_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Deferred - Change source', () => {
    const test = <T>(title: string, source: T[], onSeq: (seq: Seq<T>) => any) => {
      const testHarness = new TestHarness(source)

      const withNonEmptySource = (mutableInput: T[], source: Iterable<T>) => {
        testHarness.initExpected(input => onSeq(this.createSut(input)));

        const sut = this.createSut(source);
        testHarness.materialize(onSeq(sut));

        testHarness.makeEmpty(mutableInput);
        const empty = testHarness.materialize(onSeq(sut));
        assert.deepEqual(empty, testHarness.expected.empty);
        testHarness.makeShort(mutableInput);
        const shorter = testHarness.materialize(onSeq(sut));
        assert.deepEqual(shorter, testHarness.expected.shorter);
        testHarness.makeEmpty(mutableInput);
        const emptyAgain = testHarness.materialize(onSeq(sut));
        assert.deepEqual(emptyAgain, testHarness.expected.empty);
        testHarness.makeLong(mutableInput);
        const longer = testHarness.materialize(onSeq(sut));
        assert.deepEqual(longer, testHarness.expected.longer);
      };

      const withInitiallyEmptySource = (mutableInput: T[], source: Iterable<T>) => {
        testHarness.initExpected(input => onSeq(this.createSut(input)));

        testHarness.makeEmpty(mutableInput);
        const sut = this.createSut(source);

        let emptySut = onSeq(sut);
        testHarness.makeLong(mutableInput);
        let actualLonger = testHarness.materialize(emptySut);
        assert.deepEqual(actualLonger, testHarness.expected.longer);

        testHarness.makeShort(mutableInput);
        const shorterSut = onSeq(sut);
        const actualShorter = testHarness.materialize(shorterSut);
        assert.deepEqual(actualShorter, testHarness.expected.shorter);

        testHarness.makeEmpty(mutableInput);
        emptySut = onSeq(sut);
        const actualEmpty = testHarness.materialize(emptySut);
        assert.deepEqual(actualEmpty, testHarness.expected.empty);

        testHarness.makeLong(mutableInput);
        const longerSut = onSeq(sut);
        actualLonger = testHarness.materialize(longerSut);
        assert.deepEqual(actualLonger, testHarness.expected.longer);
      };

      describe(title + ' - With Non Empty Source', () => {
        it('array source', () => {
          const input = source.slice();
          withNonEmptySource(input, input);
        });

        it('generator source', () => {
          const input = source.slice();
          withNonEmptySource(input, generator.from(input));
        });

        it('sequence source', () => {
          const input = source.slice();
          withNonEmptySource(input, this.createSut(input));
        });
      });

      describe(title + ' - With Initially Empty Source', () => {
        it('array source', () => {
          const input = source.slice();
          withInitiallyEmptySource(input, input);
        });

        it('generator source', () => {
          const input = source.slice();
          withInitiallyEmptySource(input, generator.from(input));
        });

        it('sequence source', () => {
          const input = source.slice();
          withInitiallyEmptySource(input, this.createSut(input));
        });
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

    test('append()', array.oneToTen, seq => seq.append(-1));
    test2('cartesian()', array.oneToTen, array.tenZeros, (seq, other) => seq.cartesian(other));
    test('chunk()', array.oneToTen, seq => seq.chunk(1));
    test('chunkBy()', array.oneToTen, seq => seq.chunkBy(() => ({whatAboutTheItem:'KeepIt', endOfChunk:true })));
    test('chunkBySum()', array.oneToTen, seq => seq.chunkByLimit(5));
    test2('concat()', array.oneToTen, array.tenZeros, (seq, other) => seq.concat(other));
    test2('concat$()', array.oneToTen, array.tenZeros, (seq, other) => seq.concat$(other));
    test2('diffDistinct()', array.zeroToNine, array.oneToTen, (seq, other) => seq.diffDistinct(other));
    test2('diff()', array.zeroToNine, array.oneToTen, (seq, other) => seq.diff(other));
    test('distinct()', array.tenOnes, seq => seq.distinct());
    test('distinctUntilChanged()', array.tenOnes, seq => seq.distinctUntilChanged());
    test('entries()', array.oneToTen, seq => seq.entries());
    test('filter()', array.oneToTen, seq => seq.filter(n => n % 2));
    test('flat()', array.strings, seq => seq.flat(3));
    test('flatMap()', array.folders, seq => seq.flatMap(f => f.subFolders));
    test('flatMap<V1, V2>()', array.folders, seq => seq.flatMap(f => f.subFolders, f => f.subFolders, f => f.name));
    test('groupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3));
    test('groupBy().thenGroupBy()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2));
    test('groupBy().thenGroupBy().ungroup()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroup(g => g.first()));
    test('groupBy().thenGroupBy().ungroupAll()', array.oneToTen, seq => seq.groupBy(n => n % 3).thenGroupBy(n => n % 2).ungroupAll(g => g.first()));
    test2('groupJoin()', array.oneToTen, array.tenOnes, (seq, other) => seq.groupJoin(other, n => n, n => n));
    test2('groupJoinRight()', array.oneToTen, array.tenOnes, (seq, other) => seq.groupJoinRight(other, n => n, n => n));
    test('ifEmpty()', array.oneToTen, seq => seq.ifEmpty(1));
    test2('innerJoin()', array.oneToTen, array.oneToTen, (seq, other) => seq.innerJoin(other, n => n, n => n));
    test2('insert()', array.oneToTen, array.oneToTen, (seq, other) => seq.insert(0, other));
    test2('insertAfter()', array.oneToTen, array.oneToTen, (seq, other) => seq.insertAfter(n => n > 5, other));
    test2('insertBefore()', array.oneToTen, array.oneToTen, (seq, other) => seq.insertBefore(n => n > 5, other));
    test2('interleave()', array.oneToTen, array.oneToTen, (seq, other) => seq.interleave(other));
    test2('intersect()', array.oneToTen, array.oneToTen, (seq, other) => seq.intersect(other));
    test('intersperse()', array.oneToTen, seq => seq.intersperse(','));
    test('intersperseBy()', array.oneToTen, seq => seq.intersperseBy(() => ','));
    test('map()', array.oneToTen, seq => seq.map(n => n - n));
    test('move()', array.oneToTen, seq => seq.move(0,1,2));
    test('padEnd()', array.oneToTen, seq => seq.padEnd(11, 0));
    test('partition({matched})', array.oneToTen, seq => seq.partition(() => true).matched);
    test('partition({unmatched})', array.oneToTen, seq => seq.partition(() => false).unmatched);
    test('partition({matched+unmatched})', array.oneToTen, seq => seq.partition(() => false, (matched, unmatched) => matched.zip(unmatched)));
    test('partitionWhile()', array.zeroToTen, seq => seq.partitionWhile(x => x < 5));
    test('partitionWhile().first', array.zeroToTen, seq => seq.partitionWhile(x => x < 5).first);
    test('partitionWhile().second', array.zeroToTen, seq => seq.partitionWhile(x => x < 5).second);
    test2('prepend()', array.oneToTen, [0, -1, -2], (seq, other) => seq.prepend(other));
    test2('remove()', array.oneToTen, [1, 2], (seq, other) => seq.remove(other));
    test2('removeAll()', array.oneToTen, [1, 2], (seq, other) => seq.removeAll(other));
    test('removeFalsy()', array.zeroToTen, seq => seq.removeFalsy());
    test('removeNulls()', array.zeroToTen, seq => seq.removeNulls());
    test('repeat()', array.zeroToTen, seq => seq.repeat(1));
    test('reverse()', array.zeroToTen, seq => seq.reverse());
    test('scan()', array.zeroToTen, seq => seq.scan((prev, curr) => prev + curr, 0));
    test('skip()', array.zeroToTen, seq => seq.skip(1));
    test('skipFirst()', array.zeroToTen, seq => seq.skipFirst());
    test('skipLast()', array.zeroToTen, seq => seq.skipLast());
    test('skipWhile()', array.zeroToTen, seq => seq.skipWhile(() => true));
    test('slice()', array.zeroToTen, seq => seq.slice(0, 5));
    test('sort()', array.zeroToTen, seq => seq.sort());
    test('sortBy()', array.zeroToTen, seq => seq.sortBy(x => x));
    test('sorted()', array.zeroToTen, seq => seq.sorted());
    test('split()', array.zeroToTen, seq => seq.split(x => x < 5));
    test('splitAt()', array.zeroToTen, seq => seq.splitAt(1));
    test('splitAt().first', array.zeroToTen, seq => seq.splitAt(2).first);
    test('splitAt().second', array.zeroToTen, seq => seq.splitAt(2).second);
    test('take(all)', array.zeroToTen, seq => seq.take(10));
    test('take(more)', array.zeroToTen, seq => seq.take(12));
    test('take(less)', array.zeroToTen, seq => seq.take(2));
    test2('takeBy()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.takeBy(other, n => n));
    test('takeLast()', array.zeroToTen, seq => seq.takeLast(10));
    test('takeWhile()', array.zeroToTen, seq => seq.takeWhile(() => true));
    test2('takeOnly()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.takeOnly(other, n => n));
    test('tap()', array.zeroToTen, seq => seq.tap(n => n));
    test('traverseBreadthFirst()', array.zeroToTen, seq => seq.traverseBreadthFirst((x, parent, depth) => depth < 3? [x]: []));
    test('traverseDepthFirst()', array.zeroToTen, seq => seq.traverseDepthFirst((x, parent, depth) => depth < 3? [x]: []));
    test2('union()', array.oneToTen, array.zeroToNine, (seq, other) => seq.union(other));
    test2('unionRight()', array.oneToTen, array.zeroToNine, (seq, other) => seq.unionRight(other));
    test2('unshift()', array.oneToTen, [0, -1, -2], (seq, other) => seq.unshift(...other));
    test('window()', array.zeroToTen, seq => seq.window(1));
    test2('zip()', array.oneToTen, array.zeroToNine, (seq, other) => seq.zip(other));
    test2('zipAll()', array.oneToTen, array.zeroToTen, (seq, other) => seq.zipAll(other));
    test('zipWithIndex()', array.oneToTen, seq => seq.zipWithIndex());
  });
}
