import {describe, it} from "mocha";
import {assert} from "chai";
import {array, generator, iterables, Sample} from "../test-data"
import {SeqBase} from "../../lib/seq-base";

export abstract class SeqBase_Immediate_Tests {
  constructor(protected optimized: boolean) {
  }

  it1<T>(title: string, input: T[], testFn: (input: Iterable<T>, inputArray: T[]) => void) {
    it(title + ' - array source', () => testFn(input, input));
    it(title + ' - generator source', () => testFn(generator.from(input), input));
    it(title + ' - sequence source', () => testFn(this.createSut(input), input));
  }

  it2<T, U = T>(title: string, first: T[], second: U[], testFn: (first: Iterable<T>, second: Iterable<U>) => void) {
    it(title + ' - first array, second array', () => testFn(first, second));
    it(title + ' - first array, second generator', () => testFn(first, generator.from(second)));
    it(title + ' - first array, second sequence', () => testFn(first, this.createSut(second)));

    it(title + ' - first generator, second array', () => testFn(generator.from(first), second));
    it(title + ' - first generator, second generator', () => testFn(generator.from(first), generator.from(second)));
    it(title + ' - first generator, second sequence', () => testFn(generator.from(first), this.createSut(second)));

    it(title + ' - first sequence, second array', () => testFn(this.createSut(first), second));
    it(title + ' - first sequence, second generator', () => testFn(this.createSut(first), generator.from(second)));
    it(title + ' - first sequence, second sequence', () => testFn(this.createSut(first), this.createSut(second)));
  }

  readonly run = () => describe('SeqBase - Immediate Execution', () => {
    describe('all()', () => {
      this.it1("should return true on empty sequence", [], (input) => {
        const sut = this.createSut(input);
        const actual = sut.all(() => false);
        assert.isTrue(actual);
      });

      describe("On non-empty sequence", () => {
        this.it1("should return true if all items match a condition", array.oneToTen, (input) => {
          const alwaysTrueCondition = () => true;
          const sut = this.createSut(input);
          const actual = sut.all(alwaysTrueCondition);
          assert.isTrue(actual);
        });

        this.it1("should return false if at least one item doesn't pass the condition", array.truthyValues, (input) => {
          const alwaysFalseCondition = () => false;
          const sut = this.createSut(input);
          assert.isFalse(sut.all(alwaysFalseCondition));
        });

        this.it1("should return false if condition return falsy value", [...array.oneToTen, 0/*falsy value*/], (input) => {
          const sut = this.createSut(input);
          const actual = sut.all(value => value);
          assert.isFalse(actual);
        });

        this.it1("should return true if condition return truthy value for all items", array.truthyValues, (input) => {
          const sut = this.createSut(input);
          const actual = sut.all(value => value);
          assert.isTrue(actual);
        });

        this.it1('should call condition with expected item and index', array.oneToTen, (input) => {
          const expected = [...input].map((x, i) => ({x, i}));
          const actual: { x: number, i: number }[] = [];

          const sut = this.createSut(input);
          sut.all((x, i) => actual.push({x, i}) + 1);
          assert.sameDeepOrderedMembers(actual, expected);
        });
      });
    });

    describe('any()', () => {
      this.it1("should return false on empty sequence", [], (input) => {
        const sut = this.createSut(input);
        const actual = sut.any(x => !!x);
        assert.isFalse(actual);
      });

      describe("On non-empty sequence", () => {
        this.it1("should return true if any item match a condition", array.falsyValues, (input) => {
          const alwaysTrueCondition = () => true;
          const sut = this.createSut(input);
          const actual = sut.any(alwaysTrueCondition);
          assert.isTrue(actual);
        });

        this.it1("should return false if all items don't pass the condition", array.truthyValues, (input) => {
          const alwaysFalseCondition = () => false;
          const sut = this.createSut(input);
          const actual = sut.all(alwaysFalseCondition);
          assert.isFalse(actual);
        });

        this.it1("should return false if condition return falsy value for all items", array.falsyValues, (input) => {
          const sut = this.createSut(input);
          const actual = sut.all(value => value);
          assert.isFalse(actual);
        });

        this.it1("should return true if condition return truthy value on any item", [...array.falsyValues, -1 /*truthy value*/], (input) => {
          const sut = this.createSut(input);

          const actual = sut.any(value => value);
          assert.isTrue(actual);
        });

        this.it1('should call condition with expected item and index', array.oneToTen, (input) => {
          const expected = [...input].map((x, i) => ({x, i}));
          const actual: { x: number, i: number }[] = [];

          const sut = this.createSut(input);

          sut.any((x, i) => {
            actual.push({x, i});
            return false;
          });
          assert.sameDeepOrderedMembers(actual, expected);
        });
      });
    });

    describe("at()", () => {
      this.it1("should return an item at expected index", array.zeroToNine, (input) => {
        const expected = [...input];
        const sut = this.createSut(input);
        expected.forEach((exp, index) => {
          let actual = sut.at(index);
          assert.equal(actual, exp);
        });
      });

      this.it1("should return default value at non-existing index", array.zeroToNine, (input) => {
        const sut = this.createSut(input);
        const expectedValueNotInSequence = -1;
        const outOfRangeIndex = [...input].length + 2;
        let actual = sut.at(outOfRangeIndex, expectedValueNotInSequence);

        assert.equal(actual, expectedValueNotInSequence);

        const negativeIndex = -outOfRangeIndex;
        actual = sut.at(negativeIndex, expectedValueNotInSequence);

        assert.equal(actual, expectedValueNotInSequence);
      });

      this.it1("should return undefined at non-existing index when no default value specified", array.zeroToNine, (input) => {
        const sut = this.createSut(input);

        const outOfRangeIndex = [...input].length;
        let actual = sut.at(outOfRangeIndex);
        assert.isUndefined(actual);

        const negativeIndex = -outOfRangeIndex - 2;
        actual = sut.at(negativeIndex);

        assert.isUndefined(actual);
      });

      this.it1('should return an item from the end of the sequence, when index is negative', array.zeroToNine, (input) => {
        const expected = [...input];
        const sut = this.createSut(input);
        expected.forEach((exp, index) => {
          const negativeIndex = -expected.length + index;
          const actual = sut.at(negativeIndex);
          assert.equal(actual, exp);
        });
      });
    });

    describe("average()", () => {
      this.it1('should return average for all items when no selector provided', array.oneToTen, (input) => {
        const expected = [...input].reduce((sum, x) => sum + x) / [...input].length;
        let sut = this.createSut(input);
        let actual = sut.average();
        assert.equal(actual, expected);
      });

      this.it1("should return average on item's property", array.grades, (input) => {
        const expected = [...input].reduce((sum, x) => sum + x.grade, 0) / [...input].length;

        let sut = this.createSut(input);
        let actual = sut.average(x => x.grade);
        assert.equal(actual, expected);
      });

      this.it1('should return NaN on empty sequence - numbers', [], (input: Iterable<number>) => {
        let sut = this.createSut(input);
        let actual = sut.average();
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

      this.it1('should return NaN on empty sequence - objects', [], (input: Iterable<{ age: number; }>) => {
        let sut = this.createSut<{ age: number; }>(input);
        let actual = sut.average(x => x.age);
        assert.isNaN(actual);
      });
    });

    describe("consume()", () => {
      this.it1('should iterate all items', array.oneToTen, (input) => {
        function* iterate<T>(items: Iterable<T>, consumed: T[]) {
          for (const item of items) {
            consumed.push(item);
            yield item;
          }
        }

        const actual: number[] = [];
        const sut = this.createSut(iterate(input, actual));
        sut.consume();
        assert.sameOrderedMembers(actual, [...input]);
      });
    });

    describe("count()", () => {
      this.it1('should return number of items in non empty sequence without condition', array.oneToTen, (input) => {
        const expected = [...input].length;
        let sut = this.createSut(input);
        let actual = sut.count();
        assert.equal(actual, expected);
      });

      this.it1('should return number of items in non empty sequence that met a condition', array.oneToTen, (input) => {
        const condition = (x: number) => x % 2 === 0;
        const expected = [...input].filter(condition).length;
        let sut = this.createSut(input);
        let actual = sut.count(condition);
        assert.equal(actual, expected);
      });

      this.it1('should return count of zero on when no item met the condition', [], (input) => {
        const alwaysFalseCondition = () => false;
        const expected = 0;
        let sut = this.createSut(input);
        let actual = sut.count(alwaysFalseCondition);
        assert.equal(actual, expected);
      });

      this.it1('should return zero count on empty sequence', [], (input) => {
        const expected = 0;
        let sut = this.createSut(input);
        let actual = sut.count();
        assert.equal(actual, expected);
      });
    });

    describe("endsWith()", () => {
      describe("without key selector", () => {
        this.it2("should return false if sequence doesn't end with all the specified items", array.oneToTen, array.range(1, -10), (first, second) => {
          let sut = this.createSut(first);
          let actual = sut.endsWith(second);
          assert.isFalse(actual);
        });

        this.it2('should return true if sequence ends with the specified items in same order', array.oneToTen, array.oneToTen.slice(-5), (first, second) => {
          let sut = this.createSut(first);
          let actual = sut.endsWith(second);
          assert.isTrue(actual);
        });

        this.it2('should return false if sequence ends with the specified items but NOT in same order', array.oneToTen, array.oneToTen.slice(5).reverse(), (first, second) => {
          let sut = this.createSut(first);
          let actual = sut.endsWith(second);
          assert.isFalse(actual);
        });
        this.it2('should return true if source sequence is not empty and checking if ends with empty iterable', array.oneToTen, [], (first, second) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second);
          assert.isTrue(actual);
        });
        this.it2('should return true if source sequence is empty and checking if ends with an empty iterable', [], [], (first, second) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second);
          assert.isTrue(actual);
        });
        this.it2('should return false if source sequence is empty and checked if ends with non empty iterable', [], array.oneToTen, (first: Iterable<number>, second) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second);
          assert.isFalse(actual);
        });

        this.it1('should return true if sequence is checked with itself', array.oneToTen, (input) => {
          const sut = this.createSut(input);
          let actual = sut.endsWith(sut);
          assert.isTrue(actual);
        });
      });

      describe("with key selector", () => {
        this.it2("should return false if sequence doesn't end with all the specified items", array.gradesFiftyAndAbove.reverse(), array.gradesFiftyAndBelow, (first, second) => {
          let sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.grade);
          assert.isFalse(actual);
        });

        this.it2('should return true if sequence ends with the specified items in same order', array.grades, array.gradesFiftyAndAbove, (first, second) => {
          let sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.grade);
          assert.isTrue(actual);
        });

        this.it2('should return false if sequence ends with the specified items but NOT in same order', array.grades, array.gradesFiftyAndAbove.reverse(), (first, second) => {
          let sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.grade);
          assert.isFalse(actual);
        });

        this.it2('should return true if source sequence not empty and items to check for is an empty sequence', array.samples, [], (first, second: Iterable<Sample>) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.period);
          assert.isTrue(actual);
        });

        this.it2('should return true if source sequence is empty and items to check for is an empty sequence', [], [], (first: Iterable<Sample>, second: Iterable<Sample>) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.period);
          assert.isTrue(actual);
        });
        this.it2('should return false if source sequence is empty and checked if ends with non empty iterable', [], array.samples, (first: Iterable<Sample>, second) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.period);
          assert.isFalse(actual);
        });

        this.it1('should return true if sequence is checked with itself', array.grades, (input) => {
          const sut = this.createSut(input);
          let actual = sut.endsWith(sut, x => x.grade);
          assert.isTrue(actual);
        });
      });

      describe("with second key selector", () => {
        this.it2("should return false if sequence doesn't end with all the specified items",
          array.gradesFiftyAndAbove.reverse(),
          array.gradesFiftyAndBelow.map(x => ({...x, score: x.grade})),
          (first, second) => {
            let sut = this.createSut(first);
            let actual = sut.endsWith(second, first => first.grade, second => second.score);
            assert.isFalse(actual);
          });

        this.it2('should return true if sequence ends with the specified items in same order',
          array.grades.map(x => ({...x, score: x.grade})),
          array.gradesFiftyAndAbove,
          (first, second) => {
            let sut = this.createSut(first);
            let actual = sut.endsWith(second, first => first.score, second => second.grade);
            assert.isTrue(actual);
          });

        this.it2('should return false if sequence ends with the specified items but NOT in same order',
          array.grades.map(x => ({...x, score: x.grade})),
          array.gradesFiftyAndAbove.reverse(),
          (first, second) => {
            let sut = this.createSut(first);
            let actual = sut.endsWith(second, first => first.score, second => second.grade);
            assert.isFalse(actual);
          });

        this.it2('should return true if source sequence not empty and items to check for is an empty sequence',
          array.samples.map(x => ({...x, phase: x.period})),
          [],
          (first, second: Iterable<Sample>) => {
            const sut = this.createSut(first);
            let actual = sut.endsWith(second, first => first.phase, second => second.period);
            assert.isTrue(actual);
          });

        this.it2('should return true if source sequence is empty and items to check for is an empty sequence', [], [], (first: Iterable<Sample>, second: Iterable<Sample>) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.period, x => x.period);
          assert.isTrue(actual);
        });
        this.it2('should return false if source sequence is empty and checked if ends with non empty iterable', [], array.samples, (first: Iterable<Sample>, second) => {
          const sut = this.createSut(first);
          let actual = sut.endsWith(second, x => x.period, x => x.period);
          assert.isFalse(actual);
        });

        this.it1('should return true if sequence is checked with itself', array.grades.map(x => ({
          ...x,
          score: x.grade
        })), (input) => {
          const sut = this.createSut(input);
          let actual = sut.endsWith(sut, first => first.score, second => second.grade);
          assert.isTrue(actual);
        });
      });
    });

    describe("every()", () => {
      this.it1('should return true if all items met a condition', array.grades, (input) => {
        const sut = this.createSut(input);
        let actual = sut.every(x => x.grade <= Number.MAX_VALUE);
        assert.isTrue(actual);
      });

      this.it1("should return false if one of the items doesn't met the condition", array.grades, (input) => {
        const sut = this.createSut(input);
        let actual = sut.every(x => x.grade < 0);
        assert.isFalse(actual);
      });

      this.it1('should return true on empty sequence', [], (input: Iterable<{ name: string, grade: number }>) => {
        const sut = this.createSut(input);
        let actual = sut.every(() => false);
        assert.isTrue(actual);
      });
    });

    describe("find()", () => {
      this.it1('should return undefined if non of the items met the condition', array.grades.concat(array.grades.reverse()), (input) => {
        let sut = this.createSut(input);
        let actual = sut.find(() => false);
        assert.isUndefined(actual);
      });

      this.it1('should return undefined if sequence is empty', [], (input) => {
        let sut = this.createSut(input);
        let actual = sut.find(() => true);
        assert.isUndefined(actual);
      });

      this.it1('should return first item that meets the condition', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
        const expected = [...input].find(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.find(x => x > 5);
        assert.equal(actual, expected);
      });

      describe("starting from index", () => {
        this.it1('should return undefined if non of the items from the specified from-index, meet the condition', array.oneToTen, (input) => {
          const fromIndex = [...input].length;
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, () => false);
          assert.isUndefined(actual);
        });

        this.it1('should return undefined if sequence is empty', [], (input) => {
          let sut = this.createSut(input);
          let actual = sut.find(1, () => true);
          assert.isUndefined(actual);
        });

        this.it1('should return first item that meets the condition, after the specified from-index- numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const fromIndex = array.oneToTen.length;
          const expected = [...input].find((x, index) => index >= fromIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, x => x > 5);
          assert.equal(actual, expected);
        });

        this.it1('should return first item that meets the condition, after the specified from-index - objects', array.grades.concat(array.grades.reverse()), (input) => {
          const fromIndex = array.grades.length;
          const expected = [...input].find((x, index) => index >= fromIndex && x.grade > 50);
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, x => x.grade > 50);
          assert.deepEqual(actual, expected);
        });

        this.it1('should return undefined if from-index is out of range', array.oneToTen, (input) => {
          const fromIndex = [...input].length;
          let sut = this.createSut(input);
          let actual = sut.find(fromIndex, () => true);
          assert.isUndefined(actual);
        });
      });

      describe("with default value", () => {
        this.it1('should return default value if non of the items meet the condition', array.oneToTen, (input) => {
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.find(() => false, expected);
          assert.equal(actual, expected);
        });

        this.it1('should return default value if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut<number>(input);
          let actual = sut.find(() => true, expected);
          assert.equal(actual, expected);
        });

        describe("starting from index", () => {
          this.it1('should return default value if non of the items from the specified from-index, meet the condition', array.oneToTen, (input) => {
            const fromIndex = [...input].length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.find(fromIndex, () => false, expected);
            assert.equal(actual, expected);
          });

          this.it1('should return default value if sequence is empty', [], (input) => {
            const expected = -1;
            let sut = this.createSut<number>(input);
            let actual = sut.find(1, () => true, expected);
            assert.equal(actual, expected);
          });

          this.it1('should return default value if from-index is out of range', array.oneToTen, (input) => {
            const fromIndex = [...input].length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.find(fromIndex, () => true, expected);
            assert.equal(actual, expected);
          });
        });
      });
    });

    describe("findIndex()", () => {
      this.it1('should return -1 if non of the items meet the condition', array.oneToTen, (input) => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findIndex(() => false);
        assert.equal(actual, expected);
      });

      this.it1('should return -1 if sequence is empty', [], (input) => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findIndex(() => true);
        assert.equal(actual, expected);
      });

      this.it1('should return index of first item that meets the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
        const expected = [...input].findIndex(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findIndex(x => x > 5);
        assert.equal(actual, expected);
      });
      this.it1('should return index of first item that meets the condition - objects', array.grades.concat(array.grades.reverse()), (input) => {
        const expected = [...input].findIndex(x => x.grade > 50);
        let sut = this.createSut(input);
        let actual = sut.findIndex(x => x.grade > 50);
        assert.equal(actual, expected);
      });

      describe("starting from index", () => {
        this.it1('should return -1 if non of the items from the specified from-index, meet the condition', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const fromIndex = array.oneToTen.length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, () => false);
          assert.equal(actual, expected);
        });

        this.it1('should return -1 if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(1, () => true);
          assert.equal(actual, expected);
        });

        this.it1('should return index of first item that meets the condition, after the specified from-index - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const fromIndex = array.oneToTen.length;
          const expected = [...input].findIndex((x, index) => index >= fromIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, x => x > 5);
          assert.equal(actual, expected);
        });
        this.it1('should return index of first item that meets the condition, after the specified from-index - objects', array.grades.concat(array.grades.reverse()), (input) => {
          const fromIndex = array.grades.length;
          const expected = [...input].findIndex((x, index) => index >= fromIndex && x.grade > 50);
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, x => x.grade > 50);
          assert.equal(actual, expected);
        });

        this.it1('should return -1 if from-index is out of range', array.oneToTen, (input) => {
          const fromIndex = [...input].length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, () => true);
          assert.equal(actual, expected);
        });
      });
    });

    describe("findLast()", () => {
      this.it1('should return undefined if non of the items meet the condition', array.oneToTen, (input) => {
        let sut = this.createSut(input);
        let actual = sut.findLast(() => false);
        assert.isUndefined(actual);
      });

      this.it1('should return undefined if sequence is empty', [], (input) => {
        let sut = this.createSut(input);
        let actual = sut.findLast(() => true);
        assert.isUndefined(actual);
      });

      this.it1('should return last item that meets the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
        const expected = [...input].reverse().find(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findLast(x => x > 5);
        assert.equal(actual, expected);
      });
      this.it1('should return last item that meets the condition - objects', array.grades.concat(array.grades.reverse()), (input) => {
        const expected = [...input].reverse().find(x => x.grade > 50);
        let sut = this.createSut(input);
        let actual = sut.findLast(x => x.grade > 50);
        assert.equal(actual, expected);
      });

      describe("find till index", () => {
        this.it1('should return undefined if non of the items from the specified till-index, meet the condition', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const tillIndex = array.oneToTen.length;
          let sut = this.createSut(input);
          let actual = sut.findLast(tillIndex, () => false);
          assert.isUndefined(actual);
        });

        this.it1('should return undefined if sequence is empty', [], (input) => {
          let sut = this.createSut(input);
          let actual = sut.findLast(1, () => true);
          assert.isUndefined(actual);
        });

        this.it1('should return last item that meets the condition, not after the specified till-index - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const tillIndex = array.oneToTen.length - 1;
          const expected = [...input].slice().reverse().find((x, index) => index > tillIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.findLast(tillIndex, x => x > 5);
          assert.equal(actual, expected);
        });
        this.it1('should return last item that meets the condition, not after the specified till-index - objects', array.grades.concat(array.grades.reverse()), (input) => {
          const tillIndex = array.grades.length - 1;
          const expected2 = [...input].reverse().find((x, index) => index > tillIndex && x.grade > 50);
          let sut = this.createSut(input);
          let actual = sut.findLast(tillIndex, x => x.grade > 50);
          assert.deepEqual(actual, expected2);
        });

        this.it1('should return undefined if till-index is out of range', array.oneToTen, (input) => {
          const fromIndex = -1;
          let sut = this.createSut(input);
          let actual = sut.findLast(fromIndex, () => true);
          assert.isUndefined(actual);
        });
      });

      describe("with default value", () => {
        this.it1('should return default value if non of the items meet the condition', array.oneToTen, (input) => {
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLast(() => false, expected);
          assert.equal(actual, expected);
        });

        this.it1('should return default value if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut<number>(input);
          let actual = sut.findLast(() => true, expected);
          assert.equal(actual, expected);
        });

        describe("find till index", () => {
          this.it1('should return default value if non of the items from the specified till-index, meet the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
            const fromIndex = array.oneToTen.length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => false, expected);
            assert.equal(actual, expected);
          });
          this.it1('should return default value if non of the items from the specified till-index, meet the condition - objects', array.grades.concat(array.grades.reverse()), (input) => {
            const expected = {name: "test", grade: -1};
            const fromIndex = array.grades.length;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => false, expected);
            assert.deepEqual(actual, expected);
          });
          this.it1('should return default value if sequence is empty', [], (input) => {
            const expected = -1;
            let sut = this.createSut<number>(input);
            let actual = sut.findLast(1, () => true, expected);
            assert.equal(actual, expected);
          });

          this.it1('should return default value if till-index is out of range - numbers', array.oneToTen, (input) => {
            const fromIndex = -1;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => true, expected);
            assert.equal(actual, expected);
          });
          this.it1('should return default value if till-index is out of range - objects', array.grades, (input) => {
            const expected = {name: "test", grade: -1};
            const tillIndex = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(tillIndex, () => true, expected);
            assert.equal(actual, expected);
          });
        });
      });
    });

    describe("findLastIndex()", () => {
      this.it1('should return -1 if non of the items meet the condition', array.oneToTen, (input) => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(() => false);
        assert.equal(actual, expected);
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
          const second = array.gradesFiftyAndBelow.map(x => ({...x, score: x.grade}));
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
          const second = array.gradesFiftyAndBelow.map(x => ({...x, score: x.grade}));
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
          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, fromIndex);
          assert.equal(actual, true);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.equal(actual, true);
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
          const second = array.gradesFiftyAndAbove.map(x => ({...x, score: x.grade}));

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

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, true);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.equal(actual, true);
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

      describe('with equality function', () => {
        it('should return true if sequence contains entire sub-sequence is same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove.map(x => ({...x, score: x.grade}));

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, {equals: (a, b) => a.grade === b.score});
          assert.isTrue(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), x => x.grade);
          assert.isTrue(actual);
        });

        it('should return false if sequence do not contain sub-sequence', () => {
          const first = array.grades;
          const second = first;

          let sut = this.createSut(first);
          let actual = sut.includesSubSequence(second, {equals: () => false});
          assert.isFalse(actual);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), {equals: () => false});
          assert.isFalse(actual);
        });

        describe('from index', () => {
          it('should return true if sequence contains entire sub-sequence is same order', () => {
            const input = [...'.'.repeat(10)].map(() => ({x: 0, y: 0}));
            const first = input;
            const second = input.slice(0, 3);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.includesSubSequence(second, fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.equal(actual, true);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.equal(actual, true);
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

      describe('with equality function', () => {
        it('should return true if sequence contains entire sub-sequence is same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove;
          const expected = first.findIndex(x => x.grade === second[0].grade);
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, {equals: (a, b) => a.grade === b.grade});
          assert.equal(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), {equals: (a, b) => a.grade === b.grade});
          assert.equal(actual, expected);
        });

        it('should return false if sequence do not contain entire sub-sequence', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove.reverse();

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, {equals: () => false});
          assert.equal(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), {equals: () => false});
          assert.equal(actual, -1);
        });

        describe('from index', () => {
          it('should return true if sequence contains entire sub-sequence is same order', () => {
            const first = array.repeat({x: 0, y: 0}, 10);
            const second = first.slice(0, 3);
            const fromIndex = 5;
            const expected = fromIndex;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.equal(actual, expected);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.equal(actual, expected);
          });

          it('should return false if sequence do not contain entire sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).reverse();
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, {equals: () => false});
            assert.equal(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, {equals: () => false});
            assert.equal(actual, -1);
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

    describe("maxItem()", () => {
      describe('with key-selector', () => {
        this.it1("should return first item having the maximum value on item's numeric property", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade < grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem(x => x.grade);
          assert.equal(actual, expected);
        });

        this.it1("should return last item having the maximum value on item's numeric property, when options.findLast is true", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade <= grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem(x => x.grade, {findLast: true});
          assert.equal(actual, expected);
        });

        it('should return undefined on empty sequence', () => {
          const sut = this.createSut<{ age: number; }>();
          const actual = sut.maxItem(x => x.age);
          assert.isUndefined(actual);
        });
      });

      describe('with comparer', () => {
        this.it1("should return first item having the maximum value", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade < grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem({comparer: (a, b) => a.grade - b.grade});
          assert.equal(actual, expected);
        });

        this.it1("should return last item having the maximum value, when options.findLast is true", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade <= grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem({comparer: (a, b) => a.grade - b.grade, findLast: true});
          assert.equal(actual, expected);

        });

        it('should return undefined on empty sequence', () => {
          const sut = this.createSut<{ age: number; }>();
          const actual = sut.maxItem({comparer: (a, b) => a.age - b.age});
          assert.isUndefined(actual);
        });
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

    describe("minItem()", () => {
      describe('with key-selector', () => {
        this.it1("should return first item having the minimum value on item's numeric property",  [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade > grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem(x => x.grade);
          assert.equal(actual, expected);
        });

        this.it1("should return last item having the minimum value on item's numeric property, when options.findLast is true",  [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade >= grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem(x => x.grade, {findLast: true});
          assert.equal(actual, expected);
        });

        it('should return undefined on empty sequence', () => {
          const sut = this.createSut<{ age: number; }>();
          const actual = sut.minItem(x => x.age);
          assert.isUndefined(actual);
        });
      });

      describe('with comparer', () => {
        this.it1("should return first item having the minimum value",  [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade > grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem({comparer: (a, b) => a.grade - b.grade});
          assert.equal(actual, expected);
        });

        this.it1("should return last item having the minimum value, when options.findLast is true",  [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade >= grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem({comparer: (a, b) => a.grade - b.grade, findLast: true});
          assert.equal(actual, expected);
        });

        it('should return undefined on empty sequence', () => {
          const sut = this.createSut<{ age: number; }>();
          const actual = sut.minItem({comparer: (a, b) => a.age - b.age});
          assert.isUndefined(actual);
        });
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

        const test = (initialValue?: number): void => {
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

      describe('with second key selector', () => {
        it('should return true if sequence contains second sequence from the beginning with exact same items and same order', () => {
          const input = array.grades;
          const sutArray = this.createSut(array.grades);
          const sutGenerator = this.createSut(generator.from(input));

          for (let take = 1; take < input.length; take++) {
            const second = input.slice(0, take).map(x => ({...x, score: x.grade}));
            let actual = sutArray.startsWith(second, first => first.grade, second => second.score);
            assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
            actual = sutGenerator.startsWith(second, first => first.grade, second => second.score);
            assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
          }
        });

        it("should return false if sequence doesn't start with second sequence", () => {
          const input = array.grades;
          let second = array.grades.map(x => ({...x, score: x.grade}));
          second[second.length - 1] = second[second.length - 2];
          const sutArray = this.createSut(input);
          const sutGenerator = this.createSut(generator.from(input));
          assert.isFalse(sutArray.startsWith(second, first => first.grade, second => second.score));
          assert.isFalse(sutGenerator.startsWith(second, first => first.grade, second => second.score));
        });

        it('should return false if second sequence has more items', () => {
          const input = array.gradesFiftyAndAbove;
          const second = array.grades.map(x => ({...x, score: x.grade}));
          const sutArray = this.createSut(input);
          const sutGenerator = this.createSut(generator.from(input));
          assert.isFalse(sutArray.startsWith(second, first => first.grade, second => second.score));
          assert.isFalse(sutGenerator.startsWith(second, first => first.grade, second => second.score));


          it('should return false second sequence starts with first sequence', () => {
            const input = array.grades.slice(0, -1);
            const second = array.grades.map(x => ({...x, score: x.grade}));
            const sutArray = this.createSut(input);
            const sutGenerator = this.createSut(generator.from(input));
            assert.isFalse(sutArray.startsWith(second, first => first.grade, second => second.score));
            assert.isFalse(sutGenerator.startsWith(second, first => first.grade, second => second.score));
          });
        });

        it('should return true if second sequence is empty', () => {
          let input = array.grades;
          const second: { name: string; grade: number; score: number; }[] = [];
          const sutArray = this.createSut(input);
          const sutGenerator = this.createSut(generator.from(input));
          assert.isTrue(sutArray.startsWith(second, first => first.grade, second => second.score));
          assert.isTrue(sutGenerator.startsWith(second, first => first.grade, second => second.score));

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
        let actual = sut.sum(g => g.grade);
        assert.equal(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.sum(g => g.grade);
        assert.equal(actual, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should return zero on empty sequence', () => {
        const sut = this.createSut<number>();
        const expected = 0;
        const actual = sut.sum();
        assert.equal(actual, expected);

        const sut2 = this.createSut<{ age: number; }>();
        const actual2 = sut2.sum();
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
      it('should return comma delimited string  of the sequence items, confined within square brackets', () => {
        const input = array.oneToTen;
        const expected = '[' + input.join() + ']';
        const actual = this.createSut(input).toString();
        assert.equal(actual, expected);
      });
    });
  });

  protected abstract createSut<T>(input?: Iterable<T>): SeqBase<T>;
}
