import {describe} from "mocha";
import {array, Grade, Sample} from "../test-data";
import {assert} from "chai";
import {Comparer, Selector, Seq, ToComparableKey} from "../../lib";
import {TestIt} from "../test-harness";
import {DEFAULT_COMPARER} from "../../lib/sort-util";

export abstract class SeqBase_Sorting_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('SeqBase - Sorting functionality', () => {

    const testTopSort = <T>(title: string,
                            input: readonly T[],
                            opts: { top?: number; comparer?: (a: T, b: T) => number; selector?: ToComparableKey<T>; stableSort?: boolean; },
                            sortAndTestSut: (seq: Seq<T>, opts: { top: number; comparer?: (a: T, b: T) => number; selector?: ToComparableKey<T>; stableSort?: boolean; }, test: (sut: Seq<T>) => void) => void) => {

      if ((opts.top ?? 0) < 0) throw new Error('top value cannot be negative');

      const top = opts.top ?? Math.min(input.length >>> 1, 100);
      const comparer = opts.selector != null?
        (a: T, b: T) => DEFAULT_COMPARER(opts.selector!(a), opts.selector!(b)):
        opts.comparer ?? DEFAULT_COMPARER;
      const reverseComparer = (a: T, b: T) => -comparer(a, b);

      let expected = [...input].sort(comparer);

      function assertUnstableSort(actual: T[], expected: T[]): void {
        for (let i = 0; i < Math.max(actual.length, expected.length); i++) if (comparer(actual[i], expected[i]) !== 0) {
          assert.sameOrderedMembers(actual, expected);
          break;
        }
      }

      const stableSort = opts.stableSort;

      this.it1(title + ' - top count is less than the input length', input, input => {
        const optsTop = {...opts, top, stableSort};
        const expected1 = expected.slice(0, optsTop.top);

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          if (stableSort) assert.sameOrderedMembers(actual, expected1);
          else assertUnstableSort(actual, expected1);
        });
      });

      this.it1(title + ' - top count is more than the input length', input, (input, inputArray) => {
        const optsTop = {...opts, top: inputArray.length * 2, stableSort};
        const expected1 = expected.slice(0, optsTop.top);

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          if (stableSort) assert.sameOrderedMembers(actual, expected1);
          else assertUnstableSort(actual, expected1);
        });
      });

      this.it1(title + ' - negative top count (BOTTOM) - top count is less than the input length', input, input => {
        const optsTop = {...opts, top: -top, stableSort};
        const expected1 = expected.slice().sort(reverseComparer).slice(0, top);

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          if (stableSort) assert.sameOrderedMembers(actual, expected1);
          else assertUnstableSort(actual, expected1);
        });
      });

      this.it1(title + ' - negative top count (BOTTOM) - top count is more than the input length', input, (input, inputArray) => {
        const reverseTop = inputArray.length * 2;
        const optsTop = {...opts, top: -reverseTop, stableSort};
        const expected1 = expected.slice().sort(reverseComparer).slice(0, reverseTop);

        const sut = this.createSut(input);
        sortAndTestSut(sut, optsTop, sortedSut => {
          const actual = [...sortedSut];
          if (stableSort) assert.sameOrderedMembers(actual, expected1);
          else assertUnstableSort(actual, expected1);
        });
      });
    }

    const gradesWithDuplicatesAndNullAndUndefined = array.grades.randomize(0).pollute(1, 1).concat(array.grades.map(g => ({
      ...g,
      name: g.name + '+'
    })));
    const randomNumbersWithDuplicatesAndNullAndUndefined = array.random(20, -5, 15, 0).pollute(1, 1);
    const sampleByScoreComparer = (a: Sample, b: Sample) => (a?.score ?? Number.MAX_SAFE_INTEGER) - (b?.score ?? Number.MAX_SAFE_INTEGER);
    const safeNumber = (v?: number) => v ?? Number.MAX_SAFE_INTEGER;

    describe('sort()', () => {

      describe('without comparer', () => {

        this.it1('should return same result as Array.sort when values are strings',
          array.loremIpsum.x(2), (input, inputArray) => {
            const expected = inputArray.slice().sort();
            let sut = this.createSut(input);
            let actual = [...sut.sort()];
            assert.deepEqual(actual, expected);
          });


        this.it1('should return same result as Array.sort when values are numbers',
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
          array.gradesFiftyAndAbove.x(2),
          (input, inputArray) => {
            const comparer = (a: { grade: number; }, b: { grade: number; }) => b.grade - a.grade;
            const expected = inputArray.slice().sort(comparer);
            let sut = this.createSut(input).sort(comparer);
            let actual = [...sut];
            assert.sameDeepOrderedMembers(actual, expected);
          });

        describe('with top count', () => {
          const runTopSortTests = (stableSort?: boolean) => {
            if (!stableSort) stableSort = undefined;

            testTopSort('should return expected sorted sequence when input is random numbers',
              array.random(20, -10, 10, 0).x(2).pollute(2, 2),
              {comparer: DEFAULT_COMPARER, stableSort},
              (seq, opts, test) => test(seq.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));

            testTopSort(
              'should return expected sorted sequence when input is already sorted numbers',
              array.range(-20, 20,).selfZip(2).pollute(2, 2).sort(DEFAULT_COMPARER),
              {comparer: DEFAULT_COMPARER, stableSort},
              (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));

            testTopSort('should return expected sorted sequence when input is sorted numbers in reverse',
              array.range(20, -20).selfZip(2).prependNulldefined(0, 2).appendNulldefined(2),
              {comparer: DEFAULT_COMPARER, stableSort},
              (seq, opts, test) => test(seq.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));

            testTopSort('should return expected sorted sequence when input size is more than 10k',
              array.random(10 * 1024 + 1, -1000, 1000, 0),
              {top: 100, comparer: DEFAULT_COMPARER, stableSort},
              (seq, opts, test) => test(seq.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));

            testTopSort('should return expected sorted sequence when input is random objects',
              array.samples.selfZip(2).randomize(0).pollute(2, 2),
              {comparer: sampleByScoreComparer, stableSort},
              (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));

            testTopSort('should return expected sorted sequence when input is already sorted objects',
              array.samples.selfZip(2).pollute(2, 2).sort(sampleByScoreComparer),
              {comparer: sampleByScoreComparer, stableSort},
              (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));

            testTopSort('should return expected sorted sequence when input is already sorted objects in reverse',
              array.samples.selfZip(2).pollute(2, 2).sort((a, b) => DEFAULT_COMPARER(b, a)),
              {comparer: sampleByScoreComparer, stableSort},
              (sut, opts, test) => test(sut.sort(opts.comparer!, opts.top, {stable: opts.stableSort})));
          };

          this.it1('should return empty sequence when top count is zero',
            [] as number[], (input) => {
              const sut = this.createSut(input).sort(DEFAULT_COMPARER, 0);
              const actual = [...sut];
              assert.isEmpty(actual);
            });

          describe('stable sort', () => runTopSortTests(true));
          describe('unstable sort', () => runTopSortTests(false));
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
        const runTopSortTests = (stableSort?: boolean) => {
          if (!stableSort) stableSort = undefined;

          testTopSort('should return expected sorted sequence when input is random',
            array.samples.selfZip(5).randomize(0).pollute(2, 2),
            {selector: x => x?.score ?? Number.MAX_SAFE_INTEGER, stableSort},
            (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input is already sorted',
            array.samples.selfZip(2),
            {selector: x => x.score, stableSort},
            (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input is already sorted in reverse',
            array.grades.selfZip(2).reverse(),
            {selector: x => x.grade, stableSort},
            (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top, {stable: opts.stableSort})));

          const grades = array.grades;
          testTopSort('should return expected sorted sequence when input size is more than 10k',
            array.random(10 * 1024 + 1, 0, grades.length - 1, 0).pollute(3, 3).map(i => i != null? grades[i]: i),
            {selector: x => x?.grade ?? Number.MAX_SAFE_INTEGER, stableSort},
            (sut, opts, test) => test(sut.sortBy(opts.selector!, opts.top, {stable: opts.stableSort})));

          this.it1('should return empty sequence when top count is zero',
            [] as { value: number }[], (input) => {
              const sut = this.createSut(input).sortBy(x => x.value, 0);
              const actual = [...sut];
              assert.isEmpty(actual);
            });
        };
        describe('stable sort', () => runTopSortTests(true));
        describe('unstable sort', () => runTopSortTests(false));
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
        const runTopSortTests = (stableSort?: boolean) => {
          if (!stableSort) stableSort = undefined;

          testTopSort('should return expected sorted sequence when input is random numbers',
            array.random(20, -10, 10, 0).x(2).pollute(2, 2),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input is random strings',
            array.loremIpsum.x(5).randomize(0),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          testTopSort(
            'should return expected sorted sequence when input is already sorted numbers',
            array.range(-20, 20,).selfZip(2),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input is already sorted strings',
            array.loremIpsum.x(5).sort(),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input is sorted numbers in reverse',
            array.range(20, -20).selfZip(2),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input is already sorted strings in reverse',
            array.loremIpsum.x(5).sort().reverse(),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          testTopSort('should return expected sorted sequence when input size is more than 10k',
            array.random(10 * 1024 + 1, -100, 100, 0).pollute(3, 3),
            {stableSort},
            (seq, opts, test) => test(seq.sorted(opts.top, {stable: opts.stableSort})));

          this.it1('should return empty sequence when top count is zero',
            [] as number[], (input) => {
              const sut = this.createSut(input).sorted(0);
              const actual = [...sut];
              assert.isEmpty(actual);
            });
        }
        describe('stable sort', () => runTopSortTests(true));
        describe('unstable sort', () => runTopSortTests(false));

      });

    });

    describe('Chaining', () => {
      describe('Sorting chain', () => {
        this.it1('sortBy().thenBy...', array.samples, (input, inputArray) => {

          const expectedByAscDescAscDesc = inputArray.slice().sort((x, y) => {
            return x.type.localeCompare(y.type) /* asc */ ||
              y.period - x.period /* desc */ ||
              x.score - y.score  /* asc */ ||
              +y.ok - +x.ok  /* desc */;
          });

          const sut = this.createSut(input)
            .sortBy(x => x.type)
            .thenSortBy(x => x.period, true)
            .thenSortBy(x => x.score)
            .thenSortBy(x => x.ok, true);

          const actualByAscDescAscDesc = [...sut];
          assert.sameDeepOrderedMembers(actualByAscDescAscDesc, expectedByAscDescAscDesc);
        });

        this.it1('sortBy(reverse).thenBy...', array.samples, (input, inputArray) => {
          const expectedByDescDescAscAsc = inputArray.slice().sort((x, y) => {
            return y.type.localeCompare(x.type) /* desc */ ||
              y.period - x.period /* desc */ ||
              x.score - y.score  /* asc */ ||
              +x.ok - +y.ok  /* asc */;
          });
          const sut = this.createSut(input)
            .sortBy(x => x.type, true)
            .thenSortBy(x => x.period, true)
            .thenSortBy(x => x.score)
            .thenSortBy(x => x.ok);
          const actualByDescDescAscAsc = [...sut];
          assert.sameDeepOrderedMembers(actualByDescDescAscAsc, expectedByDescDescAscAsc);
        });
      });

      this.it1('Sorting chain - immutability', array.samples, (input, inputArray) => {

        const expectedByTypeThenByPeriod = inputArray.slice().sort((a, b) => a.type.localeCompare(b.type) || (a.period - b.period));
        const expectedByTypeThenByScoreDescending = inputArray.slice().sort((a, b) => a.type.localeCompare(b.type) || (b.score - a.score));

        const sut = this.createSut(input).sortBy(x => x.type);
        const actualByTypeThenByPeriod = [...sut.thenSortBy(x => x.period)];
        const actualByTypeThenByScoreDescending = [...sut.thenSortBy(x => x.score, true)];

        assert.sameDeepOrderedMembers(actualByTypeThenByPeriod, expectedByTypeThenByPeriod);
        assert.sameDeepOrderedMembers(actualByTypeThenByScoreDescending, expectedByTypeThenByScoreDescending);

        // Change order of execution
        const sut2 = this.createSut(input).sortBy(x => x.type);
        const actualByTypeThenByScoreDescending2 = [...sut2.thenSortBy(x => x.score, true)];
        const actualByTypeThenByPeriod2 = [...sut2.thenSortBy(x => x.period)];

        assert.sameOrderedMembers(actualByTypeThenByScoreDescending2, expectedByTypeThenByScoreDescending);
        assert.sameOrderedMembers(actualByTypeThenByPeriod2, expectedByTypeThenByPeriod);
      });

      describe('with top count', () => {
        describe('sort(top)', () => {
          describe('take()', () => {
            this.it1('sort(stable: true).take() should return sorted sequence like Array.sort.slice()',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top = inputArray.length / 2;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sort(comparer, {stable: true})
                  .take(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sort(top1, stable: true).take(top2) should return sorted sequence like Array.sort.slice(top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);

                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top1)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sort(comparer, top1, {stable: true})
                  .take(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sort(top1, stable: true).take(top2) should return sorted sequence like Array.sort.slice(top1) when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);

                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top1)

                const sut = this.createSut(input)
                  .sort(comparer, top1, {stable: true})
                  .take(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sort(top1, stable: true).take(top2) should return same seq instance when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);

                const expected = this.createSut(input).sort(comparer, top1, {stable: true});

                const actual = expected.take(top2);

                assert.equal(actual, expected);
              }
            );
          });

          describe('takeLast()', () => {
            this.it1('sort(stable: true).takeLast() should return sorted sequence like Array.sort.slice()',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top = inputArray.length / 2;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(-top);

                const sut = this.createSut(input)
                  .sort(comparer, {stable: true})
                  .takeLast(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sort(top1, stable: true).takeLast(top2) should return sorted sequence like Array.sort.slice(top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);

                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top1)
                  .slice(-top2);

                const sut = this.createSut(input)
                  .sort(comparer, top1, {stable: true})
                  .takeLast(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sort(top1, stable: true).takeLast(top2) should return same seq instance when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);

                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top1)
                  .slice(0 - top2);

                const sut = this.createSut(input)
                  .sort(comparer, top1, {stable: true})
                  .takeLast(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );
          });

          describe('sort(top)', () => {
            this.it1('sort(stable: true).sort(comparer2, top) should return sorted sequence like Array.sort(comparer2).slice(0, top)',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .sort(byNameThenByGradeComparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sort(byGradeThenByNameComparer, {stable: true})
                  .sort(byNameThenByGradeComparer, top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sort(top1).sort(comparer2, top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sort(byGradeThenByNameComparer, top1, {stable: true})
                  .sort(byNameThenByGradeComparer, top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sort(top1).sort(comparer2, top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer);

                const sut = this.createSut(input)
                  .sort(byGradeThenByNameComparer, top1, {stable: true})
                  .sort(byNameThenByGradeComparer, top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });

          describe('sortBy(top)', () => {
            this.it1('sort(stable: true).sortBy(top) should return sorted sequence like Array.sort(comparer).slice(0, top)',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(byNameThenByGradeComparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sort(byGradeThenByNameComparer, {stable: true})
                  .sortBy(x => x?.name, top)
                  .thenSortBy(x => safeNumber(x?.grade));

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sort(top1).sortBy(top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sort(byGradeThenByNameComparer, top1, {stable: true})
                  .sortBy(x => x?.name, top2)
                  .thenSortBy(x => safeNumber(x?.grade));

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sort(top1).sortBy(top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer);

                const sut = this.createSut(input)
                  .sort(byGradeThenByNameComparer, top1, {stable: true})
                  .sortBy(x => x?.name, top2)
                  .thenSortBy(x => safeNumber(x?.grade));

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });

          describe('sorted(top)', () => {
            this.it1('sort(stable: true).sorted(top) should return sorted sequence like Array.sort.slice(0, top)',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const comparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sort(comparer, {stable: true})
                  .sorted(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sort(top1).sorted(top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top1)
                  .sort(ascComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sort(descComparer, top1, {stable: true})
                  .sorted(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sort(top1).sorted(top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top1)
                  .sort(ascComparer);

                const sut = this.createSut(input)
                  .sort(descComparer, top1, {stable: true})
                  .sorted(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });
        });

        describe('sortBy(top)', () => {

          describe('thenSortBy()', () => {
            this.it1('should return expected sorted sequence with upto top-count items when top count is less than the input length',
              gradesWithDuplicatesAndNullAndUndefined,
              (input, inputArray) => {

                const top = inputArray.length / 2;
                const expected = [...inputArray]
                  .sort((a, b) => safeNumber(b?.grade) - safeNumber(a?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sortBy(x => -(x?.grade ?? Number.MAX_SAFE_INTEGER), top)
                  .thenSortBy(x => x.name);

                const actual = [...sut];
                assert.deepEqual(actual, expected);
              });

            this.it1('should return expected sorted sequence with all items when top count is more than the input length',
              gradesWithDuplicatesAndNullAndUndefined,
              (input, inputArray) => {

                const top = inputArray.length * 2;
                const expected = [...inputArray]
                  .sort((a, b) => safeNumber(b?.grade) - safeNumber(a?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sortBy(x => -(x?.grade ?? Number.MAX_SAFE_INTEGER), top)
                  .thenSortBy(x => x.name);

                const actual = [...sut];
                assert.deepEqual(actual, expected);
              });

            this.it1('should return expected reversed sorted sequence with upto top-count items when top count is negative (BOTTOM) and is less than the input length',
              gradesWithDuplicatesAndNullAndUndefined,
              (input, inputArray) => {

                const top = inputArray.length / 2;

                const expectedBottom = [...inputArray]
                  .sort((a, b) => safeNumber(b?.grade) - safeNumber(a?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top);

                const sutBottom = this.createSut(input)
                  .sortBy(x => x?.grade ?? Number.MAX_SAFE_INTEGER, -top)
                  .thenSortBy(x => x.name);

                const actualBottom = [...sutBottom];
                assert.deepEqual(actualBottom, expectedBottom);
              });

            this.it1('should return expected reversed sorted sequence with all items when top count is negative (BOTTOM) but is more than the input length',
              gradesWithDuplicatesAndNullAndUndefined,
              (input, inputArray) => {

                const top = inputArray.length * 2;

                const expectedBottom = [...inputArray]
                  .sort((a, b) => safeNumber(b?.grade) - safeNumber(a?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top);

                const sutBottom = this.createSut(input)
                  .sortBy(x => x?.grade ?? Number.MAX_SAFE_INTEGER, -top)
                  .thenSortBy(x => x.name);

                const actualBottom = [...sutBottom];
                assert.deepEqual(actualBottom, expectedBottom);
              });

            this.it1('should return empty sequence when top count zero',
              array.grades.randomize(0).pollute(1, 1).concat(array.grades.map(g => ({...g, name: g.name + '+'}))),
              (input, inputArray) => {

                const sut = this.createSut(input)
                  .sortBy(x => -(x?.grade ?? Number.MAX_SAFE_INTEGER), 0)
                  .thenSortBy(x => x.name);

                const actual = [...sut];
                assert.isEmpty(actual);
              });

          });

          describe('take()', () => {

            this.it1('sortBy(stable: true).take() should return sorted sequence like Array.sort.slice()',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort((a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top);


                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), {stable: true})
                  .thenSortBy(x => x?.name)
                  .take(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sortBy(top1, stable: true).take(top2) should return sorted sequence like Array.sort.slice(top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const expected = inputArray
                  .slice()
                  .sort((a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top1)
                  .slice(0, top2);


                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .take(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sortBy(top1, stable: true).take(top2) should return sorted sequence like Array.sort.slice(top1) when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const expected = inputArray
                  .slice()
                  .sort((a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top1)
                  .slice(0, top2);


                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .take(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sortBy(top1, stable: true).take(top2) should return same seq instance when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);

                const expected = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)

                const actual = expected.take(top2);

                assert.equal(actual, expected);
              }
            );
          });

          describe('takeLast()', () => {
            this.it1('sortBy(stable: true).takeLast() should return sorted sequence like Array.sort.slice()',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort((a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(-top);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), {stable: true})
                  .thenSortBy(x => x?.name)
                  .takeLast(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sortBy(top1, stable: true).takeLast(top2) should return sorted sequence like Array.sort.slice(0, top1).slice(top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const expected = inputArray
                  .slice()
                  .sort((a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top1)
                  .slice(-top2);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .takeLast(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sortBy(top1, stable: true).takeLast(top2) should return same seq instance when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const expected = inputArray
                  .slice()
                  .sort((a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name))
                  .slice(0, top1)
                  .slice(-top2);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .takeLast(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );
          });

          describe('sort(top)', () => {
            this.it1('sortBy(stable: true).sort(comparer, top) should return sorted sequence like Array.sort(comparer).slice(0, top)',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), {stable: true})
                  .thenSortBy(x => x?.name)
                  .sort(comparer, top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sortBy(top1).sort(comparer2, top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .sort(byNameThenByGradeComparer, top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sortBy(top1).sort(comparer2, top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .sort(byNameThenByGradeComparer, top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });

          describe('sortBy(top)', () => {
            this.it1('sortBy(stable: true).sortBy(top) should return sorted sequence like Array.sort(comparer).slice(0, top)',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const comparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), {stable: true})
                  .thenSortBy(x => x?.name)
                  .sortBy(x => x?.name, top)
                  .thenSortBy(x => safeNumber(x?.grade));

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sortBy(top1).sortBy(top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .sortBy(x => x?.name, top2)
                  .thenSortBy(x => safeNumber(x?.grade));

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sortBy(top1).sortBy(top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              gradesWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const byGradeThenByNameComparer: Comparer<{ name: string; grade: number; }> = (a, b) => safeNumber(a?.grade) - safeNumber(b?.grade) || ('' + a?.name).localeCompare('' + b?.name);
                const byNameThenByGradeComparer: Comparer<{ name: string; grade: number; }> = (a, b) => ('' + a?.name).localeCompare('' + b?.name) || safeNumber(a?.grade) - safeNumber(b?.grade);
                const expected = inputArray
                  .slice()
                  .sort(byGradeThenByNameComparer)
                  .slice(0, top1)
                  .sort(byNameThenByGradeComparer);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x?.grade), top1, {stable: true})
                  .thenSortBy(x => x?.name)
                  .sortBy(x => x?.name, top2)
                  .thenSortBy(x => safeNumber(x?.grade));

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });

          describe('sorted(top)', () => {
            this.it1('sortBy(stable: true).sorted(top) should return sorted sequence like Array.sort.slice(0, top)',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const comparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sortBy(x => safeNumber(x), {stable: true})
                  .sorted(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sortBy(top1).sorted(top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top1)
                  .sort(ascComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sortBy(x => -safeNumber(x), top1, {stable: true})
                  .sorted(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sortBy(top1).sorted(top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top1)
                  .sort(ascComparer);

                const sut = this.createSut(input)
                  .sortBy(x => -safeNumber(x), top1, {stable: true})
                  .sorted(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });
        });

        describe('sorted(top)', () => {
          describe('take()', () => {
            this.it1('sorted().take() should return sorted sequence like Array.sort.slice()',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top = inputArray.length / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sorted()
                  .take(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sorted(top1, stable: true).take(top2) should return sorted sequence like Array.sort.slice(top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);

                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sorted(top1, {stable: true})
                  .take(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sorted(top1, stable: true).take(top2) should return sorted sequence like Array.sort.slice(top1) when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);

                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top1)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sorted(top1, {stable: true})
                  .take(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sorted(top1, stable: true).take(top2) should return same seq instance when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;

                const expected = this.createSut(input).sorted(top1, {stable: true});

                const actual = expected.take(top2);

                assert.equal(actual, expected);
              }
            );
          });

          describe('takeLast()', () => {
            this.it1('sorted(stable: true).takeLast() should return sorted sequence like Array.sort.slice()',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top = inputArray.length / 2;
                const comparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(-top);

                const sut = this.createSut(input)
                  .sorted()
                  .takeLast(top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sorted(top1, stable: true).takeLast(top2) should return sorted sequence like Array.sort.slice(top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const comparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);

                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top1)
                  .slice(-top2);

                const sut = this.createSut(input)
                  .sorted(top1, {stable: true})
                  .takeLast(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );

            this.it1('sorted(top1, stable: true).takeLast(top2) should return same seq instance when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const comparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);

                const expected = inputArray
                  .slice()
                  .sort(comparer)
                  .slice(0, top1)
                  .slice(-top2);

                const sut = this.createSut(input)
                  .sorted(top1, {stable: true})
                  .takeLast(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              }
            );
          });

          describe('sort(top)', () => {
            this.it1('sorted(stable: true).sort(comparer2, top) should return sorted sequence like Array.sort(comparer2).slice(0, top)',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .sort(descComparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sorted()
                  .sort(descComparer, top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sorted(top1).sort(comparer2, top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top1)
                  .sort(descComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sorted(top1, {stable: true})
                  .sort(descComparer, top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sorted(top1).sort(comparer2, top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top1)
                  .sort(descComparer)

                const sut = this.createSut(input)
                  .sorted(top1, {stable: true})
                  .sort(descComparer, top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });

          describe('sortBy(top)', () => {
            this.it1('sorted(stable: true).sortBy(top) should return sorted sequence like Array.sort(comparer2).slice(0, top)',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sorted()
                  .sortBy(x => -safeNumber(x), top, {stable: true});

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sorted(top1).sortBy(top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top1)
                  .sort(descComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sorted( top1, {stable: true})
                  .sortBy(x => -safeNumber(x), top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sorted(top1).sortBy(top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(ascComparer)
                  .slice(0, top1)
                  .sort(descComparer);

                const sut = this.createSut(input)
                  .sorted( top1, {stable: true})
                  .sortBy(x => -safeNumber(x), top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });

          describe('sorted(top)', () => {
            this.it1('sorted(stable: true).sorted(top) should return sorted sequence like Array.sort.slice(0, top)',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {
                const revComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const top = inputArray.length / 2;
                const expected = inputArray
                  .slice()
                  .sort(revComparer)
                  .slice(0, top);

                const sut = this.createSut(input)
                  .sorted()
                  .sorted(-top);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sorted(top1).sorted(top2) should return sorted sequence like Array.sort.slice(0, top1).sort.slice(0, top2) when top2 is less than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 / 2;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top1)
                  .sort(ascComparer)
                  .slice(0, top2);

                const sut = this.createSut(input)
                  .sorted(-top1, {stable: true})
                  .sorted(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });

            this.it1('sorted(top1).sorted(top2) should return sorted sequence like Array.sort.slice(0, top1).sort when top2 is more than top1',
              randomNumbersWithDuplicatesAndNullAndUndefined, (input, inputArray) => {

                const top1 = inputArray.length / 2;
                const top2 = top1 + 1;
                const ascComparer: Comparer<number> = (a, b) => safeNumber(a) - safeNumber(b);
                const descComparer: Comparer<number> = (a, b) => safeNumber(b) - safeNumber(a);
                const expected = inputArray
                  .slice()
                  .sort(descComparer)
                  .slice(0, top1)
                  .sort(ascComparer);

                const sut = this.createSut(input)
                  .sorted(-top1, {stable: true})
                  .sorted(top2);

                const actual = [...sut];

                assert.deepEqual(actual, expected);
              });
          });
        });
      });
    });
  });
}
