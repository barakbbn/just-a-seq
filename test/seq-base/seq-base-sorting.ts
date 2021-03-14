import {describe, it} from "mocha";
import {array, generator} from "../test-data";
import {assert} from "chai";
import {Comparer, Seq} from "../../lib";

export abstract class SeqBase_Sorting_Tests {
  readonly run = () => describe('SeqBase - Sorting functionality', () => {
    // describe('orderBy', () => {
    //   it('should sort sequence of objects by one of the properties', () => {
    //     const unsorted = array.gradesFiftyAndAbove.concat(array.gradesFiftyAndBelow);
    //     const expectedByGrade = unsorted.slice().sort((a, b) => a.grade - b.grade);
    //     const expectedByName = unsorted.slice().sort((a, b) => a.name.localeCompare(b.name));
    //     const sut = this.createSut(unsorted);
    //     const sut2 = this.createSut(generator.from(unsorted));
    //
    //     let actual = [...sut.orderBy(x => x.grade)];
    //     assert.deepEqual(actual, expectedByGrade);
    //
    //     actual = [...sut2.orderBy(x => x.grade)];
    //     assert.deepEqual(actual, expectedByGrade);
    //
    //
    //     actual = [...sut.orderBy(x => x.name)];
    //     assert.deepEqual(actual, expectedByName);
    //
    //     actual = [...sut2.orderBy(x => x.name)];
    //     assert.deepEqual(actual, expectedByName);
    //   });
    //   it('should sort sequence of objects by one of the properties and a comparer', () => {
    //     const input1 = array.gradesFiftyAndAbove.map(x => ({...x, name: x.name.toUpperCase()}));
    //     const input2 = array.gradesFiftyAndBelow.map(x => ({...x, name: x.name.toLowerCase()}));
    //     const unsorted = input1.concat(input2);
    //
    //     const comparer: Comparer<string> = (a, b) => a.toUpperCase().localeCompare(b.toUpperCase());
    //     const expected = unsorted.slice().sort((a, b) => comparer(a.name, b.name));
    //
    //     const sut = this.createSut(unsorted);
    //     const sut2 = this.createSut(generator.from(unsorted));
    //
    //     let actual = [...sut.orderBy(x => x.name, comparer)];
    //     assert.deepEqual(actual, expected);
    //
    //     actual = [...sut2.orderBy(x => x.name, comparer)];
    //     assert.deepEqual(actual, expected);
    //   });
    // });
    //
    // describe('orderByDescending', () => {
    //   it('should sort sequence of objects by one of the properties', () => {
    //     const unsorted = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndAbove);
    //     const expectedByGrade = unsorted.slice().sort((a, b) => b.grade - a.grade);
    //     const expectedByName = unsorted.slice().sort((a, b) => b.name.localeCompare(a.name));
    //     const sut = this.createSut(unsorted);
    //     const sut2 = this.createSut(generator.from(unsorted));
    //
    //     let actual = [...sut.orderByDescending(x => x.grade)];
    //     assert.deepEqual(actual, expectedByGrade);
    //
    //     actual = [...sut2.orderByDescending(x => x.grade)];
    //     assert.deepEqual(actual, expectedByGrade);
    //
    //
    //     actual = [...sut.orderByDescending(x => x.name)];
    //     assert.deepEqual(actual, expectedByName);
    //
    //     actual = [...sut2.orderByDescending(x => x.name)];
    //     assert.deepEqual(actual, expectedByName);
    //   });
    //
    //   it('should sort sequence of objects by one of the properties and a comparer', () => {
    //     const input1 = array.gradesFiftyAndAbove.map(x => ({...x, name: x.name.toUpperCase()}));
    //     const input2 = array.gradesFiftyAndBelow.map(x => ({...x, name: x.name.toLowerCase()}));
    //     const unsorted = input2.concat(input1);
    //
    //     const comparer: Comparer<string> = (a, b) => a.toUpperCase().localeCompare(b.toUpperCase());
    //     const expected = unsorted.slice().sort((a, b) => comparer(b.name, a.name));
    //
    //     const sut = this.createSut(unsorted);
    //     const sut2 = this.createSut(generator.from(unsorted));
    //
    //     let actual = [...sut.orderByDescending(x => x.name, comparer)];
    //     assert.deepEqual(actual, expected);
    //
    //     actual = [...sut2.orderByDescending(x => x.name, comparer)];
    //     assert.deepEqual(actual, expected);
    //   });
    // });

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

    describe('sortBy', () => {
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
        // it('orderBy().thenBy...', () => {
        //   const unordered = array.samples;
        //
        //   const expectedByAscDescAscDesc = unordered.slice().sort((x, y) => {
        //     return x.type.localeCompare(y.type) /* asc */ ||
        //       y.period - x.period /* desc */ ||
        //       x.score - y.score  /* asc */ ||
        //       +y.ok - +x.ok  /* desc */;
        //   });
        //
        //   const sut = this.createSut(unordered)
        //     .orderBy(x => x.type)
        //     .thenByDescending(x => x.period)
        //     .thenBy(x => x.score)
        //     .thenByDescending(x => x.ok);
        //
        //   const actualByAscDescAscDesc = [...sut];
        //   assert.sameDeepOrderedMembers(actualByAscDescAscDesc, expectedByAscDescAscDesc);
        // });

        // it('orderByDescending().thenBy...', () => {
        //   const unordered = array.samples;
        //
        //   const expectedByDescDescAscAsc = unordered.slice().sort((x, y) => {
        //     return y.type.localeCompare(x.type) /* desc */ ||
        //       y.period - x.period /* desc */ ||
        //       x.score - y.score  /* asc */ ||
        //       +x.ok - +y.ok  /* asc */;
        //   });
        //   const sut = this.createSut(unordered)
        //     .orderByDescending(x => x.type)
        //     .thenByDescending(x => x.period)
        //     .thenBy(x => x.score)
        //     .thenBy(x => x.ok);
        //   const actualByDescDescAscAsc = [...sut];
        //   assert.sameDeepOrderedMembers(actualByDescDescAscAsc, expectedByDescDescAscAsc);
        // });

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

        it('sort(/* no comparer*/).thenBy...', () => {
          const unordered = array.flatFolders;
          const expectedByDescDescAscAsc = unordered.slice().sort().sort((f1, f2) => f1.depth - f2.depth);
          const sut = this.createSut(unordered)
            .sort()
            .thenSortBy(x => x.depth);
          const actualByDescDescAscAsc = [...sut];
          assert.sameDeepOrderedMembers(actualByDescDescAscAsc, expectedByDescDescAscAsc);
        });
      });

      // it('Ordering chain - immutability', () => {
      //   const unordered = array.samples;
      //
      //   const expectedByTypeThenByPeriod = unordered.slice().sort((a, b) => a.type.localeCompare(b.type) || (a.period - b.period));
      //   const expectedByTypeThenByScoreDescending = unordered.slice().sort((a, b) => a.type.localeCompare(b.type) || (b.score - a.score));
      //
      //   const sut = this.createSut(unordered).orderBy(x => x.type);
      //   const actualByTypeThenByPeriod = [...sut.thenBy(x => x.period)];
      //   const actualByTypeThenByScoreDescending = [...sut.thenByDescending(x => x.score)];
      //
      //   assert.sameDeepOrderedMembers(actualByTypeThenByPeriod, expectedByTypeThenByPeriod);
      //   assert.sameDeepOrderedMembers(actualByTypeThenByScoreDescending, expectedByTypeThenByScoreDescending);
      //
      //   // Change order of execution
      //   const sut2 = this.createSut(unordered).orderBy(x => x.type);
      //   const actualByTypeThenByScoreDescending2 = [...sut2.thenByDescending(x => x.score)];
      //   const actualByTypeThenByPeriod2 = [...sut2.thenBy(x => x.period)];
      //
      //   assert.sameOrderedMembers(actualByTypeThenByScoreDescending2, expectedByTypeThenByScoreDescending);
      //   assert.sameOrderedMembers(actualByTypeThenByPeriod2, expectedByTypeThenByPeriod);
      // });

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
  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}
