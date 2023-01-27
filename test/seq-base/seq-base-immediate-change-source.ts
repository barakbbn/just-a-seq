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

export abstract class SeqBase_Immediate_Change_Source_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Change source', () => {
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
        let actualEmpty = testHarness.materialize(emptySut);
        assert.deepEqual(actualEmpty, testHarness.expected.empty);

        testHarness.makeShort(mutableInput);
        const shorterSut = onSeq(sut);
        const actualShorter = testHarness.materialize(shorterSut);
        assert.deepEqual(actualShorter, testHarness.expected.shorter);

        testHarness.makeEmpty(mutableInput);
        emptySut = onSeq(sut);
        actualEmpty = testHarness.materialize(emptySut);
        assert.deepEqual(actualEmpty, testHarness.expected.empty);

        testHarness.makeLong(mutableInput);
        const longerSut = onSeq(sut);
        const actualLonger = testHarness.materialize(longerSut);
        assert.deepEqual(actualLonger, testHarness.expected.longer);
      };

      describe(title + ' - With Non Empty Source', () => {
        it(' - array source', () => {
          const input = source.slice();
          withNonEmptySource(input, input);
        });

        it(' - generator source', () => {
          const input = source.slice();
          withNonEmptySource(input, generator.from(input));
        });

        it(' - sequence source', () => {
          const input = source.slice();
          withNonEmptySource(input, this.createSut(input));
        });
      });

      describe(title + ' - With Initially Empty Source', () => {
        it(' - array source', () => {
          const input = source.slice();
          withInitiallyEmptySource(input, input);
        });

        it(' - generator source', () => {
          const input = source.slice();
          withInitiallyEmptySource(input, generator.from(input));
        });

        it(' - sequence source', () => {
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

    test('all()', array.oneToTen, seq => seq.all(n => n > 5));
    test('any()', array.oneToTen, seq => seq.any(n => n > 5));
    test('at()', array.oneToTen, seq => seq.at(-1));
    test('average()', array.oneToTen, seq => seq.average());
    test('count(condition)', array.oneToTen, seq => seq.count(n => n > 5));
    test('count()', array.oneToTen, seq => seq.count());
    test2('endsWith()', array.oneToTen, [9, 10], (seq, other) => seq.endsWith(other));
    test('find()', array.oneToTen, seq => seq.find(n => n > 5));
    test('findIndex()', array.oneToTen, seq => seq.findIndex(n => n > 5));
    test('findLastIndex()', array.oneToTen, seq => seq.findLastIndex(n => n > 5));
    test('findLast()', array.oneToTen, seq => seq.findLast(n => n > 5));
    test('first()', array.oneToTen, seq => seq.first(-1));
    test('firstAndRest()', array.oneToTen, seq => seq.firstAndRest(-1)[1]);
    test('forEach()', array.oneToTen, seq => seq.forEach(n => n));
    test('hasAtLeast()', array.oneToTen, seq => seq.hasAtLeast(9));
    test('includes()', array.oneToTen, seq => seq.includes(5));
    test2('includesAll()', array.zeroToTen, array.oneToTen, (seq, other) => seq.includesAll(other));
    test2('includesAny()', array.oneToTen, [5, 9], (seq, other) => seq.includesAny(other));
    test2('includesSubSequence()', array.zeroToTen, array.oneToTen, (seq, other) => seq.includesSubSequence(other));
    test('indexOf()', array.oneToTen, seq => seq.indexOf(5));
    test2('indexOfSubSequence()', array.zeroToTen, array.oneToTen, (seq, other) => seq.indexOfSubSequence(other));
    test('isEmpty()', array.oneToTen, seq => seq.isEmpty());
    test('join()', array.oneToTen, seq => seq.join());
    test('last()', array.oneToTen, seq => seq.last());
    test('lastIndexOf()', array.oneToTen, seq => seq.lastIndexOf(-1));
    test('max()', array.oneToTen, seq => seq.max());
    test('min()', array.oneToTen, seq => seq.min());
    test('reduce()', array.oneToTen, seq => seq.reduce((prev, curr) => prev + curr, 0));
    test('reduceRight()', array.oneToTen, seq => seq.reduceRight((prev, curr) => prev + curr, 0));
    test2('sameItems()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.sameItems(other));
    test2('sameOrderedItems()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.sameOrderedItems(other));
    test2('startsWith()', array.zeroToTen, array.zeroToTen, (seq, other) => seq.startsWith(other));
    test('sum()', array.zeroToTen, seq => seq.sum());
    test('toArray()', array.zeroToTen, seq => seq.toArray());
    test('toMap()', array.zeroToTen, seq => seq.toMap(n => n % 3));
    test('toMapOfOccurrences()', array.zeroToTen, seq => seq.toMapOfOccurrences(n => n % 3));
    test('toSet()', array.zeroToTen, seq => seq.toSet());
  });
}
