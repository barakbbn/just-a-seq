import {describe, it} from "mocha";
import {array, generator} from "../test-data";
import {assert} from "chai";
import {ComparableType, Seq, ToComparableKey} from "../../lib";
import {TestIt} from "../test-harness";

export abstract class SeqBase_Sorting_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Sorting functionality', () => {

    describe('sort()', () => {
      it('should return same result as Array.sort when not using comparer and values are not strings', () => {
        const unsorted = [3, 2, 8, undefined, 100, 6, 9, 0, 10, null, 7, 6, 4];
        const expected = unsorted.slice().sort();
        let sut = this.createSut(unsorted);
        let actual = [...sut.sort()];
        assert.deepEqual(actual, expected);
      });

      it('should return same result as Array.sort when using a comparer', () => {
        const unsorted = array.gradesFiftyAndAbove.concat(array.gradesFiftyAndBelow);
        const comparer = (a: { grade: number; }, b: { grade: number; }) => b.grade - a.grade;
        const expected = unsorted.slice().sort(comparer);
        let sut = this.createSut(unsorted);
        let sutSorted = sut.sort(comparer);
        let actual = [...sutSorted];
        assert.sameDeepOrderedMembers(actual, expected);
      });
    });

    describe('sortBy()', () => {
      it('should sort sequence of objects by one of the properties', () => {
        const unsorted = array.gradesFiftyAndAbove.concat(array.gradesFiftyAndBelow);
        const expectedByGrade = unsorted.slice().sort((a, b) => a.grade - b.grade);
        const expectedByName = unsorted.slice().sort((a, b) => a.name.localeCompare(b.name));
        const sut = this.createSut(unsorted);
        const sut2 = this.createSut(generator.from(unsorted));

        let actual = [...sut.sortBy(x => x.grade)];
        assert.deepEqual(actual, expectedByGrade);

        actual = [...sut2.sortBy(x => x.grade)];
        assert.deepEqual(actual, expectedByGrade);


        actual = [...sut.sortBy(x => x.name)];
        assert.deepEqual(actual, expectedByName);

        actual = [...sut2.sortBy(x => x.name)];
        assert.deepEqual(actual, expectedByName);
      });
      it('should sort sequence in reverse of objects by one of the properties', () => {
        const unsorted = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndAbove);
        const expectedByGrade = unsorted.slice().sort((a, b) => b.grade - a.grade);
        const expectedByName = unsorted.slice().sort((a, b) => b.name.localeCompare(a.name));
        const sut = this.createSut(unsorted);
        const sut2 = this.createSut(generator.from(unsorted));

        let actual = [...sut.sortBy(x => x.grade, true)];
        assert.deepEqual(actual, expectedByGrade);

        actual = [...sut2.sortBy(x => x.grade, true)];
        assert.deepEqual(actual, expectedByGrade);


        actual = [...sut.sortBy(x => x.name, true)];
        assert.deepEqual(actual, expectedByName);

        actual = [...sut2.sortBy(x => x.name, true)];
        assert.deepEqual(actual, expectedByName);
      });
    });

    describe('sorted()', () => {
      describe('should sort sequence of numbers', () => {
        const unsorted = [50, 10, -5, 100, 7, 70, 30, 0, -100];
        const sut = this.createSut(unsorted);
        const sut2 = this.createSut(generator.from(unsorted));

        it('increasing', () => {
          const expected = unsorted.slice().sort((a, b) => a - b);
          const actual = [...sut.sorted()];
          assert.sameOrderedMembers(actual, expected);
          const actual2 = [...sut2.sorted()];
          assert.deepEqual(actual2, expected);
        });
        it('in reverse', () => {
          const expected = unsorted.slice().sort((a, b) => b - a);
          const actual = [...sut.sorted(true)];
          assert.deepEqual(actual, expected);
          const actual2 = [...sut2.sorted(true)];
          assert.deepEqual(actual2, expected);
        });
      });

      describe('should sort sequence of strings', () => {
        const unsorted = ['ddd', null, 'a', 'd', 'cc', 'aaa', null, 'a', 'aa', undefined, 'b', 'c', 'abc', 'abb', undefined];
        const sut = this.createSut(unsorted);
        const sut2 = this.createSut(generator.from(unsorted));
        const comparer = (a: any, b: any): number => a === b
          ? 0
          : (+(a === undefined) * 2 + +(a === null)) - (+(b === undefined) * 2 + +(b === null)) || +(a > b) || -(b > a);

        it('increasing', () => {
          const expected = unsorted.slice().sort(comparer);
          const actual = [...sut.sorted()];
          assert.deepEqual(actual, expected);
          const actual2 = [...sut2.sorted()];
          assert.deepEqual(actual2, expected);
        });

        it('in reverse', () => {
          const reverseComparer = (a: any, b: any) => comparer(b, a);
          const expected = unsorted.slice().sort(reverseComparer);
          const actual = [...sut.sorted(true)];
          assert.deepEqual(actual, expected);
          const actual2 = [...sut2.sorted(true)];
          assert.deepEqual(actual2, expected);
        });
      });
    });

    describe('Chaining', () => {
      describe('Sorting chain', () => {
        it('sortBy().thenBy...', () => {
          const unordered = array.samples;

          const expectedByAscDescAscDesc = unordered.slice().sort((x, y) => {
            return x.type.localeCompare(y.type) /* asc */ ||
              y.period - x.period /* desc */ ||
              x.score - y.score  /* asc */ ||
              +y.ok - +x.ok  /* desc */;
          });

          const sut = this.createSut(unordered)
            .sortBy(x => x.type)
            .thenSortBy(x => x.period, true)
            .thenSortBy(x => x.score)
            .thenSortBy(x => x.ok, true);

          const actualByAscDescAscDesc = [...sut];
          assert.sameDeepOrderedMembers(actualByAscDescAscDesc, expectedByAscDescAscDesc);
        });

        it('sortBy(reverse).thenBy...', () => {
          const unordered = array.samples;

          const expectedByDescDescAscAsc = unordered.slice().sort((x, y) => {
            return y.type.localeCompare(x.type) /* desc */ ||
              y.period - x.period /* desc */ ||
              x.score - y.score  /* asc */ ||
              +x.ok - +y.ok  /* asc */;
          });
          const sut = this.createSut(unordered)
            .sortBy(x => x.type, true)
            .thenSortBy(x => x.period, true)
            .thenSortBy(x => x.score)
            .thenSortBy(x => x.ok);
          const actualByDescDescAscAsc = [...sut];
          assert.sameDeepOrderedMembers(actualByDescDescAscAsc, expectedByDescDescAscAsc);
        });
      });

      it('Sorting chain - immutability', () => {
        const unordered = array.samples;

        const expectedByTypeThenByPeriod = unordered.slice().sort((a, b) => a.type.localeCompare(b.type) || (a.period - b.period));
        const expectedByTypeThenByScoreDescending = unordered.slice().sort((a, b) => a.type.localeCompare(b.type) || (b.score - a.score));

        const sut = this.createSut(unordered).sortBy(x => x.type);
        const actualByTypeThenByPeriod = [...sut.thenSortBy(x => x.period)];
        const actualByTypeThenByScoreDescending = [...sut.thenSortBy(x => x.score, true)];

        assert.sameDeepOrderedMembers(actualByTypeThenByPeriod, expectedByTypeThenByPeriod);
        assert.sameDeepOrderedMembers(actualByTypeThenByScoreDescending, expectedByTypeThenByScoreDescending);

        // Change order of execution
        const sut2 = this.createSut(unordered).sortBy(x => x.type);
        const actualByTypeThenByScoreDescending2 = [...sut2.thenSortBy(x => x.score, true)];
        const actualByTypeThenByPeriod2 = [...sut2.thenSortBy(x => x.period)];

        assert.sameOrderedMembers(actualByTypeThenByScoreDescending2, expectedByTypeThenByScoreDescending);
        assert.sameOrderedMembers(actualByTypeThenByPeriod2, expectedByTypeThenByPeriod);
      });
    });

    describe('top()', () => {
      const primitiveComparer = (a: any, b: any) => a === b? 0: a > b? 1: -1;

      const test = <T>(title: string, input: readonly T[], getOpts: () => { top?: number; comparer?: (a: T, b: T) => number; selector?: ToComparableKey<T> }) => {
        this.it1(title, input, (input, inputArray) => {
          const opts = {top: inputArray.length >>> 2, ...getOpts()};

          let expected = inputArray.slice();
          if (opts.selector != null) expected.sort((a: T, b: T) => primitiveComparer(opts.selector!(a), opts.selector!(b)));
          else expected.sort(opts.comparer ?? primitiveComparer);
          if (opts.top < 0) expected.reverse();
          expected = expected.slice(0, Math.abs(opts.top));

          const sut = this.createSut(input);
          const top = opts.selector != null?
            sut.top(opts.top, opts.selector):
            opts.comparer != null?
              sut.top(opts.top, {comparer: opts.comparer}):
              sut.top(opts.top);
          const actual = [...top];
          assert.deepEqual(actual, expected);
        });
      }

      describe('without comparer', () => {
        describe('should return sorted sequence with only the number of top items', () => {
          describe('top count is less than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0), () => ({}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer), () => ({}));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse(), () => ({}));
            test('input size is more than 10k', array.random(10 * 1024 + 1, -10, 10, 0), () => ({top: 100}));
          });
          describe('top count is more than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0), () => ({top: 9999999999}));
            test('input is already sorted', array.repeatConcat(array.range(-10, 10), 2).sort(primitiveComparer), () => ({top: 9999999999}));
            test('input is sorted in reverse', array.repeatConcat(array.range(-10, 10), 2).sort(primitiveComparer).reverse(), () => ({top: 9999999999}));
          });
        });
        describe('should return sorted sequence with only the number of BOTTOM items, when count parameter is negative', () => {
          describe('top count is less than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0), () => ({top: -10}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer), () => ({top: -10}));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse(), () => ({top: -10}));
          });
          describe('top count is more than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0), () => ({top: -9999999999}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer), () => ({top: -9999999999}));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse(), () => ({top: -9999999999}));
          });
        });
      });

      describe('value-selector', () => {
        const selector = (x: { value: number }) => x.value;
        describe('should return sorted sequence with only the number of top items', () => {
          describe('top count is less than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({selector}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({selector}));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({selector}));
            test('input size is more than 10k', array.random(10 * 1024 + 1, -10, 10, 0).map(n => ({value: n})), () => ({
              top: 100,
              selector
            }));
          });
          describe('top count is more than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({
              top: 9999999999,
              selector
            }));
            test('input is already sorted', array.repeatConcat(array.range(-10, 10), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({
              top: 9999999999,
              selector
            }));
            test('input is sorted in reverse', array.repeatConcat(array.range(-10, 10), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({
              top: 9999999999,
              selector
            }));
          });
        });
        describe('should return sorted sequence with only the number of BOTTOM items, when count parameter is negative', () => {
          describe('top count is less than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({top: -10, selector}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({
              top: -10,
              selector
            }));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({
              top: -10,
              selector
            }));
          });
          describe('top count is more than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({
              top: -9999999999,
              selector
            }));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({
              top: -9999999999,
              selector
            }));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({
              top: -9999999999,
              selector
            }));
          });
        });
      });

      describe('comparer', () => {
        const comparer = (a: { value: number }, b: { value: number }) => a.value - b.value;

        describe('should return sorted sequence with only the number of top items', () => {
          describe('top count is less than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({comparer}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({comparer}));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({comparer}));
            test('input size is more than 10k', array.random(10 * 1024 + 1, -10, 10, 0).map(n => ({value: n})), () => ({
              top: 100,
              comparer
            }));
          });
          describe('top count is more than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({
              top: 9999999999,
              comparer
            }));
            test('input is already sorted', array.repeatConcat(array.range(-10, 10), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({
              top: 9999999999,
              comparer
            }));
            test('input is sorted in reverse', array.repeatConcat(array.range(-10, 10), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({
              top: 9999999999,
              comparer
            }));
          });
        });
        describe('should return sorted sequence with only the number of BOTTOM items, when count parameter is negative', () => {
          describe('top count is less than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({top: -10, comparer}));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({
              top: -10,
              comparer
            }));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({
              top: -10,
              comparer
            }));
          });
          describe('top count is more than input sequence size', () => {
            test('input is random', array.random(20, -10, 10, 0).map(n => ({value: n})), () => ({
              top: -9999999999,
              comparer
            }));
            test('input is already sorted', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).map(n => ({value: n})), () => ({
              top: -9999999999,
              comparer
            }));
            test('input is sorted in reverse', array.repeatConcat(array.range(-20, 20), 2).sort(primitiveComparer).reverse().map(n => ({value: n})), () => ({
              top: -9999999999,
              comparer
            }));
          });
        });
      });
    });
  });
}
