import {describe, it} from "mocha";
import {assert} from "chai";
import {array, generator, iterables, Sample} from "../test-data"
import { SeqBase } from "../../lib/seq-base";

export abstract class SeqBase_Immediate_Tests {
  readonly run = () => describe('SeqBase - Immediate Execution', () => {
    describe('all()', () => {
      it("Return true on empty sequence", () => {
        const sut = this.createSut();
        const sut2 = this.createSut(generator.from([]));
        const actual = sut.all(() => false);
        const actual2 = sut2.all(() => false);
        assert.isTrue(actual);
        assert.isTrue(actual2);
      });

      describe("On non-empty sequence", () => {
        it("Return true if all items match a condition", () => {
          const alwaysTrueCondition = () => true;
          const input = array.oneToTen;
          const sut = this.createSut(input);
          const sut2 = this.createSut(generator.from(input));
          const actual = sut.all(alwaysTrueCondition);
          const actual2 = sut2.all(alwaysTrueCondition);
          assert.isTrue(actual);
          assert.isTrue(actual2);
        });

        it("Return false if at least one item doesn't pass the condition", () => {

          const alwaysFalseCondition = () => false;
          const sut = this.createSut(iterables.truthyValues);
          const sut2 = this.createSut(array.truthyValues);

          assert.isFalse(sut.all(alwaysFalseCondition));
          assert.isFalse(sut2.all(alwaysFalseCondition));
        });

        it("Return false if condition return falsy value", () => {
          const falsyValue = 0;
          const nonEmpty = [...array.oneToTen, falsyValue];
          const sut = this.createSut(nonEmpty);
          const sut2 = this.createSut(generator.from(nonEmpty));

          const actual = sut.all(value => value);
          const actual2 = sut2.all(value => value);
          assert.isFalse(actual);
          assert.isFalse(actual2);
        });

        it("Return true if condition return truthy value for all items", () => {
          const sut = this.createSut(array.truthyValues);
          const sut2 = this.createSut(iterables.truthyValues);

          const actual = sut.all(value => value);
          const actual2 = sut2.all(value => value);
          assert.isTrue(actual);
          assert.isTrue(actual2);
        });

        it('should call condition with expected item and index', () => {
          const expected = array.oneToTen.map((x, i) => ({x, i}));
          const actual: { x: number, i: number }[] = [];
          const actual2: { x: number, i: number }[] = [];

          const sut = this.createSut(array.oneToTen);
          const sut2 = this.createSut(iterables.oneToTen);

          sut.all((x, i) => actual.push({x, i}) + 1);
          sut2.all((x, i) => actual2.push({x, i}) + 1);
          assert.sameDeepOrderedMembers(actual, expected);
          assert.sameDeepOrderedMembers(actual2, expected);
        });
      });
    });

    describe('any()', () => {
      it("Return false on empty sequence", () => {
        const sut = this.createSut([]);
        const actual = sut.any(x => !!x);
        assert.isFalse(actual);
        assert.isFalse(sut.any());
      });

      describe("On non-empty sequence", () => {
        it("Return true if any item match a condition", () => {
          const alwaysTrueCondition = () => true;

          const sut = this.createSut(iterables.falsyValues);

          const actual = sut.any(alwaysTrueCondition);
          assert.isTrue(actual);
        });

        it("Return false if all items don't pass the condition", () => {
          const alwaysFalseCondition = () => false;
          const sut = this.createSut(array.truthyValues);

          const actual = sut.all(alwaysFalseCondition);
          assert.isFalse(actual);
        });

        it("Return false if condition return falsy value for all items", () => {
          const sut = this.createSut(array.falsyValues);

          const actual = sut.all(value => value);
          assert.isFalse(actual);
        });

        it("Return true if condition return truthy value on any item", () => {
          const truthyValue = -1;
          const actualNonEmpty = [...array.falsyValues, truthyValue];
          const expectedNonEmpty = actualNonEmpty.slice();
          const sut = this.createSut(actualNonEmpty);

          const actual = sut.any(value => value);
          assert.isTrue(actual);
          assert.deepEqual(actualNonEmpty, expectedNonEmpty);
        });

        it('should call condition with expected item and index', () => {
          const expected = array.oneToTen.map((x, i) => ({x, i}));
          const actual: { x: number, i: number }[] = [];

          const sut = this.createSut(array.oneToTen);

          sut.any((x, i) => {
            actual.push({x, i});
            return false;
          });
          assert.sameDeepOrderedMembers(actual, expected);
        });
      });
    });

    describe("at()", () => {
      it("Return an item at expected index", () => {
        const input = array.zeroToNine;
        const expected = input.slice();
        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        expected.forEach((exp, index) => {
          let actual = sut.at(index);
          assert.equal(actual, exp);
          actual = sut2.at(index);
          assert.equal(actual, exp);
        });
      });

      it("Return default value at non-existing index", () => {
        const input = array.zeroToNine;
        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        const expectedValueNotInSequence = -1;
        const outOfRangeIndex = input.length + 2;
        let actual = sut.at(outOfRangeIndex, expectedValueNotInSequence);
        let actual2 = sut2.at(outOfRangeIndex, expectedValueNotInSequence);

        assert.equal(actual, expectedValueNotInSequence);
        assert.equal(actual2, expectedValueNotInSequence);

        const negativeIndex = -outOfRangeIndex;
        actual = sut.at(negativeIndex, expectedValueNotInSequence);
        actual2 = sut2.at(negativeIndex, expectedValueNotInSequence);

        assert.equal(actual, expectedValueNotInSequence);
        assert.equal(actual2, expectedValueNotInSequence);
      });

      it("Return undefined at non-existing index when no default value specified", () => {
        const input = array.zeroToNine;
        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));

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
        const expected = input.slice();
        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        expected.forEach((exp, index) => {
          const negativeIndex = -expected.length + index;
          const actual = sut.at(negativeIndex);
          const actual2 = sut2.at(negativeIndex);
          assert.equal(actual, exp);
          assert.equal(actual2, exp);
        });
      });
    });

    describe("average()", () => {
      it('should return average for all items when no selector provided', () => {
        const input = array.oneToTen;
        const expected = input.reduce((sum, x) => sum + x) / input.length;

        let sut = this.createSut(input);
        let actual = sut.average();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.average();
        assert.equal(actual, expected);
        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("should return average on item's property", () => {
        const input = array.grades;
        const expected = input.reduce((sum, x) => sum + x.grade, 0) / input.length;

        let sut = this.createSut(input);
        let actual = sut.average(x => x.grade);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.average(x => x.grade);
        assert.equal(actual, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should return NaN on empty sequence', () => {
        let sut = this.createSut<number>();
        let actual = sut.average();
        assert.isNaN(actual);
        sut = this.createSut<number>([]);
        actual = sut.average();
        assert.isNaN(actual);
        sut = this.createSut<number>(generator.from([]));
        actual = sut.average();
        assert.isNaN(actual);

        let sut2 = this.createSut<{ age: number; }>();
        let actual2 = sut2.average(x => x.age);
        assert.isNaN(actual2);
        sut2 = this.createSut<{ age: number; }>([]);
        actual2 = sut2.average(x => x.age);
        assert.isNaN(actual2);
        sut2 = this.createSut<{ age: number; }>(generator.from([]));
        actual2 = sut2.average(x => x.age);
        assert.isNaN(actual2);
      });
    });

    describe("consume()", () => {
      it('should iterate all items', () => {
        function* iterate<T>(input: Iterable<T>, consumed: T[]) {
          for (const item of input) {
            consumed.push(item);
            yield item;
          }
        }

        const input = array.oneToTen;
        const actual: number[] = [];
        const sut = this.createSut(iterate(input, actual));
        sut.consume();
        assert.sameOrderedMembers(actual, input);

        const input2 = generator.from(array.oneToTen);
        const actual2: number[] = [];
        const sut2 = this.createSut(iterate(input2, actual2));
        sut2.consume();
        assert.sameOrderedMembers(actual2, [...input2]);

      });

    });

    describe("count()", () => {
      it('should return number of items in non empty sequence without condition', () => {
        const input = array.oneToTen;
        const expected = input.length;
        let sut = this.createSut(input);
        let actual = sut.count();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.count();
        assert.equal(actual, expected);
      });

      it('should return number of items in non empty sequence that met a condition', () => {
        const input = array.oneToTen;
        const condition = (x: number) => x % 2 === 0;
        const expected = input.filter(condition).length;
        let sut = this.createSut(input);
        let actual = sut.count(condition);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.count(condition);
        assert.equal(actual, expected);
      });

      it('should return count of zero on when no item met the condition', () => {
        const input: number[] = [];
        const alwaysFalseCondition = () => false;
        const expected = 0;
        let sut = this.createSut(input);
        let actual = sut.count(alwaysFalseCondition);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.count(alwaysFalseCondition);
        assert.equal(actual, expected);
      });

      it('should return zero count on empty sequence', () => {
        const input: number[] = [];
        const expected = 0;
        let sut = this.createSut(input);
        let actual = sut.count();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.count();
        assert.equal(actual, expected);
      });
    });

    describe("endsWith()", () => {
      describe("without key selector", () => {
        it("should return false if sequence doesn't end with all the specified items", () => {
          const input = array.oneToTen;
          const endsWith = [...generator.range(1, -10)];
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith));
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(endsWith);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith));
          assert.isFalse(actual);
        });

        it('should return true if sequence ends with the specified items in same order', () => {
          const input = array.oneToTen;
          const endsWith = array.oneToTen.slice(-5);
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith);
          assert.isTrue(actual);
          actual = sut.endsWith(generator.from(endsWith));
          assert.isTrue(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(generator.from(endsWith));
          assert.isTrue(actual);
          actual = sut.endsWith(endsWith);
          assert.isTrue(actual);
        });

        it('should return false if sequence ends with the specified items but NOT in same order', () => {
          const input = array.oneToTen;
          const endsWith = input.slice(5).reverse();
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith));
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(generator.from(endsWith));
          assert.isFalse(actual);
          actual = sut.endsWith(endsWith);
          assert.isFalse(actual);
        });

        it('should return true if items to check for is an empty sequence', () => {
          const emptyItems: number[] = [];
          const emptyItemsGenerator = generator.from(emptyItems);

          const sut = this.createSut(array.oneToTen);
          let actual = sut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = sut.endsWith(emptyItemsGenerator);
          assert.isTrue(actual);

          const generatorOfNumbersSut = this.createSut(generator.from(array.oneToTen));
          actual = generatorOfNumbersSut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = generatorOfNumbersSut.endsWith(emptyItemsGenerator);
          assert.isTrue(actual);

          const emptyArraySut = this.createSut(emptyItems);
          actual = emptyArraySut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = emptyArraySut.endsWith(emptyItemsGenerator);
          assert.isTrue(actual);

          const emptySequenceSut = this.createSut();
          actual = emptySequenceSut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = emptySequenceSut.endsWith(emptyItemsGenerator);
          assert.isTrue(actual);
        });

        it('should return true if sequence is checked with itself', () => {
          const input = array.oneToTen;

          const sut = this.createSut(input);
          let actual = sut.endsWith(sut);
          assert.isTrue(actual);

          const sut2 = this.createSut(generator.from(input));
          let actual2 = sut2.endsWith(sut);
          assert.isTrue(actual2);

          actual = sut.endsWith(sut2);
          assert.isTrue(actual);

          actual2 = sut2.endsWith(sut);
          assert.isTrue(actual2);
        });
      });

      describe("with key selector", () => {
        it("should return false if sequence doesn't end with all the specified items", () => {
          const input = array.gradesFiftyAndAbove.reverse();
          const endsWith = array.gradesFiftyAndBelow;
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);
          actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
        });

        it('should return true if sequence ends with the specified items in same order', () => {
          const input = array.grades;
          const endsWith = array.gradesFiftyAndAbove;
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith, x => x.grade);
          assert.isTrue(actual);
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isTrue(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isTrue(actual);
          actual = sut.endsWith(endsWith, x => x.grade);
          assert.isTrue(actual);
        });

        it('should return false if sequence ends with the specified items but NOT in same order', () => {
          const input = array.grades;
          const endsWith = array.gradesFiftyAndAbove.reverse();
          let sut = this.createSut(input);
          let actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input));
          actual = sut.endsWith(generator.from(endsWith), x => x.grade);
          assert.isFalse(actual);
          actual = sut.endsWith(endsWith, x => x.grade);
          assert.isFalse(actual);
        });

        it('should return true if items to check for is an empty sequence', () => {
          let emptyItems: Sample[] = [];

          const sut = this.createSut(array.samples);
          let actual = sut.endsWith(emptyItems);
          assert.isTrue(actual);
          actual = sut.endsWith(generator.from(emptyItems));
          assert.isTrue(actual);

          const generatorOfNumbersSut = this.createSut(generator.from(array.samples));
          actual = generatorOfNumbersSut.endsWith(generator.from(emptyItems));
          assert.isTrue(actual);
          actual = generatorOfNumbersSut.endsWith(emptyItems);
          assert.isTrue(actual);
        });

        it('should return true if sequence is checked with itself', () => {
          const input = array.grades;

          const sut = this.createSut(input);
          let actual = sut.endsWith(sut, x => x.grade);
          assert.isTrue(actual);

          const sut2 = this.createSut(generator.from(input));
          let actual2 = sut2.endsWith(sut2, x => x.grade);
          assert.isTrue(actual2);

          actual = sut.endsWith(sut2, x => x.grade);
          assert.isTrue(actual);

          actual2 = sut2.endsWith(sut, x => x.grade);
          assert.isTrue(actual2);
        });
      });
    });

    describe("every()", () => {
      it('should return true if all items met a condition', () => {
        const input = array.grades;
        const sut = this.createSut(input);
        let actual = sut.every(x => x.grade <= Number.MAX_VALUE);
        assert.isTrue(actual);

        const sut2 = this.createSut(generator.from(input));
        actual = sut2.every(x => x.grade <= Number.MAX_VALUE);
        assert.isTrue(actual);
      });

      it("should return false if one of the items doesn't met the condition", () => {
        const input = array.grades;
        const sut = this.createSut(input);
        let actual = sut.every(x => x.grade < 0);
        assert.isFalse(actual);

        const sut2 = this.createSut(generator.from(input));
        actual = sut2.every(x => x.grade < 0);
        assert.isFalse(actual);
      });

      it('should return true on empty sequence', () => {
        const input: { name: string, grade: number }[] = [];
        const sut = this.createSut(input);
        let actual = sut.every(() => false);
        assert.isTrue(actual);

        const sut2 = this.createSut();
        actual = sut2.every(() => false);
        assert.isTrue(actual);
      });
    });

    describe("find()", () => {
      it('should return undefined if non of the items meet the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        let sut = this.createSut(input);
        let actual = sut.find(() => false);
        assert.isUndefined(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.find(() => false);
        assert.isUndefined(actual);

        const input2 = array.grades.concat(array.grades.reverse());
        let sut2 = this.createSut(input2);
        let actual2 = sut2.find(() => false);
        assert.isUndefined(actual2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.find(() => false);
        assert.isUndefined(actual2);
      });

      it('should return undefined if sequence is empty', () => {
        let sut = this.createSut([]);
        let actual = sut.find(() => true);
        assert.isUndefined(actual);
        sut = this.createSut();
        actual = sut.find(() => true);
        assert.isUndefined(actual);
      });

      it('should return first item that meets the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const expected = input.find(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.find(x => x > 5);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.find(x => x > 5);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades.reverse());
        const expected2 = input2.find(x => x.grade > 50);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.find(x => x.grade > 50);
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.find(x => x.grade > 50);
        assert.equal(actual2, expected2);
      });

      describe("starting from index", () => {
        it('should return undefined if non of the items from the specified from-index, meet the condition', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, () => false);
          assert.isUndefined(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.find(fromIndex, () => false);
          assert.isUndefined(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.find(fromIndex2, () => false);
          assert.isUndefined(actual2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.find(fromIndex2, () => false);
          assert.isUndefined(actual2);
        });

        it('should return undefined if sequence is empty', () => {
          let sut = this.createSut([]);
          let actual = sut.find(1, () => true);
          assert.isUndefined(actual);
          sut = this.createSut();
          actual = sut.find(1, () => true);
          assert.isUndefined(actual);
        });

        it('should return first item that meets the condition, after the specified from-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const expected = input.find((x, index) => index >= fromIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, x => x > 5);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.find(fromIndex, x => x > 5);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const expected2 = input2.find((x, index) => index >= fromIndex2 && x.grade > 50);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.find(fromIndex2, x => x.grade > 50);
          assert.deepEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.find(fromIndex2, x => x.grade > 50);
          assert.deepEqual(actual2, expected2);
        });

        it('should return undefined if from-index is out of range', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = input.length;
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, () => true);
          assert.isUndefined(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.find(fromIndex, () => true);
          assert.isUndefined(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = input2.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.find(fromIndex2, () => true);
          assert.isUndefined(actual2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.find(fromIndex2, () => true);
          assert.isUndefined(actual2);
        });
      });

      describe("with default value", () => {
        it('should return default value if non of the items meet the condition', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.find(() => false, expected);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.find(() => false, expected);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const expected2 = {name: "test", grade: -1};
          let sut2 = this.createSut(input2);
          let actual2 = sut2.find(() => false, expected2);
          assert.deepEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.find(() => false, expected2);
          assert.deepEqual(actual2, expected2);
        });

        it('should return default value if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut<number>([]);
          let actual = sut.find(() => true, expected);
          assert.equal(actual, expected);
          sut = this.createSut<number>();
          actual = sut.find(() => true, expected);
          assert.equal(actual, expected);
        });

        describe("starting from index", () => {
          it('should return default value if non of the items from the specified from-index, meet the condition', () => {
            const input = array.oneToTen.concat(array.zeroToNine.reverse());
            const fromIndex = array.oneToTen.length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.find(fromIndex, () => false, expected);
            assert.equal(actual, expected);
            sut = this.createSut(generator.from(input));
            actual = sut.find(fromIndex, () => false, expected);
            assert.equal(actual, expected);

            const input2 = array.grades.concat(array.grades.reverse());
            const expected2 = {name: "test", grade: -1};
            const fromIndex2 = array.grades.length;
            let sut2 = this.createSut(input2);
            let actual2 = sut2.find(fromIndex2, () => false, expected2);
            assert.deepEqual(actual2, expected2);

            sut2 = this.createSut(generator.from(input2));
            actual2 = sut2.find(fromIndex2, () => false, expected2);
            assert.deepEqual(actual2, expected2);
          });

          it('should return default value if sequence is empty', () => {
            const expected = -1;
            let sut = this.createSut<number>([]);
            let actual = sut.find(1, () => true, expected);
            assert.equal(actual, expected);
            sut = this.createSut<number>();
            actual = sut.find(1, () => true, expected);
            assert.equal(actual, expected);
          });

          it('should return default value if from-index is out of range', () => {
            const input = array.oneToTen.concat(array.zeroToNine.reverse());
            const fromIndex = input.length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.find(fromIndex, () => true, expected);
            assert.equal(actual, expected);
            sut = this.createSut(generator.from(input));
            actual = sut.find(fromIndex, () => true, expected);
            assert.equal(actual, expected);

            const input2 = array.grades.concat(array.grades.reverse());
            const expected2 = {name: "test", grade: -1};
            const fromIndex2 = input2.length;
            let sut2 = this.createSut(input2);
            let actual2 = sut2.find(fromIndex2, () => true, expected2);
            assert.equal(actual2, expected2);

            sut2 = this.createSut(generator.from(input2));
            actual2 = sut2.find(fromIndex2, () => true, expected2);
            assert.equal(actual2, expected2);
          });
        });
      });
    });

    describe("findIndex()", () => {
      it('should return -1 if non of the items meet the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findIndex(() => false);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.findIndex(() => false);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades.reverse());
        let sut2 = this.createSut(input2);
        let actual2 = sut2.findIndex(() => false);
        assert.equal(actual2, expected);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.findIndex(() => false);
        assert.equal(actual2, expected);
      });

      it('should return -1 if sequence is empty', () => {
        const expected = -1;
        let sut = this.createSut([]);
        let actual = sut.findIndex(() => true);
        assert.equal(actual, expected);
        sut = this.createSut();
        actual = sut.findIndex(() => true);
        assert.equal(actual, expected);
      });

      it('should return index of first item that meets the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const expected = input.findIndex(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findIndex(x => x > 5);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.findIndex(x => x > 5);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades.reverse());
        const expected2 = input2.findIndex(x => x.grade > 50);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.findIndex(x => x.grade > 50);
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.findIndex(x => x.grade > 50);
        assert.equal(actual2, expected2);
      });

      describe("starting from index", () => {
        it('should return -1 if non of the items from the specified from-index, meet the condition', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, () => false);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findIndex(fromIndex, () => false);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findIndex(fromIndex2, () => false);
          assert.equal(actual2, expected);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findIndex(fromIndex2, () => false);
          assert.equal(actual2, expected);
        });

        it('should return -1 if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut([]);
          let actual = sut.findIndex(1, () => true);
          assert.equal(actual, expected);
          sut = this.createSut();
          actual = sut.findIndex(1, () => true);
          assert.equal(actual, expected);
        });

        it('should return index of first item that meets the condition, after the specified from-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const expected = input.findIndex((x, index) => index >= fromIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, x => x > 5);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findIndex(fromIndex, x => x > 5);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const expected2 = input2.findIndex((x, index) => index >= fromIndex2 && x.grade > 50);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findIndex(fromIndex2, x => x.grade > 50);
          assert.equal(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findIndex(fromIndex2, x => x.grade > 50);
          assert.equal(actual2, expected2);
        });

        it('should return -1 if from-index is out of range', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = input.length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, () => true);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findIndex(fromIndex, () => true);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = input2.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findIndex(fromIndex2, () => true);
          assert.equal(actual2, expected);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findIndex(fromIndex2, () => true);
          assert.equal(actual2, expected);
        });
      });
    });

    describe("findLast()", () => {
      it('should return undefined if non of the items meet the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        let sut = this.createSut(input);
        let actual = sut.findLast(() => false);
        assert.isUndefined(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.findLast(() => false);
        assert.isUndefined(actual);

        const input2 = array.grades.concat(array.grades.reverse());
        let sut2 = this.createSut(input2);
        let actual2 = sut2.findLast(() => false);
        assert.isUndefined(actual2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.findLast(() => false);
        assert.isUndefined(actual2);
      });

      it('should return undefined if sequence is empty', () => {
        let sut = this.createSut([]);
        let actual = sut.findLast(() => true);
        assert.isUndefined(actual);
        sut = this.createSut();
        actual = sut.findLast(() => true);
        assert.isUndefined(actual);
      });

      it('should return last item that meets the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const expected = input.slice().reverse().find(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findLast(x => x > 5);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.findLast(x => x > 5);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades.reverse());
        const expected2 = input2.slice().reverse().find(x => x.grade > 50);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.findLast(x => x.grade > 50);
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.findLast(x => x.grade > 50);
        assert.equal(actual2, expected2);
      });

      describe("starting till index", () => {
        it('should return undefined if non of the items from the specified till-index, meet the condition', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          let sut = this.createSut(input);
          let actual = sut.findLast(fromIndex, () => false);
          assert.isUndefined(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.findLast(fromIndex, () => false);
          assert.isUndefined(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLast(fromIndex2, () => false);
          assert.isUndefined(actual2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLast(fromIndex2, () => false);
          assert.isUndefined(actual2);
        });

        it('should return undefined if sequence is empty', () => {
          let sut = this.createSut([]);
          let actual = sut.findLast(1, () => true);
          assert.isUndefined(actual);
          sut = this.createSut();
          actual = sut.findLast(1, () => true);
          assert.isUndefined(actual);
        });

        it('should return last item that meets the condition, after the specified till-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length - 1;
          const expected = input.slice().reverse().find((x, index) => index > fromIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.findLast(fromIndex, x => x > 5);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findLast(fromIndex, x => x > 5);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length - 1;
          const expected2 = input2.slice().reverse().find((x, index) => index > fromIndex2 && x.grade > 50);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLast(fromIndex2, x => x.grade > 50);
          assert.deepEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLast(fromIndex2, x => x.grade > 50);
          assert.deepEqual(actual2, expected2);
        });

        it('should return undefined if till-index is out of range', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = -1;
          let sut = this.createSut(input);
          let actual = sut.findLast(fromIndex, () => true);
          assert.isUndefined(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.findLast(fromIndex, () => true);
          assert.isUndefined(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -1;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLast(fromIndex2, () => true);
          assert.isUndefined(actual2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLast(fromIndex2, () => true);
          assert.isUndefined(actual2);
        });
      });

      describe("with default value", () => {
        it('should return default value if non of the items meet the condition', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLast(() => false, expected);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findLast(() => false, expected);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const expected2 = {name: "test", grade: -1};
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLast(() => false, expected2);
          assert.deepEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLast(() => false, expected2);
          assert.deepEqual(actual2, expected2);
        });

        it('should return default value if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut<number>([]);
          let actual = sut.findLast(() => true, expected);
          assert.equal(actual, expected);
          sut = this.createSut<number>();
          actual = sut.findLast(() => true, expected);
          assert.equal(actual, expected);
        });

        describe("starting from index", () => {
          it('should return default value if non of the items from the specified till-index, meet the condition', () => {
            const input = array.oneToTen.concat(array.zeroToNine.reverse());
            const fromIndex = array.oneToTen.length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => false, expected);
            assert.equal(actual, expected);
            sut = this.createSut(generator.from(input));
            actual = sut.findLast(fromIndex, () => false, expected);
            assert.equal(actual, expected);

            const input2 = array.grades.concat(array.grades.reverse());
            const expected2 = {name: "test", grade: -1};
            const fromIndex2 = array.grades.length;
            let sut2 = this.createSut(input2);
            let actual2 = sut2.findLast(fromIndex2, () => false, expected2);
            assert.deepEqual(actual2, expected2);

            sut2 = this.createSut(generator.from(input2));
            actual2 = sut2.findLast(fromIndex2, () => false, expected2);
            assert.deepEqual(actual2, expected2);
          });

          it('should return default value if sequence is empty', () => {
            const expected = -1;
            let sut = this.createSut<number>([]);
            let actual = sut.findLast(1, () => true, expected);
            assert.equal(actual, expected);
            sut = this.createSut<number>();
            actual = sut.findLast(1, () => true, expected);
            assert.equal(actual, expected);
          });

          it('should return default value if till-index is out of range', () => {
            const input = array.oneToTen.concat(array.zeroToNine.reverse());
            const fromIndex = -1;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => true, expected);
            assert.equal(actual, expected);
            sut = this.createSut(generator.from(input));
            actual = sut.findLast(fromIndex, () => true, expected);
            assert.equal(actual, expected);

            const input2 = array.grades.concat(array.grades.reverse());
            const expected2 = {name: "test", grade: -1};
            const fromIndex2 = -1;
            let sut2 = this.createSut(input2);
            let actual2 = sut2.findLast(fromIndex2, () => true, expected2);
            assert.equal(actual2, expected2);

            sut2 = this.createSut(generator.from(input2));
            actual2 = sut2.findLast(fromIndex2, () => true, expected2);
            assert.equal(actual2, expected2);
          });
        });
      });
    });

    describe("findLastIndex()", () => {
      it('should return -1 if non of the items meet the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(() => false);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.findLastIndex(() => false);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades.reverse());
        let sut2 = this.createSut(input2);
        let actual2 = sut2.findLastIndex(() => false);
        assert.equal(actual2, expected);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.findLastIndex(() => false);
        assert.equal(actual2, expected);
      });

      it('should return -1 if sequence is empty', () => {
        const expected = -1;
        let sut = this.createSut([]);
        let actual = sut.findLastIndex(() => true);
        assert.equal(actual, expected);
        sut = this.createSut();
        actual = sut.findLastIndex(() => true);
        assert.equal(actual, expected);
      });

      it('should return index of last item that meets the condition', () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const expected = input.length - 1 - input.slice().reverse().findIndex(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(x => x > 5);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.findLastIndex(x => x > 5);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades.reverse());
        const expected2 = input2.length - 1 - input2.slice().reverse().findIndex(x => x.grade > 50);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.findLastIndex(x => x.grade > 50);
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.findLastIndex(x => x.grade > 50);
        assert.equal(actual2, expected2);
      });

      describe("starting till index", () => {
        it('should return -1 if non of the items from the specified till-index, meet the condition', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, () => false);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findLastIndex(fromIndex, () => false);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLastIndex(fromIndex2, () => false);
          assert.equal(actual2, expected);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLastIndex(fromIndex2, () => false);
          assert.equal(actual2, expected);
        });

        it('should return -1 if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut([]);
          let actual = sut.findLastIndex(1, () => true);
          assert.equal(actual, expected);
          sut = this.createSut();
          actual = sut.findLastIndex(1, () => true);
          assert.equal(actual, expected);
        });

        it('should return index of last item that meets the condition, after the specified till-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const expected = input.map((x, i) => [x, i]).slice(0, fromIndex + 1).filter(([x,]) => x > 5).slice(-1)[0][1];
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, x => x > 5);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findLastIndex(fromIndex, x => x > 5);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const expected2 = input2.map((x, i) => ({
            x,
            i
          })).slice(0, fromIndex2 + 1).filter(({x}) => x.grade > 50).slice(-1)[0].i;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLastIndex(fromIndex2, x => x.grade > 50);
          assert.equal(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLastIndex(fromIndex2, x => x.grade > 50);
          assert.equal(actual2, expected2);
        });

        it('should return -1 if till-index is out of range', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = -2;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, () => true);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.findLastIndex(fromIndex, () => true);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -2;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLastIndex(fromIndex2, () => true);
          assert.equal(actual2, expected);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.findLastIndex(fromIndex2, () => true);
          assert.equal(actual2, expected);
        });
      });
    });

    describe("first()", () => {
      it('should return the first item in the sequence', () => {
        const input = array.oneToTen;
        const expected = input[0];
        let sut = this.createSut(input);
        let actual = sut.first();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.first();
        assert.equal(actual, expected);

        const input2 = array.grades;
        const expected2 = input2[0];
        let sut2 = this.createSut(input2);
        let actual2 = sut2.first();
        assert.deepEqual(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.first();
        assert.deepEqual(actual2, expected2);
      });

      it('should return undefined on empty sequence', () => {
        let sut = this.createSut([]);
        let actual = sut.first();
        assert.isUndefined(actual);

        sut = this.createSut();
        actual = sut.first();
        assert.isUndefined(actual);
      });

      it('should return default value on empty sequence', () => {
        const expected = -1;
        let sut = this.createSut<number>([]);
        let actual = sut.first(expected);
        assert.equal(actual, expected);

        sut = this.createSut<number>();
        actual = sut.first(expected);
        assert.equal(actual, expected);
      });
    });

    describe('forEach()', () => {
      it('should execute callback function on each item in sequence', () => {
        const input = array.oneToTen;
        const expected = input.map((value, index) => ({value, index}));
        const actual: { value: number, index: number }[] = [];
        const callback = (value: number, index: number) => {
          actual.push({value, index});
        };

        let sut = this.createSut(input);
        sut.forEach(callback);
        assert.sameDeepOrderedMembers(actual, expected);

        actual.splice(0);
        sut = this.createSut(generator.from(input));
        sut.forEach(callback);
        assert.sameDeepOrderedMembers(actual, expected);
      });

      it('should not execute callback function on empty sequence', () => {
        const input: number[] = [];
        let actual = false;
        const callback = () => actual = true;

        let sut = this.createSut(input);
        sut.forEach(callback);
        assert.isFalse(actual);
        sut = this.createSut(input);
        sut.forEach(callback);
        assert.isFalse(actual);
      });

      it('should break loop if returning the breakReturnValue parameter in the callback', () => {
        let sut = this.createSut(array.oneToTen);
        const expected = 5;
        let actual = -1;
        sut.forEach((value, i, breakReturnValue) => {
          actual = value;
          if (value === expected) return breakReturnValue;
        });

        assert.equal(actual, expected);
      });
    });

    describe('hasAtLeast()', () => {
      it('should return true if sequence as number of expected items', () => {
        const input = array.oneToTen;
        let sut = this.createSut(input);
        for (let count = 1; count <= input.length; count++) {
          let actual = sut.hasAtLeast(count);
          assert.isTrue(actual);
        }

        sut = this.createSut(generator.from(input));
        for (let count = 1; count <= input.length; count++) {
          let actual = sut.hasAtLeast(count);
          assert.isTrue(actual);
        }
      });

      it('should return false if sequence has less items than expected', () => {
        const input = array.oneToTen;
        let sut = this.createSut(input);
        let actual = sut.hasAtLeast(input.length + 1);
        assert.isFalse(actual);

        sut = this.createSut(generator.from(input));
        actual = sut.hasAtLeast(input.length + 1);
        assert.isFalse(actual);

        sut = this.createSut();
        actual = sut.hasAtLeast(input.length + 1);
        assert.isFalse(actual);
      });

      it('should throw exception if count parameter is not positive', () => {
        const input = array.oneToTen;
        let sut = this.createSut(input);
        assert.throws(() => sut.hasAtLeast(0));
        assert.throws(() => sut.hasAtLeast(-1));
      });
    });

    describe("includes()", () => {
      it('should return true if sequence includes the item', () => {
        const input = array.oneToTen;
        const expected = input.includes(5);
        let sut = this.createSut(input);
        let actual = sut.includes(5);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.includes(5);
        assert.equal(actual, expected);

        const input2 = array.grades;
        const expected2 = input2.includes(input2[5]);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.includes(input2[5]);
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.includes(input2[5]);
        assert.equal(actual2, expected2);
      });

      it("should return false if sequence doesn't include the item", () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const valueToFind = -1;
        let sut = this.createSut(input);
        let actual = sut.includes(valueToFind);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.includes(valueToFind);
        assert.isFalse(actual);

        const input2 = array.grades.concat(array.grades.reverse());
        const valueToFind2 = {name: "missing", grade: -1};
        let sut2 = this.createSut(input2);
        let actual2 = sut2.includes(valueToFind2);
        assert.isFalse(actual2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.includes(valueToFind2);
        assert.isFalse(actual2);
      });

      it('should return false if sequence is empty', () => {
        let sut = this.createSut<any>([]);
        let actual = sut.includes(undefined);
        assert.isFalse(actual);
        sut = this.createSut();
        actual = sut.includes(undefined);
        assert.isFalse(actual);
      });

      describe("starting from index", () => {
        it('should return true if sequence includes the item, after the specified from-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const valueToFind = input[fromIndex + 2];

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const valueToFind2 = input2[fromIndex2 + 2];

          let sut2 = this.createSut(input2);
          let actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);
        });

        it("should return false if sequence doesn't include the item from the specified from-index", () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const missingValueToFind = -1;
          let sut = this.createSut(input);
          let actual = sut.includes(missingValueToFind, fromIndex);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.includes(missingValueToFind, fromIndex);
          assert.isFalse(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const valueToFind2 = {name: "missing", grade: -1};

          let sut2 = this.createSut(input2);
          let actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isFalse(actual2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isFalse(actual2);
        });

        it('should return false if sequence is empty', () => {
          let sut = this.createSut<any>([]);
          let actual = sut.includes(undefined, 1);
          assert.isFalse(actual);
          sut = this.createSut();
          actual = sut.includes(undefined, 1);
          assert.isFalse(actual);
        });

        it('should return false if from-index is out of range', () => {
          const input = array.oneToTen;
          const fromIndex = input.length;
          const valueToFind = 1;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
        });
      });

      describe("with negative index", () => {
        it('should return true if sequence includes the item, after the specified from-index', () => {
          const input = array.tenZeros.concat(array.tenOnes);
          const fromIndex = -10;
          const valueToFind = 1;

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -10;
          const valueToFind2 = input2[input2.length - 10];

          let sut2 = this.createSut(input2);
          let actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);
          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);
        });

        it("should return false if sequence doesn't include the item from the specified from-index", () => {
          const input = array.tenZeros.concat(array.tenOnes);
          const fromIndex = array.tenZeros.length;
          const valueToFind = 0;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
        });

        it('should return false if sequence is empty', () => {
          let sut = this.createSut<any>([]);
          let actual = sut.includes(undefined, -1);
          assert.isFalse(actual);
          sut = this.createSut();
          actual = sut.includes(undefined, -1);
          assert.isFalse(actual);
        });

        it('should return true if sequence includes the item and from-index is negative out of range', () => {
          const input = array.tenOnes;
          const fromIndex = -input.length;
          const valueToFind = 1;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -input2.length - 2;
          const valueToFind2 = input2[input2.length - 10];

          let sut2 = this.createSut(input2);
          let actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);
          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);
        });
      });
    });

    describe('includesAll()', () => {
      it('should return true if sequence contains all items from the second sequence', () => {
        const first = array.oneToTen;
        const second = [7, 2, 3, 7];
        let sut = this.createSut(first);
        let actual = sut.includesAll(second);
        assert.isTrue(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAll(generator.from(second));
        assert.isTrue(actual);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade <= 50);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesAll(second2);
        assert.isTrue(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesAll(generator.from(second2));
        assert.isTrue(actual2);
      });

      it('should return false if sequence contains only some of the items from the second sequence', () => {
        const first = array.oneToTen;
        const second = [7, 2, -1, 7];
        let sut = this.createSut(first);
        let actual = sut.includesAll(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAll(generator.from(second));
        assert.isFalse(actual);

        const first2 = array.grades;
        const missingItem = {name: "missing", grade: -1};
        const second2 = first2.filter(x => x.grade <= 50).concat([missingItem]);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesAll(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesAll(generator.from(second2));
        assert.isFalse(actual2);
      });

      it("should return false if sequence doesn't contains any of the items from the second sequence", () => {
        const first = array.oneToTen;
        const second = [0, 0, 0, 0];
        let sut = this.createSut(first);
        let actual = sut.includesAll(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAll(generator.from(second));
        assert.isFalse(actual);

        const first2 = array.grades;
        const second2 = array.gradesFiftyAndBelow; // different instances of objects, which without key selector aren't equal
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesAll(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesAll(generator.from(second2));
        assert.isFalse(actual2);
      });

      it('should return false is source sequence is empty', () => {
        const first: number[] = [];
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.includesAll(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAll(generator.from(second));
        assert.isFalse(actual);
      });

      it('should return true if second sequence is empty', () => {
        const first = array.oneToTen;
        const second: number[] = [];
        let sut = this.createSut(first);
        let actual = sut.includesAll(second);
        assert.isTrue(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAll(generator.from(second));
        assert.isTrue(actual);
      });

      describe('with key-selector', () => {
        it('should return true if sequence contains all items from the second sequence', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndBelow;
          let sut = this.createSut(first);
          let actual = sut.includesAll(second, x => x.grade);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });

        it('should return false if sequence contains only some of the items from the second sequence', () => {
          const first = array.grades;
          const missingItem = {name: "missing", grade: -1};
          const second = first.filter(x => x.grade <= 50).concat([missingItem]);
          let sut = this.createSut(first);
          let actual = sut.includesAll(second, x => x.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it("should return false if sequence doesn't contains any of the items from the second sequence", () => {
          const first = array.grades;
          const second = [{name: "fake 1", grade: -1}, {name: "fake ", grade: -1}, {name: "fake 3", grade: -2}];
          second.forEach(x => x.grade = -x.grade);
          let sut = this.createSut(first);
          let actual = sut.includesAll(second);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second));
          assert.isFalse(actual);
        });

        it('should return false is source sequence is empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades;
          let sut = this.createSut(first);
          let actual = sut.includesAll(second, x => x.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return true if second sequence is empty', () => {
          const first = array.grades;
          const second: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = sut.includesAll(second, x => x.grade);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });
      });

      describe('with second key-selector', () => {
        it('should return true if sequence contains all items from the second sequence', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: 0, y: 0},
            {x: -1, y: 1},
            {x: 1, y: -1}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
        });

        it('should return false if sequence contains only some of the items from the second sequence', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: 0, y: 0},
            {x: -1, y: 1},
            {x: 1, y: -1},
            {x: 9999, y: 9999}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
        });

        it("should return false if sequence doesn't contains any of the items from the second sequence", () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
        });

        it('should return false is source sequence is empty', () => {
          const first: { x: number; y: number; z: number }[] = [];
          const second = [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
        });

        it('should return true if second sequence is empty', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second: { x: number; y: number; z: number }[] = [];

          let sut = this.createSut(first);
          let actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAll(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
        });
      });
    });

    describe('includesAny()', () => {
      it('should return true if sequence contains any item from the second sequence', () => {
        const first = array.oneToTen;
        const second = [-1, -2, 7, -3, -4];
        let sut = this.createSut(first);
        let actual = sut.includesAny(second);
        assert.isTrue(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAny(generator.from(second));
        assert.isTrue(actual);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade >= 50);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesAny(second2);
        assert.isTrue(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesAny(generator.from(second2));
        assert.isTrue(actual2);
      });

      it("should return false if sequence doesn't contains any of the items from the second sequence", () => {
        const first = array.oneToTen;
        const second = [0, 0, 0, 0];
        let sut = this.createSut(first);
        let actual = sut.includesAny(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAny(generator.from(second));
        assert.isFalse(actual);

        const first2 = array.grades;
        const second2 = array.gradesFiftyAndBelow; // different instances of objects, which without key selector aren't equal
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesAny(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesAny(generator.from(second2));
        assert.isFalse(actual2);
      });

      it('should return false is source sequence is empty', () => {
        const first: number[] = [];
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.includesAny(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAny(generator.from(second));
        assert.isFalse(actual);
      });

      it('should return false if second sequence is empty', () => {
        const first = array.oneToTen;
        const second: number[] = [];
        let sut = this.createSut(first);
        let actual = sut.includesAny(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.includesAny(generator.from(second));
        assert.isFalse(actual);
      });

      describe('with key-selector', () => {
        it('should return true if sequence contains any item from the second sequence', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndBelow;
          let sut = this.createSut(first);
          let actual = sut.includesAny(second, x => x.grade);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });

        it("should return false if sequence doesn't contains any of the items from the second sequence", () => {
          const first = array.grades;
          const second = [{name: "fake 1", grade: -1}, {name: "fake ", grade: -1}, {name: "fake 3", grade: -2}];
          second.forEach(x => x.grade = -x.grade);
          let sut = this.createSut(first);
          let actual = sut.includesAny(second);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second));
          assert.isFalse(actual);
        });

        it('should return false is source sequence is empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades;
          let sut = this.createSut(first);
          let actual = sut.includesAny(second, x => x.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return false if second sequence is empty', () => {
          const first = array.grades;
          const second: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = sut.includesAny(second, x => x.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });
      });

      describe('with second key-selector', () => {
        it('should return true if sequence contains any item from the second sequence', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: 0, y: 0},
            {x: -1, y: 1},
            {x: 1, y: -1}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
        });

        it("should return false if sequence doesn't contains any of the items from the second sequence", () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
        });

        it('should return false is source sequence is empty', () => {
          const first: { x: number; y: number; z: number }[] = [];
          const second = [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ];

          let sut = this.createSut(first);
          let actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
        });

        it('should return false if second sequence is empty', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second: { x: number; y: number; z: number }[] = [];

          let sut = this.createSut(first);
          let actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.includesAny(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
        });
      });
    });

    describe('includesSubSequence()', () => {
      it('should return true if sequence contains entire sub-sequence is same order', () => {
        const first = array.zeroToTen;
        const second = array.oneToNine;
        let sut = this.createSut(first);
        let actual = sut.includesSubSequence(second);
        assert.isTrue(actual);

        sut = this.createSut(generator.from(first));
        actual = sut.includesSubSequence(generator.from(second));
        assert.isTrue(actual);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade > 50);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesSubSequence(second2);
        assert.isTrue(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesSubSequence(generator.from(second2));
        assert.isTrue(actual2);
      });

      it('should return false if sequence contains entire sub-sequence but not in same order', () => {
        const first = array.oneToTen;
        const second = array.range(5, 2);
        let sut = this.createSut(first);
        let actual = sut.includesSubSequence(second);
        assert.isFalse(actual);

        sut = this.createSut(generator.from(first));
        actual = sut.includesSubSequence(generator.from(second));
        assert.isFalse(actual);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade > 50).reverse();
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesSubSequence(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesSubSequence(generator.from(second2));
        assert.isFalse(actual2);
      });

      it('should return false if sequence contains part of sub-sequence', () => {
        const first = array.oneToTen;
        const second = [9, 10, 11];
        let sut = this.createSut(first);
        let actual = sut.includesSubSequence(second);
        assert.isFalse(actual);

        sut = this.createSut(generator.from(first));
        actual = sut.includesSubSequence(generator.from(second));
        assert.isFalse(actual);

        const first2 = array.grades;
        const missing = {name: "missing", grade: -1};
        const second2 = first2.slice(-3).concat([missing]);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesSubSequence(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesSubSequence(generator.from(second2));
        assert.isFalse(actual2);
      });

      it('should return false if sequence has less items than sub-sequence', () => {
        const first = array.oneToNine;
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.includesSubSequence(second);
        assert.isFalse(actual);

        sut = this.createSut(generator.from(first));
        actual = sut.includesSubSequence(generator.from(second));
        assert.isFalse(actual);

        const first2 = array.grades.slice(0, array.grades.length - 2);
        const second2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesSubSequence(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesSubSequence(generator.from(second2));
        assert.isFalse(actual2);
      });

      it('should return false if sequence is empty', () => {
        const first: number[] = [];
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.includesSubSequence(second);
        assert.isFalse(actual);

        sut = this.createSut(generator.from(first));
        actual = sut.includesSubSequence(generator.from(second));
        assert.isFalse(actual);

        const first2: { name: string, grade: number; }[] = [];
        const second2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesSubSequence(second2);
        assert.isFalse(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesSubSequence(generator.from(second2));
        assert.isFalse(actual2);
      });

      it('should return true if sub-sequence is empty', () => {
        const first = array.oneToTen;
        const second: number[] = [];
        let sut = this.createSut(first);
        let actual = sut.includesSubSequence(second);
        assert.isTrue(actual);

        sut = this.createSut(generator.from(first));
        actual = sut.includesSubSequence(generator.from(second));
        assert.isTrue(actual);

        const second2: { name: string, grade: number; }[] = [];
        const first2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.includesSubSequence(second2);
        assert.isTrue(actual2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.includesSubSequence(generator.from(second2));
        assert.isTrue(actual2);
      });

      describe('from index', () => {
        it('should return true if sequence contains entire sub-sequence is same order starting from-index', () => {
          const first = array.tenOnes;
          const second = [1, 1, 1];
          const fromIndex = 5;
          const expectedScannedTillIndex = fromIndex + second.length-1;
          let sut = this.createSut(first);
          let actual = sut.findSubSequence(second, fromIndex);
          assert.equal(actual[0], fromIndex);
          assert.equal(actual[1], expectedScannedTillIndex);

          sut = this.createSut(generator.from(first));
          actual = sut.findSubSequence(generator.from(second), fromIndex);
          assert.equal(actual[0], fromIndex);
          assert.equal(actual[1], expectedScannedTillIndex);
        });

        it('should return false if sequence contains entire sub-sequence but not in same order', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = [0, 0, 0, 1, 1, 1];
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, fromIndex);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.isFalse(actual);
        });

        it('should return false if sequence contains part of sub-sequence', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = [1, 1, 1, 9999];
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, fromIndex);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.isFalse(actual);
        });

        it('should return false if sequence has less items than sub-sequence', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, fromIndex);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.isFalse(actual);
        });

        it('should return false if sequence is empty', () => {
          const first: number[] = [];
          const second = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, fromIndex);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.isFalse(actual);
        });

        it('should return true if sub-sequence is empty', () => {
          const second: number[] = [];
          const first = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, fromIndex);
          assert.isTrue(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.isTrue(actual);
        });
      });

      describe('with key-selector', () => {
        it('should return true if sequence contains entire sub-sequence is same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove;

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, x => x.grade);
          assert.isTrue(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });

        it('should return false if sequence contains entire sub-sequence but not in same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove.reverse();

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return false if sequence contains part of sub-sequence', () => {
          const first = array.grades;
          const missing = {name: "missing", grade: -1};
          const second = array.gradesFiftyAndAbove.concat(missing);

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return false if sequence has less items than sub-sequence', () => {
          const first = array.grades;
          const missing = {name: "missing", grade: -1};
          const second = array.grades.concat(missing);

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return false if sequence is empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades;

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return true if sub-sequence is empty', () => {
          const second: { name: string; grade: number; }[] = [];
          const first = array.grades;

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, x => x.grade);
          assert.isTrue(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });

        describe('from index', () => {
          it('should return true if sequence contains entire sub-sequence is same order', () => {
            const input = [...'.'.repeat(10)].map(() => ({x: 0, y: 0}));
            const first = input;
            const second = input.slice(0, 3);
            const fromIndex = 5;
            const expectedScannedTillIndex = fromIndex + second.length-1;

            let sut = this.createSut(first);
            let actual = sut.findSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual[0], fromIndex);
            assert.equal(actual[1], expectedScannedTillIndex);

            sut = this.createSut(generator.from(first));
            actual = sut.findSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.isTrue(actual[0] > -1);
            assert.equal(actual[0], fromIndex);
            assert.equal(actual[1], expectedScannedTillIndex);
          });

          it('should return false if sequence contains entire sub-sequence but not in same order', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).reverse();
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);
          });

          it('should return false if sequence contains part of sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).concat([{x: 0, y: -9999}]);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);
          });

          it('should return false if sequence has less items than sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.concat([{x: 0, y: 11}]);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);
          });

          it('should return false if sequence is empty', () => {
            const first: { x: number; y: number; }[] = [];
            const second = array.oneToTen.map((y) => ({x: 0, y}));
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.isFalse(actual);
          });

          it('should return true if sub-sequence is empty', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second: { x: number; y: number; }[] = [];
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.isTrue(actual);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.isTrue(actual);
          });
        });
      });
    });

    describe("indexOf()", () => {
      it('should return first index of item if sequence includes the item', () => {
        const input = array.oneToTen;
        const expected = input.indexOf(5);
        let sut = this.createSut(input);
        let actual = sut.indexOf(5);
        assert.equal(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.indexOf(5);
        assert.equal(actual, expected);

        const input2 = array.grades;
        const expected2 = input2.indexOf(input2[5]);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.indexOf(input2[5]);
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.indexOf(input2[5]);
        assert.equal(actual2, expected2);
      });

      it("should return -1 if sequence doesn't include the item", () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const valueToFind = -1;
        let sut = this.createSut(input);
        let actual = sut.indexOf(valueToFind);
        assert.equal(actual, -1);
        sut = this.createSut(generator.from(input));
        actual = sut.indexOf(valueToFind);
        assert.equal(actual, -1);

        const input2 = array.grades.concat(array.grades.reverse());
        const valueToFind2 = {name: "missing", grade: -1};
        let sut2 = this.createSut(input2);
        let actual2 = sut2.indexOf(valueToFind2);
        assert.equal(actual2, -1);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.indexOf(valueToFind2);
        assert.equal(actual2, -1);
      });

      it('should return -1 if sequence is empty', () => {
        let sut = this.createSut<any>([]);
        let actual = sut.indexOf(undefined);
        assert.equal(actual, -1);
        sut = this.createSut();
        actual = sut.indexOf(undefined);
        assert.equal(actual, -1);
      });

      describe("starting from index", () => {
        it('should return first index of item if sequence includes the item, after the specified from-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const valueToFind = input[fromIndex + 2];
          const expected = input.indexOf(valueToFind, fromIndex);

          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const valueToFind2 = input2[fromIndex2 + 2];
          const expected2 = input2.indexOf(valueToFind2, fromIndex);

          let sut2 = this.createSut(input2);
          let actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.equal(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.equal(actual2, expected2);
        });

        it("should return -1 if sequence doesn't include the item from the specified from-index", () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const missingValueToFind = -1;
          let sut = this.createSut(input);
          let actual = sut.indexOf(missingValueToFind, fromIndex);
          assert.equal(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(missingValueToFind, fromIndex);
          assert.equal(actual, -1);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const valueToFind2 = {name: "missing", grade: -1};

          let sut2 = this.createSut(input2);
          let actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.equal(actual2, -1);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.equal(actual2, -1);
        });

        it('should return -1 if sequence is empty', () => {
          let sut = this.createSut<any>([]);
          let actual = sut.indexOf(undefined, 1);
          assert.equal(actual, -1);
          sut = this.createSut();
          actual = sut.indexOf(undefined, 1);
          assert.equal(actual, -1);
        });

        it('should return -1 if from-index is out of range', () => {
          const input = array.oneToTen;
          const fromIndex = input.length;
          const valueToFind = 1;
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, -1);
        });
      });

      describe("with negative index", () => {
        it('should return first index of item if sequence includes the item, after the specified from-index', () => {
          const input = array.tenZeros.concat(array.tenOnes);
          const fromIndex = -10;
          const valueToFind = 1;
          const expected = input.indexOf(valueToFind, fromIndex);
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -array.grades.length;
          const expected2 = input2.length + fromIndex2 + 2;
          const valueToFind2 = input2[expected2];

          let sut2 = this.createSut(input2);
          let actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.equal(actual2, expected2);
          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.equal(actual2, expected2);
        });

        it("should return -1 if sequence doesn't include the item from the specified from-index", () => {
          const input = array.tenZeros.concat(array.tenOnes);
          const fromIndex = array.tenZeros.length;
          const valueToFind = 0;
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, -1);
        });

        it('should return -1 if sequence is empty', () => {
          let sut = this.createSut<any>([]);
          let actual = sut.indexOf(undefined, -1);
          assert.equal(actual, -1);
          sut = this.createSut();
          actual = sut.indexOf(undefined, -1);
          assert.equal(actual, -1);
        });

        it('should return first index of item if sequence includes the item and from-index is negative out of range', () => {
          const input = array.tenOnes;
          const fromIndex = -input.length;
          const valueToFind = 1;
          const expected = input.indexOf(valueToFind, fromIndex);
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.equal(actual, expected);
        });
      });
    });

    describe('indexOfSubSequence()', () => {
      it('should return true if sequence contains entire sub-sequence is same order', () => {
        const first = array.zeroToNine.concat(array.zeroToTen);
        const second = array.oneToTen;
        const expected = first.lastIndexOf(second[0]);
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.equal(actual, expected);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade > 50);
        const expected2 = first2.indexOf(second2[0]);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.equal(actual2, expected2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.equal(actual2, expected2);
      });

      it('should return false if sequence contains entire sub-sequence but not in same order', () => {
        const first = array.oneToTen;
        const second = array.range(5, 2);
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.equal(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.equal(actual, -1);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade > 50).reverse();
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.equal(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.equal(actual2, -1);
      });

      it('should return false if sequence contains part of sub-sequence', () => {
        const first = array.oneToTen;
        const second = [9, 10, 11];
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.equal(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.equal(actual, -1);

        const first2 = array.grades;
        const missing = {name: "missing", grade: -1};
        const second2 = first2.slice(-3).concat([missing]);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.equal(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.equal(actual2, -1);
      });

      it('should return false if sequence has less items than sub-sequence', () => {
        const first = array.oneToNine;
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.equal(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.equal(actual, -1);

        const first2 = array.grades.slice(0, array.grades.length - 2);
        const second2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.equal(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.equal(actual2, -1);
      });

      it('should return false if sequence is empty', () => {
        const first: number[] = [];
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.equal(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.equal(actual, -1);

        const first2: { name: string, grade: number; }[] = [];
        const second2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.equal(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.equal(actual2, -1);
      });

      it('should return true if sub-sequence is empty', () => {
        const first = array.oneToTen;
        const second: number[] = [];
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.equal(actual, 0);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.equal(actual, 0);

        const second2: { name: string, grade: number; }[] = [];
        const first2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.equal(actual2, 0);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.equal(actual2, 0);
      });

      describe('from index', () => {
        it('should return true if sequence contains entire sub-sequence is same order starting from-index', () => {
          const first = array.zeroToNine.concat(array.zeroToTen);
          const second = array.oneToNine;
          const expected = first.lastIndexOf(second[0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.equal(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, expected);
        });

        it('should return false if sequence contains entire sub-sequence but not in same order', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = [0, 0, 0, 1, 1, 1];
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, -1);
        });

        it('should return false if sequence contains part of sub-sequence', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = [1, 1, 1, 9999];
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, -1);
        });

        it('should return false if sequence has less items than sub-sequence', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, -1);
        });

        it('should return false if sequence is empty', () => {
          const first: number[] = [];
          const second = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, -1);
        });

        it('should return true if sub-sequence is empty', () => {
          const second: number[] = [];
          const first = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.equal(actual, 0);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, 0);
        });
      });

      describe('with key-selector', () => {
        it('should return true if sequence contains entire sub-sequence is same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove;
          const expected = first.findIndex(x => x.grade === second[0].grade);
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.equal(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.equal(actual, expected);
        });

        it('should return false if sequence contains entire sub-sequence but not in same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove.reverse();

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.equal(actual, -1);
        });

        it('should return false if sequence contains part of sub-sequence', () => {
          const first = array.grades;
          const missing = {name: "missing", grade: -1};
          const second = array.gradesFiftyAndAbove.concat(missing);

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.equal(actual, -1);
        });

        it('should return false if sequence has less items than sub-sequence', () => {
          const first = array.grades;
          const missing = {name: "missing", grade: -1};
          const second = array.grades.concat(missing);

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.equal(actual, -1);
        });

        it('should return false if sequence is empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades;

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.equal(actual, -1);
        });

        it('should return true if sub-sequence is empty', () => {
          const second: { name: string; grade: number; }[] = [];
          const first = array.grades;

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.equal(actual, 0);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.equal(actual, 0);
        });

        describe('from index', () => {
          it('should return true if sequence contains entire sub-sequence is same order', () => {
            const first = array.repeat({x: 0, y: 0}, 10);
            const second = first.slice(0, 3);
            const fromIndex = 5;
            const expected = fromIndex;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, expected);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, expected);
          });

          it('should return false if sequence contains entire sub-sequence but not in same order', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).reverse();
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);
          });

          it('should return false if sequence contains part of sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).concat([{x: 0, y: -9999}]);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);
          });

          it('should return false if sequence has less items than sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.concat([{x: 0, y: 11}]);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);
          });

          it('should return false if sequence is empty', () => {
            const first: { x: number; y: number; }[] = [];
            const second = array.oneToTen.map((y) => ({x: 0, y}));
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, -1);
          });

          it('should return true if sub-sequence is empty', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second: { x: number; y: number; }[] = [];
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, 0);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, 0);
          });
        });
      });
    });

    describe('isEmpty()', () => {
      it("should return true if sequence doesn't contain any items", () => {
        let sut = this.createSut([]);
        let actual = sut.isEmpty();
        assert.isTrue(actual);

        sut = this.createSut();
        actual = sut.isEmpty();
        assert.isTrue(actual);
      });

      it('should return false if sequence has items', () => {
        const input = array.tenZeros;
        let sut = this.createSut(input);
        let actual = sut.isEmpty();
        assert.isFalse(actual);

        sut = this.createSut(generator.from(input));
        actual = sut.isEmpty();
        assert.isFalse(actual);

        const input2 = array.grades;
        let sut2 = this.createSut(input2);
        let actual2 = sut2.isEmpty();
        assert.isFalse(actual2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.isEmpty();
        assert.isFalse(actual2);
      });
    });

    describe('join()', () => {
      it('should behave like Array.join', () => {
        for (const input of <any[][]>[array.abc, [], [1]]) {
          const sutArray = this.createSut<any>(input);
          const sutGenerator = this.createSut(generator.from<any>(input));
          for (const separator of <string[]>[undefined, '', ' ', ',', '|', "<=>", '/', null]) {
            const expected = input.join(separator);
            let actual = sutArray.join(separator);
            assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join(${separator})`);
            actual = sutGenerator.join(separator);
            assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join(${separator})`);
          }
        }
      });

      it('should return wrapped the string with either a start and/or end string', () => {
        for (const start of <string[]>['', undefined, null, '[', '{', ' ']) {
          for (const end of <string[]>['', undefined, null, ']', '}', ' ']) {
            for (const input of <any[]>[array.abc, [], [1]]) {
              const sutArray = this.createSut<any>(input);
              const sutGenerator = this.createSut(generator.from<any>(input));
              for (const separator of <string[]>[undefined, '', ' ', ',', '|', "<=>", '/', null]) {
                const expected = (start === undefined ? '' : start) + input.join(separator) + (end === undefined ? '' : end);
                let actual = sutArray.join({start, separator, end});
                assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join({start: ${start}, separator: ${separator}, end: ${end}})`);
                actual = sutGenerator.join({start, separator, end});
                assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join({start: ${start}, separator: ${separator}, end: ${end}})`);
              }
            }
          }
        }
      });
    });

    describe('last()', () => {
      it('should return last item in non-empty sequence', () => {
        const input = array.oneToTen;
        const expected = input.slice(-1)[0];
        let sut = this.createSut(input);
        let actual = sut.last();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.last();
        assert.equal(actual, expected);

        const input2 = array.grades;
        const expected2 = input2.slice(-1)[0];
        let sut2 = this.createSut(input2);
        let actual2 = sut2.last();
        assert.equal(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.last();
        assert.equal(actual2, expected2);
      });

      it('should return undefined on empty sequence', () => {
        let sut = this.createSut([]);
        let actual = sut.last();
        assert.isUndefined(actual);

        sut = this.createSut();
        actual = sut.last();
        assert.isUndefined(actual);
      });

      it('should return fallback value on empty sequence', () => {
        let sut = this.createSut<number>([]);
        const expected = 1;
        let actual = sut.last(expected);
        assert.equal(actual, expected);

        sut = this.createSut<number>();
        actual = sut.last(expected);
        assert.equal(actual, expected);
      });
    });

    describe('lastIndexOf()', () => {
      it('should return last index of item being searched', () => {
        const input = array.oneToTen.concat(array.oneToTen);
        const itemToFind = 5;
        const expected = input.lastIndexOf(itemToFind);
        let sut = this.createSut(input);
        let actual = sut.lastIndexOf(itemToFind);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.lastIndexOf(itemToFind);
        assert.equal(actual, expected);

        const input2 = array.grades.concat(array.grades);
        const itemToFind2 = array.grades[2];
        const expected2 = input2.lastIndexOf(itemToFind2);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.lastIndexOf(itemToFind2);
        assert.deepEqual(actual2, expected2);
      });

      it("should return -1 if sequence doesn't include the item", () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const valueToFind = -1;
        let sut = this.createSut(input);
        let actual = sut.lastIndexOf(valueToFind);
        assert.equal(actual, -1);
        sut = this.createSut(generator.from(input));
        actual = sut.lastIndexOf(valueToFind);
        assert.equal(actual, -1);

        const input2 = array.grades.concat(array.grades.reverse());
        const valueToFind2 = {name: "missing", grade: -1};
        let sut2 = this.createSut(input2);
        let actual2 = sut2.lastIndexOf(valueToFind2);
        assert.equal(actual2, -1);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.lastIndexOf(valueToFind2);
        assert.equal(actual2, -1);
      });

      it('should return -1 if sequence is empty', () => {
        let sut = this.createSut<any>([]);
        let actual = sut.lastIndexOf(undefined);
        assert.equal(actual, -1);
        sut = this.createSut();
        actual = sut.lastIndexOf(undefined);
        assert.equal(actual, -1);
      });

      describe("starting till index", () => {
        it('should return -1 if item to find is beyond the from-index', () => {
          const input = array.oneToNine.concat(9999);
          const itemToFind = 9999;
          const fromIndex = input.length - 2;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, -1);

          const itemToFind2 = {name: 'out-of-reach', grade: 110};
          const input2 = array.grades.concat(itemToFind2);
          const fromIndex2 = input2.length - 2;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, -1);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, -1);
        });

        it('should return -1 if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut<number>([]);
          let actual = sut.lastIndexOf(1, 1);
          assert.equal(actual, expected);
          sut = this.createSut<number>();
          actual = sut.lastIndexOf(1, 1);
          assert.equal(actual, expected);
        });

        it('should return the last index of searched item before or at the from-index', () => {
          const input = array.tenOnes;
          const itemToFind = 1;
          const fromIndex = 7;
          const expected = fromIndex;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);

          let input2 = array.grades;
          input2.push(...input2.slice().reverse());
          const expected2 = array.grades.length - 2;
          const itemToFind2 = input2[expected2];
          const fromIndex2 = array.grades.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected2);
        });

        it('should return the last index of searched item when from-index is out or range', () => {
          const input = array.tenOnes;
          const itemToFind = 1;
          const fromIndex = input.length * 2;
          const expected = input.length - 1;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);

          let input2 = array.grades;
          input2.push(...input2.slice().reverse());
          const itemToFind2 = input2[0];
          const fromIndex2 = input2.length * 2;
          const expected2 = input2.lastIndexOf(itemToFind2, fromIndex2);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected2);
        });
      });

      describe("with negative index", () => {
        it('should return -1 if item to find is beyond the from-index', () => {
          const itemToFind = 9999;
          const input = array.oneToNine.concat(itemToFind);
          const fromIndex = -2;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, -1);

          const itemToFind2 = {name: 'beyond-reach', grade: 110};
          const input2 = array.grades.concat(itemToFind2);
          const fromIndex2 = -2;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, -1);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, -1);
        });

        it('should return -1 if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut<number>([]);
          let actual = sut.lastIndexOf(1, -1);
          assert.equal(actual, expected);
          sut = this.createSut<number>();
          actual = sut.lastIndexOf(1, -1);
          assert.equal(actual, expected);
        });

        it('should return the last index of searched item before or at the from-index', () => {
          const input = array.tenOnes;
          const itemToFind = 1;
          const fromIndex = -7;
          const expected = input.length + fromIndex;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const itemToFind2 = input2.slice(-1)[0];
          const fromIndex2 = -array.grades.length;
          const expected2 = array.grades.indexOf(itemToFind2);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected2);
        });

        it('should return -1 if from-index is out of range', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const itemToFind = 1;
          const fromIndex = -input.length - 5;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.equal(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const itemToFind2 = array.grades[0];
          const fromIndex2 = -input2.length - 5;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.equal(actual2, expected);
        });
      });
    });

    describe("max()", () => {
      it('should return maximum value from sequence of number', () => {
        const input = array.oneToTen;
        const expected = input.reduce((max, x) => max < x ? x : max, Number.NEGATIVE_INFINITY);

        let sut = this.createSut(input);
        let actual = sut.max();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.max();
        assert.equal(actual, expected);
        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("should return maximum value on item's numeric property", () => {
        const input = array.grades;
        const expected = input.reduce((max, x) => max < x.grade ? x.grade : max, Number.NEGATIVE_INFINITY);

        let sut = this.createSut(input);
        let actual = sut.max(x => x.grade);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.max(x => x.grade);
        assert.equal(actual, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should Negative Infinity on empty sequence', () => {
        const sut = this.createSut<number>();
        const expected = Number.NEGATIVE_INFINITY;
        const actual = sut.max();
        assert.equal(actual, expected);

        const sut2 = this.createSut<{ age: number; }>();
        const actual2 = sut2.max(x => x.age);
        assert.equal(actual2, expected);
      });
    });

    describe("min()", () => {
      it('should return minimum value from sequence of number', () => {
        const input = array.oneToTen;
        const expected = input.reduce((min, x) => min > x ? x : min, Number.POSITIVE_INFINITY);

        let sut = this.createSut(input);
        let actual = sut.min();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.min();
        assert.equal(actual, expected);
        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("should return minimum value on item's numeric property", () => {
        const input = array.grades;
        const expected = input.reduce((min, x) => min > +x.grade ? x.grade : min, Number.POSITIVE_INFINITY);

        let sut = this.createSut(input);
        const actual = sut.min(x => x.grade);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        const actual2 = sut.min(x => x.grade);
        assert.equal(actual2, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should Infinity on empty sequence', () => {
        const expected = Number.POSITIVE_INFINITY;
        const sut = this.createSut<number>();
        const actual = sut.min();
        assert.equal(actual, expected);

        const sut2 = this.createSut<{ age: number; }>();
        const actual2 = sut2.min(x => x.age);
        assert.equal(actual2, expected);
      });
    });

    describe('reduce()', () => {
      it('should behave like Array.reduce', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));

        const reducers = [
          (a: number, b: number) => a + b,
          (a: number, b: number) => a * b,
          (a: number, _: number) => a,
          (a: number, b: number) => b,
        ];
        const expectations = reducers.map(reducer => input.reduce(reducer));

        for (const [index, reducer] of reducers.entries()) {
          const expected = expectations[index];
          const actual = sut.reduce(reducer);
          assert.equal(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
          const actual2 = sut2.reduce(reducer);
          assert.equal(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
        }

        const input2 = array.abc;
        const sut3 = this.createSut(input2);
        const sut4 = this.createSut(generator.from(input2));
        const reducer = (a: string, b: string) => a + b;
        const expected = input2.reduce(reducer);
        const actual = sut3.reduce(reducer);
        const actual2 = sut4.reduce(reducer);

        assert.equal(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
        assert.equal(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
      });

      it('should not affect input array', () => {
        const input = array.oneToTen;
        const inputCopy = input.slice();
        const sut = this.createSut(input);
        sut.reduce(() => 0);
        assert.sameOrderedMembers(input, inputCopy);

        const sut2 = this.createSut(generator.from(input));
        sut2.reduce(() => 0);
        assert.sameOrderedMembers(input, inputCopy);
      });

      describe('should provide parameters to reducer in correct order and values and return reducer final result', () => {
        it('without initial value', () => test());
        it('with initial value', () => test(-10));

        const test = (initialValue?: number): void =>{
          const input = array.oneToTen;
          const expectedPreviousValues: number[] = [];
          const expectedCurrentValues: number[] = [];
          const expectedIndices: number[] = [];
          const arrayReduce = input.reduce.bind(input);
          const arrayReducer = (previous: number, current: number, index: number) => {
            expectedPreviousValues.push(previous);
            expectedCurrentValues.push(current);
            expectedIndices.push(index);
            return previous + current;
          };

          const expected = initialValue === undefined ?
            arrayReduce(arrayReducer) :
            arrayReduce(arrayReducer, initialValue as number);


          const actualPreviousValues: number[] = [];
          const actualCurrentValues: number[] = [];
          const actualIndices: number[] = [];

          const sut = this.createSut(generator.from(input));

          const seqReduce = sut.reduce.bind(sut);
          const seqReducer = (previous: number, current: number, index: number) => {
            actualPreviousValues.push(previous);
            actualCurrentValues.push(current);
            actualIndices.push(index);
            return previous + current;
          };

          const actual = initialValue === undefined ?
            seqReduce(seqReducer) :
            seqReduce(seqReducer, initialValue as number);

          assert.sameOrderedMembers(actualPreviousValues, expectedPreviousValues, `actual previous values [${actualPreviousValues}] not same as expected [${expectedPreviousValues}]`);
          assert.sameOrderedMembers(actualCurrentValues, expectedCurrentValues, `actual current values [${actualCurrentValues}] not same as expected [${expectedCurrentValues}]`);
          assert.sameOrderedMembers(actualIndices, expectedIndices, `actual indices [${actualIndices}] not same as expected [${expectedIndices}]`);
          assert.equal(actual, expected, `actual return value ${actual} not equals to expected ${expected}`)
        }
      });

      it('should throw if sequence is empty and no initial value provided', () => {
        const input: number[] = [];
        const sut = this.createSut(input);
        assert.throws(() => sut.reduce((a, b) => a + b), TypeError);
        const sut2 = this.createSut(generator.from(input));
        assert.throws(() => sut2.reduce((a, b) => a + b), TypeError);
      });

      it('should return initial value if sequence is empty', () => {
        const expected = Math.PI;
        const unexpected = -1;
        const input: number[] = [];

        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));

        const actual = sut.reduce(() => unexpected, expected);
        assert.equal(actual, expected);
        const actual2 = sut2.reduce(() => unexpected, expected);
        assert.equal(actual2, expected);
      });

      it('should return first item if sequence has only one item and no initial value provided', () => {
        const expected = Math.PI;
        const unexpected = -1;
        const input: number[] = [expected];

        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        const actual = sut.reduce(() => unexpected);
        assert.equal(actual, expected);
        const actual2 = sut2.reduce(() => unexpected);
        assert.equal(actual2, expected);

      });
    });

    describe('reduceRight()', () => {
      it('should behave like Array.reduceRight', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));

        const reducers = [
          (a: number, b: number) => a + b,
          (a: number, b: number) => a * b,
          (a: number, _: number) => a,
          (a: number, b: number) => b,
        ];
        const expectations = reducers.map(reducer => input.reduceRight(reducer));

        for (const [index, reducer] of reducers.entries()) {
          const expected = expectations[index];
          const actual = sut.reduceRight(reducer);
          assert.equal(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
          const actual2 = sut2.reduceRight(reducer);
          assert.equal(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
        }

        const input2 = array.abc;
        const sut3 = this.createSut(input2);
        const sut4 = this.createSut(generator.from(input2));
        const reducer = (a: string, b: string) => a + b;
        const expected = input2.reduceRight(reducer);
        const actual = sut3.reduceRight(reducer);
        const actual2 = sut4.reduceRight(reducer);

        assert.equal(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
        assert.equal(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
      });

      it('should not affect input array', () => {
        const input = array.oneToTen;
        const inputCopy = input.slice();
        const sut = this.createSut(input);
        sut.reduceRight(() => 0);
        assert.sameOrderedMembers(input, inputCopy);

        const sut2 = this.createSut(generator.from(input));
        sut2.reduceRight(() => 0);
        assert.sameOrderedMembers(input, inputCopy);
      });

      describe('should provide parameters to reducer in correct order and values and return reducer final result', () => {
        it('without initial value', () => test());
        it('with initial value', () => test(-10));

        const test = (initialValue?: number): void => {
          const input = array.oneToTen;
          const expectedPreviousValues: number[] = [];
          const expectedCurrentValues: number[] = [];
          const expectedIndices: number[] = [];
          const arrayReduce = input.reduceRight.bind(input);
          const arrayReducer = (previous: number, current: number, index: number) => {
            expectedPreviousValues.push(previous);
            expectedCurrentValues.push(current);
            expectedIndices.push(index);
            return previous + current;
          };

          const expected = initialValue === undefined ?
            arrayReduce(arrayReducer) :
            arrayReduce(arrayReducer, initialValue as number);


          const actualPreviousValues: number[] = [];
          const actualCurrentValues: number[] = [];
          const actualIndices: number[] = [];

          const sut = this.createSut(generator.from(input));

          const seqReduce = sut.reduceRight.bind(sut);
          const seqReducer = (previous: number, current: number, index: number) => {
            actualPreviousValues.push(previous);
            actualCurrentValues.push(current);
            actualIndices.push(index);
            return previous + current;
          };

          const actual = initialValue === undefined ?
            seqReduce(seqReducer) :
            seqReduce(seqReducer, initialValue as number);

          assert.sameOrderedMembers(actualPreviousValues, expectedPreviousValues, `actual previous values [${actualPreviousValues}] not same as expected [${expectedPreviousValues}]`);
          assert.sameOrderedMembers(actualCurrentValues, expectedCurrentValues, `actual current values [${actualCurrentValues}] not same as expected [${expectedCurrentValues}]`);
          assert.sameOrderedMembers(actualIndices, expectedIndices, `actual indices [${actualIndices}] not same as expected [${expectedIndices}]`);
          assert.equal(actual, expected, `actual return value ${actual} not equals to expected ${expected}`)
        }
      });

      it('should throw if sequence is empty and no initial value provided', () => {
        const input: number[] = [];
        const sut = this.createSut(input);
        assert.throws(() => sut.reduceRight((a, b) => a + b), TypeError);
        const sut2 = this.createSut(generator.from(input));
        assert.throws(() => sut2.reduceRight((a, b) => a + b), TypeError);
      });

      it('should return initial value if sequence is empty', () => {
        const expected = Math.PI;
        const unexpected = -1;
        const input: number[] = [];

        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));

        const actual = sut.reduceRight(() => unexpected, expected);
        assert.equal(actual, expected);
        const actual2 = sut2.reduceRight(() => unexpected, expected);
        assert.equal(actual2, expected);
      });

      it('should return first item if sequence has only one item and no initial value provided', () => {
        const expected = Math.PI;
        const unexpected = -1;
        const input: number[] = [expected];

        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        const actual = sut.reduceRight(() => unexpected);
        assert.equal(actual, expected);
        const actual2 = sut2.reduceRight(() => unexpected);
        assert.equal(actual2, expected);

      });
    });

    describe('sameItems()', () => {
      it('should return true if both sequences have the same items', () => {
        const first = array.oneToTen;
        const second = array.oneToTen.reverse();
        let sut = this.createSut(first);
        let actual = sut.sameItems(second);
        assert.isTrue(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.sameItems(generator.from(second));
        assert.isTrue(actual);
      });

      it('should return true if both sequences are empty', () => {
        assert.isTrue(this.createSut([]).sameItems([]));
        assert.isTrue(this.createSut().sameItems(this.createSut()));
      });

      it('should return false if sequences have different number of items', () => {
        const input = array.oneToTen;
        const second = array.oneToNine;

        let sut = this.createSut(input);
        let actual = sut.sameItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.sameItems(generator.from(second));
        assert.isFalse(actual);
      });

      it('should return false if one of the sequences is empty', () => {
        let first: number[] = [];
        let second = array.oneToNine;

        let sut = this.createSut(first);
        let actual = sut.sameItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.sameItems(generator.from(second));
        assert.isFalse(actual);

        first = array.oneToNine;
        second = [];
        sut = this.createSut(first);
        actual = sut.sameItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.sameItems(generator.from(second));
        assert.isFalse(actual);

      });

      describe('with key-selector', () => {
        it('should return true if both sequences have the same items', () => {
          const first = array.grades;
          const second = array.grades.reverse();
          let sut = this.createSut(first);
          let actual = sut.sameItems(second, x => x.grade);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });

        it('should return false if sequences have different number of items', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndAbove);

          let sut = this.createSut(first);
          let actual = sut.sameItems(second, x => x.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second), x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(second);
          actual = sut.sameItems(first, x => x.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(second));
          actual = sut.sameItems(generator.from(first), x => x.grade);
          assert.isFalse(actual);
        });

        it('should return false if one of the sequences is empty', () => {
          let first: { name: string; grade: number }[] = [];
          let second = array.grades;

          let sut = this.createSut(first);
          let actual = sut.sameItems(second);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second));
          assert.isFalse(actual);

          first = array.grades;
          second = [];
          sut = this.createSut(first);
          actual = sut.sameItems(second);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second));
          assert.isFalse(actual);
        });
      });

      describe('with second key-selector', () => {
        it('should return true if both sequences have the same items', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: -1, y: 1},
            {x: 0, y: 0},
            {x: 0, y: 1},
            {x: 1, y: 0},
            {x: 1, y: -1}
          ];

          let sut = this.createSut(first);
          let actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isTrue(actual);
        });

        it('should return false if sequences have different number of items', () => {
          const first = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ];
          const second = [
            {x: -1, y: 1},
            {x: 0, y: 0},
            {x: 0, y: 1},
            {x: 1, y: 0}
          ];

          let sut = this.createSut(first);
          let actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);

          let sut2 = this.createSut(second);
          let actual2 = sut2.sameItems(first, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual2);
          sut2 = this.createSut(generator.from(second));
          actual2 = sut2.sameItems(generator.from(first), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual2);
        });

        it("should return false if one of the sequences is empty", () => {
          const first: { x: number; y: number; z: number; }[] = [{x: 0, y: 0, z: 0}];
          const second: { x: number; y: number; }[] = [];

          let sut = this.createSut(first);
          let actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameItems(generator.from(second), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual);

          let sut2 = this.createSut(second);
          let actual2 = sut2.sameItems(first, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual2);
          sut2 = this.createSut(generator.from(second));
          actual2 = sut2.sameItems(generator.from(first), l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
          assert.isFalse(actual2);
        });
      });
    });

    describe('sameOrderedItems()', () => {
      it('should return true if both sequences have the same items in same order', () => {
        const input = array.oneToTen;
        let sut = this.createSut(input);
        let actual = sut.sameOrderedItems(input);
        assert.isTrue(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.sameOrderedItems(generator.from(input));
        assert.isTrue(actual);
      });

      it('should return true if both sequences are empty', () => {
        assert.isTrue(this.createSut([]).sameOrderedItems([]));
        assert.isTrue(this.createSut().sameOrderedItems(this.createSut()));
      });

      it('should return false if both sequences have the same items but not same order', () => {
        const input = array.oneToTen;
        const second = input.slice();
        second[second.length - 1] = input[second.length - 2];
        second[second.length - 2] = input[second.length - 1];

        let sut = this.createSut(input);
        let actual = sut.sameOrderedItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.sameOrderedItems(generator.from(second));
        assert.isFalse(actual);
      });

      it('should return false if sequences have different number of items', () => {
        const input = array.oneToTen;
        const second = array.oneToNine;

        let sut = this.createSut(input);
        let actual = sut.sameOrderedItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.sameOrderedItems(generator.from(second));
        assert.isFalse(actual);
      });

      it('should return false if one of the sequences is empty', () => {
        let first: number[] = [];
        let second = array.oneToNine;

        let sut = this.createSut(first);
        let actual = sut.sameOrderedItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.sameOrderedItems(generator.from(second));
        assert.isFalse(actual);

        first = array.oneToNine;
        second = [];
        sut = this.createSut(first);
        actual = sut.sameOrderedItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(first));
        actual = sut.sameOrderedItems(generator.from(second));
        assert.isFalse(actual);

      });

      describe('with equality comparer', () => {
        it('should return true if both sequences have the same items in same order', () => {
          const input = array.grades;
          let sut = this.createSut(input);
          let actual = sut.sameOrderedItems(input, (a, b) => a.grade === b.grade);
          assert.isTrue(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.sameOrderedItems(generator.from(input), (a, b) => a.grade === b.grade);
          assert.isTrue(actual);
        });

        it('should return false if both sequences have the same items but not same order', () => {
          const input = array.grades;
          const second = input.slice();
          second[second.length - 1] = input[second.length - 2];
          second[second.length - 2] = input[second.length - 1];

          let sut = this.createSut(input);
          let actual = sut.sameOrderedItems(second, (a, b) => a.grade === b.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.sameOrderedItems(generator.from(second), (a, b) => a.grade === b.grade);
          assert.isFalse(actual);
        });

        it('should return false if sequences have different number of items', () => {
          const input = array.grades;
          const second = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndAbove);

          let sut = this.createSut(input);
          let actual = sut.sameOrderedItems(second, (a, b) => a.grade === b.grade);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(input));
          actual = sut.sameOrderedItems(generator.from(second), (a, b) => a.grade === b.grade);
          assert.isFalse(actual);

          sut = this.createSut(second);
          actual = sut.sameOrderedItems(input, (a, b) => a.grade === b.grade);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(second));
          actual = sut.sameOrderedItems(generator.from(input), (a, b) => a.grade === b.grade);
          assert.isFalse(actual);
        });

        it('should return false if one of the sequences is empty', () => {
          let first: { name: string; grade: number }[] = [];
          let second = array.grades;

          let sut = this.createSut(first);
          let actual = sut.sameOrderedItems(second);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameOrderedItems(generator.from(second));
          assert.isFalse(actual);

          first = array.grades;
          second = [];
          sut = this.createSut(first);
          actual = sut.sameOrderedItems(second);
          assert.isFalse(actual);
          sut = this.createSut(generator.from(first));
          actual = sut.sameOrderedItems(generator.from(second));
          assert.isFalse(actual);
        });

        describe('with second of different type', () => {
          it('should return true if both sequences have the same items in same order', () => {
            const first = [
              {x: 0, y: 0, z: 0},
              {x: 0, y: 1, z: 1},
              {x: 1, y: 0, z: 0},
              {x: -1, y: 1, z: -1},
              {x: 1, y: -1, z: 1}
            ];
            const second = [
              {x: 0, y: 0},
              {x: 0, y: 1},
              {x: 1, y: 0},
              {x: -1, y: 1},
              {x: 1, y: -1}
            ];

            let sut = this.createSut(first);
            let actual = sut.sameOrderedItems(second, (l, r) => l.x === r.x && l.y === r.y);
            assert.isTrue(actual);
            sut = this.createSut(generator.from(first));
            actual = sut.sameOrderedItems(generator.from(second), (l, r) => l.x === r.x && l.y === r.y);
            assert.isTrue(actual);
          });

          it('should return false if both sequences have the same items but not same order', () => {
            const first = [
              {x: 0, y: 0, z: 0},
              {x: 0, y: 1, z: 1},
              {x: 1, y: 0, z: 0},
              {x: -1, y: 1, z: -1},
              {x: 1, y: -1, z: 1}
            ];
            const second = [
              {x: -1, y: 1},
              {x: 0, y: 0},
              {x: 0, y: 1},
              {x: 1, y: 0},
              {x: 1, y: -1}
            ];

            let sut = this.createSut(first);
            let actual = sut.sameOrderedItems(second, (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual);
            sut = this.createSut(generator.from(first));
            actual = sut.sameOrderedItems(generator.from(second), (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual);
          });

          it('should return false if sequences have different number of items', () => {
            const first = [
              {x: 0, y: 0, z: 0},
              {x: 0, y: 1, z: 1},
              {x: 1, y: 0, z: 0},
              {x: -1, y: 1, z: -1},
              {x: 1, y: -1, z: 1}
            ];
            const second = [
              {x: 0, y: 0},
              {x: 0, y: 1},
              {x: 1, y: 0},
              {x: -1, y: 1},
            ];

            let sut = this.createSut(first);
            let actual = sut.sameOrderedItems(second, (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual);
            sut = this.createSut(generator.from(first));
            actual = sut.sameOrderedItems(generator.from(second), (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual);

            let sut2 = this.createSut(second);
            let actual2 = sut2.sameOrderedItems(first, (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual2);
            sut2 = this.createSut(generator.from(second));
            actual2 = sut2.sameOrderedItems(generator.from(first), (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual2);
          });

          it("should return false if one of the sequences is empty", () => {
            const first: { x: number; y: number; z: number; }[] = [{x: 0, y: 0, z: 0}];
            const second: { x: number; y: number; }[] = [];

            let sut = this.createSut(first);
            let actual = sut.sameOrderedItems(second, (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual);
            sut = this.createSut(generator.from(first));
            actual = sut.sameOrderedItems(generator.from(second), (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual);

            let sut2 = this.createSut(second);
            let actual2 = sut2.sameOrderedItems(first, (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual2);
            sut2 = this.createSut(generator.from(second));
            actual2 = sut2.sameOrderedItems(generator.from(first), (l, r) => l.x === r.x && l.y === r.y);
            assert.isFalse(actual2);
          });
        });
      });
    });

    describe("some()", () => {
      it('should return true if at least one meets a condition', () => {
        const input = array.grades;
        const sut = this.createSut(input);
        let actual = sut.some(x => x.grade <= 100);
        assert.isTrue(actual);

        const sut2 = this.createSut(generator.from(input));
        actual = sut2.some(x => x.grade <= 100);
        assert.isTrue(actual);
      });

      it("should return false if none of the items meet the condition", () => {
        const input = array.grades;
        const sut = this.createSut(input);
        let actual = sut.some(x => x.grade < 0);
        assert.isFalse(actual);

        const sut2 = this.createSut(generator.from(input));
        actual = sut2.some(x => x.grade < 0);
        assert.isFalse(actual);
      });

      it('should false true on empty sequence', () => {
        const input: { name: string, grade: number }[] = [];
        const sut = this.createSut(input);
        let actual = sut.some(() => false);
        assert.isFalse(actual);

        const sut2 = this.createSut();
        actual = sut2.some(() => false);
        assert.isFalse(actual);
      });

      it('should return true if sequence not empty and not condition provided', () => {
        const input = array.grades;
        const sut = this.createSut(input);
        let actual = sut.some();
        assert.isTrue(actual);

        const sut2 = this.createSut(generator.from(input));
        actual = sut2.some();
        assert.isTrue(actual);
      });
    });

    describe('startsWith()', () => {
      it('should return true if sequence contains second sequence from the beginning with exact same items and same order', () => {
        const input = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));

        for (let take = 1; take < input.length; take++) {
          const second = input.slice(0, take);
          let actual = sutArray.startsWith(second);
          assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
          actual = sutGenerator.startsWith(second);
          assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
        }
      });

      it("should return false if sequence doesn't start with second sequence", () => {
        const input = array.oneToTen;
        const second = array.oneToNine.concat(9);
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        assert.isFalse(sutArray.startsWith(second));
        assert.isFalse(sutGenerator.startsWith(second));
      });

      it('should return false if second sequence has more items', () => {
        const input = array.oneToNine;
        const secondArray = array.tenOnes;
        const secondGenerator = iterables.tenOnes;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        assert.isFalse(sutArray.startsWith(secondArray));
        assert.isFalse(sutGenerator.startsWith(secondArray));
        assert.isFalse(sutArray.startsWith(secondGenerator));
        assert.isFalse(sutGenerator.startsWith(secondGenerator));
      });

      it('should return false if second sequence starts with first sequence', () => {
        const input = array.oneToNine;
        const second = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        assert.isFalse(sutArray.startsWith(second));
        assert.isFalse(sutGenerator.startsWith(second));
        assert.isFalse(sutArray.startsWith(generator.from(second)));
        assert.isFalse(sutGenerator.startsWith(generator.from(second)));
      });

      it('should return true if second sequence is empty', () => {
        let input = array.oneToNine;
        const second: number[] = [];
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        assert.isTrue(sutArray.startsWith(second));
        assert.isTrue(sutGenerator.startsWith(second));

        // Also with empty source sequence
        assert.isTrue(this.createSut<number>([]).startsWith(second));
        assert.isTrue(this.createSut<number>().startsWith(second));
      });

      describe('with key selector', () => {
        it('should return true if sequence contains second sequence from the beginning with exact same items and same order', () => {
          const input = array.grades;
          const sutArray = this.createSut(array.grades);
          const sutGenerator = this.createSut(generator.from(input));

          for (let take = 1; take < input.length; take++) {
            const second = input.slice(0, take);
            let actual = sutArray.startsWith(second, x => x.grade);
            assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
            actual = sutGenerator.startsWith(second, x => x.grade);
            assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
          }
        });

        it("should return false if sequence doesn't start with second sequence", () => {
          const input = array.grades;
          let second = array.grades;
          second[second.length - 1] = second[second.length - 2];
          const sutArray = this.createSut(input);
          const sutGenerator = this.createSut(generator.from(input));
          assert.isFalse(sutArray.startsWith(second, x => x.grade));
          assert.isFalse(sutGenerator.startsWith(second, x => x.grade));
        });

        it('should return false if second sequence has more items', () => {
          const input = array.gradesFiftyAndAbove;
          const second = array.grades;
          const sutArray = this.createSut(input);
          const sutGenerator = this.createSut(generator.from(input));
          assert.isFalse(sutArray.startsWith(second, x => x.grade));
          assert.isFalse(sutGenerator.startsWith(second, x => x.grade));


          it('should return false second sequence starts with first sequence', () => {
            const input = array.grades.slice(0, -1);
            const second = array.grades;
            const sutArray = this.createSut(input);
            const sutGenerator = this.createSut(generator.from(input));
            assert.isFalse(sutArray.startsWith(second, x => x.grade));
            assert.isFalse(sutGenerator.startsWith(second, x => x.grade));
          });
        });

        it('should return true if second sequence is empty', () => {
          let input = array.grades;
          const second: { name: string; grade: number; }[] = [];
          const sutArray = this.createSut(input);
          const sutGenerator = this.createSut(generator.from(input));
          assert.isTrue(sutArray.startsWith(second, x => x.grade));
          assert.isTrue(sutGenerator.startsWith(second, x => x.grade));

          // Also with empty source sequence
          assert.isTrue(this.createSut<{ name: string; grade: number; }>([]).startsWith(second, x => x.grade));
          assert.isTrue(this.createSut<{ name: string; grade: number; }>().startsWith(second, x => x.grade));
        });
      });
    });

    describe("sum()", () => {
      it('should return sum for all items in numeric sequence', () => {
        const input = array.oneToTen;
        const expected = input.reduce((sum, x) => sum + x);

        let sut = this.createSut(input);
        let actual = sut.sum();
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.sum();
        assert.equal(actual, expected);
        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("should return sum on item's property", () => {
        const input = array.grades;
        const expected = input.reduce((sum, x) => sum + x.grade, 0);

        let sut = this.createSut(input);
        let actual = sut.sum(x => x.grade);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.sum(x => x.grade);
        assert.equal(actual, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should return zero on empty sequence', () => {
        const sut = this.createSut<number>();
        const expected = 0;
        const actual = sut.sum();
        assert.equal(actual, expected);

        const sut2 = this.createSut<{ age: number; }>();
        const actual2 = sut2.sum(x => x.age);
        assert.equal(actual2, expected);
      });
    });

    describe("toArray()", () => {
      it('should return array with same items as the sequence', () => {
        const input = array.oneToTen;
        const expected = input.slice();
        const sut = this.createSut(input);
        const actual = sut.toArray();
        assert.sameOrderedMembers(actual, expected);
      });

      it('should return a new copy of array', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        const actual = sut.toArray();
        assert.notEqual(actual, input);
      });

      it('should return new array on cached sequence', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        sut.cache();
        const actual = sut.toArray();
        assert.notEqual(actual, input);
      });
    });

    describe('toMap()', () => {
      it('should return an instance of Map with the sequence distinct values by key selector', () => {
        const input = array.grades.concat(array.gradesFiftyAndAbove);
        const expected = new Map(input.map(x => [x.grade, x]));

        let sut = this.createSut(input);
        let actual = sut.toMap(x => x.grade);
        assert.sameDeepOrderedMembers([...actual], [...expected]);

        sut = this.createSut(generator.from(input));
        actual = sut.toMap(x => x.grade);
        assert.sameDeepOrderedMembers([...actual], [...expected]);
      });

      describe('with value selector', () => {
        it('should return an instance of Map with the sequence distinct values by key selector', () => {
          const input = array.grades.concat(array.gradesFiftyAndAbove);
          const expected = new Map(input.map(x => [x.grade, x.name]));

          let sut = this.createSut(input);
          let actual = sut.toMap(x => x.grade, x => x.name);
          assert.sameDeepOrderedMembers([...actual], [...expected]);

          sut = this.createSut(generator.from(input));
          actual = sut.toMap(x => x.grade, x => x.name);
          assert.sameDeepOrderedMembers([...actual], [...expected]);
        });
      });

      describe('with comparable key', () => {
        it('should return an instance of Map with the sequence distinct values by key selector', () => {
          const input: { x: number; y: number; z: number; }[] = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 0, z: 999},
            {x: 1, y: 1, z: 1},
            {x: 2, y: 2, z: 2},
          ];

          const keysSet = new Set();
          const expected = new Map();
          input.forEach(xyz => {
            const key = `[${xyz.x},${xyz.y}]`;
            if (!keysSet.has(key)) {
              keysSet.add(key);
              expected.set({x: xyz.x, y: xyz.y}, xyz);
            }
          });

          let sut = this.createSut(input);
          let actual = sut.toMap(xyz => ({x: xyz.x, y: xyz.y}), undefined, key => `[${key.x},${key.y}]`);
          assert.sameDeepOrderedMembers([...actual], [...expected]);

          sut = this.createSut(generator.from(input));
          actual = sut.toMap(xyz => ({x: xyz.x, y: xyz.y}), undefined, key => `[${key.x},${key.y}]`);
          assert.sameDeepOrderedMembers([...actual], [...expected]);
        });
      });

      describe('with value selector and comparable key', () => {
        it('should return an instance of Map with the sequence distinct values by key selector', () => {
          const input: { x: number; y: number; z: number; }[] = [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 0, z: 999},
            {x: 1, y: 1, z: 1},
            {x: 2, y: 2, z: 2},
          ];

          const keysSet = new Set();
          const expected = new Map();
          input.forEach(xyz => {
            const key = `[${xyz.x},${xyz.y}]`;
            if (!keysSet.has(key)) {
              keysSet.add(key);
              expected.set({x: xyz.x, y: xyz.y}, `[${xyz.x},${xyz.y},${xyz.z}]`);
            }
          });

          let sut = this.createSut(input);
          let actual = sut.toMap(
            xyz => ({x: xyz.x, y: xyz.y}),
            xyz => `[${xyz.x},${xyz.y},${xyz.z}]`,
            key => `[${key.x},${key.y}]`);
          assert.sameDeepOrderedMembers([...actual], [...expected]);

          sut = this.createSut(generator.from(input));
          actual = sut.toMap(
            xyz => ({x: xyz.x, y: xyz.y}),
            xyz => `[${xyz.x},${xyz.y},${xyz.z}]`,
            key => `[${key.x},${key.y}]`);
          assert.sameDeepOrderedMembers([...actual], [...expected]);
        });
      });
    });

    describe('toSet()', () => {
      it('should return an instance of Set with the sequence distinct values', () => {
        const input = array.abc.concat(['a', 'b', 'c']);
        const expected = new Set(input);
        let sut = this.createSut(input);
        let actual = sut.toSet();
        assert.sameOrderedMembers([...actual], [...expected]);

        sut = this.createSut(generator.from(input));
        actual = sut.toSet();
        assert.sameOrderedMembers([...actual], [...expected]);
      });

      describe('with key selector', () => {
        it('should return an instance of Set with the sequence distinct values', () => {
          const input = array.grades.concat(array.gradesFiftyAndAbove);
          const keysSet = new Set<number>();
          const expected = new Set<{ name: string; grade: number; }>();
          input.forEach(item => {
            if (!keysSet.has(item.grade)) {
              keysSet.add(item.grade);
              expected.add(item)
            }
          });
          let sut = this.createSut(input);
          let actual = sut.toSet(x => x.grade);
          assert.sameOrderedMembers([...actual], [...expected]);

          sut = this.createSut(generator.from(input));
          actual = sut.toSet(x => x.grade);
          assert.sameOrderedMembers([...actual], [...expected]);
        });
      });
    });

    describe('toString()', () => {
      it('should behave like Array.join', () => {
        for (const input of <any[][]>[array.abc, [], [1]]) {
          const sutArray = this.createSut<any>(input);
          const sutGenerator = this.createSut(generator.from<any>(input));
          for (const separator of <string[]>[undefined, '', ' ', ',', '|', "<=>", '/', null]) {
            const expected = input.join(separator);
            let actual = sutArray.toString(separator);
            assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join(${separator})`);
            actual = sutGenerator.toString(separator);
            assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join(${separator})`);
          }
        }
      });

      it('should return wrapped the string with either a start and/or end string', () => {
        for (const start of <string[]>['', undefined, null, '[', '{', ' ']) {
          for (const end of <string[]>['', undefined, null, ']', '}', ' ']) {
            for (const input of <any[]>[array.abc, [], [1]]) {
              const sutArray = this.createSut<any>(input);
              const sutGenerator = this.createSut(generator.from<any>(input));
              for (const separator of <string[]>[undefined, '', ' ', ',', '|', "<=>", '/', null]) {
                const expected = (start === undefined ? '' : start) + input.join(separator) + (end === undefined ? '' : end);
                let actual = sutArray.toString({start, separator, end});
                assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join({start: ${start}, separator: ${separator}, end: ${end}})`);
                actual = sutGenerator.toString({start, separator, end});
                assert.equal(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join({start: ${start}, separator: ${separator}, end: ${end}})`);
              }
            }
          }
        }
      });
    });

  });

  protected abstract createSut<T>(input?: Iterable<T>): SeqBase<T>;
}
