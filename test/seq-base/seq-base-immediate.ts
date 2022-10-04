import {describe, it} from "mocha";
import {assert} from "chai";
import {array, generator, Sample} from "../test-data"
import {SeqBase} from "../../lib/seq-base";
import {Seq, Selector} from "../../lib";
import {TestIt} from "../test-harness";

export abstract class SeqBase_Immediate_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
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
          assert.strictEqual(actual, exp);
        });
      });

      this.it1("should return default value at non-existing index", array.zeroToNine, (input) => {
        const sut = this.createSut(input);
        const expectedValueNotInSequence = -1;
        const outOfRangeIndex = [...input].length + 2;
        let actual = sut.at(outOfRangeIndex, expectedValueNotInSequence);

        assert.strictEqual(actual, expectedValueNotInSequence);

        const negativeIndex = -outOfRangeIndex;
        actual = sut.at(negativeIndex, expectedValueNotInSequence);

        assert.strictEqual(actual, expectedValueNotInSequence);
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
          assert.strictEqual(actual, exp);
        });
      });
    });

    describe("average()", () => {
      this.it1('should return average for all items when no selector provided', array.oneToTen, (input) => {
        const expected = [...input].reduce((sum, x) => sum + x) / [...input].length;
        let sut = this.createSut(input);
        let actual = sut.average();
        assert.strictEqual(actual, expected);
      });

      this.it1("should return average on item's property", array.grades, (input) => {
        const expected = [...input].reduce((sum, x) => sum + x.grade, 0) / [...input].length;

        let sut = this.createSut(input);
        let actual = sut.average(x => x.grade);
        assert.strictEqual(actual, expected);
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
        assert.strictEqual(actual, expected);
      });

      this.it1('should return number of items in non empty sequence that met a condition', array.oneToTen, (input) => {
        const condition = (x: number) => x % 2 === 0;
        const expected = [...input].filter(condition).length;
        let sut = this.createSut(input);
        let actual = sut.count(condition);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return count of zero on when no item met the condition', [], (input) => {
        const alwaysFalseCondition = () => false;
        const expected = 0;
        let sut = this.createSut(input);
        let actual = sut.count(alwaysFalseCondition);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return zero count on empty sequence', [], (input) => {
        const expected = 0;
        let sut = this.createSut(input);
        let actual = sut.count();
        assert.strictEqual(actual, expected);
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

        describe('second is partial type of first', () => {
          const FIRST: readonly { id: number; name: string; }[] = [
            {id: 0, name: '0'}, {id: 1, name: '1'}, {id: 2, name: '2'}, {id: 3, name: '3'},
            {id: 4, name: '4'}, {id: 5, name: '5'}, {id: 6, name: '6'}, {id: 7, name: '7'}
          ];
          const SECOND: readonly { id: number; }[] = [{id: 0}, {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}, {id: 7}];

          this.it2("should return false if sequence doesn't end with all the specified items",
            FIRST.map((x, i) => FIRST[FIRST.length - i - 1]),
            SECOND,
            (first, second) => {
              let sut = this.createSut(first);
              let actual = sut.endsWith(second, x => x.id);
              assert.isFalse(actual);
            });

          this.it2('should return true if sequence ends with the specified items in same order',
            FIRST,
            SECOND.slice(4),
            (first, second) => {
              let sut = this.createSut(first);
              let actual = sut.endsWith(second, x => x.id);
              assert.isTrue(actual);
            });

          this.it2('should return false if sequence ends with the specified items but NOT in same order',
            FIRST,
            SECOND.slice(-4).reverse(),
            (first, second) => {
              let sut = this.createSut(first);
              let actual = sut.endsWith(second, x => x.id);
              assert.isFalse(actual);
            });

          this.it2('should return true if source sequence not empty and items to check for is an empty sequence',
            FIRST,
            [] as { id: number; }[],
            (first, second) => {
              const sut = this.createSut(first);
              let actual = sut.endsWith(second, x => x.id);
              assert.isTrue(actual);
            });

          this.it2('should return false if source sequence is empty and checked if ends with non empty iterable',
            [] as { id: number; name: string; }[], SECOND, (first, second) => {
              const sut = this.createSut(first);
              let actual = sut.endsWith(second, x => x.id);
              assert.isFalse(actual);
            });
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

      describe("with equality comparer", () => {
        this.it2("should return false if sequence doesn't end with all the specified items",
          array.gradesFiftyAndAbove.reverse(),
          array.gradesFiftyAndBelow.map(x => ({name: x.name, score: x.grade})),
          (first, second) => {
            let sut = this.createSut(first);
            let actual = sut.endsWith(second, {equals: (f, s) => f.grade === s.score});
            assert.isFalse(actual);
          });

        this.it2('should return true if sequence ends with the specified items in same order',
          array.grades.map(x => ({name: x.name, score: x.grade})),
          array.gradesFiftyAndAbove,
          (first, second) => {
            let sut = this.createSut(first);
            let actual = sut.endsWith(second, {equals: (f, s) => f.score === s.grade});
            assert.isTrue(actual);
          });

        this.it2('should return false if sequence ends with the specified items but NOT in same order',
          array.grades.map(x => ({name: x.name, score: x.grade})),
          array.gradesFiftyAndAbove.reverse(),
          (first, second) => {
            let sut = this.createSut(first);
            let actual = sut.endsWith(second, {equals: (f, s) => f.score === s.grade});
            assert.isFalse(actual);
          });

        this.it2('should return true if source sequence not empty and items to check for is an empty sequence',
          array.samples.map(x => ({...x, phase: x.period})),
          [] as Sample[],
          (first, second: Iterable<Sample>) => {
            const sut = this.createSut(first);
            let actual = sut.endsWith(second, {equals: (f, s) => f.phase === s.period});
            assert.isTrue(actual);
          });

        this.it2('should return true if source sequence is empty and items to check for is an empty sequence',
          [] as Sample[], [] as Sample[], (first, second) => {
            const sut = this.createSut(first);
            let actual = sut.endsWith(second, {equals: (f, s) => f.period === s.period});
            assert.isTrue(actual);
          });

        this.it2('should return false if source sequence is empty and checked if ends with non empty iterable',
          [] as Sample[], array.samples, (first, second) => {
            const sut = this.createSut(first);
            let actual = sut.endsWith(second, {equals: (f, s) => f.period === s.period});
            assert.isFalse(actual);
          });

        this.it1('should return true if sequence is checked with itself',
          array.grades.map(x => ({...x, score: x.grade})),
          (input) => {
            const sut = this.createSut(input);
            let actual = sut.endsWith(sut, {equals: (f, s) => f.grade === s.score});
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
        assert.strictEqual(actual, expected);
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
          assert.strictEqual(actual, expected);
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
          const sut = this.createSut(input);
          const actual = sut.find(fromIndex, () => true);
          assert.isUndefined(actual);
        });

        this.it1('should return first item (at start 0) if provided start index is negative', array.grades, input => {
          let actualFirstIteratedIndex = 0;
          const negativeIndex = -2;
          const sut = this.createSut(input);
          sut.find(negativeIndex, (item, i) => {
            actualFirstIteratedIndex = i;
            return true;
          });
          assert.strictEqual(actualFirstIteratedIndex, 0);
        });
      });

      describe("with default value", () => {
        this.it1('should return default value if non of the items meet the condition', array.oneToTen, (input) => {
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.find(() => false, expected);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return default value if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut<number>(input);
          let actual = sut.find(() => true, expected);
          assert.strictEqual(actual, expected);
        });

        describe("starting from index", () => {
          this.it1('should return default value if non of the items from the specified from-index, meet the condition', array.oneToTen, (input) => {
            const fromIndex = [...input].length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.find(fromIndex, () => false, expected);
            assert.strictEqual(actual, expected);
          });

          this.it1('should return default value if sequence is empty', [], (input) => {
            const expected = -1;
            let sut = this.createSut<number>(input);
            let actual = sut.find(1, () => true, expected);
            assert.strictEqual(actual, expected);
          });

          this.it1('should return default value if from-index is out of range', array.oneToTen, (input) => {
            const fromIndex = [...input].length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.find(fromIndex, () => true, expected);
            assert.strictEqual(actual, expected);
          });
        });
      });
    });

    describe("findIndex()", () => {
      this.it1('should return -1 if non of the items meet the condition', array.oneToTen, (input) => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findIndex(() => false);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return -1 if sequence is empty', [], (input) => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findIndex(() => true);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return index of first item that meets the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
        const expected = [...input].findIndex(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findIndex(x => x > 5);
        assert.strictEqual(actual, expected);
      });
      this.it1('should return index of first item that meets the condition - objects', array.grades.concat(array.grades.reverse()), (input) => {
        const expected = [...input].findIndex(x => x.grade > 50);
        let sut = this.createSut(input);
        let actual = sut.findIndex(x => x.grade > 50);
        assert.strictEqual(actual, expected);
      });

      describe("starting from index", () => {
        this.it1('should return -1 if non of the items from the specified from-index, meet the condition', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const fromIndex = array.oneToTen.length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, () => false);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return -1 if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(1, () => true);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return index of first item that meets the condition, after the specified from-index - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
          const fromIndex = array.oneToTen.length;
          const expected = [...input].findIndex((x, index) => index >= fromIndex && x > 5);
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, x => x > 5);
          assert.strictEqual(actual, expected);
        });
        this.it1('should return index of first item that meets the condition, after the specified from-index - objects', array.grades.concat(array.grades.reverse()), (input) => {
          const fromIndex = array.grades.length;
          const expected = [...input].findIndex((x, index) => index >= fromIndex && x.grade > 50);
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, x => x.grade > 50);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return -1 if from-index is out of range', array.oneToTen, (input) => {
          const fromIndex = [...input].length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findIndex(fromIndex, () => true);
          assert.strictEqual(actual, expected);
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
        assert.strictEqual(actual, expected);
      });
      this.it1('should return last item that meets the condition - objects', array.grades.concat(array.grades.reverse()), (input) => {
        const expected = [...input].reverse().find(x => x.grade > 50);
        let sut = this.createSut(input);
        let actual = sut.findLast(x => x.grade > 50);
        assert.strictEqual(actual, expected);
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
          assert.strictEqual(actual, expected);
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
          assert.strictEqual(actual, expected);
        });

        this.it1('should return default value if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut<number>(input);
          let actual = sut.findLast(() => true, expected);
          assert.strictEqual(actual, expected);
        });

        describe("find till index", () => {
          this.it1('should return default value if non of the items from the specified till-index, meet the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input) => {
            const fromIndex = array.oneToTen.length;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => false, expected);
            assert.strictEqual(actual, expected);
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
            assert.strictEqual(actual, expected);
          });

          this.it1('should return default value if till-index is out of range - numbers', array.oneToTen, (input) => {
            const fromIndex = -1;
            const expected = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(fromIndex, () => true, expected);
            assert.strictEqual(actual, expected);
          });
          this.it1('should return default value if till-index is out of range - objects', array.grades, (input) => {
            const expected = {name: "test", grade: -1};
            const tillIndex = -1;
            let sut = this.createSut(input);
            let actual = sut.findLast(tillIndex, () => true, expected);
            assert.strictEqual(actual, expected);
          });
        });
      });
    });

    describe("findLastIndex()", () => {
      this.it1('should return -1 if non of the items meet the condition', array.oneToTen, (input) => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(() => false);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return -1 if sequence is empty', [], input => {
        const expected = -1;
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(() => true);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return index of last item that meets the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input, inputArray) => {
        const expected = inputArray.length - 1 - inputArray.slice().reverse().findIndex(x => x > 5);
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(x => x > 5);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return index of last item that meets the condition - objects', array.grades.concat(array.grades.reverse()), (input, inputArray) => {
        const expected = inputArray.length - 1 - inputArray.slice().reverse().findIndex(x => x.grade > 50);
        let sut = this.createSut(input);
        let actual = sut.findLastIndex(x => x.grade > 50);
        assert.strictEqual(actual, expected);
      });

      describe("starting till index", () => {
        this.it1('should return -1 if non of the items from the specified till-index, meet the condition - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), input => {
          const fromIndex = array.oneToTen.length;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, () => false);
          assert.strictEqual(actual, expected);
        });
        this.it1('should return -1 if non of the items from the specified till-index, meet the condition - objects', array.grades.concat(array.grades.reverse()), input => {
          const expected = -1;
          const fromIndex2 = array.grades.length;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex2, () => false);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return -1 if sequence is empty', [], (input) => {
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(1, () => true);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return index of last item that meets the condition, after the specified till-index - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input, inputArray) => {
          const fromIndex = array.oneToTen.length;
          const expected = inputArray.map((x, i) => [x, i]).slice(0, fromIndex + 1).filter(([x,]) => x > 5).slice(-1)[0][1];
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, x => x > 5);
          assert.strictEqual(actual, expected);
        });

        this.it1('should return index of last item that meets the condition, after the specified till-index - objects', array.grades.concat(array.grades.reverse()), (input, inputArray) => {
          const fromIndex = array.grades.length;
          const expected = inputArray.map((x, i) => ({
            x,
            i
          })).slice(0, fromIndex + 1).filter(({x}) => x.grade > 50).slice(-1)[0].i;
          let sut2 = this.createSut(input);
          let actual2 = sut2.findLastIndex(fromIndex, x => x.grade > 50);
          assert.strictEqual(actual2, expected);
        });

        this.it1('should return -1 if till-index is out of range - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), input => {
          const fromIndex = -2;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, () => true);
          assert.strictEqual(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -2;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.findLastIndex(fromIndex2, () => true);
          assert.strictEqual(actual2, expected);
        });

        this.it1('should return -1 if till-index is out of range - numbers', array.grades.concat(array.grades.reverse()), input => {
          const expected = -1;
          const fromIndex = -2;
          let sut = this.createSut(input);
          let actual = sut.findLastIndex(fromIndex, () => true);
          assert.strictEqual(actual, expected);
        });
      });
    });

    describe("first()", () => {
      this.it1('should return the first item in the sequence - numbers', array.oneToTen, (input, inputArray) => {
        const expected = inputArray[0];
        let sut = this.createSut(input);
        let actual = sut.first();
        assert.strictEqual(actual, expected);
      });

      this.it1('should return the first item in the sequence - objects', array.grades, (input, inputArray) => {
        const expected = inputArray[0];
        let sut = this.createSut(input);
        let actual = sut.first();
        assert.deepEqual(actual, expected);
      });

      this.it1('should return undefined on empty sequence', [], input => {
        let sut = this.createSut(input);
        let actual = sut.first();
        assert.isUndefined(actual);
      });

      this.it1('should return default value on empty sequence', [], input => {
        const expected = -1;
        let sut = this.createSut<number>(input);
        let actual = sut.first(expected);
        assert.strictEqual(actual, expected);
      });
    });

    describe('forEach()', () => {
      this.it1('should execute callback function on each item in sequence', array.oneToTen, (input, inputArray) => {
        const expected = inputArray.map((value, index) => ({value, index}));
        const actual: { value: number, index: number }[] = [];
        const callback = (value: number, index: number) => {
          actual.push({value, index});
        };

        let sut = this.createSut(input);
        sut.forEach(callback);
        assert.sameDeepOrderedMembers(actual, expected);
      });

      this.it1('should not execute callback function on empty sequence', [], (input) => {
        let actual = false;
        const callback = () => actual = true;
        let sut = this.createSut(input);
        sut.forEach(callback);
        assert.isFalse(actual);
      });

      this.it1('should break loop if returning the breakReturnValue parameter in the callback', array.oneToTen, input => {
        let sut = this.createSut(input);
        const expected = 5;
        let actual = -1;
        sut.forEach((value, i, breakReturnValue) => {
          actual = value;
          if (value === expected) return breakReturnValue;
        });

        assert.strictEqual(actual, expected);
      });
    });

    describe('hasAtLeast()', () => {
      this.it1('should return true if sequence as number of expected items', array.oneToTen, (input, inputArray) => {
        let sut = this.createSut(input);
        for (let count = 1; count <= inputArray.length; count++) {
          let actual = sut.hasAtLeast(count);
          assert.isTrue(actual);
        }
      });

      this.it1('should return false if sequence has less items than expected', array.oneToTen, (input, inputArray) => {
        let sut = this.createSut(input);
        let actual = sut.hasAtLeast(inputArray.length + 1);
        assert.isFalse(actual);
      });

      this.it1('should return false if sequence is empty', [], (input) => {
        let sut = this.createSut(input);
        let actual = sut.hasAtLeast(1);
        assert.isFalse(actual);
      });

      this.it1('should throw exception if count parameter is not positive', array.oneToTen, input => {
        let sut = this.createSut(input);
        assert.throws(() => sut.hasAtLeast(0));
        assert.throws(() => sut.hasAtLeast(-1));
      });
    });

    describe("includes()", () => {
      this.it1('should return true if sequence includes the item - numbers', array.oneToTen, (input, inputArray) => {
        const expected = inputArray.includes(5);
        let sut = this.createSut(input);
        let actual = sut.includes(5);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return true if sequence includes the item - objects', array.grades, (input, inputArray) => {
        const expected = inputArray.includes(inputArray[5]);
        let sut = this.createSut(input);
        let actual = sut.includes(inputArray[5]);
        assert.strictEqual(actual, expected);
      });

      this.it1("should return false if sequence doesn't include the item - numbers", array.oneToTen.concat(array.zeroToNine.reverse()), input => {
        const valueToFind = -1;
        let sut = this.createSut(input);
        let actual = sut.includes(valueToFind);
        assert.isFalse(actual);
      });

      this.it1("should return false if sequence doesn't include the item - objects", array.grades.concat(array.grades.reverse()), input => {
        const valueToFind = {name: "missing", grade: -1};
        let sut = this.createSut(input);
        let actual = sut.includes(valueToFind);
        assert.isFalse(actual);
      });

      this.it1('should return false if sequence is empty', [], input => {
        let sut = this.createSut<any>(input);
        let actual = sut.includes(undefined);
        assert.isFalse(actual);
      });

      describe("starting from index", () => {
        this.it1('should return true if sequence includes the item, after the specified from-index - numbers', array.oneToTen.concat(array.zeroToNine.reverse()), (input, inputArray) => {
          const valueToFind = inputArray[0];
          const fromIndex = 1;

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
        });

        this.it1('should return true if sequence includes the item, after the specified from-index - objects', array.repeatConcat(array.grades, 2), (input, inputArray) => {
          const valueToFind = inputArray[0];
          const fromIndex = 1;

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
        });

        this.it1("should return false if sequence doesn't include the item from the specified from-index - numbers", array.oneToTen, (input, inputArray) => {
          const valueToFind = inputArray[0];
          const fromIndex = 1;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
        });

        this.it1("should return false if sequence doesn't include the item from the specified from-index - objects", array.grades, (input, inputArray) => {
          const valueToFind = inputArray[0];
          const fromIndex = 1;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
        });

        this.it1('should return false if sequence is empty', [], input => {
          let sut = this.createSut<any>(input);
          let actual = sut.includes(undefined, 1);
          assert.isFalse(actual);
        });

        this.it1('should return false if from-index is out of range', array.oneToTen, (input, inputArray) => {
          const fromIndex = inputArray.length;
          const valueToFind = inputArray[0];
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
        });
      });

      describe("with negative index", () => {
        this.it1('should return true if sequence includes the item, after the specified from-index - numbers', array.tenZeros.concat(array.tenOnes), input => {
          const fromIndex = -10;
          const valueToFind = 1;

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
        });

        this.it1('should return true if sequence includes the item, after the specified from-index - objects', array.grades.concat(array.grades.reverse()), (input, inputArray) => {
          const fromIndex = -10;
          const valueToFind = inputArray[inputArray.length - 10];

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
        });

        this.it1("should return false if sequence doesn't include the item from the specified from-index", array.tenZeros.concat(array.tenOnes), input => {
          const fromIndex = -10;
          const valueToFind = -1;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isFalse(actual);
        });

        this.it1('should return false if sequence is empty', [], input => {
          let sut = this.createSut<any>(input);
          let actual = sut.includes(undefined, -1);
          assert.isFalse(actual);
        });

        this.it1('should return true if sequence includes the item and from-index is negative out of range - numbers', array.tenOnes, (input, inputArray) => {
          const fromIndex = -inputArray.length;
          const valueToFind = 1;
          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -input2.length - 2;
          const valueToFind2 = input2[input2.length - 10];

          let sut2 = this.createSut(input2);
          let actual2 = sut2.includes(valueToFind2, fromIndex2);
          assert.isTrue(actual2);
        });

        this.it1('should return true if sequence includes the item and from-index is negative out of range - objects', array.grades.concat(array.grades.reverse()), (input, inputArray) => {
          const fromIndex = -inputArray.length - 2;
          const valueToFind = inputArray[inputArray.length - 10];

          let sut = this.createSut(input);
          let actual = sut.includes(valueToFind, fromIndex);
          assert.isTrue(actual);
        });
      });
    });

    describe('includesAll()', () => {
      this.it2('should return true if sequence contains all items from the second sequence',
        array.oneToTen, [7, 2, 3, 7], (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.includesAll(second);
          assert.isTrue(actual);
        });

      this.it2('should return false if sequence contains only some of the items from the second sequence',
        array.oneToTen, [7, 2, -1, 7], (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.includesAll(second);
          assert.isFalse(actual);
        });

      this.it2("should return false if sequence doesn't contains any of the items from the second sequence",
        array.oneToTen, [0, 0, 0, 0], (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.includesAll(second);
          assert.isFalse(actual);
        });

      this.it2('should return false is source sequence is empty',
        [] as number[], array.oneToTen, (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.includesAll(second);
          assert.isFalse(actual);
        });

      this.it2('should return true if second sequence is empty',
        array.oneToTen, [] as number[], (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.includesAll(second);
          assert.isTrue(actual);
        });

      describe('with key-selector', () => {
        this.it2('should return true if sequence contains all items from the second sequence',
          array.grades, array.gradesFiftyAndBelow.map(x => ({grade: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, x => x.grade);
            assert.isTrue(actual);
          });

        this.it2('should return false if sequence contains only some of the items from the second sequence',
          array.gradesAboveFifty, array.grades, (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, x => x.grade);
            assert.isFalse(actual);
          });

        this.it2("should return false if sequence doesn't contains any of the items from the second sequence",
          array.grades,
          [{grade: -1}, {grade: -1}, {grade: -2}],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second);
            assert.isFalse(actual);
          });

        this.it2('should return false is source sequence is empty',
          [] as { name: string; grade: number; }[], array.grades, (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, x => x.grade);
            assert.isFalse(actual);
          });

        this.it2('should return true if second sequence is empty',
          array.grades, [] as { name: string; grade: number; }[], (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, x => x.grade);
            assert.isTrue(actual);
          });
      });

      describe('with second key-selector', () => {
        this.it2('should return true if sequence contains all items from the second sequence',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ], [
            {x: 0, y: 0},
            {x: -1, y: 1},
            {x: 1, y: -1}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isTrue(actual);
          });

        this.it2('should return false if sequence contains only some of the items from the second sequence',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ], [
            {x: 0, y: 0},
            {x: -1, y: 1},
            {x: 1, y: -1},
            {x: 9999, y: 9999}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
          });

        this.it2("should return false if sequence doesn't contains any of the items from the second sequence",
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ], [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
          });

        this.it2('should return false is source sequence is empty',
          [] as { x: number; y: number; z: number }[],
          [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
          });

        this.it2('should return true if second sequence is empty',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ],
          [] as { x: number; y: number; z: number }[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAll(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isTrue(actual);
          });
      });
    });

    describe('includesAny()', () => {
      this.it2('should return true if sequence contains any item from the second sequence',
        array.oneToTen, [-1, -2, 7, -3, -4], (first, second) => {
          const sut = this.createSut(first);
          const actual = sut.includesAny(second);
          assert.isTrue(actual);
        });

      this.it2("should return false if sequence doesn't contains any of the items from the second sequence",
        array.oneToTen, [0, 0, 0, 0], (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.includesAny(second);
          assert.isFalse(actual);
        });

      this.it2('should return false is source sequence is empty',
        [] as number[], array.oneToTen, (first, second) => {

          let sut = this.createSut(first);
          let actual = sut.includesAny(second);
          assert.isFalse(actual);
        });

      this.it2('should return false if second sequence is empty',
        array.oneToTen, [] as number[], (first, second) => {

          let sut = this.createSut(first);
          let actual = sut.includesAny(second);
          assert.isFalse(actual);
        });

      describe('with key-selector', () => {
        this.it2('should return true if sequence contains any item from the second sequence',
          array.grades,
          array.gradesFiftyAndBelow.map(x => ({grade: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, x => x.grade);
            assert.isTrue(actual);
          });

        this.it2("should return false if sequence doesn't contains any of the items from the second sequence",
          array.grades,
          [{name: "fake 1", grade: -1}, {name: "fake ", grade: -1}, {name: "fake 3", grade: -2}],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, x => x.grade);
            assert.isFalse(actual);
          });

        this.it2('should return false is source sequence is empty',
          [] as { name: string; grade: number; }[],
          array.grades,
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, x => x.grade);
            assert.isFalse(actual);
          });

        this.it2('should return false if second sequence is empty',
          array.grades, [] as { grade: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, x => x.grade);
            assert.isFalse(actual);
          });
      });

      describe('with second key-selector', () => {
        this.it2('should return true if sequence contains any item from the second sequence',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ], [
            {x: 0, y: 0},
            {x: -1, y: 1},
            {x: 1, y: -1}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isTrue(actual);
          });

        this.it2("should return false if sequence doesn't contains any of the items from the second sequence",
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ],
          [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
          });

        this.it2('should return false is source sequence is empty',
          [] as { x: number; y: number; z: number }[],
          [
            {x: 2222, y: 2222},
            {x: -2222, y: 2222},
            {x: 3333, y: -3333},
            {x: 9999, y: 9999}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
          });

        this.it2('should return false if second sequence is empty',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ],
          [] as { x: number; y: number; z: number }[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.includesAny(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
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
          assert.strictEqual(actual, true);

          sut = this.createSut(generator.from(first));
          actual = sut.includesSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, true);
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
            assert.strictEqual(actual, true);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, true);
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

        // TODO: second sequence of different type
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
            assert.strictEqual(actual, true);

            sut = this.createSut(generator.from(first));
            actual = sut.includesSubSequence(generator.from(second), fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.strictEqual(actual, true);
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
        assert.strictEqual(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = sut.indexOf(5);
        assert.strictEqual(actual, expected);

        const input2 = array.grades;
        const expected2 = input2.indexOf(input2[5]);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.indexOf(input2[5]);
        assert.strictEqual(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.indexOf(input2[5]);
        assert.strictEqual(actual2, expected2);
      });

      it("should return -1 if sequence doesn't include the item", () => {
        const input = array.oneToTen.concat(array.zeroToNine.reverse());
        const valueToFind = -1;
        let sut = this.createSut(input);
        let actual = sut.indexOf(valueToFind);
        assert.strictEqual(actual, -1);
        sut = this.createSut(generator.from(input));
        actual = sut.indexOf(valueToFind);
        assert.strictEqual(actual, -1);

        const input2 = array.grades.concat(array.grades.reverse());
        const valueToFind2 = {name: "missing", grade: -1};
        let sut2 = this.createSut(input2);
        let actual2 = sut2.indexOf(valueToFind2);
        assert.strictEqual(actual2, -1);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.indexOf(valueToFind2);
        assert.strictEqual(actual2, -1);
      });

      it('should return -1 if sequence is empty', () => {
        let sut = this.createSut<any>([]);
        let actual = sut.indexOf(undefined);
        assert.strictEqual(actual, -1);
        sut = this.createSut();
        actual = sut.indexOf(undefined);
        assert.strictEqual(actual, -1);
      });

      describe("starting from index", () => {
        it('should return first index of item if sequence includes the item, after the specified from-index', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const valueToFind = input[fromIndex + 2];
          const expected = input.indexOf(valueToFind, fromIndex);

          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const valueToFind2 = input2[fromIndex2 + 2];
          const expected2 = input2.indexOf(valueToFind2, fromIndex);

          let sut2 = this.createSut(input2);
          let actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);
        });

        it("should return -1 if sequence doesn't include the item from the specified from-index", () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const fromIndex = array.oneToTen.length;
          const missingValueToFind = -1;
          let sut = this.createSut(input);
          let actual = sut.indexOf(missingValueToFind, fromIndex);
          assert.strictEqual(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(missingValueToFind, fromIndex);
          assert.strictEqual(actual, -1);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = array.grades.length;
          const valueToFind2 = {name: "missing", grade: -1};

          let sut2 = this.createSut(input2);
          let actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.strictEqual(actual2, -1);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.strictEqual(actual2, -1);
        });

        it('should return -1 if sequence is empty', () => {
          let sut = this.createSut<any>([]);
          let actual = sut.indexOf(undefined, 1);
          assert.strictEqual(actual, -1);
          sut = this.createSut();
          actual = sut.indexOf(undefined, 1);
          assert.strictEqual(actual, -1);
        });

        it('should return -1 if from-index is out of range', () => {
          const input = array.oneToTen;
          const fromIndex = input.length;
          const valueToFind = 1;
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, -1);
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
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const fromIndex2 = -array.grades.length;
          const expected2 = input2.length + fromIndex2 + 2;
          const valueToFind2 = input2[expected2];

          let sut2 = this.createSut(input2);
          let actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);
          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.indexOf(valueToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);
        });

        it("should return -1 if sequence doesn't include the item from the specified from-index", () => {
          const input = array.tenZeros.concat(array.tenOnes);
          const fromIndex = array.tenZeros.length;
          const valueToFind = 0;
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, -1);
        });

        it('should return -1 if sequence is empty', () => {
          let sut = this.createSut<any>([]);
          let actual = sut.indexOf(undefined, -1);
          assert.strictEqual(actual, -1);
          sut = this.createSut();
          actual = sut.indexOf(undefined, -1);
          assert.strictEqual(actual, -1);
        });

        it('should return first index of item if sequence includes the item and from-index is negative out of range', () => {
          const input = array.tenOnes;
          const fromIndex = -input.length;
          const valueToFind = 1;
          const expected = input.indexOf(valueToFind, fromIndex);
          let sut = this.createSut(input);
          let actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.indexOf(valueToFind, fromIndex);
          assert.strictEqual(actual, expected);
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
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.strictEqual(actual, expected);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade > 50);
        const expected2 = first2.indexOf(second2[0]);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.strictEqual(actual2, expected2);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.strictEqual(actual2, expected2);
      });

      it('should return false if sequence contains entire sub-sequence but not in same order', () => {
        const first = array.oneToTen;
        const second = array.range(5, 2);
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.strictEqual(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.strictEqual(actual, -1);

        const first2 = array.grades;
        const second2 = first2.filter(x => x.grade > 50).reverse();
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.strictEqual(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.strictEqual(actual2, -1);
      });

      it('should return false if sequence contains part of sub-sequence', () => {
        const first = array.oneToTen;
        const second = [9, 10, 11];
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.strictEqual(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.strictEqual(actual, -1);

        const first2 = array.grades;
        const missing = {name: "missing", grade: -1};
        const second2 = first2.slice(-3).concat([missing]);
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.strictEqual(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.strictEqual(actual2, -1);
      });

      it('should return false if sequence has less items than sub-sequence', () => {
        const first = array.oneToNine;
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.strictEqual(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.strictEqual(actual, -1);

        const first2 = array.grades.slice(0, array.grades.length - 2);
        const second2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.strictEqual(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.strictEqual(actual2, -1);
      });

      it('should return false if sequence is empty', () => {
        const first: number[] = [];
        const second = array.oneToTen;
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.strictEqual(actual, -1);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.strictEqual(actual, -1);

        const first2: { name: string, grade: number; }[] = [];
        const second2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.strictEqual(actual2, -1);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.strictEqual(actual2, -1);
      });

      it('should return true if sub-sequence is empty', () => {
        const first = array.oneToTen;
        const second: number[] = [];
        let sut = this.createSut(first);
        let actual = sut.indexOfSubSequence(second);
        assert.strictEqual(actual, 0);

        sut = this.createSut(generator.from(first));
        actual = sut.indexOfSubSequence(generator.from(second));
        assert.strictEqual(actual, 0);

        const second2: { name: string, grade: number; }[] = [];
        const first2 = array.grades;
        let sut2 = this.createSut(first2);
        let actual2 = sut2.indexOfSubSequence(second2);
        assert.strictEqual(actual2, 0);
        sut2 = this.createSut(generator.from(first2));
        actual2 = sut2.indexOfSubSequence(generator.from(second2));
        assert.strictEqual(actual2, 0);
      });

      describe('from index', () => {
        it('should return true if sequence contains entire sub-sequence is same order starting from-index', () => {
          const first = array.zeroToNine.concat(array.zeroToTen);
          const second = array.oneToNine;
          const expected = first.lastIndexOf(second[0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.strictEqual(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, expected);
        });

        it('should return false if sequence contains entire sub-sequence but not in same order', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = [0, 0, 0, 1, 1, 1];
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, -1);
        });

        it('should return false if sequence contains part of sub-sequence', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = [1, 1, 1, 9999];
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, -1);
        });

        it('should return false if sequence has less items than sub-sequence', () => {
          const first = array.tenOnes.concat(array.tenZeros);
          const second = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, -1);
        });

        it('should return false if sequence is empty', () => {
          const first: number[] = [];
          const second = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, -1);
        });

        it('should return true if sub-sequence is empty', () => {
          const second: number[] = [];
          const first = array.tenZeros.concat([0]);
          const fromIndex = 6;
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, fromIndex);
          assert.strictEqual(actual, 0);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), fromIndex);
          assert.strictEqual(actual, 0);
        });
      });

      describe('with key-selector', () => {
        it('should return true if sequence contains entire sub-sequence is same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove;
          const expected = first.findIndex(x => x.grade === second[0].grade);
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.strictEqual(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.strictEqual(actual, expected);
        });

        it('should return false if sequence contains entire sub-sequence but not in same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove.reverse();

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.strictEqual(actual, -1);
        });

        it('should return false if sequence contains part of sub-sequence', () => {
          const first = array.grades;
          const missing = {name: "missing", grade: -1};
          const second = array.gradesFiftyAndAbove.concat(missing);

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.strictEqual(actual, -1);
        });

        it('should return false if sequence has less items than sub-sequence', () => {
          const first = array.grades;
          const missing = {name: "missing", grade: -1};
          const second = array.grades.concat(missing);

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.strictEqual(actual, -1);
        });

        it('should return false if sequence is empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades;

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.strictEqual(actual, -1);
        });

        it('should return true if sub-sequence is empty', () => {
          const second: { name: string; grade: number; }[] = [];
          const first = array.grades;

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, x => x.grade);
          assert.strictEqual(actual, 0);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), x => x.grade);
          assert.strictEqual(actual, 0);
        });

        describe('from index', () => {
          it('should return true if sequence contains entire sub-sequence is same order', () => {
            const first = array.repeat({x: 0, y: 0}, 10);
            const second = first.slice(0, 3);
            const fromIndex = 5;
            const expected = fromIndex;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, expected);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, expected);
          });

          it('should return false if sequence contains entire sub-sequence but not in same order', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).reverse();
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);
          });

          it('should return false if sequence contains part of sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).concat([{x: 0, y: -9999}]);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);
          });

          it('should return false if sequence has less items than sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.concat([{x: 0, y: 11}]);
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);
          });

          it('should return false if sequence is empty', () => {
            const first: { x: number; y: number; }[] = [];
            const second = array.oneToTen.map((y) => ({x: 0, y}));
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, -1);
          });

          it('should return true if sub-sequence is empty', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second: { x: number; y: number; }[] = [];
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, 0);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, p => `[${p.x},${p.y}]`);
            assert.strictEqual(actual, 0);
          });
        });

        // TODO: second sequence of different type
      });

      describe('with equality function', () => {
        it('should return true if sequence contains entire sub-sequence is same order', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove;
          const expected = first.findIndex(x => x.grade === second[0].grade);
          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, {equals: (a, b) => a.grade === b.grade});
          assert.strictEqual(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), {equals: (a, b) => a.grade === b.grade});
          assert.strictEqual(actual, expected);
        });

        it('should return false if sequence do not contain entire sub-sequence', () => {
          const first = array.grades;
          const second = array.gradesFiftyAndAbove.reverse();

          let sut = this.createSut(first);
          let actual = sut.indexOfSubSequence(second, {equals: () => false});
          assert.strictEqual(actual, -1);

          sut = this.createSut(generator.from(first));
          actual = sut.indexOfSubSequence(generator.from(second), {equals: () => false});
          assert.strictEqual(actual, -1);
        });

        describe('from index', () => {
          it('should return true if sequence contains entire sub-sequence is same order', () => {
            const first = array.repeat({x: 0, y: 0}, 10);
            const second = first.slice(0, 3);
            const fromIndex = 5;
            const expected = fromIndex;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.strictEqual(actual, expected);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, {equals: (a, b) => a.x === b.x && a.y === b.y});
            assert.strictEqual(actual, expected);
          });

          it('should return false if sequence do not contain entire sub-sequence', () => {
            const first = array.oneToTen.map((y) => ({x: 0, y}));
            const second = first.slice(-3).reverse();
            const fromIndex = 5;

            let sut = this.createSut(first);
            let actual = sut.indexOfSubSequence(second, fromIndex, {equals: () => false});
            assert.strictEqual(actual, -1);

            sut = this.createSut(generator.from(first));
            actual = sut.indexOfSubSequence(generator.from(second), fromIndex, {equals: () => false});
            assert.strictEqual(actual, -1);
          });
        });
      });
    });

    describe('isEmpty()', () => {
      this.it1("should return true if sequence doesn't contain any items", [], input => {
        let sut = this.createSut(input);
        let actual = sut.isEmpty();
        assert.isTrue(actual);
      });

      it("should return true if sequence source is a Seq tagged as empty", () => {
        const emptySeq = Seq.empty();
        let sut = this.createSut(emptySeq);
        let actual = sut.isEmpty();
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
            assert.strictEqual(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join(${separator})`);
            actual = sutGenerator.join(separator);
            assert.strictEqual(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join(${separator})`);
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
                assert.strictEqual(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join({start: ${start}, separator: ${separator}, end: ${end}})`);
                actual = sutGenerator.join({start, separator, end});
                assert.strictEqual(actual, expected, `string "${actual}" doesn't equals expected string "${expected}" when doing [${input}].join({start: ${start}, separator: ${separator}, end: ${end}})`);
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
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.last();
        assert.strictEqual(actual, expected);

        const input2 = array.grades;
        const expected2 = input2.slice(-1)[0];
        let sut2 = this.createSut(input2);
        let actual2 = sut2.last();
        assert.strictEqual(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.last();
        assert.strictEqual(actual2, expected2);
      });

      it('should return undefined on empty sequence', () => {
        let sut = this.createSut([]);
        let actual = sut.last();
        assert.isUndefined(actual);

        sut = this.createSut();
        actual = sut.last();
        assert.isUndefined(actual);
      });

      this.it1('should return fallback value on empty sequence', [], (input) => {
        let sut = this.createSut<number>(input);
        const expected = 1;
        let actual = sut.last(expected);
        assert.strictEqual(actual, expected);

        sut = this.createSut<number>();
        actual = sut.last(expected);
        assert.strictEqual(actual, expected);
      });
    });

    describe('lastIndexOf()', () => {
      it('should return last index of item being searched', () => {
        const input = array.oneToTen.concat(array.oneToTen);
        const itemToFind = 5;
        const expected = input.lastIndexOf(itemToFind);
        let sut = this.createSut(input);
        let actual = sut.lastIndexOf(itemToFind);
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.lastIndexOf(itemToFind);
        assert.strictEqual(actual, expected);

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
        assert.strictEqual(actual, -1);
        sut = this.createSut(generator.from(input));
        actual = sut.lastIndexOf(valueToFind);
        assert.strictEqual(actual, -1);

        const input2 = array.grades.concat(array.grades.reverse());
        const valueToFind2 = {name: "missing", grade: -1};
        let sut2 = this.createSut(input2);
        let actual2 = sut2.lastIndexOf(valueToFind2);
        assert.strictEqual(actual2, -1);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.lastIndexOf(valueToFind2);
        assert.strictEqual(actual2, -1);
      });

      it('should return -1 if sequence is empty', () => {
        let sut = this.createSut<any>([]);
        let actual = sut.lastIndexOf(undefined);
        assert.strictEqual(actual, -1);
        sut = this.createSut();
        actual = sut.lastIndexOf(undefined);
        assert.strictEqual(actual, -1);
      });

      describe("starting till index", () => {
        it('should return -1 if item to find is beyond the from-index', () => {
          const input = array.oneToNine.concat(9999);
          const itemToFind = 9999;
          const fromIndex = input.length - 2;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, -1);

          const itemToFind2 = {name: 'out-of-reach', grade: 110};
          const input2 = array.grades.concat(itemToFind2);
          const fromIndex2 = input2.length - 2;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, -1);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, -1);
        });

        it('should return -1 if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut<number>([]);
          let actual = sut.lastIndexOf(1, 1);
          assert.strictEqual(actual, expected);
          sut = this.createSut<number>();
          actual = sut.lastIndexOf(1, 1);
          assert.strictEqual(actual, expected);
        });

        it('should return the last index of searched item before or at the from-index', () => {
          const input = array.tenOnes;
          const itemToFind = 1;
          const fromIndex = 7;
          const expected = fromIndex;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);

          let input2 = array.grades;
          input2.push(...input2.slice().reverse());
          const expected2 = array.grades.length - 2;
          const itemToFind2 = input2[expected2];
          const fromIndex2 = array.grades.length;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);
        });

        it('should return the last index of searched item when from-index is out or range', () => {
          const input = array.tenOnes;
          const itemToFind = 1;
          const fromIndex = input.length * 2;
          const expected = input.length - 1;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);

          let input2 = array.grades;
          input2.push(...input2.slice().reverse());
          const itemToFind2 = input2[0];
          const fromIndex2 = input2.length * 2;
          const expected2 = input2.lastIndexOf(itemToFind2, fromIndex2);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);
        });
      });

      describe("with negative index", () => {
        it('should return -1 if item to find is beyond the from-index', () => {
          const itemToFind = 9999;
          const input = array.oneToNine.concat(itemToFind);
          const fromIndex = -2;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, -1);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, -1);

          const itemToFind2 = {name: 'beyond-reach', grade: 110};
          const input2 = array.grades.concat(itemToFind2);
          const fromIndex2 = -2;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, -1);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, -1);
        });

        it('should return -1 if sequence is empty', () => {
          const expected = -1;
          let sut = this.createSut<number>([]);
          let actual = sut.lastIndexOf(1, -1);
          assert.strictEqual(actual, expected);
          sut = this.createSut<number>();
          actual = sut.lastIndexOf(1, -1);
          assert.strictEqual(actual, expected);
        });

        it('should return the last index of searched item before or at the from-index', () => {
          const input = array.tenOnes;
          const itemToFind = 1;
          const fromIndex = -7;
          const expected = input.length + fromIndex;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const itemToFind2 = input2.slice(-1)[0];
          const fromIndex2 = -array.grades.length;
          const expected2 = array.grades.indexOf(itemToFind2);
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected2);
        });

        it('should return -1 if from-index is out of range', () => {
          const input = array.oneToTen.concat(array.zeroToNine.reverse());
          const itemToFind = 1;
          const fromIndex = -input.length - 5;
          const expected = -1;
          let sut = this.createSut(input);
          let actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);
          sut = this.createSut(generator.from(input));
          actual = sut.lastIndexOf(itemToFind, fromIndex);
          assert.strictEqual(actual, expected);

          const input2 = array.grades.concat(array.grades.reverse());
          const itemToFind2 = array.grades[0];
          const fromIndex2 = -input2.length - 5;
          let sut2 = this.createSut(input2);
          let actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected);

          sut2 = this.createSut(generator.from(input2));
          actual2 = sut2.lastIndexOf(itemToFind2, fromIndex2);
          assert.strictEqual(actual2, expected);
        });
      });
    });

    describe("max()", () => {
      it('should return maximum value from sequence of number', () => {
        const input = array.oneToTen;
        const expected = input.reduce((max, x) => max < x ? x : max, Number.NEGATIVE_INFINITY);

        let sut = this.createSut(input);
        let actual = sut.max();
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.max();
        assert.strictEqual(actual, expected);
        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("should return maximum value on item's numeric property", () => {
        const input = array.grades;
        const expected = input.reduce((max, x) => max < x.grade ? x.grade : max, Number.NEGATIVE_INFINITY);

        let sut = this.createSut(input);
        let actual = sut.max(x => x.grade);
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.max(x => x.grade);
        assert.strictEqual(actual, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should Negative Infinity on empty sequence', () => {
        const sut = this.createSut<number>();
        const expected = Number.NEGATIVE_INFINITY;
        const actual = sut.max();
        assert.strictEqual(actual, expected);

        const sut2 = this.createSut<{ age: number; }>();
        const actual2 = sut2.max(x => x.age);
        assert.strictEqual(actual2, expected);
      });
    });

    describe("maxItem()", () => {
      describe('with key-selector', () => {
        this.it1("should return first item having the maximum value on item's numeric property", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade < grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem(x => x.grade);
          assert.strictEqual(actual, expected);
        });

        this.it1("should return last item having the maximum value on item's numeric property, when options.findLast is true", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade <= grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem(x => x.grade, {findLast: true});
          assert.strictEqual(actual, expected);
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
          assert.strictEqual(actual, expected);
        });

        this.it1("should return last item having the maximum value, when options.findLast is true", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((maxGrade, grade) => maxGrade.grade <= grade.grade ? grade : maxGrade);

          let sut = this.createSut(input);
          let actual = sut.maxItem({comparer: (a, b) => a.grade - b.grade, findLast: true});
          assert.strictEqual(actual, expected);

        });

        this.it1('should return undefined on empty sequence', <{ age: number; }[]>[], input => {
          const sut = this.createSut(input);
          const actual = sut.maxItem({comparer: (a, b) => a.age - b.age});
          assert.isUndefined(actual);
        });

      });

      this.it1('should throws is selector parameter is not a function or has comparer function', <{ age: number; }[]>[], input => {
        const sut = this.createSut(input);
        assert.throw(() => sut.maxItem(undefined as unknown as Selector<{ age: number; }, any>));
      });
    });

    describe("min()", () => {
      it('should return minimum value from sequence of number', () => {
        const input = array.oneToTen;
        const expected = input.reduce((min, x) => min > x ? x : min, Number.POSITIVE_INFINITY);

        let sut = this.createSut(input);
        let actual = sut.min();
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = sut.min();
        assert.strictEqual(actual, expected);
        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("should return minimum value on item's numeric property", () => {
        const input = array.grades;
        const expected = input.reduce((min, x) => min > +x.grade ? x.grade : min, Number.POSITIVE_INFINITY);

        let sut = this.createSut(input);
        const actual = sut.min(x => x.grade);
        assert.strictEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        const actual2 = sut.min(x => x.grade);
        assert.strictEqual(actual2, expected);
        assert.sameDeepOrderedMembers(input, array.grades);
      });

      it('should Infinity on empty sequence', () => {
        const expected = Number.POSITIVE_INFINITY;
        const sut = this.createSut<number>();
        const actual = sut.min();
        assert.strictEqual(actual, expected);

        const sut2 = this.createSut<{ age: number; }>();
        const actual2 = sut2.min(x => x.age);
        assert.strictEqual(actual2, expected);
      });
    });

    describe("minItem()", () => {
      describe('with key-selector', () => {
        this.it1("should return first item having the minimum value on item's numeric property", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade > grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem(x => x.grade);
          assert.strictEqual(actual, expected);
        });

        this.it1("should return last item having the minimum value on item's numeric property, when options.findLast is true", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade >= grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem(x => x.grade, {findLast: true});
          assert.strictEqual(actual, expected);
        });

        it('should return undefined on empty sequence', () => {
          const sut = this.createSut<{ age: number; }>();
          const actual = sut.minItem(x => x.age);
          assert.isUndefined(actual);
        });
      });

      describe('with comparer', () => {
        this.it1("should return first item having the minimum value", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade > grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem({comparer: (a, b) => a.grade - b.grade});
          assert.strictEqual(actual, expected);
        });

        this.it1("should return last item having the minimum value, when options.findLast is true", [...array.grades, ...array.grades], (input, inputArray) => {
          const expected = inputArray.reduce((minGrade, grade) => minGrade.grade >= grade.grade ? grade : minGrade);

          let sut = this.createSut(input);
          let actual = sut.minItem({comparer: (a, b) => a.grade - b.grade, findLast: true});
          assert.strictEqual(actual, expected);
        });

        it('should return undefined on empty sequence', () => {
          const sut = this.createSut<{ age: number; }>();
          const actual = sut.minItem({comparer: (a, b) => a.age - b.age});
          assert.isUndefined(actual);
        });
      });

      this.it1('should throws is selector parameter is not a function or has comparer function', <{ age: number; }[]>[], input => {
        const sut = this.createSut(input);
        assert.throw(() => sut.minItem(undefined as unknown as Selector<{ age: number; }, any>));
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
          assert.strictEqual(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
          const actual2 = sut2.reduce(reducer);
          assert.strictEqual(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
        }

        const input2 = array.abc;
        const sut3 = this.createSut(input2);
        const sut4 = this.createSut(generator.from(input2));
        const reducer = (a: string, b: string) => a + b;
        const expected = input2.reduce(reducer);
        const actual = sut3.reduce(reducer);
        const actual2 = sut4.reduce(reducer);

        assert.strictEqual(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
        assert.strictEqual(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
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
          assert.strictEqual(actual, expected, `actual return value ${actual} not equals to expected ${expected}`)
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
        assert.strictEqual(actual, expected);
        const actual2 = sut2.reduce(() => unexpected, expected);
        assert.strictEqual(actual2, expected);
      });

      it('should return first item if sequence has only one item and no initial value provided', () => {
        const expected = Math.PI;
        const unexpected = -1;
        const input: number[] = [expected];

        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        const actual = sut.reduce(() => unexpected);
        assert.strictEqual(actual, expected);
        const actual2 = sut2.reduce(() => unexpected);
        assert.strictEqual(actual2, expected);

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
          assert.strictEqual(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
          const actual2 = sut2.reduceRight(reducer);
          assert.strictEqual(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
        }

        const input2 = array.abc;
        const sut3 = this.createSut(input2);
        const sut4 = this.createSut(generator.from(input2));
        const reducer = (a: string, b: string) => a + b;
        const expected = input2.reduceRight(reducer);
        const actual = sut3.reduceRight(reducer);
        const actual2 = sut4.reduceRight(reducer);

        assert.strictEqual(actual, expected, `actual: ${actual} , expected: ${expected}  with reducer: ${reducer}`);
        assert.strictEqual(actual2, expected, `actual: ${actual2} , expected: ${expected}  with reducer: ${reducer}`);
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
          assert.strictEqual(actual, expected, `actual return value ${actual} not equals to expected ${expected}`)
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
        assert.strictEqual(actual, expected);
        const actual2 = sut2.reduceRight(() => unexpected, expected);
        assert.strictEqual(actual2, expected);
      });

      it('should return first item if sequence has only one item and no initial value provided', () => {
        const expected = Math.PI;
        const unexpected = -1;
        const input: number[] = [expected];

        const sut = this.createSut(input);
        const sut2 = this.createSut(generator.from(input));
        const actual = sut.reduceRight(() => unexpected);
        assert.strictEqual(actual, expected);
        const actual2 = sut2.reduceRight(() => unexpected);
        assert.strictEqual(actual2, expected);

      });
    });

    describe('sameItems()', () => {
      this.it2('should return true if both sequences have the same items',
        array.oneToTen, array.oneToTen.reverse(), (first, second) => {
          const sut = this.createSut(first);
          const actual = sut.sameItems(second);
          assert.isTrue(actual);
        });

      this.it2('should return true if both sequences are empty',
        [] as unknown[], [] as unknown[], (first, second) => {
          assert.isTrue(this.createSut(first).sameItems(second));
        });

      this.it2('should return false if sequences have different number of items',
        array.oneToTen, array.oneToNine, (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.sameItems(second);
          assert.isFalse(actual);
        });

      this.it2('should return false if source sequences is empty',
        [] as number[], array.oneToNine, (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.sameItems(second);
          assert.isFalse(actual);
        });

      this.it2('should return false if only second sequences is empty',
        array.oneToNine, [] as number[], (first, second) => {

          const sut = this.createSut(first);
          const actual = sut.sameItems(second);
          assert.isFalse(actual);
        });

      describe('with key-selector', () => {
        this.it2('should return true if both sequences have the same items',
          array.grades, array.grades.reverse(), (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second, x => x.grade);
            assert.isTrue(actual);
          });

        this.it2('should return false if sequences have different number of items',
          array.grades, array.gradesFiftyAndBelow.concat(array.gradesFiftyAndAbove), (first, second) => {

            let sut = this.createSut(first);
            let actual = sut.sameItems(second, x => x.grade);
            assert.isFalse(actual);

            sut = this.createSut(second);
            actual = sut.sameItems(first, x => x.grade);
            assert.isFalse(actual);
          });

        this.it2('should return false if only source sequences is empty',
          [] as { name: string; grade: number }[], array.grades, (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second);
            assert.isFalse(actual);
          });

        this.it2('should return false if only second sequences is empty',
          array.grades, [] as { name: string; grade: number }[], (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second);
            assert.isFalse(actual);
          });

        // TODO: second sequence of different type
      });

      describe('with second key-selector', () => {
        this.it2('should return true if both sequences have the same items',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ], [
            {x: -1, y: 1},
            {x: 0, y: 0},
            {x: 0, y: 1},
            {x: 1, y: 0},
            {x: 1, y: -1}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isTrue(actual);
          });

        this.it2('should return false if sequences have different number of items',
          [
            {x: 0, y: 0, z: 0},
            {x: 0, y: 1, z: 1},
            {x: 1, y: 0, z: 0},
            {x: -1, y: 1, z: -1},
            {x: 1, y: -1, z: 1}
          ],
          [
            {x: -1, y: 1},
            {x: 0, y: 0},
            {x: 0, y: 1},
            {x: 1, y: 0}
          ],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);

            const sut2 = this.createSut(second);
            const actual2 = sut2.sameItems(first, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual2);
          });

        this.it2("should return false if only source sequences is empty",
          [] as { x: number; y: number; }[],
          [{x: 0, y: 0, z: 0}] as { x: number; y: number; z: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
          });

        this.it2("should return false if only second sequences is empty",
          [{x: 0, y: 0, z: 0}] as { x: number; y: number; z: number; }[],
          [] as { x: number; y: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.sameItems(second, l => `${l.x}|${l.y}`, r => `${r.x}|${r.y}`);
            assert.isFalse(actual);
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

      it('should return false if second sequence has less items', () => {
        const input = array.oneToTen;
        const second = array.oneToNine;

        let sut = this.createSut(input);
        let actual = sut.sameOrderedItems(second);
        assert.isFalse(actual);
        sut = this.createSut(generator.from(input));
        actual = sut.sameOrderedItems(generator.from(second));
        assert.isFalse(actual);
      });

      it('should return false if second sequence has more items', () => {
        const input = array.oneToNine;
        const second = array.oneToTen;

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
          let second: {name: string, grade: number}[] = array.grades;

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
      this.it1('should return true if at least one meets a condition', array.grades, input => {
        const sut = this.createSut(input);
        let actual = sut.some(x => x.grade <= 100);
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
      this.it1('should return true if sequence contains second sequence from the beginning with exact same items and same order',
        array.oneToTen,
        (input, inputArray) => {
          const sut = this.createSut(input);

          for (let take = 1; take < inputArray.length; take++) {
            const second = inputArray.slice(0, take);
            let actual = sut.startsWith(second);
            assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
          }
        });

      this.it2("should return false if sequence doesn't start with second sequence",
        array.oneToTen,
        array.oneToNine.concat(9),
        (first, second) => {
          const sut = this.createSut(first);
          assert.isFalse(sut.startsWith(second));
        });

      this.it2('should return false if second sequence has more items',
        array.oneToNine,
        array.tenOnes,
        (first, second) => {
          const sut = this.createSut(first);
          assert.isFalse(sut.startsWith(second));
        });

      this.it2('should return false if second sequence starts with first sequence',
        array.oneToNine,
        array.oneToTen,
        (first, second) => {
          const sut = this.createSut(first);
          assert.isFalse(sut.startsWith(second));
        });

      this.it2('should return true if second sequence is empty', array.oneToNine, [], (first, second) => {
        const sut = this.createSut(first);
        assert.isTrue(sut.startsWith(second));
      });

      describe('with key selector', () => {
        this.it1('should return true if sequence contains second sequence from the beginning with exact same items and same order',
          array.grades,
          (input, inputArray) => {

            const sut = this.createSut(input);

            for (let take = 1; take < inputArray.length; take++) {
              const second = inputArray.slice(0, take);
              let actual = sut.startsWith(second, x => x.grade);

              assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
            }
          });

        this.it2("should return false if sequence doesn't start with second sequence",
          array.grades.concat(array.grades[0]),
          array.grades.concat(array.grades[1]),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, x => x.grade));
          });

        this.it2('should return false if second sequence has more items',
          array.gradesFiftyAndAbove,
          array.grades,
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, x => x.grade));
          });

        this.it2('should return false if second sequence starts with first sequence',
          array.grades.slice(0, -1),
          array.grades,
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, x => x.grade));
          });

        this.it2('should return true if second sequence is empty',
          array.grades,
          [] as { name: string; grade: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            assert.isTrue(sut.startsWith(second, x => x.grade));
          });

        this.it2('should return true if both sequences are empty',
          [] as { name: string; grade: number; }[],
          [] as { name: string; grade: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            assert.isTrue(sut.startsWith(second, x => x.grade));
          });

        describe('second is partial type of first', () => {
          const FIRST: readonly { id: number; name: string; }[] = [
            {id: 0, name: '0'}, {id: 1, name: '1'}, {id: 2, name: '2'}, {id: 3, name: '3'},
            {id: 4, name: '4'}, {id: 5, name: '5'}, {id: 6, name: '6'}, {id: 7, name: '7'}
          ];
          const SECOND: readonly { id: number; }[] = [{id: 0}, {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}, {id: 7}];

          this.it1('should return true if sequence contains second sequence from the beginning with exact same items and same order',
            FIRST,
            (input, inputArray) => {

              const sut = this.createSut(input);

              for (let take = 1; take < inputArray.length; take++) {
                const second = inputArray.slice(0, take).map(x => ({id: x.id}));
                let actual = sut.startsWith(second, x => x.id);

                assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
              }
            });

          this.it2("should return false if sequence doesn't start with second sequence",
            FIRST.concat(FIRST[0]),
            SECOND.concat(SECOND[1]),
            (first, second) => {

              const sut = this.createSut(first);
              assert.isFalse(sut.startsWith(second, x => x.id));
            });

          this.it2('should return false if second sequence has more items',
            FIRST,
            SECOND.concat(SECOND),
            (first, second) => {

              const sut = this.createSut(first);
              assert.isFalse(sut.startsWith(second, x => x.id));
            });

          this.it2('should return false if second sequence starts with first sequence',
            FIRST.slice(0, -1),
            SECOND,
            (first, second) => {

              const sut = this.createSut(first);
              assert.isFalse(sut.startsWith(second, x => x.id));
            });

          this.it2('should return true if second sequence is empty',
            FIRST,
            [] as { id: number; }[],
            (first, second) => {

              const sut = this.createSut(first);
              assert.isTrue(sut.startsWith(second, x => x.id));
            });

          this.it2('should return true if both sequences are empty',
            [] as { id: number; name: string; }[],
            [] as { id: number; }[],
            (first, second) => {

              const sut = this.createSut(first);
              assert.isTrue(sut.startsWith(second, x => x.id));
            });
        });
      });

      describe('with second key selector', () => {
        this.it1('should return true if sequence contains second sequence from the beginning with exact same items and same order',
          array.grades,
          (input, inputArray) => {

            const sut = this.createSut(array.grades);

            for (let take = 1; take < inputArray.length; take++) {
              const second = inputArray.slice(0, take).map(x => ({name: x.name, score: x.grade}));
              let actual = sut.startsWith(second, first => first.grade, second => second.score);
              assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
            }
          });

        this.it2("should return false if sequence doesn't start with second sequence",
          array.grades.concat(array.grades[0]),
          array.grades.concat(array.grades[1]).map(x => ({name: x.name, score: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, first => first.grade, second => second.score));
          });

        this.it2('should return false if second sequence has more items',
          array.gradesFiftyAndAbove,
          array.grades.map(x => ({name: x.name, score: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, first => first.grade, second => second.score));
          });

        this.it2('should return false second sequence starts with first sequence',
          array.grades.slice(0, -1),
          array.grades.map(x => ({...x, score: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, first => first.grade, second => second.score));
          });

        this.it2('should return true if second sequence is empty',
          array.grades,
          [] as { name: string; score: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            assert.isTrue(sut.startsWith(second, first => first.grade, second => second.score));
          });

        this.it2('should return true if both sequences are empty',
          [] as { name: string; grade: number; }[],
          [] as { name: string; score: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            assert.isTrue(sut.startsWith(second, first => first.grade, second => second.score));
          });
      });

      describe('with equality comparer', () => {
        this.it1('should return true if sequence contains second sequence from the beginning with exact same items and same order',
          array.grades,
          (input, inputArray) => {

            const sut = this.createSut(array.grades);

            for (let take = 1; take < inputArray.length; take++) {
              const second = inputArray.slice(0, take).map(x => ({name: x.name, score: x.grade}));
              let actual = sut.startsWith(second, {equals: (f, s) => f.grade === s.score});
              assert.isTrue(actual, `[${input}] doesn't starts with [${second}]`);
            }
          });

        this.it2("should return false if sequence doesn't start with second sequence",
          array.grades.concat(array.grades[0]),
          array.grades.concat(array.grades[1]).map(x => ({name: x.name, score: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, {equals: (f, s) => f.grade === s.score}));
          });

        this.it2('should return false if second sequence has more items',
          array.gradesFiftyAndAbove,
          array.grades.map(x => ({name: x.name, score: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, {equals: (f, s) => f.grade === s.score}));
          });

        this.it2('should return false if second sequence starts with first sequence',
          array.grades.slice(0, -1),
          array.grades.map(x => ({name: x.name, score: x.grade})),
          (first, second) => {

            const sut = this.createSut(first);
            assert.isFalse(sut.startsWith(second, {equals: (f, s) => f.grade === s.score}));
          });

        this.it2('should return true if second sequence is empty',
          array.grades,
          [] as { name: string; score: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            assert.isTrue(sut.startsWith(second, {equals: (f, s) => f.grade === s.score}));
          });

        this.it2('should return true if both sequences are empty',
          [] as { name: string; grade: number; }[],
          [] as { name: string; score: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            assert.isTrue(sut.startsWith(second, {equals: (f, s) => f.grade === s.score}));
          });
      });
    });

    describe("sum()", () => {
      this.it1('should return sum for all items in numeric sequence', array.oneToTen, (input, inputArray) => {
        const expected = inputArray.reduce((sum, x) => sum + x);

        let sut = this.createSut(input);
        let actual = sut.sum();
        assert.strictEqual(actual, expected);
      });

      this.it1("should return sum on item's property", array.grades, (input, inputArray) => {
        const expected = inputArray.reduce((sum, x) => sum + x.grade, 0);

        let sut = this.createSut(input);
        let actual = sut.sum(g => g.grade);
        assert.strictEqual(actual, expected);
      });

      this.it1('should return zero on empty sequence', <number[]>[], emptyInput => {
        const sut = this.createSut(emptyInput);
        const expected = 0;
        const actual = sut.sum();
        assert.strictEqual(actual, expected);
      });
    });

    describe("toArray()", () => {
      this.it1('should return array with same items as the sequence', array.oneToTen, input => {
        const expected = [...input];
        const sut = this.createSut(input);
        const actual = sut.toArray();
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return a new copy of array', array.oneToTen, input => {
        const expected = [...input];

        const sut = this.createSut(input);
        const actual = sut.toArray();
        assert.notEqual(actual, expected);
      });

      this.it1('should return new array on cached sequence', array.oneToTen, input => {
        const expected = [...input];
        const sut = this.createSut(input);
        sut.cache();
        const actual = sut.toArray();
        assert.notEqual(actual, expected);
      });
    });

    describe('toMap()', () => {
      this.it1('should return an instance of Map with the sequence distinct values by key selector',
        array.grades.concat(array.gradesFiftyAndAbove),
        (input, inputArray) => {
          const expected = new Map(inputArray.map(x => [x.grade, x]));

          const sut = this.createSut(input);
          const actual = sut.toMap(x => x.grade);
          assert.sameDeepOrderedMembers([...actual], [...expected]);
        });

      this.it1('should use last value in case of duplicate keys',
        array.samples, (input, inputArray) => {
          const expected = new Map(inputArray.map(s => [s.type, s]));
          const sut = this.createSut(input);
          const actual = sut.toMap(s => s.type);
          assert.deepEqual(actual, expected);
        });

      describe('with value selector', () => {
        this.it1('should return an instance of Map with the sequence distinct values by key selector',
          array.grades.concat(array.gradesFiftyAndAbove),
          (input, inputArray) => {
            const expected = new Map(inputArray.map(x => [x.grade, x.name]));

            const sut = this.createSut(input);
            const actual = sut.toMap(x => x.grade, x => x.name);
            assert.sameDeepOrderedMembers([...actual], [...expected]);
          });

        this.it1('should use last value in case of duplicate keys',
          array.samples, (input, inputArray) => {
            const expected = new Map(inputArray.map(s => [s.type, s.score]));
            const sut = this.createSut(input);
            const actual = sut.toMap(s => s.type, s => s.score);
            assert.deepEqual(actual, expected);
          });
      });

      describe('with comparable key', () => {
        this.it1('should return an instance of Map with the sequence distinct values by key selector',
          [{x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 999}, {x: 1, y: 1, z: 1}, {x: 2, y: 2, z: 2},],
          (input, inputArray) => {

            const keys = new Map<string, unknown>();
            const expected = new Map();
            inputArray.forEach(xyz => {
              const key = {x: xyz.x, y: xyz.y};
              const comparable = `[${xyz.x},${xyz.y}]`;
              const realKey = keys.get(comparable) ?? keys.set(comparable, key).get(comparable)!;
              expected.set(realKey, xyz);
            });

            const sut = this.createSut(input);
            const actual = sut.toMap(xyz => ({x: xyz.x, y: xyz.y}), undefined, key => `[${key.x},${key.y}]`);
            assert.sameDeepOrderedMembers([...actual], [...expected]);
          });

        this.it1('should use last value in case of duplicate keys',
          array.samples, (input, inputArray) => {
            const keys = new Map<string, unknown>();
            const expected = new Map();
            inputArray.forEach(s => {
              const key = {type: s.type};
              const comparable = s.type;
              const realKey = keys.get(comparable) ?? keys.set(comparable, key).get(comparable)!;
              expected.set(realKey, s);
            });


            const sut = this.createSut(input);
            const actual = sut.toMap(s => ({type: s.type}), undefined, s => s.type);
            assert.deepEqual(actual, expected);
          });
      });

      describe('with value selector and comparable key', () => {
        this.it1('should return an instance of Map with the sequence distinct values by key selector',
          [{x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 999}, {x: 1, y: 1, z: 1}, {x: 2, y: 2, z: 2},],
          (input, inputArray) => {

            const keys = new Map<string, unknown>();
            const expected = new Map();
            inputArray.forEach(xyz => {
              const key = {x: xyz.x, y: xyz.y};
              const comparable = `[${xyz.x},${xyz.y}]`;
              const realKey = keys.get(comparable) ?? keys.set(comparable, key).get(comparable)!;
              expected.set(realKey, `[${xyz.x},${xyz.y},${xyz.z}]`);
            });

            const sut = this.createSut(input);
            const actual = sut.toMap(
              xyz => ({x: xyz.x, y: xyz.y}),
              xyz => `[${xyz.x},${xyz.y},${xyz.z}]`,
              key => `[${key.x},${key.y}]`);

            assert.sameDeepOrderedMembers([...actual], [...expected]);
          });

        this.it1('should use last value in case of duplicate keys',
          array.samples, (input, inputArray) => {
            const keys = new Map<string, unknown>();
            const expected = new Map();
            inputArray.forEach(s => {
              const key = {type: s.type};
              const comparable = s.type;
              const realKey = keys.get(comparable) ?? keys.set(comparable, key).get(comparable)!;
              expected.set(realKey, s.score);
            });

            const sut = this.createSut(input);
            const actual = sut.toMap(s => ({type: s.type}), s => s.score, s => s.type);
            assert.deepEqual(actual, expected);
          });
      });
    });

    describe('toMapOfOccurrences()', () => {
      this.it1('should return a Map of keys mapped to number of times each key exists in source sequence',
        [0, 1, 4, 4, 4, 4, 3, 3, 3, 2, 2], input => {
          const expected = new Map([
            [0, 1], [1, 1], [4, 4], [3, 3], [2, 2]
          ]);

          const actual = this.createSut(input).toMapOfOccurrences();
          assert.deepEqual(actual, expected);
        });

      describe('with key-selector', () => {
        this.it1('should return a Map of keys mapped to number of times each key exists in source sequence',
          array.samples, (input, inputArray) => {
            const expected = new Map();
            for(const s of inputArray) {
              expected.set(s.type, (expected.get(s.type) ?? 0) + 1);
            }

            const actual = this.createSut(input).toMapOfOccurrences(s => s.type);
            assert.deepEqual(actual, expected);
          });

        this.it1('should call key-selector function for every item from source sequence',
          array.samples, (input, inputArray) => {
            const expected = new Map();
            for(const s of inputArray) {
              expected.set(s.type, (expected.get(s.type) ?? 0) + 1);
            }
            const actual: Sample[] = [];
             this.createSut(input).toMapOfOccurrences(s => {
               actual.push(s);
               return s.type;
             });
            assert.deepEqual(actual, inputArray);
          });
      });

      describe('with comparable key', () => {
        this.it1('should return a Map of keys mapped to number of times each key exists in source sequence',
          array.samples, (input, inputArray) => {
            let expected = new Map();
            for(const s of inputArray) {
              expected.set(s.type, (expected.get(s.type) ?? 0) + 1);
            }
            expected = new Map([...expected].map(entry => [{type: entry[0]}, entry[1]]));

            const actual = this.createSut(input).toMapOfOccurrences(s => ({type: s.type}), key => key.type);
            assert.deepEqual(actual, expected);
          });

        this.it1('should call key-selector function for every item from source sequence',
          array.samples, (input, inputArray) => {
            const expected = inputArray.map(s => ({type: s.type}));

            const actual: {type: string}[] = [];
            this.createSut(input).toMapOfOccurrences(s => ({type: s.type}), key => {
              actual.push(key);
              return key.type;
            });
            assert.deepEqual(actual, expected);
          });

        this.it1('should return empty Map when source sequence is empty', [], input => {
          const actual = this.createSut(input).toMapOfOccurrences(x => ({x}), key => key.x);
          assert.equal(actual.size, 0);
        });
      });
    });

    describe('toSet()', () => {
      this.it1('should return an instance of Set with the sequence distinct values',
        array.abc.concat(array.abc),
        input => {
          const expected = new Set(input);
          let sut = this.createSut(input);
          let actual = sut.toSet();
          assert.sameOrderedMembers([...actual], [...expected]);
        });

      describe('with key selector', () => {
        this.it1('should return an instance of Set with the sequence distinct values',
          array.grades.concat(array.gradesFiftyAndAbove),
          (input, inputArray) => {
            const keysSet = new Set<number>();
            const expected = new Set<{ name: string; grade: number; }>();
            inputArray.forEach(item => {
              if (!keysSet.has(item.grade)) {
                keysSet.add(item.grade);
                expected.add(item)
              }
            });
            const sut = this.createSut(input);
            const actual = sut.toSet(x => x.grade);
            assert.sameOrderedMembers([...actual], [...expected]);
          });
      });
    });

    describe('toString()', () => {
      this.it1('should return comma delimited string of the sequence items, confined within square brackets',
        array.oneToTen,
        (input, inputArray) => {
          const expected = '[' + inputArray.join() + ']';
          const actual = this.createSut(input).toString();
          assert.strictEqual(actual, expected);
        });

      this.it1('should return string "[]" for empty sequence',
        [],
        input => {
          const expected = '[]';
          const actual = this.createSut(input).toString();
          assert.strictEqual(actual, expected);
        });
    });
  });
}
