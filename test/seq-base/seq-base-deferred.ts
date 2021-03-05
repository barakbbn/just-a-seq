import {describe, it} from "mocha";
import {Condition, Seq} from "../../lib";
import {assert} from "chai";
import {array, Folder, generator} from "../test-data";

export abstract class SeqBase_Deferred_Tests {
  it1<T>(title: string, input: T[], testFn: (input: Iterable<T>) => void) {
    it(title + ' - array source', () => testFn(input));
    it(title + ' - generator source', () => testFn(generator.from(input)));
    it(title + ' - sequence source', () => testFn(this.createSut(input)));
  }

  // its1<T>(title: string, input: T[][], testFn: (input: Iterable<Iterable<T>>) => void) {
  //   let first = input[0];
  //   let last = input.length > 1 ? input[input.length - 1] : undefined;
  //   const entitle = (baseTitle: string, iterables: Iterable<Iterable<T>>) => {
  //     let f = [...iterables][0];
  //     let s = [...iterables].slice(-1)[0];
  //     const firstType = Array.isArray(f) ? 'array' : typeof f === 'function' ? 'generator' : 'sequence';
  //     const secondType = s ? Array.isArray(f) ? 'array' : typeof f === 'function' ? 'generator' : 'sequence' : undefined;
  //     return `${baseTitle} - [${firstType}, ..., ${secondType}]`
  //   }
  //
  //   if (!last) {
  //     it(title + ' - array', () => testFn(input));
  //     it(title + ' - generator source', () => testFn(generator.from(input)));
  //     it(title + ' - sequence source', () => testFn(this.createSut(input)));
  //
  //   } else {
  //     let iterables: Iterable<Iterable<T>>;
  //     iterables = [first, ...input.slice(1, -1), last];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //     iterables = [first, ...input.slice(1, -1), generator.from(last)];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //     iterables = [first, ...input.slice(1, -1), this.createSut(last)];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //
  //     iterables = [generator.from(first), ...input.slice(1, -1), last];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //     iterables = [generator.from(first), ...input.slice(1, -1), generator.from(last)];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //     iterables = [generator.from(first), ...input.slice(1, -1), this.createSut(last)];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //
  //     iterables = [this.createSut(first), ...input.slice(1, -1), last];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //     iterables = [this.createSut(first), ...input.slice(1, -1), generator.from(last)];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //     iterables = [this.createSut(first), ...input.slice(1, -1), this.createSut(last)];
  //     it(entitle(title, iterables), () => testFn(iterables));
  //   }
  // }

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

  readonly run = () => describe('SeqBase - Deferred Execution', () => {
    describe("append()", () => {
      this.it1('should add an item at the end of the sequence', array.zeroToNine, (input) => {
        const expected = [...input, 10];
        const sut = this.createSut(input);
        const actual = [...sut.append(10)];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe("as()", () => {
      it('should return same instance', () => {
        const sut = this.createSut<Number>();
        const actual = sut.as<number>();

        assert.equal(actual, sut);
      });
    });

    describe('asSeq()', () => {
      it('should create new instance of sequence', () => {
        const sut = this.createSut();
        const actual = sut.asSeq();
        assert.notEqual(actual, sut);
      });
      it('should produce same results as before', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        const seq = sut.asSeq();
        const expected = [...sut];
        const actual = [...seq];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe("chunk", () => {
      const testRangeOfChunkSizes = <T>(input: Iterable<T>, consumeOuterSequenceFirst: boolean) => {
        const sut = this.createSut(input);

        const inputArray = [...input];
        for (let chunkSize = 1; chunkSize <= inputArray.length; chunkSize++) {
          const expected: any[] = [];
          for (let skip = 0; skip < inputArray.length; skip += chunkSize) {
            expected.push(inputArray.slice(skip, skip + chunkSize));
          }

          let actual: Iterable<Seq<T>> = sut.chunk(chunkSize);
          if (consumeOuterSequenceFirst) actual = [...actual];

          let actualChunksCount = 0;
          for (let innerActual of actual) {
            const innerExpected = expected[actualChunksCount++];
            assert.sameOrderedMembers([...innerActual], innerExpected);
            //Asset inner can be re-consumed
            assert.sameOrderedMembers([...innerActual], innerExpected);
          }
          assert.equal(actualChunksCount, expected.length);
        }
      };

      it('when input sequence is array, should return inner sequences each with number of items as the chunk size and last one with remaining items', () => {
        testRangeOfChunkSizes(array.oneToTen, false);
        testRangeOfChunkSizes(array.oneToTen, true);
      });

      it('when input sequence is generator, should return inner sequences each with number of items as the chunk size and last one with remaining items', () => {
        testRangeOfChunkSizes(generator.from(array.oneToTen), false);
        testRangeOfChunkSizes(generator.from(array.oneToTen), true);
      });

      it('should return empty sequence when chunk size is zero or less', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        let actual = [...sut.chunk(0)];
        assert.lengthOf(actual, 0);

        actual = [...sut.chunk(-1)];
        assert.lengthOf(actual, 0);
      });

      it('should return 1 inner sequence with all items when chunk size equals or greater than number of existing items', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);

        let chunkSize = input.length;
        let actual = [...sut.chunk(chunkSize)];

        assert.lengthOf(actual, 1);
        let actualInner = [...actual[0]];
        assert.sameOrderedMembers(actualInner, input);

        chunkSize = input.length * 2;
        actual = [...sut.chunk(chunkSize)];
        assert.lengthOf(actual, 1);
        actualInner = [...actual[0]];
        assert.sameOrderedMembers(actualInner, input);
      });

      this.it1('should be able to iterate child chunked-sequence after main sequence closed', array.oneToTen, (input) => {
        const expected = [...input].splice(0,2)
        const sut = this.createSut(input).chunk(2);
        let [firstChunk] = sut; // will take first child chunked-sequence and close the iterator returned by sut
        const actual = [...firstChunk];
        assert.deepEqual(actual, expected);
      });
    });

    describe("concat()", () => {
      it('should append one or more sequences at the end of the target sequence', () => {
        let sut = this.createSut([1, 2]);
        const expected = array.oneToTen;
        let actual = [...sut.concat([3, 4], [5, 6], [7, 8, 9, 10])];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from([1, 2]));
        actual = [...sut.concat(generator.from([3, 4]), generator.from([5, 6]), generator.from([7, 8, 9, 10]))];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should concat sequence to itself', () => {
        let sut = this.createSut([1, 2]);
        const expected = [1, 2].concat([1, 2]);

        let actual = [...sut.concat(sut)];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from([1, 2]));
        actual = [...sut.concat(sut)];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should have no effect when concatenating empty sequences', () => {
        let sut = this.createSut([1, 2]);
        const expected = [1, 2];
        let actual = [...sut.concat([], [], [])];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from([1, 2]));
        actual = [...sut.concat(this.createSut(), this.createSut(), this.createSut())];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe("diff()", () => {
      describe("without keySelector", () => {
        it("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence", () => {
          const first = array.oneToTen.concat(array.oneToTen);
          const second = array.zeroToNine.concat(array.zeroToNine);
          const expected = [0, 0, 10, 10];

          const sut = this.createSut(first);
          const actual = sut.diff(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('should return empty sequence if all items in first sequence exist in second sequence and vise versa', () => {
          const first = array.oneToTen.concat(array.oneToTen);
          const second = array.oneToTen;
          const expected: number[] = [];

          const sut = this.createSut(first);
          const actual = [...sut.diff(second)];
          assert.sameMembers(actual, expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = [...sut2.diff(generator.from(second))];
          assert.sameMembers(actual2, expected);
        });

        it('when second sequence is empty, should return the first sequence', () => {
          const first = array.oneToTen
            .concat(array.oneToTen)
            .concat(array.oneToTen.filter(x => x > 5))
            .concat(array.oneToTen.reverse());

          const second: number[] = [];
          const expected = first.slice();

          const sut = this.createSut(first);
          const actual = [...sut.diff(second)];
          assert.sameMembers(actual, expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('when first sequence is empty, should return the second sequence', () => {
          const second = array.oneToTen
            .concat(array.oneToTen)
            .concat(array.oneToTen.filter(x => x > 5))
            .concat(array.oneToTen.reverse());

          const first: number[] = [];
          const expected = second.slice();

          const sut = this.createSut(first);
          const actual = sut.diff(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('should return empty sequence when first and second sequences are empty', () => {
          const first: number[] = [];
          const second: number[] = [];
          const expected: number[] = [];

          const sut = this.createSut(first);
          const actual = sut.diff(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });
      });

      describe("with keySelector", () => {
        it("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence", () => {
          let first = array.grades.slice(0, -1);
          first = first.concat(first.reverse());

          const nonExistingGrade = {name: "not exists", grade: -1};
          let second = array.grades.slice(1);
          second.push(nonExistingGrade);
          second = second.concat(second.reverse());

          let expected = [array.grades[0], array.grades[array.grades.length - 1], nonExistingGrade];
          expected = expected.concat(expected);

          const sut = this.createSut(first);
          const actual = sut.diff(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });

        it('should return empty sequence if all items in first sequence exist in second sequence and vise versa', () => {
          const first = array.grades.concat(array.grades);
          const second = array.grades;
          const expected: { name: string; grade: number; }[] = [];

          const sut = this.createSut(first);
          const actual = sut.diff(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });

        it('when second sequence is empty, should return the first sequence', () => {
          const first = array.grades.concat(array.grades);
          const second: { name: string; grade: number; }[] = [];
          const expected = first.slice();

          const sut = this.createSut(first);
          const actual = sut.diff(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });

        it('when first sequence is empty, should return the second sequence', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades.concat(array.grades);
          const expected = second.slice();

          const sut = this.createSut(first);
          const actual = sut.diff(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });

        it('should return empty sequence when first and second sequences are empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second: { name: string; grade: number; }[] = [];
          const expected: { name: string; grade: number; }[] = [];

          const sut = this.createSut(first);
          const actual = sut.diff(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diff(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });
      });
    });

    describe("diffDistinct()", () => {
      describe("without keySelector", () => {
        it("should return distinct items from first sequence not existing in second sequence and items from second sequence not existing in first sequence", () => {
          const first = array.oneToTen.concat(array.oneToTen);
          const second = array.zeroToNine.concat(array.zeroToNine);
          const expected = [0, 10];

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('should return empty sequence if all items in first sequence exist in second sequence and vise versa', () => {
          const first = array.oneToTen.concat(array.oneToTen);
          const second = array.oneToTen;
          const expected: number[] = [];

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('when second sequence is empty, should return distinct items from the first sequence', () => {
          const first = array.oneToTen.concat(array.oneToTen);
          const second: number[] = [];
          const expected = array.oneToTen;

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('when first sequence is empty, should return distinct items from the second sequence', () => {
          const first: number[] = [];
          const second = array.zeroToNine.concat(array.zeroToNine);
          const expected = array.zeroToNine;

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });

        it('should return empty sequence when first and second sequences are empty', () => {
          const first: number[] = [];
          const second: number[] = [];
          const expected: number[] = [];

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second);
          assert.sameMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second));
          assert.sameMembers([...actual2], expected);
        });
      });

      describe("with keySelector", () => {
        it("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence", () => {
          const first = array.grades.concat(array.grades.reverse());

          const nonExistingGrade = {name: "not exists", grade: -1};
          let second = array.grades.slice(1, -1);
          second.push(nonExistingGrade);
          second = second.concat(second);

          const expected = [array.grades[0], array.grades[array.grades.length - 1], nonExistingGrade];

          const sut = this.createSut(first);
          const actual = [...sut.diffDistinct(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = [...sut2.diffDistinct(generator.from(second), x => x.grade)];
          assert.sameDeepMembers(actual2, expected);
        });

        it('should return empty sequence if all items in first sequence exist in second sequence and vise versa', () => {
          const first = array.grades.concat(array.grades);
          const second = array.grades;
          const expected: { name: string; grade: number; }[] = [];

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });

        it('when second sequence is empty, should return the first sequence distinct values', () => {
          const first = array.grades.concat(array.grades);
          const second: { name: string; grade: number; }[] = [];
          const expected = array.grades;

          const sut = this.createSut(first);
          const actual = [...sut.diffDistinct(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = [...sut2.diffDistinct(generator.from(second), x => x.grade)];
          assert.sameDeepMembers(actual2, expected);
        });

        it('when first sequence is empty, should return the second sequence distinct values', () => {
          const first: { name: string; grade: number; }[] = [];
          const second = array.grades.concat(array.grades);
          const expected = array.grades;

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });

        it('should return empty sequence when first and second sequences are empty', () => {
          const first: { name: string; grade: number; }[] = [];
          const second: { name: string; grade: number; }[] = [];
          const expected: { name: string; grade: number; }[] = [];

          const sut = this.createSut(first);
          const actual = sut.diffDistinct(second, x => x.grade);
          assert.sameDeepMembers([...actual], expected);

          const sut2 = this.createSut(generator.from(first));
          const actual2 = sut2.diffDistinct(generator.from(second), x => x.grade);
          assert.sameDeepMembers([...actual2], expected);
        });
      });
    });

    describe("distinct()", () => {
      this.it1('should return distinct values from non empty sequence', array.oneToTen.concat(array.zeroToNine).concat(array.oneToNine), (input) => {
        const expected = array.zeroToTen;
        const sut = this.createSut(input);
        const actual = sut.distinct();
        assert.sameMembers([...actual], expected);
      });

      this.it1('should return distinct values by key selector from non empty sequence', array.grades
        .concat(array.grades.filter(x => x.grade > 50))
        .concat(array.grades.reverse()), (input) => {

        const expected = array.grades;
        const sut = this.createSut(input);
        const actual = sut.distinct(x => x.grade);
        assert.sameDeepMembers([...actual], expected);
      });

      this.it1('should return empty sequence when source sequence is empty', [], (input) => {
        const expected: number[] = [];
        const sut = this.createSut(input);
        const actual = sut.distinct();
        assert.sameMembers([...actual], expected);
      });

      this.it1('should return empty sequence when source sequence is empty and key selector is used', [], (input: Iterable<{ name: string; grade: number; }>) => {
        const expected: { name: string; grade: number; }[] = [];
        const sut = this.createSut(input);
        const actual = sut.distinct(x => x.grade);
        assert.sameDeepMembers([...actual], expected);
      });
    });

    describe('entries()', () => {
      this.it1('should return sequence of tuples of index paired with the item, like Array.entries()', array.abc, (input) => {
        const sut = this.createSut(input);
        const expected = [...[...input].entries()];
        const actual = [...sut.entries()];
        assert.deepEqual(actual, expected)
      });
    });

    describe("filter()", () => {
      this.it1('should return only items that meet the condition - numbers', array.oneToTen, (input) => {
        const expectedEvens = [...input].filter(x => x % 2 == 0);
        let sut = this.createSut(input);
        let actual = [...sut.filter(x => x % 2 == 0)];
        assert.sameOrderedMembers(actual, expectedEvens);
      });

      this.it1('should return only items that meet the condition - objects', array.grades, (input) => {
        const expectedAboveFifty = [...input].filter(x => x.grade > 50);
        let sut2 = this.createSut(input);
        let actual2 = [...sut2.filter(x => x.grade > 50)];
        assert.sameOrderedMembers(actual2, expectedAboveFifty);
      });

      this.it1('should return empty sequence if non of the items meet the condition - numbers', array.oneToTen, (input) => {
        const expectedEmpty: any[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.filter(() => false)];
        assert.sameOrderedMembers(actual, expectedEmpty);
      });

      this.it1('should return empty sequence if non of the items meet the condition - objects', array.grades, (input) => {
        const expectedEmpty: any[] = [];
        const sut = this.createSut(input);
        const actual = [...sut.filter(() => false)];
        assert.sameOrderedMembers(actual, expectedEmpty);
      });
    });

    describe("firstAndRest()", () => {
      function tuple<T, U>(first: T, rest: U[]): [T, U[]] {
        return [first, rest] as [T, U[]];
      }

      this.it1('should return first item in sequence and rest of items in new sequence - numbers', array.oneToTen, (input) => {
        const source = [...input];
        const expected = tuple(source[0], source.slice(1));
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return first item in sequence and rest of items in new sequence - objects', array.grades, (input) => {
        const source = [...input];
        const expected = tuple(source[0], source.slice(1));
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return first item and and empty sequence when sequence has only one item - numbers', [1], (input) => {
        const expected = tuple(1, []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return first item and and empty sequence when sequence has only one item - objects', array.grades.slice(0, 1), (input) => {
        const source = [...input];
        const expected = tuple(source[0], []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return undefined and empty sequence when sequence is empty', [], (input) => {
        const expected = tuple(undefined, []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return default value and empty sequence when sequence is empty - default number', [], (input) => {
        const defaultValue = -1;
        const expected = tuple(defaultValue, []);
        let sut = this.createSut<number>(input);
        let actual = sut.firstAndRest(defaultValue);
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return default value and empty sequence when sequence is empty - default object', [], (input) => {
        const defaultValue = {name: "default", grade: -1};
        const expected = tuple(defaultValue, []);
        let sut = this.createSut<{ name: string; grade: number; }>(input);
        let actual = sut.firstAndRest(defaultValue);
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual[1]], expected[1]);
      });
    });

    describe('flat()', () => {
      const buildHierarchy = (items: any[], depth: number, itemsPerUnit: number = 2) => {
        function* split(toSplit: any[]) {
          for (let i = 0; i < toSplit.length; i += itemsPerUnit) yield toSplit.slice(i, i + itemsPerUnit);
        }

        let results = items;
        for (let level = 0; level < depth; level++) results = [...split(results)]
        return results;
      }

      it('should flatten a sequence of array by 1 level when no specifying depth', () => {
        const depth1 = array.oneToTen;
        const expected = [...depth1];
        const sut = this.createSut(depth1);
        const actual = [...sut.flat()];
        assert.deepEqual(actual, expected);

        const depth2 = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];
        const expected2 = array.oneToTen;
        const sut2 = this.createSut(depth2);
        const actual2 = [...sut2.flat()];
        assert.deepEqual(actual2, expected2);

        const depth3 = [[[1, 2], [3, 4]], [[5, 6], [7, 8]], [[9, 10]]];
        const expected3 = depth2;
        const sut3 = this.createSut(depth3);
        const actual3 = [...sut3.flat()];
        assert.deepEqual(actual3, expected3);
      });

      it('should flatten a sequence of arrays with several depths, by specified depth', () => {
        const input = array.strings;
        const expected = [...input];
        for (let depth = 0; depth < 5; depth++) {
          const hierarchy = buildHierarchy(input, depth);
          const sut = this.createSut(hierarchy);
          const flat = sut.flat(depth);
          const actual = [...flat];
          assert.deepEqual(actual, expected);
        }
      });

      it('should flatten a sequence of sequences with several depths, by specified depth', function () {

      });

      it('should flatten a sequence with sequences of mixed depths, by specified depth', () => {
      });

      this.it1('should return empty sequence if all items have empty sub sequence', [[], [], []], (input) => {
        const expected: any[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.flat(2)];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe("flatMap()", () => {
      this.it1('should flattened items from a sequence of items having child items - strings', array.strings, (input) => {
        const expected = [...input].slice(0, 0).concat(...input);
        let sut = this.createSut(input);
        let actual = [...sut.flatMap(x => x)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should flattened items from a sequence of items having child items - objects', array.folders, (input) => {
        const expected = [...input].slice(0, 0).concat(...[...input].map(f => f.subFolders));
        let sut = this.createSut(input);
        let actual = [...sut.flatMap(f => f.subFolders)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return empty sequence if all items have empty sub sequence', [[], [], []], (input) => {
        const expected: any[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.flatMap(x => x)];
        assert.sameOrderedMembers(actual, expected);
      });

      describe("with result selector", () => {
        this.it1('should flattened items from a sequence of items having child items', array.folders, (input) => {
          const expected = Array<string>().concat(...[...input].map(f => f.subFolders.map(f => f.name)));
          let sut = this.createSut(input);
          let actual = [...sut.flatMap(f => f.subFolders, f => f.name)];
          assert.sameDeepOrderedMembers(actual, expected);
        });

        this.it1('should return empty sequence if all items have empty children sequence', [new Folder("1"), new Folder('2'), new Folder('2')], (input) => {
          const expected: string[] = [];
          let sut = this.createSut(input);
          let actual = [...sut.flatMap(f => f.subFolders)];
          assert.sameDeepOrderedMembers(actual, expected);
        });
      });
    });

    describe("ifEmpty()", () => {
      this.it1("should keep same sequence if it's not empty", array.oneToTen, (input) => {
        const expected = [...input];
        const sut = this.createSut(input);
        let actual = [...sut.ifEmpty(0)];
        assert.sameOrderedMembers(actual, expected);

        actual = [...sut.ifEmpty({useFactory: () => 0})];
        assert.sameOrderedMembers(actual, expected);

        actual = [...sut.ifEmpty({useSequence: [0]})];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return default value if sequence is empty - default number', [], (input: Iterable<number>) => {
        const defaultValue = 0;
        const expected = [defaultValue];
        let sut = this.createSut(input);
        let actual = [...sut.ifEmpty(defaultValue)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return default value if sequence is empty - default object', [], (input: Iterable<{ name: string, grade: number }>) => {
        const defaultValue = {name: "defaultStudent", grade: 100};
        const expected = [defaultValue];
        let sut = this.createSut(input);
        let actual = [...sut.ifEmpty(defaultValue)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should lazily provide default value thru a factory', [], (input: Iterable<number>) => {
        const defaultValue = 0;
        let factoryExecuted = false;
        const useFactory = () => {
          factoryExecuted = true;
          return defaultValue;
        };
        const expected = defaultValue;
        let sut = this.createSut(input);

        let seq = sut.ifEmpty({useFactory});
        let iterator = seq[Symbol.iterator]();
        assert.isFalse(factoryExecuted);
        let actual = iterator.next().value;
        assert.isTrue(factoryExecuted);
        assert.isTrue(iterator.next().done);
        assert.equal(actual, expected);
      });

      this.it1('should return a default sequence if source sequence is empty', [], (input: Iterable<number>) => {
        const useSequence = array.oneToTen;
        const expected = useSequence;
        let sut = this.createSut(input);

        let actual = [...sut.ifEmpty({useSequence})];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('innerJoin()', () => {
      this.it2('should return pairs of only matched items from outer and inner sequences', array.gradesFiftyAndBelow, array.grades, (outer, inner) => {
        const expected = array.gradesFiftyAndBelow.map(g => ({outer: g, inner: g}));
        const sut = this.createSut(outer).innerJoin(inner, g => g.grade, g => g.grade);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      this.it2('should return pairs that have the same outer item if it matches several inner items', [{key: array.samples[0].type}], array.samples, (outer, inner) => {
        const expected = (<any[]>[]).concat(...[...outer].map(o => [...inner].filter(i => i.type === o.key).map(i => ({
          outer: o,
          inner: i
        }))));
        const sut = this.createSut(outer).innerJoin(inner, s => s.key, s => s.type);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      this.it2('should return empty sequence if no matches', [1, 2, 3], [-1, -2, -3], (outer, inner) => {
        const sut = this.createSut(outer).innerJoin(inner, _ => _, _ => _);
        const actual = [...sut];
        assert.deepEqual(actual, []);
      });

      this.it2('should return matched items after applying resultsSelector', array.gradesFiftyAndBelow.map(g => ({key: g.grade})), array.grades, (outer, inner) => {
        const expected = array.gradesFiftyAndBelow.map(g => g.name);
        const sut = this.createSut(outer).innerJoin(
          inner,
          g => g.key,
          g => g.grade,
          (outer, inner) => inner.name);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });
    });

    describe('insert()', () => {
      it('should insert new items in source sequence at specified index', () => {
        const inputs = [
          {first: array.abc, seconds: [undefined, 'second', ['1', '2'], '', []]},
          {first: array.oneToTen, seconds: [undefined, 0, [-1, -2], []]},
          {
            first: array.gradesFiftyAndBelow,
            seconds: [undefined, {name: 'new', grade: 110}, array.gradesFiftyAndAbove, []]
          },
          {first: [], seconds: [undefined, 'abc', array.abc, []]},
        ];
        for (const input of inputs) {
          const sutArray = this.createSut<any>(input.first);
          const sutGenerator = this.createSut(generator.from<any>(input.first));
          for (let index = -1; index <= input.first.length + 1; index++) {
            for (const second of input.seconds) {
              const secondArray: any[] = Array.isArray(second) ? second : [second];
              let expected: any[] = input.first.slice();
              expected.splice(index < 0 ? 0 : index, 0, ...secondArray);
              let actual = [...sutArray.insert(index, second)];
              const secondForLog = (() => {
                const quoted: any[] = secondArray.map(x => typeof x === 'string' ? `'${x}'` : x);
                return Array.isArray(second) ? (`[${quoted}]`) : [quoted[0]];
              })();
              let failedMessage = `expected [${actual}] to deeply equal [${expected}] when doing [${input.first}].insert(${index}, ${secondForLog})`;
              assert.deepEqual(actual, expected, failedMessage);
              actual = [...sutGenerator.insert(index, second)];
              failedMessage = `expected [${actual}] to deeply equal [${expected}] when doing [${input.first}].insert(${index}, ${secondForLog})`;
              assert.deepEqual(actual, expected, failedMessage);

              if (Array.isArray(second)) {
                actual = [...sutArray.insert(index, ...second)];
                assert.deepEqual(actual, expected, failedMessage);
                actual = [...sutArray.insert(index, generator.from<any>(second))];
                assert.deepEqual(actual, expected, failedMessage);

                actual = [...sutGenerator.insert(index, ...second)];
                assert.deepEqual(actual, expected, failedMessage);
                actual = [...sutGenerator.insert(index, generator.from<any>(second))];
                assert.deepEqual(actual, expected, failedMessage);
              }
            }
          }
        }
      });
    });

    describe('insertBefore()', () => {
      this.it1('should insert new items in source sequence immediately before the first item that meets the condition', [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1], (input) => {
        const seconds = [undefined, 0, [-1, -2], []];
        const source = [...input];
        const sut = this.createSut<any>(input);

        for (let i = 0; i <= source.length; i++) {
          const condition: Condition<number> = (x: number, index: number) => index === i;
          for (const second of seconds) {
            const secondArray: any[] = Array.isArray(second) ? second : [second];
            let atIndex = source.findIndex(condition);
            let expected = [...input];
            if (atIndex >= 0) expected.splice(atIndex, 0, ...secondArray);

            const secondForLog = (() => {
              const quoted: any[] = secondArray.map(x => typeof x === 'string' ? `'${x}'` : x);
              return Array.isArray(second) ? (`[${quoted}]`) : second === undefined ? 'undefined' : [quoted[0]];
            })();
            const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${input}].insertBefore((x, index) => index === ${i}, ${secondForLog})`;

            let actual = [...sut.insertBefore(condition, second)];
            assert.deepEqual(actual, expected, failedMessage(actual));

            if (Array.isArray(second)) {
              actual = [...sut.insertBefore(condition, ...second)];
              assert.deepEqual(actual, expected, failedMessage(actual));
              actual = [...sut.insertBefore(condition, generator.from<any>(second))];
              assert.deepEqual(actual, expected, failedMessage(actual));
            }
          }
        }
      });

      this.it2('should not add new items if none of the sources items meets the condition - numbers', array.zeroToNine, [-1, -2, -3], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertBefore(() => false, second);
        assert.deepEqual([...actual], expected)
      });

      this.it2('should not add new items if none of the sources items meets the condition - string', array.abc, ['', '1', '-'], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertBefore(() => false, second);
        assert.deepEqual([...actual], expected)
      });

      this.it2('should not add new items if none of the sources items meets the condition - objects', array.grades, [{
        name: Date.now().toString(),
        grade: -101
      }], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertBefore(() => false, second);
        assert.deepEqual([...actual], expected)
      });
    });

    describe('insertAfter()', () => {
      this.it1('should insert new items in source sequence immediately after the first item that meets the condition', [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1], (input) => {
        const source = [...input];
        const seconds = [undefined, 0, [-1, -2], []];

        const sut = this.createSut<any>(input);

        for (let i = 0; i <= source.length; i++) {
          const condition: Condition<number> = (x: number, index: number) => index === i;
          for (const second of seconds) {
            const secondArray: any[] = Array.isArray(second) ? second : [second];
            let atIndex = source.findIndex(condition);
            let expected = [...input];
            if (atIndex >= 0) expected.splice(atIndex + 1, 0, ...secondArray);

            const secondForLog = (() => {
              const quoted: any[] = secondArray.map(x => typeof x === 'string' ? `'${x}'` : x);
              return Array.isArray(second) ? (`[${quoted}]`) : second === undefined ? 'undefined' : [quoted[0]];
            })();
            const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${input}].insertAfter((x, index) => index === ${i}, ${secondForLog})`;

            let actual = [...sut.insertAfter(condition, second)];
            assert.deepEqual(actual, expected, failedMessage(actual));

            if (Array.isArray(second)) {
              actual = [...sut.insertAfter(condition, ...second)];
              assert.deepEqual(actual, expected, failedMessage(actual));
              actual = [...sut.insertAfter(condition, generator.from<any>(second))];
              assert.deepEqual(actual, expected, failedMessage(actual));
            }
          }
        }
      });

      this.it2('should not add new items if none of the sources items meets the condition - numbers', array.zeroToNine, [-1, -2, -3], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertAfter(() => false, second);
        assert.deepEqual([...actual], expected)
      });

      this.it2('should not add new items if none of the sources items meets the condition - string', array.abc, ['', '1', '-'], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertAfter(() => false, second);
        assert.deepEqual([...actual], expected)
      });

      this.it2('should not add new items if none of the sources items meets the condition - objects', array.grades, [{
        name: Date.now().toString(),
        grade: -101
      }], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertAfter(() => false, second);
        assert.deepEqual([...actual], expected)
      });
    });

    describe('intersect()', () => {
      this.it2('should return items that exists in both sequences without duplications', array.zeroToNine.concat(array.oneToTen), array.zeroToTen.concat(array.tenOnes).filter(x => x % 2 === 1).reverse(), (first, secondOdds) => {
        const expectedOdds = [...new Set(secondOdds)];
        let sut = this.createSut(first);
        let actual = [...sut.intersect(secondOdds)];
        assert.sameMembers(actual, expectedOdds);
      });

      this.it2('should return empty sequence if none of items exists in both sequences', array.oneToTen, array.tenZeros, (first, second) => {
        const expected: number[] = [];
        let sut = this.createSut(first);
        let actual = [...sut.intersect(second)];
        assert.sameMembers(actual, expected);
      });

      this.it2('should return empty sequence if second sequence is empty', array.oneToTen, [], (first, second: Iterable<number>) => {
        const expected: number[] = [];
        let sut = this.createSut(first);
        let actual = [...sut.intersect(second)];
        assert.sameMembers(actual, expected);
      });
      this.it2('should return empty sequence if first sequence is empty', [], array.oneToTen, (first: Iterable<number>, second) => {
        const expected: number[] = [];
        let sut = this.createSut(second);
        let actual = [...sut.intersect(first)];
        assert.sameMembers(actual, expected);
      });

      describe('with key-selector', () => {
        this.it2('should return items that exists in both sequences without duplications', array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove), array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow), (first, second) => {
          const expected = array.grades.filter(x => x.grade === 50).slice(-1);
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

        this.it2('should return empty sequence if none of items exists in both sequences', array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove).filter(x => x.grade !== 50), array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).filter(x => x.grade !== 50), (first, second) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

        this.it2('should return empty sequence if second sequence is empty', array.grades, [], (first, second: Iterable<{ name: string; grade: number }>) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });
        this.it2('should return empty sequence if first sequence is empty', [], array.grades, (first: Iterable<{ name: string; grade: number }>, second) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(second);
          let actual = [...sut.intersect(first, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });
      });
    });

    describe('intersperse()', () => {
      const testIntersperse = <T>(input: Iterable<T>, separator: any, opts?: { insideOut?: boolean; prefix?: any; suffix?: any }) => {
        const expected: any[] = [...input].reduce((res, item) => [...res, item, separator], <any[]>[]);
        expected.pop();
        if (opts?.prefix != null || opts?.insideOut) expected.unshift(opts?.prefix ?? separator);
        if (opts?.suffix != null || opts?.insideOut) expected.push(opts?.suffix ?? separator);

        const sut = this.createSut(input);
        const actual = (opts?.insideOut) ? sut.intersperse(separator, true) : sut.intersperse(separator, opts);
        assert.deepEqual([...actual], expected);
      };

      this.it1('should return sequence with separator value between each item from the source sequence - strings', ['name', 'age', 'score', 'date'], (input) => {
        testIntersperse(input, '|');
      });
      this.it1('should return sequence with separator value between each item from the source sequence - objects', array.samples, (input) => {
        testIntersperse(input, -1);
      });

      this.it1('should return sequence with source items between the separator value when insideOut parameter is true - primitive values', array.zeroToNine, (input) => {
        testIntersperse(input, '|', {insideOut: true});
      });

      this.it1('should return sequence with source items between the separator value when insideOut parameter is true - objects', array.samples, (input) => {
        testIntersperse(input, -1, {insideOut: true});
      });

      this.it1('should return sequence prefixed with a start value and a separator value between each item from the source sequence', array.zeroToNine, (input) => {
        testIntersperse(input, '|', {prefix: '['});
      });

      this.it1('should return sequence suffixed with an end value and a separator value between each item from the source sequence', array.zeroToNine, (input) => {
        testIntersperse(input, '|', {suffix: ']'});
      });

      this.it1('should return sequence prefixed with a start value and suffixed with an end value and a separator value between each item from the source sequence', array.zeroToNine, (input) => {
        testIntersperse(input, '|', {prefix: '[', suffix: ']'});
      });
    });

    describe("map()", () => {
      this.it1('should return same number of items as the source, converted by map function - numbers', array.oneToTen, (input) => {
        const mapFn = (x: number) => x * 2;
        const expected = [...input].map(mapFn);
        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return same number of items as the source, converted by map function - objects', array.grades, (input) => {
        const mapFn = (x: { name: string, grade: number }) => x.grade;
        const expected = [...input].map(mapFn);
        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.sameDeepOrderedMembers(actual, expected);
      });

      this.it1('when source sequence is empty, should return empty sequence', [], (input: Iterable<number>) => {
        const mapFn = (x: number) => x * 2;
        const expected: number[] = [];

        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("should map to items' index as expected", array.grades, (input) => {
        const mapFn = (x: { name: string, grade: number }, index: number) => index;
        const expected = [...input].map((_, i) => i);
        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.sameDeepOrderedMembers(actual, expected);
      });
    });

    describe('ofType()', () => {
      this.it1('should return filtered sequence with only the values of requested type', Array<any>().concat(
        array.oneToTen,
        array.abc,
        [false, true, false, true],
        [Symbol.iterator, Symbol.hasInstance],
        [() => 1, (x: number) => x, (() => void 0)],
        array.truthyValues,
        array.falsyValues,
        array.grades,
        array.folders), (source) => {

        const sut = this.createSut(source);
        const input = [...source];
        const expectedNumber = input.filter(x => typeof x === 'number');
        assert.deepEqual([...sut.ofType('number')], expectedNumber);

        const expectedBoolean = input.filter(x => typeof x === 'boolean');
        assert.deepEqual([...sut.ofType('boolean')], expectedBoolean);

        const expectedObject = input.filter(x => typeof x === 'object');
        assert.deepEqual([...sut.ofType('object')], expectedObject);

        const expectedString = input.filter(x => typeof x === 'string');
        assert.deepEqual([...sut.ofType('string')], expectedString);

        const expectedFunction = input.filter(x => typeof x === 'function');
        assert.deepEqual([...sut.ofType('function')], expectedFunction);

        const expectedSymbol = input.filter(x => typeof x === 'symbol');
        assert.deepEqual([...sut.ofType('symbol')], expectedSymbol);

        assert.deepEqual([...sut.ofType(Number)], expectedNumber);
        assert.deepEqual([...sut.ofType(String)], expectedString);
        assert.deepEqual([...sut.ofType(Boolean)], expectedBoolean);
        assert.deepEqual([...sut.ofType(Object)], expectedObject);
        assert.deepEqual([...sut.ofType(Symbol)], expectedSymbol);

        const expectedClass = input.filter(x => x instanceof Folder);
        assert.deepEqual([...sut.ofType(Folder)], expectedClass);
      });

      this.it1('should return empty sequence is non of the values is of the requested type', array.abc, (input) => {
        const expected: any[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.ofType('number')];
        assert.sameMembers(actual, expected);
      });

      it('should return empty sequence if requested type is not primitive and not a class', () => {
        const input = array.abc;
        const expected: any[] = [];
        const fakeAnyType: any = {};
        let sut = this.createSut(input);
        let actual = [...sut.ofType(fakeAnyType)];
        assert.sameMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.ofType(fakeAnyType)];
        assert.sameMembers(actual, expected);
      });
    });

    describe('prepend()', () => {
      this.it1('should return new sequence with new items added at the start - strings', array.abc, (input) => {
        const newItem1 = '-';
        const newItem2 = '0';
        const expected = [newItem1, newItem2].concat([...input]);
        let sut = this.createSut(input);
        let actual = [...sut.prepend(newItem1, newItem2)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it2('should return new sequence with new items added at the start - objects', array.gradesFiftyAndAbove, array.gradesFiftyAndBelow, (first, second) => {
        const expected = [...second].concat([...first]);
        let sut = this.createSut(first);
        let actual = [...sut.prepend(...second)];
        assert.sameDeepOrderedMembers(actual, expected);


        const input3: string[] = [];
        const newItems3 = 'abc';
        const expected3 = [newItems3];
        let sut3 = this.createSut(input3);
        let actual3 = [...sut3.prepend(newItems3)];
        assert.deepEqual(actual3, expected3);
        sut3 = this.createSut(generator.from(input3));
        actual3 = [...sut3.prepend(newItems3)];
        assert.deepEqual(actual3, expected3);
      });

      this.it1('should return new sequence with new items added to an empty iterable', [], (input: Iterable<string>) => {
        const newItems = 'abc';
        const expected = [newItems];
        let sut = this.createSut(input);
        let actual = [...sut.prepend(newItems)];
        assert.deepEqual(actual, expected);
      });
    });

    describe("push()", () => {
      this.it2('should add several items at the end of the sequence', [1, 2, 3, 4, 5], [6, 7, 8, 9, 10], (first, second) => {
        const expected = [...first].concat([...second]);
        const sut = this.createSut(first);
        const actual = [...sut.push(...second)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it2('should add several Iterable items at the end of the a sequence of Iterables', [[1], [2, 2], [3, 3, 3], [4, 4, 4], [5, 5, 5]], [[6], [7, 7], [8, 8, 8], [9, 9, 9, 9], [10]], (first, second) => {
        const expected = [...first].concat([...second]);
        const sut = this.createSut(first);
        const actual = [...sut.push(...second)];
        assert.sameDeepOrderedMembers(actual, expected);
      });

      this.it1('should not change the sequence when pushing nothing', [1, 2, 3, 4, 5], (input) => {
        const expected = [...input];

        const sut = this.createSut(input);
        const actual = [...sut.push()];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('remove()', () => {
      this.it2('should remove occurrences of items from the source sequence that exists on the seconds sequence, the same number of time they exists in the second sequence',
        [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5],
        [0, 0, 2, 2, 4, 4, 6, 6, 5, 5, 3, 3, 1, 1, 5],
        (first, second) => {
          const expected = [3, 4, 4, 5, 5];
          const sut = this.createSut(first);

          let actual = sut.remove(second);
          assert.sameOrderedMembers([...actual], expected);
        });

      this.it2('should remove occurrences of items from the source sequence that exists on the seconds sequence according to key-selector, the same number of time they exists in the second sequence',
        [
          {x: 1, y: 1},
          {x: 2, y: 2},
          {x: 2, y: 2},
          {x: 3, y: 3},
          {x: 3, y: 3},
          {x: 3, y: 3},
          {x: 4, y: 4},
          {x: 4, y: 4},
          {x: 4, y: 4},
          {x: 4, y: 4},
          {x: 5, y: 5},
          {x: 5, y: 5},
          {x: 5, y: 5},
          {x: 5, y: 5},
          {x: 5, y: 5}
        ],
        [
          {x: 0, y: 0},
          {x: 0, y: 0},
          {x: 2, y: 2},
          {x: 2, y: 2},
          {x: 4, y: 4},
          {x: 4, y: 4},
          {x: 6, y: 6},
          {x: 6, y: 6},
          {x: 5, y: 5},
          {x: 5, y: 5},
          {x: 3, y: 3},
          {x: 3, y: 3},
          {x: 1, y: 1},
          {x: 1, y: 1}
        ],
        (first, second) => {
          const expected = [
            {x: 3, y: 3},
            {x: 4, y: 4},
            {x: 4, y: 4},
            {x: 5, y: 5},
            {x: 5, y: 5},
            {x: 5, y: 5}
          ];

          const keySelector = (point: { x: number; y: number; }) => point.x + point.y * 1000;
          const sut = this.createSut(first);
          let actual = sut.remove(second, keySelector);
          assert.deepEqual([...actual], expected);
        });
    });

    describe('removeAll()', () => {
      this.it2('should remove all occurrences of items from the source sequence that exists on the seconds sequence',
        array.abc, [...'Expected to be Removed'], (first, second) => {
          const expected = [...first].filter(ch => ![...second].includes(ch));
          const sut = this.createSut(first);
          const actual = sut.removeAll(second);
          assert.sameOrderedMembers([...actual], expected)
        });

      this.it2('should remove all occurrences of items from the source sequence that exists on the seconds sequence according to key-selector',
        array.samples,
        array.samples.filter(s => s.type === 'A'),
        (first, second) => {
          const expected = [...first].filter(s => [...second].findIndex(r => r.type === s.type) < 0);

          const sut = this.createSut(first);
          const actual = sut.removeAll(second, sample => sample.type);

          assert.deepEqual([...actual], expected)
        });
    });

    describe('removeFalsy()', () => {
      this.it1('should return a new sequence without falsy values', array.truthyValues.concat(array.falsyValues), (input) => {
        const expected = array.truthyValues;
        let sut = this.createSut(input);
        let actual = [...sut.removeFalsy()];
        assert.deepEqual(actual, expected);
      });
    });

    describe('removeNulls()', () => {
      this.it1('should return a new sequence without null and undefined values', array.truthyValues.concat(array.falsyValues), (input) => {
        const expected = [...input].filter(x => x != null);
        let sut = this.createSut(input);
        let actual = [...sut.removeNulls()];
        assert.deepEqual(actual, expected);
      });
    });

    describe('repeat()', () => {
      this.it1('should return new sequence with original sequence concatenated to itself the requested number of times', array.oneToTen, (source) => {
        const count = 5;
        const input = [...source];
        const expected = input.concat(input, input, input, input);
        let sut = this.createSut(input);
        let actual = [...sut.repeat(count)];
        assert.deepEqual(actual, expected);
      });

      it('should throw exception if count is not positive', () => {
        assert.throw(() => this.createSut().repeat(0));
        assert.throw(() => this.createSut().repeat(-1));
      });
    });

    describe('reverse()', () => {
      this.it1('should return sequence in reverse order', array.range(-5, 5), (input) => {
        const expected = [...input].reverse();
        let sut = this.createSut(input);
        let actual = [...sut.reverse()];
        assert.deepEqual(actual, expected);
      });
    });

    describe("skip()", () => {
      this.it1("Return rest of items when skipping only part of the items", array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const greaterThanZeroLessThenNumberOfItems = 7;
        const expected = [...input].slice(greaterThanZeroLessThenNumberOfItems);
        const actual = [...sut.skip(greaterThanZeroLessThenNumberOfItems)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("Return all items when skipping zero items", array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const expected = array.oneToTen.slice();
        const actual = [...sut.skip(0)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("Return same instance when skipping zero items", array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const expected = array.oneToTen.slice();
        const actual = [...sut.skip(0)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("Return empty sequence when skipping all items", array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const expected: number[] = [];
        const actual = [...sut.skip([...input].length)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("Return empty sequence when skipping more then existing items", array.oneToTen, (input) => {
        const moreThanExistingItems = [...input].length + 1;
        const sut = this.createSut(input);
        const expected: number[] = [];
        const actual = [...sut.skip(moreThanExistingItems)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should behave like Array.slice(0, count) also when count is negative', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(source);
        for (let skip = -input.length - 1; skip < input.length + 1; skip++) {
          for (let take = -input.length - 1; take <= input.length + 1; take++) {
            const expected = input.slice(skip);
            const actual = [...sut.skip(skip)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
          }
        }
      });
    });

    describe('skipFirst()', () => {
      this.it1('should skip first item in a sequence', array.zeroToTen, (input) => {
        const expected = [...input];
        expected.shift();
        let sut = this.createSut(input);
        let actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return empty sequence if only one item in source sequence', [1], (input) => {
        const expected: number[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return empty sequence is source sequence is empty', [], (input) => {
        const expected: number[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);
      });
    });

    describe('skipLast()', () => {
      this.it1('should return new sequence without last skipped items', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(input);
        for (let count = 0; count < input.length + 1; count++) {
          const expected = input.slice(0, -count);
          let actual = [...sut.skipLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].skipLast(${count})`);
        }
      });

      this.it1('should return empty sequence is count is negative', array.oneToTen, (input) => {
        assert.sameOrderedMembers([...this.createSut(input).skipLast(-1)], []);
      });
    });

    describe("skipWhile()", () => {
      this.it1("should return empty sequence when condition always met", array.oneToTen, (input) => {
        const expected: number[] = [];
        const alwaysTrueCondition = () => true;

        const sut = this.createSut(input);

        const actual = [...sut.skipWhile(alwaysTrueCondition)];

        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("should return empty sequence when source sequence is already empty", [], (input) => {
        const expected: number[] = [];
        const alwaysFalseCondition = () => false;

        const sut = this.createSut(input);

        const actual = [...sut.skipWhile(alwaysFalseCondition)];

        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return sub sequence from one item after condition no longer met, till end of sequence', array.oneToTen.concat(array.oneToTen), (input) => {
        const expected = [...input].slice(5);
        let sut = this.createSut(input);
        let actual = [...sut.skipWhile(x => x <= 5)];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('slice()', () => {
      this.it1('should return a section from the sequence according to start index and count', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(input);
        for (let skip = -input.length - 1; skip < input.length + 1; skip++) {
          for (let take = -input.length - 1; take <= input.length + 1; take++) {
            const expected = input.slice(skip, take);
            let actual = [...sut.slice(skip, take)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
          }
        }
      });
    });

    describe('split()', () => {
      describe('at index', () => {
        it('should return two sequences, first one with items before the split index and the second with the rest', () => {
          const source = array.oneToTen;
          for (let size = 0; size <= 10; size++) {
            const input = source.slice(size);
            let sutArray = this.createSut(input);
            let sutGenerator = this.createSut(generator.from(input));
            for (let index = -1; index < input.length + 1; index++) {
              const expectedFirst = index < 1 ? [] : input.slice(0, index);
              const expectedSecond = index < 1 ? input.slice() : input.slice(index);
              let actual = sutArray.split(index);
              assert.deepEqual([...actual[0]], expectedFirst);
              assert.deepEqual([...actual[1]], expectedSecond);
              // Second first
              actual = sutArray.split(index);
              assert.deepEqual([...actual[1]], expectedSecond);
              assert.deepEqual([...actual[0]], expectedFirst);

              actual = sutGenerator.split(index);
              assert.deepEqual([...actual[0]], expectedFirst);
              assert.deepEqual([...actual[1]], expectedSecond);
              // Second first
              actual = sutGenerator.split(index);
              assert.deepEqual([...actual[1]], expectedSecond);
              assert.deepEqual([...actual[0]], expectedFirst);
            }
          }
        });
      });

      describe('by condition', () => {
        this.it1('should return two sequences, first one with items while the condition met and the second with the rest', array.oneToTen, (input) => {
          const expected = [[...input].filter(n => n < 5), [...input].filter(n => n >= 5)];
          const sut = this.createSut(input);
          const split = sut.split(n => n < 5);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(actual, expected);
        });

        this.it1('should return first sequence with all items and second empty, if all items match a condition', array.oneToTen, (input) => {
          const expected = [[...input].filter(n => n > 0), []];
          const sut = this.createSut(input);
          const split = sut.split(n => n > 0);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(actual, expected);
        });

        this.it1('should return first sequence empty and second with all items, if none of the items match a condition', array.oneToTen, (input) => {
          const expected = [[], [...input].filter(n => n > 0)];
          const sut = this.createSut(input);
          const split = sut.split(() => false);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(actual, expected);
        });
      });
    });

    describe('take()', () => {
      this.it1('should behave like Array.slice(0, count) also when count is negative', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(source);
        for (let skip = -input.length - 1; skip < input.length + 1; skip++) {
          for (let take = -input.length - 1; take <= input.length + 1; take++) {
            const expected = input.slice(0, take);
            let actual = [...sut.take(take)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
          }
        }
      });
    });

    describe('takeLast()', () => {
      this.it1('should return new sequence only with last N items', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(source);
        for (let count = 1; count < input.length + 1; count++) {
          const expected = input.slice(-count);
          let actual = [...sut.takeLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].takeLast(${count})`);
        }
      });

      this.it1('should return empty sequence is count non positive', [], (input) => {
        assert.sameOrderedMembers([...this.createSut(input).takeLast(0)], []);
        assert.sameOrderedMembers([...this.createSut(input).takeLast(-1)], []);
      });
    });

    describe('takeWhile()', () => {
      this.it1("should return empty sequence when condition never met", array.oneToTen, (input) => {
        const expected: number[] = [];
        const alwaysFalseCondition = () => false;

        const sut = this.createSut(input);

        const actual = [...sut.takeWhile(alwaysFalseCondition)];

        assert.sameOrderedMembers(actual, expected);
      });

      this.it1("should return empty sequence when source sequence is empty", [], (input) => {
        const expected: number[] = [];
        const alwaysTrueCondition = () => false;

        const sut = this.createSut(input);

        const actual = [...sut.takeWhile(alwaysTrueCondition)];

        assert.sameOrderedMembers(actual, expected);
      });


      this.it1('should return sub sequence from beginning of source sequence up to the one item before condition no longer met', array.oneToTen.concat(array.oneToTen), (input) => {
        const expected = array.range(1, 5);
        let sut = this.createSut(input);
        let actual = [...sut.takeWhile(x => x <= 5)];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('takeOnly()', () => {
      it('should return items from source sequence that exists in seconds sequence with same key', () => {
        const existsOnlyInFirst = {name: 'first', grade: -1};
        const existsOnlyInSecond = {name: 'second', grade: -2};
        const input = array.grades.concat(existsOnlyInFirst);
        const second = array.gradesFiftyAndAbove.concat(existsOnlyInSecond);
        const expected = array.gradesFiftyAndAbove;
        let sut = this.createSut(input);
        let actual = [...sut.takeOnly(second, x => x.grade)];
        assert.deepEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.takeOnly(generator.from(second), x => x.grade)];
        assert.deepEqual(actual, expected);

        const input2 = array.gradesFiftyAndAbove.concat(existsOnlyInFirst);
        const second2 = array.grades.concat(existsOnlyInSecond);
        const expected2 = array.gradesFiftyAndAbove;
        let sut2 = this.createSut(input2);
        let actual2 = [...sut2.takeOnly(second2, x => x.grade)];
        assert.deepEqual(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = [...sut2.takeOnly(generator.from(second2), x => x.grade)];
        assert.deepEqual(actual2, expected2);


        const input3 = array.gradesFiftyAndAbove;
        const second3 = array.gradesFiftyAndBelow;
        const expected3 = array.gradesFiftyAndAbove.filter(x => x.grade === 50);
        let sut3 = this.createSut(input3);
        let actual3 = [...sut3.takeOnly(second3, x => x.grade)];
        assert.deepEqual(actual3, expected3);

        sut3 = this.createSut(generator.from(input3));
        actual3 = [...sut3.takeOnly(generator.from(second3), x => x.grade)];
        assert.deepEqual(actual3, expected3);
      });

      it('should return empty sequence if non of the source items exists in second sequence', () => {
        const input = array.abc;
        const second = array.oneToTen;
        let sut = this.createSut(input);
        let actual = [...sut.takeOnly(second, x => x, y => y.toString())];
        assert.sameMembers(actual, []);
        sut = this.createSut(generator.from(input));
        actual = [...sut.takeOnly(generator.from(second), x => x, y => y.toString())];
        assert.sameMembers(actual, []);
      });

      it('should return duplicate items same as they exists in seconds sequence', () => {
        const input = array.repeat({x: 1, y: 1}, 3)
          .concat(array.repeat({x: 2, y: 2}, 3))
          .concat(array.repeat({x: 3, y: 3}, 3))
          .concat(array.repeat({x: 4, y: 4}, 3));

        const second = [{x: 0, y: 0, z: 0}]
          .concat(array.repeat({x: 1, y: 1, z: 1}, 1))
          .concat(array.repeat({x: 2, y: 2, z: 2}, 2))
          .concat(array.repeat({x: 3, y: 3, z: 3}, 3))
          .concat(array.repeat({x: 4, y: 4, z: 4}, 4));

        const expected = array.repeat({x: 1, y: 1}, 1)
          .concat(array.repeat({x: 2, y: 2}, 2))
          .concat(array.repeat({x: 3, y: 3}, 3))
          .concat(array.repeat({x: 4, y: 4}, 3));

        let sut = this.createSut(input);

        let actual = [...sut.takeOnly(second, xy => `[${xy.x},${xy.y}]`, xyz => `[${xyz.x},${xyz.y}]`)];
        assert.deepEqual(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = [...sut.takeOnly(generator.from(second), xy => `[${xy.x},${xy.y}]`, xyz => `[${xyz.x},${xyz.y}]`)];
        assert.deepEqual(actual, expected);
      });
    });

    describe('tap()', () => {
      this.it1('should call callback for each item in source sequence with correct index', array.zeroToNine, (input) => {
        const actual: number[] = [];
        const expected = [...input];
        const sut = this.createSut(input);
        const tapped = sut.tap((item, index) => actual.push(index));
        for (const item of tapped) {
        }
        assert.deepEqual(actual, expected)
      });

      this.it1('should produce same results before and after tap', array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const tapped = sut.tap(() => false);
        const actual = [...tapped];
        const expected = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should call provided callback for each item', array.oneToTen, (input) => {
        const expected = [...input];
        const sut = this.createSut(input);
        const actual: number[] = [];
        const tapped = sut.tap(item => actual.push(item));
        for (const item of tapped) {
        }
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should call all callbacks in order when tap called several times', array.oneToTen, (input) => {
        const expected = [...input];
        const sut = this.createSut(input);
        const [actual1, actual2, actual3] = [[], [], []] as [number[], number[], number[]];
        const chainedTap = sut
          .tap(item => actual1.push(item))
          .tap(item => actual2.push(item))
          .tap(item => actual3.push(item));
        for (const item of chainedTap) {
        }
        assert.sameOrderedMembers(actual1, expected);
        assert.sameOrderedMembers(actual2, expected);
        assert.sameOrderedMembers(actual3, expected);
      });

      this.it1('should use provided `this` argument with callback', array.oneToTen, (input) => {
        const expected = [...input];
        const actual = new class {
          items: number[] = [];

          add(value: number): void {
            this.items.push(value);
          }
        };

        const sut = this.createSut(input);

        const tapped = sut.tap(actual.add, actual);
        for (const item of tapped) {
        }
        assert.sameOrderedMembers(actual.items, expected);
      });
    });

    describe('transform', () => {
      this.it1('should replace sequence with concatenated filters of it', array.oneToTen, (input) => {
        const transformer = (seq: Seq<number>) => seq.filter(x => x % 2 === 0).concat(
          seq.filter(x => x % 2),
          seq.filter(x => x >= 5)
        );

        let sut = this.createSut(input);
        let expected = transformer(sut);
        let actual = sut.transform(transformer);

        assert.sameOrderedMembers(actual.toArray(), expected.toArray());
      });

      this.it1('should not replace when transform return the sequence itself', array.oneToTen, (input) => {
        const transformer = (seq: Seq<number>) => seq;

        let sut = this.createSut(input);
        let actual = sut.transform(transformer);

        assert.strictEqual(actual, sut);
      });
    });

    describe('union()', () => {
      this.it2('should return a sequence with distinct items from both sequences', array.zeroToNine, array.oneToTen, (first, second) => {
        const expected = [...new Set([...first].concat([...second]))];
        const sut = this.createSut(first);

        let actual = [...sut.union(second)];
        assert.deepEqual(actual, expected);


        const expected2 = [...new Set(first)];
        actual = [...sut.union(sut)];
        assert.deepEqual(actual, expected2);
      });

      this.it2('should return a sequence with distinct items from both sequences according to a key-selector', array.gradesFiftyAndAbove, array.gradesFiftyAndAbove, (first, second) => {
        const union = [...first].concat([...second]);

        const keySelector = (grade: { name: string; grade: number; }) => grade.name;
        const map = new Map<string, { name: string; grade: number; }>();
        union.concat([...second]).forEach((grade) => map.set(keySelector(grade), grade));
        const expected = union.filter((x) => map.delete(keySelector(x)));

        const sut = this.createSut(first);

        let actual = [...sut.union(second, keySelector)];
        assert.deepEqual(actual, expected);


        const expected2 = [...new Set(first)];
        actual = [...sut.union(sut, keySelector)];
        assert.deepEqual(actual, expected2);
      });
    });

    describe('zip()', () => {
      it('should return a sequence as long as the shortest zipped sequence', () => {
        const rotate = (...arrays: any[][]) => arrays.forEach(arr => arr.unshift(arr.pop()));
        const [shortest, longest, inBetween1, inBetween2] = [array.oneToNine, array.abc, array.zeroToTen, array.samples.slice(0, 15)];

        const asArray: any[][] = [shortest, inBetween1, inBetween2, longest];
        const asIterable = asArray.map(generator.from);
        const asSeq = asArray.map(arr => this.createSut(arr));

        for (let test = 1; test <= asArray.length; test++) {
          let i = 0;
          const expected = shortest.map((_, i) => asArray.map(arr => arr[i]));

          const sut: Seq<any> = asSeq[i++];
          const zipped = sut.zip(asArray[i++], asIterable[i++], asSeq[i++]);

          const actual = [...zipped];
          assert.deepEqual(actual, expected);

          rotate(asArray, asIterable, asSeq);
        }
      });
    });

    describe('zipAll()', () => {
      it('should return a sequence as long as the longest zipped sequence', () => {
        const rotate = (...arrays: any[][]) => arrays.forEach(arr => arr.unshift(arr.pop()));
        const [shortest, longest, inBetween1, inBetween2] = [array.oneToNine, array.abc, array.zeroToTen, array.samples.slice(0, 15)];

        const asArray: any[] = [shortest, inBetween1, inBetween2, longest];
        const asIterable = asArray.map(generator.from);
        const asSeq = asArray.map(arr => this.createSut(arr));

        for (let test = 1; test <= asArray.length; test++) {
          let i = 0;
          const expected = longest.map((_, i) => asArray.map(arr => arr[i]));

          const sut: Seq<any> = asSeq[i++];
          const zipped = sut.zipAll(asArray[i++], asIterable[i++], asSeq[i++]);
          const actual = [...zipped];
          assert.deepEqual(actual, expected);

          rotate(asArray, asIterable, asSeq);
        }
      });

      it('should use specified defaults for shorter sequences, in the order they specified', () => {
        const rotate = (...arrays: any[][]) => arrays.forEach(arr => arr.unshift(arr.pop()));
        const [shortest, longest, inBetween1, inBetween2] = [array.oneToNine, array.abc, array.zeroToTen, array.samples.slice(0, 15)];

        const asArray: any[] = [shortest, inBetween1, inBetween2, longest];
        const asIterable = asArray.map(generator.from);
        const asSeq = asArray.map(arr => this.createSut(arr));
        const defaults: [number, string, number, { type: string; period: number; score: number; ok: boolean; }] = [-9, 'default', -10, {
          type: "default",
          period: 0,
          score: 0,
          ok: true
        }];
        for (let test = 1; test <= asArray.length; test++) {
          let i = 0;
          const expected = longest.map((_, index) => asArray.map((arr, arrIndex) => arr[index] ?? defaults[arrIndex]));

          const sut: Seq<any> = asSeq[i++];
          const zipped = sut.zipAll(asArray[i++], asIterable[i++], asSeq[i++], {defaults: defaults as [any, any, any, any]});
          const actual = [...zipped];
          assert.deepEqual(actual, expected);

          rotate(asArray, asIterable, asSeq, defaults);
        }
      });
    });

    describe('zipWithIndex()', () => {
      this.it1('should pair all items, each with its index in the sequence', array.abc, (input) => {
        const expected = [...input].map((x, i) => [x, i]);

        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex()];
        assert.deepEqual(actual, expected);
      });

      this.it1('when source sequence is empty, should return empty sequence', [], (input) => {
        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex()];
        assert.isEmpty(actual);
      });
    });

  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}
