import {describe, it} from "mocha";
import {array} from "../test-data";
import {assert} from "chai";
import {Seq, ToComparableKey} from "../../lib";
import {TestIt} from "../test-harness";
import {DEFAULT_COMPARER, safeComparer, safeSelector} from "../../lib/sort-util";

export abstract class SeqBase_Sorting_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Sorting functionality', () => {

    const testTopSort = <T>(title: string,
                            input: readonly T[],
                            opts: { top?: number; comparer?: (a: T, b: T) => number; selector?: ToComparableKey<T> },
                            sortAndTestSut: (seq: Seq<T>, opts: { top: number; comparer?: (a: T, b: T) => number; selector?: ToComparableKey<T> }, test: (sut: Seq<T>) => void) => void) => {

      if ((opts.top ?? 0) < 0) throw new Error('top value cannot be negative');

      const top = opts.top ?? Math.min(input.length >>> 1, 100);
      const comparer = opts.selector != null?
        (a: T, b: T) => DEFAULT_COMPARER(opts.selector!(a), opts.selector!(b)):
        opts.comparer ?? DEFAULT_COMPARER;
      const reverseComparer = (a: T, b: T) => -comparer(a, b);

      let expected = [...input].sort(comparer);

      this.it1(title + ' - top count is less than the input length', input, (input, inputArray) => {
        const optsTop = {...opts, top};
        const expected1 = expected.slice(0, Math.abs(optsTop.top));

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          assert.deepEqual(actual, expected1);
        });
      });

      this.it1(title + ' - top count is more than the input length', input, (input, inputArray) => {
        const optsTop = {...opts, top: inputArray.length * 2};
        const expected1 = expected.slice(0, Math.abs(optsTop.top));

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          assert.deepEqual(actual, expected1);
        });
      });

      this.it1(title + ' - negative top count (BOTTOM) - top count is less than the input length', input, (input, inputArray) => {
        const optsTop = {...opts, top: -top};
        const expected1 = expected.slice().sort(reverseComparer).slice(0, Math.abs(optsTop.top));

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          assert.deepEqual(actual, expected1);
        });
      });

      this.it1(title + ' - negative top count (BOTTOM) - top count is more than the input length', input, (input, inputArray) => {
        const optsTop = {...opts, top: inputArray.length * -2};
        const expected1 = expected.slice().sort(reverseComparer).slice(0, Math.abs(optsTop.top));

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          assert.deepEqual(actual, expected1);
        });
      });
    }

    describe('sort()', () => {

      describe('without comparer', () => {

        this.it1('should return same result as Array.sort when values are strings',
          array.loremIpsum.x(2), (input, inputArray) => {
            const expected = inputArray.slice().sort();
            let sut = this.createSut(input);
            let actual = [...sut.sort()];
            assert.deepEqual(actual, expected);
          });


        this.it1('should return same result as Array.sort when values are not strings',
          [3, 2, 8, undefined, 100, 6, 9, 0, 10, null, 7, 6, 4], (input, inputArray) => {
            const expected = inputArray.slice().sort();
            let sut = this.createSut(input);
            let actual = [...sut.sort()];
            assert.deepEqual(actual, expected);
          });

        this.it1('should return same result as Array.sort according to items.toString()',
          array.random(20, 0, 20, 0).map(n => new Date(n)), (input, inputArray) => {
            const expected = inputArray.slice().sort();
            let sut = this.createSut(input).sort();
            let actual = [...sut];
            assert.deepEqual(actual, expected);
          });

      });

      describe('with comparer', () => {

        this.it1('should return same result as Array.sort when using a comparer on objects',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndBelow),
          (input, inputArray) => {
            const comparer = (a: { grade: number; }, b: { grade: number; }) => b.grade - a.grade;
            const expected = inputArray.slice().sort(comparer);
            let sut = this.createSut(input).sort(comparer);
            let actual = [...sut];
            assert.sameDeepOrderedMembers(actual, expected);
          });

        describe('with top count', () => {

          testTopSort('should return expected sorted sequence when input is random numbers',
            array.random(20, -10, 10, 0).x(2).pollute(2, 2),
            {comparer: DEFAULT_COMPARER},
            (seq, opts, test) => {
              test(seq.sort(opts.comparer!, opts.top));
            });

          testTopSort('should return expected sorted sequence when input is random objects',
            array.grades.selfZip(2).randomize(0).pollute(2, 2),
            {comparer: safeComparer((a, b) => a.grade - b.grade)},
            (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top)));

          testTopSort(
            'should return expected sorted sequence when input is already sorted numbers',
            array.range(-20, 20,).selfZip(2),
            {comparer: DEFAULT_COMPARER},
            (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top)));

          testTopSort('should return expected sorted sequence when input is already sorted objects',
            array.grades.selfZip(2),
            {comparer: (a, b) => a.grade - b.grade},
            (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top)));

          testTopSort('should return expected sorted sequence when input is sorted numbers in reverse',
            array.range(20, -20).selfZip(2),
            {comparer: DEFAULT_COMPARER},
            (seq, opts, test) => test(seq.sort(opts.comparer!, opts.top)));

          testTopSort('should return expected sorted sequence when input is already sorted objects in reverse',
            array.grades.selfZip(2).reverse(),
            {comparer: (a, b) => a.grade - b.grade},
            (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top)));

          testTopSort('should return expected sorted sequence when input size is more than 10k',
            array.random(10 * 1024 + 1, -1000, 1000, 0),
            {top: 100, comparer: DEFAULT_COMPARER},
            (seq, opts, test) => test(seq.sort(opts.comparer!, opts.top)));

          this.it1('should return empty sequence when top count is zero',
            [] as number[], (input) => {
              const sut = this.createSut(input).sort(DEFAULT_COMPARER, 0);
              const actual = [...sut];
              assert.isEmpty(actual);
            });
        });
      });
    });

    describe('sortBy()', () => {
      this.it1('should sort sequence of objects by one of the properties',
        array.gradesFiftyAndAbove.concat(array.gradesFiftyAndBelow), (input, inputArray) => {
          const expectedByGrade = inputArray.slice().sort((a, b) => a.grade - b.grade);
          const expectedByName = inputArray.slice().sort((a, b) => a.name.localeCompare(b.name));
          const sutByGrade = this.createSut(input).sortBy(x => x.grade);
          const actualByGrade = [...sutByGrade];
          assert.deepEqual(actualByGrade, expectedByGrade);

          const sutByName = this.createSut(input).sortBy(x => x.name);
          const actualByName = [...sutByName];
          assert.deepEqual(actualByName, expectedByName);
        });

      this.it1('should sort sequence in reverse of objects by one of the properties',
        array.gradesFiftyAndAbove.concat(array.gradesFiftyAndBelow), (input, inputArray) => {
          const expectedByGrade = inputArray.slice().sort((a, b) => b.grade - a.grade);
          const expectedByName = inputArray.slice().sort((a, b) => b.name.localeCompare(a.name));
          const sutByGrade = this.createSut(input).sortBy(x => x.grade, true);
          const actualByGrade = [...sutByGrade];
          assert.deepEqual(actualByGrade, expectedByGrade);

          const sutByName = this.createSut(input).sortBy(x => x.name, true);
          const actualByName = [...sutByName];
          assert.deepEqual(actualByName, expectedByName);
        });

      describe('with top count', () => {

        testTopSort('should return expected sorted sequence when input is random',
          array.grades.selfZip(5).randomize(0).pollute(2, 2),
          {selector: safeSelector(x => x.grade)},
          (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top)));

        testTopSort('should return expected sorted sequence when input is already sorted',
          array.grades.selfZip(2),
          {selector: x => x.grade},
          (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top)));

        testTopSort('should return expected sorted sequence when input is already sorted in reverse',
          array.grades.selfZip(2).reverse(),
          {selector: x => x.grade},
          (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top)));

        const grades = array.grades;
        testTopSort('should return expected sorted sequence when input size is more than 10k',
          array.random(10 * 1024 + 1, 0, grades.length - 1, 0).pollute(3, 3).map(i => i != null? grades[i]: i),
          {selector: safeSelector(x => x.grade)},
          (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top)));

        this.it1('should return empty sequence when top count is zero',
          [] as { value: number }[], (input) => {
            const sut = this.createSut(input).sortBy(x => x.value, 0);
            const actual = [...sut];
            assert.isEmpty(actual);
          });
      });
    });

    describe('sorted()', () => {
      this.it1('should sort sequence of numbers', array.random(20, -10, 20, 0), (input, inputArray) => {
        const expected = inputArray.slice().sort((a, b) => a - b);
        const sut = this.createSut(input).sorted();

        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should sort sequence of numbers in reverse', array.random(20, -10, 20, 0), (input, inputArray) => {
        const expected = inputArray.slice().sort((a, b) => b - a);
        const sut = this.createSut(input).sorted(true);

        const actual = [...sut];
        assert.deepEqual(actual, expected);

      });

      const unsortedStrings = ['ddd', null, 'a', 'd', 'cc', 'aaa', null, 'a', 'aa', undefined, 'b', 'c', 'abc', 'abb', undefined];
      const stringComparer = (a: any, b: any): number => a === b
        ? 0
        : (+(a === undefined) * 2 + +(a === null)) - (+(b === undefined) * 2 + +(b === null)) || +(a > b) || -(b > a);

      this.it1('should sort sequence of strings', unsortedStrings, (input, inputArray) => {
        const expected = inputArray.slice().sort();
        const sut = this.createSut(input).sorted();
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      this.it1('should sort sequence of strings in reverse', unsortedStrings, (input, inputArray) => {
        const expected = inputArray.slice().sort((a, b) => -DEFAULT_COMPARER(a, b));
        const sut = this.createSut(input).sorted(true);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      describe('with top count', () => {

        testTopSort('should return expected sorted sequence when input is random numbers',
          array.random(20, -10, 10, 0).x(2).pollute(2, 2),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        testTopSort('should return expected sorted sequence when input is random strings',
          array.loremIpsum.x(5).randomize(0),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        testTopSort(
          'should return expected sorted sequence when input is already sorted numbers',
          array.range(-20, 20,).selfZip(2),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        testTopSort('should return expected sorted sequence when input is already sorted strings',
          array.loremIpsum.x(5).sort(),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        testTopSort('should return expected sorted sequence when input is sorted numbers in reverse',
          array.range(20, -20).selfZip(2),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        testTopSort('should return expected sorted sequence when input is already sorted strings in reverse',
          array.loremIpsum.x(5).sort().reverse(),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        testTopSort('should return expected sorted sequence when input size is more than 10k',
          array.random(10 * 1024 + 1, -100, 100, 0).pollute(3, 3),
          {},
          (seq, opts, test) => test(seq.sorted(opts.top)));

        this.it1('should return empty sequence when top count is zero',
          [] as number[], (input) => {
            const sut = this.createSut(input).sorted(0);
            const actual = [...sut];
            assert.isEmpty(actual);
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

      describe('with top count', () => {
        describe('sort(top)', () => {
          describe('take()', () => {
            // TODO:
          });
          describe('takeLast()', () => {
            // TODO:
          });
          describe('sort(top)', () => {
            // TODO:
          });
          describe('sortBy(top)', () => {
            // TODO:
          });
          describe('sorted(top)', () => {
            // TODO:
          });
        });
        describe('sortBy(top)', () => {
          describe('thenSortBy()', () => {
            this.it1('should return expected sorted sequence with upto top-count items when performing thenSortBy()',
              array.grades.x(2).randomize(0), (input, inputArray) => {
                const top = inputArray.length / 2;
                const expected = inputArray.slice()
                  .sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name))
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sortBy(x => -x.grade, top)
                  .thenSortBy(x => x.name);
                const actual = [...sut];
                assert.deepEqual(actual, expected);
              });

          });
          describe('take()', () => {

          });
          describe('takeLast()', () => {

          });
          describe('sort(top)', () => {

          });
          describe('sortBy(top)', () => {

          });
          describe('sorted(top)', () => {

          });
        });
        describe('sorted(top)', () => {
          describe('take()', () => {
            // TODO:
          });
          describe('takeLast()', () => {
            // TODO:
          });
          describe('sort(top)', () => {
            // TODO:
          });
          describe('sortBy(top)', () => {
            // TODO:
          });
          describe('sorted(top)', () => {
            // TODO:
          });
        });
      });
    });
  });
}
