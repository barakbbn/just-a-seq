import {describe, it} from "mocha";
import {SortedSeqImpl} from "../lib/sorted-seq";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {SeqTags, TaggedSeq} from "../lib/common";
import {array, generator, iterables, Sample} from "./test-data";
import {assert} from "chai";
import {SeqBase_Deferred_Change_Source_Tests} from "./seq-base/seq-base-deferred-change-source";
import {DONT_COMPARE} from "../lib/sort-util";
import {SeqBase_Immediate_Change_Source_Tests} from "./seq-base/seq-base-immediate-change-source";
import {TestIt} from './test-harness';

function createSut<T>(optimized: boolean) {
  return <T>(input?: Iterable<T>, comparer: (a: T, b: T) => number = DONT_COMPARE): SortedSeqImpl<T> => {
    const seq = SortedSeqImpl.create(input ?? [], undefined, comparer);
    if (optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  };
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

class SortedSeqImpl_Deferred_Change_Source_Tests extends SeqBase_Deferred_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class SortedSeqImpl_Immediate_Change_Source_Tests extends SeqBase_Immediate_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

export class SortedSeqImpl_Tests extends TestIt {
  protected createSut = createSut(this.optimized);

  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SortedSeqImpl', () => {
    new SortedSeqImpl_Deferred_GetIterator_Tests(this.optimized).run();
    new SortedSeqImpl_Deferred_Tests(this.optimized).run();
    new SortedSeqImpl_Immediate_Tests(this.optimized).run();
    new SortedSeqImpl_SortedSeq_Tests(this.optimized).run();
    new SortedSeqImpl_CachedSeq_Tests(this.optimized).run();
    new SortedSeqImpl_Grouping_Tests(this.optimized).run();
    new SortedSeqImpl_Deferred_Change_Source_Tests(this.optimized).run();
    new SortedSeqImpl_Immediate_Change_Source_Tests(this.optimized).run();

    describe("at()", () => {
      this.it1("Return an item at expected index", array.zeroToNine, (input, inputArray) => {
        const expected = inputArray.slice().reverse();
        const sut = this.createReverseSut(input);
        expected.forEach((exp, index) => {
          let actual = sut.at(index);
          assert.strictEqual(actual, exp);
        });
      });

      this.it1("Return default value at non-existing index", array.zeroToNine, (input, inputArray) => {
        const sut = this.createReverseSut(input);
        const expectedValueNotInSequence = -1;
        const outOfRangeIndex = inputArray.length + 2;
        let actual = sut.at(outOfRangeIndex, expectedValueNotInSequence);

        assert.strictEqual(actual, expectedValueNotInSequence);

        const negativeIndex = -outOfRangeIndex;
        actual = sut.at(negativeIndex, expectedValueNotInSequence);

        assert.strictEqual(actual, expectedValueNotInSequence);
      });

      this.it1("Return undefined at non-existing index when no default value specified", array.zeroToNine, (input, inputArray) => {
        const sut = this.createReverseSut(input);

        const outOfRangeIndex = inputArray.length;
        let actual = sut.at(outOfRangeIndex);

        assert.isUndefined(actual);

        const negativeIndex = -outOfRangeIndex - 2;

        actual = sut.at(negativeIndex);
        assert.isUndefined(actual);
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
        this.it1("should return false if sequence doesn't end with all the specified items", array.oneToTen, input => {
          const endsWith = [...generator.range(1, -10)];
          let sut = this.createReverseSut(input);
          let actual = sut.endsWith(endsWith);
          assert.isFalse(actual);
        });

        this.it1('should return true if sequence ends with the specified items in same order', array.oneToTen, input => {
          const endsWith = array.oneToTen.reverse().slice(-5);
          let sut = this.createReverseSut(input);
          let actual = sut.endsWith(endsWith);
          assert.isTrue(actual);
        });

        this.it1('should return false if sequence ends with the specified items but NOT in same order', array.oneToTen, (input, inputArray) => {
          const endsWith = inputArray.slice(5).reverse();
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith);
          assert.isFalse(actual);

          actual = sut.endsWith(generator.from(endsWith));
          assert.isFalse(actual);
        });

        this.it1('should return true if items to check for is an empty sequence', array.oneToTen, (input) => {
          let emptyItems: number[] = [];

          const sut = this.createReverseSut(input);
          const actual = sut.endsWith(emptyItems);
          assert.isTrue(actual);
        });

        this.it1('should return true if sequence is checked with itself', array.oneToTen, input => {

          const sut = this.createReverseSut(input);
          let actual = sut.endsWith(sut);
          assert.isTrue(actual);
        });
      });

      describe("with key selector", () => {
        this.it1("should return false if sequence doesn't end with all the specified items", array.gradesFiftyAndAbove.reverse(), input => {
          const endsWith = array.gradesFiftyAndBelow;
          const sut = this.createSut(input, (a, b) => b.grade - a.grade);
          const actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
        });

        this.it2('should return true if sequence ends with the specified items in same order',
          array.grades,
          array.gradesFiftyAndBelow.sort((a, b) => b.grade - a.grade),
          (input, endsWith) => {
            const sut = this.createSut(input, (a, b) => b.grade - a.grade);
            const actual = sut.endsWith(endsWith, x => x.grade);
            assert.isTrue(actual);
          });

        this.it2('should return false if sequence ends with the specified items but NOT in same order',
          array.grades,
          array.gradesFiftyAndAbove,
          (input, endsWith) => {

            const sut = this.createSut(input, (a, b) => b.grade - a.grade);
            const actual = sut.endsWith(endsWith, x => x.grade);
            assert.isFalse(actual);
          });

        this.it1('should return true if items to check for is an empty sequence', array.samples, input => {
          let emptyItems: Sample[] = [];
          const sut = this.createSut(input);
          const actual = sut.endsWith(emptyItems);
          assert.isTrue(actual);
        });

        this.it1('should return true if sequence is checked with itself', array.grades, input => {
          const sut = this.createSut(input, (a, b) => b.grade - a.grade);
          const actual = sut.endsWith(sut, x => x.grade);
          assert.isTrue(actual);
        });

      });
    });

    describe('takeLast()', () => {
      this.it1('should return last item after sorting', array.oneToTen, input => {
        const expected = [...input].slice(0, 1);
        const sut = this.createSut(input, (a, b) => b - a);
        const last = sut.takeLast(1);
        const actual = [...last];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('thenSortBy()', () => {
      this.it1('should sort only by thenSortBy(comparer) when no comparer provided on creation', [1, 11, 2, 22, 3, 333, 4, 4444], (input, inputArray) => {
        const expected = inputArray.slice().sort((a, b) => b - a); // descending using comparer
        const sut = this.createSut(input).thenSortBy(x => -x); // descending using selector
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });
    });
  });

  protected createReverseSut<T>(input: Iterable<T> = [], comparer?: (a: T, b: T) => number) {
    const seq = SortedSeqImpl.create(input, undefined, comparer, true);
    if (this.optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}

