import {describe, it} from "mocha";
import {SortedSeqImpl} from "../lib/sorted-seq";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {DONT_COMPARE, SeqTags, TaggedSeq} from "../lib/common";
import {array, generator, iterables, Sample} from "./test-data";
import {assert} from "chai";
import {SeqBase_Change_Source_Tests} from "./seq-base/seq-base-change-source";

function createSut<T>(optimized: boolean) {
  return <T>(input: Iterable<T>): SortedSeqImpl<T> => {
    const seq = SortedSeqImpl.create(input ?? [], undefined, DONT_COMPARE);
    if (optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}

class SortedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut(this.optimized);
}

class SortedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut(this.optimized);
}

class SortedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut(this.optimized);
}

class SortedSeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut(this.optimized);
}

class SortedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut(this.optimized);
}

class SortedSeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut(this.optimized);

}

class SortedSeqImpl_Change_Source_Tests extends SeqBase_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

export class SortedSeqImpl_Tests {
  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('SortedSeqImpl', () => {
    new SortedSeqImpl_Deferred_GetIterator_Tests(this.optimized).run();
    new SortedSeqImpl_Deferred_Tests(this.optimized).run();
    new SortedSeqImpl_Immediate_Tests(this.optimized).run();
    new SortedSeqImpl_SortedSeq_Tests(this.optimized).run();
    new SortedSeqImpl_CachedSeq_Tests(this.optimized).run();
    new SortedSeqImpl_Grouping_Tests(this.optimized).run();
    new SortedSeqImpl_Change_Source_Tests(this.optimized).run();

    describe("at()", () => {
      it("Return an item at expected index", () => {
        const input = array.zeroToNine;
        const expected = input.slice().reverse();
        const sut = this.createReverseSut(input);
        const sut2 = this.createReverseSut(generator.from(input));
        expected.forEach((exp, index) => {
          let actual = sut.at(index);
          assert.strictEqual(actual, exp);
          actual = sut2.at(index);
          assert.strictEqual(actual, exp);
        });
      });

      it("Return default value at non-existing index", () => {
        const input = array.zeroToNine;
        const sut = this.createReverseSut(generator.from(input));
        const expectedValueNotInSequence = -1;
        const outOfRangeIndex = input.length + 2;
        let actual = sut.at(outOfRangeIndex, expectedValueNotInSequence);

        assert.strictEqual(actual, expectedValueNotInSequence);

        const negativeIndex = -outOfRangeIndex;
        actual = sut.at(negativeIndex, expectedValueNotInSequence);

        assert.strictEqual(actual, expectedValueNotInSequence);
      });

      it("Return undefined at non-existing index when no default value specified", () => {
        const input = array.zeroToNine;
        const sut = this.createReverseSut(input);
        const sut2 = this.createReverseSut(generator.from(input));

        const outOfRangeIndex = input.length;
        let actual = sut.at(outOfRangeIndex);
        let actual2 = sut2.at(outOfRangeIndex);

        assert.isUndefined(actual);
        assert.isUndefined(actual2);

        const negativeIndex = -outOfRangeIndex - 2;

        actual = sut.at(negativeIndex);
        actual2 = sut2.at(negativeIndex);
        assert.isUndefined(actual);
        assert.isUndefined(actual2);
      });

      it('when index is negative, should return an item from the end of the sequence', () => {
        const input = array.zeroToNine;
        const expected = input.slice().reverse();
        const sut = this.createReverseSut(input);
        const sut2 = this.createReverseSut(generator.from(input));
        expected.forEach((exp, index) => {
          const negativeIndex = -expected.length + index;
          const actual = sut.at(negativeIndex);
          const actual2 = sut2.at(negativeIndex);
          assert.strictEqual(actual, exp);
          assert.strictEqual(actual2, exp);
        });
      });
    });

    describe("endsWith()", () => {
      describe("without key selector", () => {
        it("should return false if sequence doesn't end with all the specified items", () => {
          const input = array.oneToTen;
          const endsWith = [...generator.range(1, -10)];
          let sut = this.createReverseSut(input);
          let sut2 = this.createReverseSut(generator.from(input));
          let actual = sut.endsWith(endsWith);
          let actual2 = sut2.endsWith(endsWith);
          assert.isFalse(actual);
          assert.isFalse(actual2);
        });

        it('should return true if sequence ends with the specified items in same order', () => {
          const input = array.oneToTen;
          const endsWith = array.oneToTen.reverse().slice(-5);
          let sut = this.createReverseSut(input);
          let sut2 = this.createReverseSut(generator.from(input));
          let actual = sut.endsWith(endsWith);
          let actual2 = sut2.endsWith(endsWith);
          assert.isTrue(actual);
          assert.isTrue(actual2);
        });

        it('should return false if sequence ends with the specified items but NOT in same order', () => {
          const input = array.oneToTen;
          const endsWith = input.slice(5).reverse();
          let sut = this.createSut(input);
          let sut2 = this.createSut(generator.from(input));
          let actual = sut.endsWith(endsWith);
          let actual2 = sut2.endsWith(endsWith);
          assert.isFalse(actual);
          assert.isFalse(actual2);

          actual = sut.endsWith(generator.from(endsWith));
          actual2 = sut2.endsWith(generator.from(endsWith));
          assert.isFalse(actual);
          assert.isFalse(actual2);
        });

        it('should return true if items to check for is an empty sequence', () => {
          let emptyItems: number[] = [];

          const sut = this.createReverseSut(array.oneToTen);
          const sut2 = this.createReverseSut(iterables.oneToTen);
          let actual = sut.endsWith(emptyItems);
          let actual2 = sut2.endsWith(emptyItems);
          assert.isTrue(actual);
          assert.isTrue(actual2);

          const emptyGeneratorSut = this.createReverseSut(generator.from(emptyItems));
          actual2 = emptyGeneratorSut.endsWith(emptyItems);
          assert.isTrue(actual2);

          const emptyArraySut = this.createReverseSut(emptyItems);
          actual = emptyArraySut.endsWith(emptyItems);
          assert.isTrue(actual);

          const emptySequenceSut = this.createReverseSut();
          actual = emptySequenceSut.endsWith(emptyItems);
          assert.isTrue(actual);
        });

        it('should return true if sequence is checked with itself', () => {
          const input = array.oneToTen;

          const sut = this.createReverseSut(input);
          const sut2 = this.createReverseSut(generator.from(input));
          let actual = sut.endsWith(sut);
          let actual2 = sut2.endsWith(sut2);
          assert.isTrue(actual);
          assert.isTrue(actual2);

          actual = sut.endsWith(sut2);
          actual2 = sut2.endsWith(sut);
          assert.isTrue(actual);
          assert.isTrue(actual2);
        });
      });

      describe("with key selector", () => {
        it("should return false if sequence doesn't end with all the specified items", () => {
          const input = array.gradesFiftyAndAbove.reverse();
          const endsWith = array.gradesFiftyAndBelow;
          let sut = this.createSut(input, (a, b) => b.grade - a.grade);
          let actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return true if sequence ends with the specified items in same order', () => {
          const input = array.grades;
          const endsWith = array.gradesFiftyAndBelow.sort((a, b) => b.grade - a.grade);
          let sut = this.createSut(input, (a, b) => b.grade - a.grade);
          let actual = sut.endsWith(endsWith, x => x.grade);
          let actual2 = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isTrue(actual);
          assert.isTrue(actual2);

          sut = this.createSut(generator.from(input), (a, b) => b.grade - a.grade);
          actual = sut.endsWith(endsWith, x => x.grade);
          actual2 = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isTrue(actual);
          assert.isTrue(actual2);
        });

        it('should return false if sequence ends with the specified items but NOT in same order', () => {
          const input = array.grades;
          const endsWith = array.gradesFiftyAndAbove;
          let sut = this.createSut(input, (a, b) => b.grade - a.grade);
          let actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input), (a, b) => b.grade - a.grade);
          actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return true if items to check for is an empty sequence', () => {
          let emptyItems: Sample[] = [];
          const input = array.samples;
          let sut = this.createSut(input);
          let actual = sut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = sut.endsWith(generator.from(emptyItems));
          assert.isTrue(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = sut.endsWith(generator.from(emptyItems));
          assert.isTrue(actual);
        });

        it('should return true if sequence is checked with itself', () => {
          const input = array.grades;

          let sut = this.createSut(input, (a, b) => b.grade - a.grade);
          let sut2 = this.createSut(generator.from(input), (a, b) => b.grade - a.grade);
          let actual = sut.endsWith(sut, x => x.grade);
          let actual2 = sut2.endsWith(sut2, x => x.grade);
          assert.isTrue(actual);
          assert.isTrue(actual2);

          actual = sut.endsWith(sut2, x => x.grade);
          actual2 = sut2.endsWith(sut, x => x.grade);
          assert.isTrue(actual);
          assert.isTrue(actual2);
        });

      });
    });

    describe('takeLast()', () => {
      describe('should return last item after sorting', () => testDualInput(array.oneToTen, (input: Iterable<number>) => {
        const expected = [...input].slice(0, 1);
        const sut = this.createSut(input, (a, b) => b - a);
        const last = sut.takeLast(1);
        const actual = [...last];
        assert.sameOrderedMembers(actual, expected);
      }));
    });

    describe('thenSortBy()', () => {
      it('should sort only by thenSortBy(comparer) when no comparer provided on creation', () => {
        const input = [1, 11, 2, 22, 3, 333, 4, 4444];
        const expected = [...input].sort((a, b) => b - a); // descending using comparer
        const sut = this
          .createSut(input, undefined)
          .thenSortBy(x => -x); // descending using selector

        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });
    });
  });

  protected createSut<T>(items: Iterable<T> = [], comparer?: (a: T, b: T) => number) {
    const seq = new SortedSeqImpl(items, comparer);
    if (this.optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }

  protected createReverseSut<T>(input: Iterable<T> = [], comparer?: (a: T, b: T) => number) {
    const seq = SortedSeqImpl.create(input, undefined, comparer, true);
    if (this.optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}

function testDualInput<T>(input: T[], testFn: (input: Iterable<T>) => void) {
  it('array source', () => testFn(input));
  it('generator source', () => testFn(generator.from(input)));
}
