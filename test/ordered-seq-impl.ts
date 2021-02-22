import {describe, it} from "mocha";
import {OrderedSeqImpl} from "../lib/ordered-seq";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Ordering_Tests} from "./seq-base/seq-base-ordering";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {DONT_COMPARE} from "../lib/common";
import {array, generator, iterables, Sample} from "./test-data";
import {assert} from "chai";

function createSut<T>(input: Iterable<T>): OrderedSeqImpl<T> {
  return OrderedSeqImpl.create(input ?? [], undefined, DONT_COMPARE);
}

class OrderedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_OrderedSeq_Tests extends SeqBase_Ordering_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut

}

export class OrderedSeqImpl_Tests {
  readonly run = () => describe('OrderedSeqImpl', () => {
    new OrderedSeqImpl_Deferred_GetIterator_Tests().run();
    new OrderedSeqImpl_Deferred_Tests().run();
    new OrderedSeqImpl_Immediate_Tests().run();
    new OrderedSeqImpl_OrderedSeq_Tests().run();
    new OrderedSeqImpl_CachedSeq_Tests().run();
    new OrderedSeqImpl_Grouping_Tests().run();

    describe("at()", () => {
      it("Return an item at expected index", () => {
        const input = array.zeroToNine;
        const expected = input.slice().reverse();
        const sut = this.createReverseSut(input);
        const sut2 = this.createReverseSut(generator.from(input));
        expected.forEach((exp, index) => {
          let actual = sut.at(index);
          assert.equal(actual, exp);
          actual = sut2.at(index);
          assert.equal(actual, exp);
        });
      });

      it("Return default value at non-existing index", () => {
        const input = array.zeroToNine;
        const sut = this.createReverseSut(generator.from(input));
        const expectedValueNotInSequence = -1;
        const outOfRangeIndex = input.length + 2;
        let actual = sut.at(outOfRangeIndex, expectedValueNotInSequence);

        assert.equal(actual, expectedValueNotInSequence);

        const negativeIndex = -outOfRangeIndex;
        actual = sut.at(negativeIndex, expectedValueNotInSequence);

        assert.equal(actual, expectedValueNotInSequence);
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
          assert.equal(actual, exp);
          assert.equal(actual2, exp);
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
      describe('should return last item after ordering', () => testDualInput(array.oneToTen, (input: Iterable<number>) => {
        const expected = [...input].slice(0, 1);
        const sut = this.createSut(input, (a, b) => b - a);
        const last = sut.takeLast(1);
        const actual = [...last];
        assert.sameOrderedMembers(actual, expected);
      }));
    });
  });

  protected createSut<T>(items: Iterable<T> = [], comparer?: (a: T, b: T) => number) {
    return new OrderedSeqImpl(items, comparer)
  }

  protected createReverseSut<T>(input: Iterable<T> = [], comparer?: (a: T, b: T) => number) {
    return OrderedSeqImpl.create(input, undefined, comparer, true);
  }
}

function testDualInput<T>(input: T[], testFn: (input: Iterable<T>) => void) {
  it('array source', () => testFn(input));
  it('generator source', () => testFn(generator.from(input)));
}
