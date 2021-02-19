import {describe, it} from "mocha";
import {asSeq, Condition, Seq} from "../../lib";
import {assert} from "chai";
import {array, Folder, generator} from "../test-data";

export abstract class SeqBase_Deferred_Tests {

  readonly run = () => describe('SeqBase - Deferred Execution', () => {
    describe("append()", () => {
      it('should add an item at the end of the sequence', () => {
        const expected = array.zeroToTen;
        const input = array.zeroToNine;
        const sut = this.createSut(input);
        const actual = [...sut.append(10)];
        assert.sameOrderedMembers(actual, expected);
        assert.sameOrderedMembers(input, array.zeroToNine);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = [...sut2.append(10)];
        assert.sameOrderedMembers(actual2, expected);
        assert.sameOrderedMembers(input, array.zeroToNine);
      });
    });

    describe("as()", () => {
      it('should return same instance', () => {
        const sut: Seq<Array<number>> = this.createSut<Array<number>>();
        const actual = sut.as<Iterable<number>>();

        assert.equal(actual, sut);
      });
    });

    describe('asSeq()', ()=>{
      it('should create new instance of sequence', ()=> {
        const sut = this.createSut();
        const actual = sut.asSeq();
        assert.notEqual(actual, sut);
      });
      it('should produce same results as before', ()=> {
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
      it('should return distinct values from non empty sequence', () => {
        const input = array.oneToTen.concat(array.zeroToNine).concat(array.oneToNine);
        const expected = array.zeroToTen;
        const sut = this.createSut(input);
        const actual = sut.distinct();
        assert.sameMembers([...actual], expected);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = sut2.distinct();
        assert.sameMembers([...actual2], expected);
      });

      it('should return distinct values by key selector from non empty sequence', () => {
        const input = array.grades
          .concat(array.grades.filter(x => x.grade > 50))
          .concat(array.grades.reverse());

        const expected = array.grades;
        const sut = this.createSut(input);
        const actual = sut.distinct(x => x.grade);
        assert.sameDeepMembers([...actual], expected);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = sut2.distinct(x => x.grade);
        assert.sameDeepMembers([...actual2], expected);
      });

      it('should return empty sequence when source sequence is empty', () => {
        const input: number[] = [];
        const expected: number[] = [];
        const sut = this.createSut(input);
        const actual = sut.distinct();
        assert.sameMembers([...actual], expected);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = sut2.distinct();
        assert.sameMembers([...actual2], expected);
      });

      it('should return empty sequence when source sequence is empty and key selector is used', () => {
        const input: { name: string; grade: number; }[] = [];
        const expected: { name: string; grade: number; }[] = [];
        const sut = this.createSut(input);
        const actual = sut.distinct(x => x.grade);
        assert.sameDeepMembers([...actual], expected);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = sut2.distinct(x => x.grade);
        assert.sameDeepMembers([...actual2], expected);
      });
    });

    describe('entries()', () => {
      it('should return sequence of tuples of index paired with the item, like Array.entries()', () => {
        const input = array.abc;
        const sut = this.createSut(input);
        const expected = [...input.entries()];
        const actual = [...sut.entries()];
        assert.deepEqual(actual, expected)
      });
    });

    describe("filter()", () => {
      it('should return only items that meet the condition', () => {
        const input = array.oneToTen;
        const expectedEvens = input.filter(x => x % 2 == 0);
        let sut = this.createSut(input);
        let actual = [...sut.filter(x => x % 2 == 0)];
        assert.sameOrderedMembers(actual, expectedEvens);
        sut = this.createSut(generator.from(input));
        actual = [...sut.filter(x => x % 2 == 0)];
        assert.sameOrderedMembers(actual, expectedEvens);

        const input2 = array.grades;
        const expectedAboveFifty = input2.filter(x => x.grade > 50);
        let sut2 = this.createSut(input2);
        let actual2 = [...sut2.filter(x => x.grade > 50)];
        assert.sameOrderedMembers(actual2, expectedAboveFifty);
        sut2 = this.createSut(generator.from(input2));
        actual2 = [...sut2.filter(x => x.grade > 50)];
        assert.sameOrderedMembers(actual2, expectedAboveFifty);
      });

      it('should return empty sequence if non of the items meet the condition', () => {
        const input = array.oneToTen;
        const expectedEmpty: any[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.filter(() => false)];
        assert.sameOrderedMembers(actual, expectedEmpty);
        sut = this.createSut(generator.from(input));
        actual = [...sut.filter(() => false)];
        assert.sameOrderedMembers(actual, expectedEmpty);

        const input2 = array.grades;
        let sut2 = this.createSut(input2);
        let actual2 = [...sut2.filter(() => false)];
        assert.sameOrderedMembers(actual2, expectedEmpty);
        sut2 = this.createSut(generator.from(input2));
        actual2 = [...sut2.filter(() => false)];
        assert.sameOrderedMembers(actual2, expectedEmpty);
      });
    });

    describe("firstAndRest()", () => {
      function tuple<T, U>(first: T, rest: U[]): [T, U[]] {
        return [first, rest] as [T, U[]];
      }

      it('should return first item in sequence and rest of items in new sequence', () => {
        const input = array.oneToTen;
        const expected = tuple(input[0], input.slice(1));
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
        sut = this.createSut(generator.from(input));
        actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);

        const input2 = array.grades;
        const expected2 = tuple(input2[0], input2.slice(1));
        let sut2 = this.createSut(input2);
        let actual2 = sut2.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual2[1]], expected2[1]);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual2[1]], expected2[1]);
      });

      it('when sequence has only one item, should return first item and and empty sequence', () => {
        const input = [1];
        const expected = tuple(1, []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
        sut = this.createSut(generator.from(input));
        actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);

        const input2 = array.grades.slice(0, 1);
        const expected2 = tuple(input2[0], []);
        let sut2 = this.createSut(input2);
        let actual2 = sut2.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual2[1]], expected2[1]);

        sut2 = this.createSut(generator.from(input2));
        actual2 = sut2.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual2[1]], expected2[1]);
      });

      it('when should is empty, should return undefined and empty sequence', () => {
        const expected = tuple(undefined, []);
        let sut = this.createSut([]);
        let actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
        sut = this.createSut();
        actual = sut.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      it('when should is empty, should return default value and empty sequence', () => {
        const defaultValue = -1;
        const expected = tuple(defaultValue, []);
        let sut = this.createSut<number>([]);
        let actual = sut.firstAndRest(defaultValue);
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
        sut = this.createSut<number>();
        actual = sut.firstAndRest(defaultValue);
        assert.equal(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);

        const expected2 = tuple({name: "default", grade: -1}, []);
        let sut2 = this.createSut<{ name: string; grade: number; }>([]);
        let actual2 = sut2.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual2[1]], expected2[1]);

        sut2 = this.createSut<{ name: string; grade: number; }>();
        actual2 = sut2.firstAndRest();
        assert.equal(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual2[1]], expected2[1]);
      });
    });

    describe("flatMap()", () => {
      it('should flattened items from a sequence of items having child items', () => {
        const input = [array.oneToTen, array.truthyValues, array.falsyValues];
        const expected = input.slice(0, 0).concat(...input);
        let sut = this.createSut(input);
        let actual = [...sut.flatMap()];
        assert.deepEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.flatMap()];
        assert.deepEqual(actual, expected);
      });

      it('should return empty sequence if all items have empty sub sequence', () => {
        const input: number[][] = [[], [], []];
        const expected: number[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.flatMap()];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.flatMap()];
        assert.sameOrderedMembers(actual, expected);
      });

      describe("with result selector", () => {
        it('should flattened items from a sequence of items having child items', () => {
          const input = array.folders;
          const expected = Array<string>().concat(...input.map(f => f.subFolders.map(f => f.name)));
          let sut = this.createSut(input);
          let actual = [...sut.flatMap(f => f.subFolders, f => f.name)];
          assert.sameDeepOrderedMembers(actual, expected);

          sut = this.createSut(generator.from(input));
          actual = [...sut.flatMap(f => f.subFolders, f => f.name)];
          assert.sameDeepOrderedMembers(actual, expected);
        });

        it('should return empty sequence if all items have empty children sequence', () => {
          const input = [new Folder("1"), new Folder('2'), new Folder('2')];
          const expected: string[] = [];
          let sut = this.createSut(input);
          let actual = [...sut.flatMap()];
          assert.sameDeepOrderedMembers(actual, expected);

          sut = this.createSut(generator.from(input));
          actual = [...sut.flatMap()];
          assert.sameDeepOrderedMembers(actual, expected);
        });

      });
    });

    describe("ifEmpty()", () => {
      it("should keep same sequence if it's not empty", () => {
        const input = array.oneToTen;
        const expected = input;
        const sut = this.createSut(input);
        let actual = [...sut.ifEmpty(0)];
        assert.sameOrderedMembers(actual, expected);

        actual = [...sut.ifEmpty({useFactory: () => 0})];
        assert.sameOrderedMembers(actual, expected);

        actual = [...sut.ifEmpty({useSequence: [0]})];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should return default value if sequence is empty', () => {
        const input: number[] = [];
        const defaultValue = 0;
        const expected = [defaultValue];
        let sut = this.createSut(input);
        let actual = [...sut.ifEmpty(defaultValue)];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.ifEmpty(defaultValue)];
        assert.sameOrderedMembers(actual, expected);

        const input2: { name: string, grade: number }[] = [];
        const defaultValue2 = {name: "defaultStudent", grade: 100};
        const expected2 = [defaultValue2];
        let sut2 = this.createSut(input2);
        let actual2 = [...sut2.ifEmpty(defaultValue2)];
        assert.sameOrderedMembers(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = [...sut2.ifEmpty(defaultValue2)];
        assert.sameOrderedMembers(actual2, expected2);

      });

      it('should lazily provide default value thru a factory', () => {
        const input: number[] = [];
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

        factoryExecuted = false;
        sut = this.createSut(generator.from(input));
        seq = sut.ifEmpty({useFactory});
        iterator = seq[Symbol.iterator]();
        assert.isFalse(factoryExecuted);
        actual = iterator.next().value;
        assert.isTrue(factoryExecuted);
        assert.isTrue(iterator.next().done);
        assert.equal(actual, expected);
      });

      it('should return a default sequence if source sequence is empty', () => {
        const input: number[] = [];
        const useSequence = array.oneToTen;
        const expected = useSequence;
        let sut = this.createSut(input);

        let actual = [...sut.ifEmpty({useSequence})];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.ifEmpty({useSequence})];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('innerJoin()', () => {
      it('should return pairs of only matched items from outer and inner sequences', () => {
        const outer = array.gradesFiftyAndBelow;
        const inner = array.grades;
        const expected = array.gradesFiftyAndBelow.map(g => ({outer: g, inner: g}));
        const sut = this.createSut(outer).innerJoin(inner, g => g.grade, g => g.grade);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      it('should return pairs that have the same outer item if it matches several inner items', () => {
        const outer = [{key: array.samples[0].type}];
        const inner = array.samples;
        const expected = (<any[]>[]).concat(...outer.map(o => inner.filter(i => i.type === o.key).map(i => ({
          outer: o,
          inner: i
        }))));
        const sut = this.createSut(outer).innerJoin(inner, s => s.key, s => s.type);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      it('should return empty sequence if no matches', () => {
        const outer = [1, 2, 3];
        const inner = [-1, -2, -3];
        const sut = this.createSut(outer).innerJoin(inner, _ => _, _ => _);
        const actual = [...sut];
        assert.deepEqual(actual, []);
      });

      it('should return matched items after applying resultsSelector', () => {
        const outer = array.gradesFiftyAndBelow.map(g => ({key: g.grade}));
        const inner = array.grades;
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
      it('should insert new items in source sequence immediately before the first item that meets the condition', () => {
        let input = [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1];
        const seconds = [undefined, 0, [-1, -2], []];

        const sutArray = this.createSut<any>(input);
        const sutGenerator = this.createSut(generator.from<any>(input));

        for (let i = 0; i <= input.length; i++) {
          const condition: Condition<number> = (x: number, index: number) => index === i;
          for (const second of seconds) {
            const secondArray: any[] = Array.isArray(second) ? second : [second];
            let atIndex = input.findIndex(condition);
            let expected = input.slice();
            if (atIndex >= 0) expected.splice(atIndex, 0, ...secondArray);

            const secondForLog = (() => {
              const quoted: any[] = secondArray.map(x => typeof x === 'string' ? `'${x}'` : x);
              return Array.isArray(second) ? (`[${quoted}]`) : second === undefined ? 'undefined' : [quoted[0]];
            })();
            const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${input}].insertBefore((x, index) => index === ${i}, ${secondForLog})`;

            let actual = [...sutArray.insertBefore(condition, second)];
            assert.deepEqual(actual, expected, failedMessage(actual));
            actual = [...sutGenerator.insertBefore(condition, second)];
            assert.deepEqual(actual, expected, failedMessage(actual));

            if (Array.isArray(second)) {
              actual = [...sutArray.insertBefore(condition, ...second)];
              assert.deepEqual(actual, expected, failedMessage(actual));
              actual = [...sutArray.insertBefore(condition, generator.from<any>(second))];
              assert.deepEqual(actual, expected, failedMessage(actual));

              actual = [...sutGenerator.insertBefore(condition, ...second)];
              assert.deepEqual(actual, expected, failedMessage(actual));
              actual = [...sutGenerator.insertBefore(condition, generator.from<any>(second))];
              assert.deepEqual(actual, expected, failedMessage(actual));
            }
          }
        }
      });

      it('should not add new items if none of the sources items meets the condition', () => {
        const inputs = [
          array.zeroToNine,
          array.abc,
          array.grades
        ];

        const itemsNotInSource = [
          [-1, -2, -3],
          ['', '1', '-'],
          [{name: Date.now().toString(), grade: -101}]
        ];

        for (let i = 0; i < inputs.length; i++) {
          const expected: any[] = inputs[i];
          const sut = this.createSut<any>(generator.from(expected));
          const actual = sut.insertBefore(() => false, itemsNotInSource[i]);
          assert.deepEqual([...actual], expected)
        }
      });
    });

    describe('insertAfter()', () => {
      it('should insert new items in source sequence immediately after the first item that meets the condition', () => {
        let input = [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1];
        const seconds = [undefined, 0, [-1, -2], []];

        const sutArray = this.createSut<any>(input);
        const sutGenerator = this.createSut(generator.from<any>(input));

        for (let i = 0; i <= input.length; i++) {
          const condition: Condition<number> = (x: number, index: number) => index === i;
          for (const second of seconds) {
            const secondArray: any[] = Array.isArray(second) ? second : [second];
            let atIndex = input.findIndex(condition);
            let expected = input.slice();
            if (atIndex >= 0) expected.splice(atIndex + 1, 0, ...secondArray);

            const secondForLog = (() => {
              const quoted: any[] = secondArray.map(x => typeof x === 'string' ? `'${x}'` : x);
              return Array.isArray(second) ? (`[${quoted}]`) : second === undefined ? 'undefined' : [quoted[0]];
            })();
            const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${input}].insertAfter((x, index) => index === ${i}, ${secondForLog})`;

            let actual = [...sutArray.insertAfter(condition, second)];
            assert.deepEqual(actual, expected, failedMessage(actual));
            actual = [...sutGenerator.insertAfter(condition, second)];
            assert.deepEqual(actual, expected, failedMessage(actual));

            if (Array.isArray(second)) {
              actual = [...sutArray.insertAfter(condition, ...second)];
              assert.deepEqual(actual, expected, failedMessage(actual));
              actual = [...sutArray.insertAfter(condition, generator.from<any>(second))];
              assert.deepEqual(actual, expected, failedMessage(actual));

              actual = [...sutGenerator.insertAfter(condition, ...second)];
              assert.deepEqual(actual, expected, failedMessage(actual));
              actual = [...sutGenerator.insertAfter(condition, generator.from<any>(second))];
              assert.deepEqual(actual, expected, failedMessage(actual));
            }
          }
        }
      });

      it('should not add new items if none of the sources items meets the condition', () => {
        const inputs = [
          array.zeroToNine,
          array.abc,
          array.grades
        ];

        const itemsNotInSource = [
          [-1, -2, -3],
          ['', '1', '-'],
          [{name: Date.now().toString(), grade: -101}]
        ];

        for (let i = 0; i < inputs.length; i++) {
          const expected: any[] = inputs[i];
          const sut = this.createSut<any>(generator.from(expected));
          const actual = sut.insertAfter(() => false, itemsNotInSource[i]);
          assert.deepEqual([...actual], expected)
        }
      });
    });

    describe('intersect()', () => {
      it('should return items that exists in both sequences without duplications', () => {
        const first = array.zeroToNine.concat(array.oneToTen);
        const secondOdds = array.zeroToTen.concat(array.tenOnes).filter(x => x % 2 === 1).reverse();
        const expectedOdds = [1, 3, 5, 7, 9];
        let sut = this.createSut(first);
        let actual = [...sut.intersect(secondOdds)];
        assert.sameMembers(actual, expectedOdds);

        sut = this.createSut(generator.from(first));
        actual = [...sut.intersect(generator.from(secondOdds))];
        assert.sameMembers(actual, expectedOdds);
      });

      it('should return empty sequence if none of items exists in both sequences', () => {
        const first = array.oneToTen;
        const second = array.tenZeros;
        const expected: number[] = [];
        let sut = this.createSut(first);
        let actual = [...sut.intersect(second)];
        assert.sameMembers(actual, expected);

        sut = this.createSut(generator.from(first));
        actual = [...sut.intersect(generator.from(second))];
        assert.sameMembers(actual, expected);
      });

      it('should return empty sequence if one of the sequences is empty', () => {
        let first: number[] = array.oneToTen;
        let second: number[] = [];
        const expected: number[] = [];
        let sut = this.createSut(first);
        let actual = [...sut.intersect(second)];
        assert.sameMembers(actual, expected);

        sut = this.createSut(generator.from(first));
        actual = [...sut.intersect(generator.from(second))];
        assert.sameMembers(actual, expected);

        second = array.oneToTen;
        first = [];
        sut = this.createSut(first);
        actual = [...sut.intersect(second)];
        assert.sameMembers(actual, expected);

        sut = this.createSut(generator.from(first));
        actual = [...sut.intersect(generator.from(second))];
        assert.sameMembers(actual, expected);
      });

      describe('with key-selector', () => {
        it('should return items that exists in both sequences without duplications', () => {
          const first = array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove);
          const second = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow);
          const expected = array.grades.filter(x => x.grade === 50).slice(-1);
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = [...sut.intersect(generator.from(second), x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

        it('should return empty sequence if none of items exists in both sequences', () => {
          const first = array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove).filter(x => x.grade !== 50);
          const second = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).filter(x => x.grade !== 50);
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = [...sut.intersect(generator.from(second), x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

        it('should return empty sequence if one of the sequences is empty', () => {
          let first: { name: string; grade: number }[] = [];
          let second: { name: string; grade: number }[] = array.grades;
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = [...sut.intersect(generator.from(second), x => x.grade)];
          assert.sameDeepMembers(actual, expected);

          second = [];
          first = array.grades;
          sut = this.createSut(first);
          actual = [...sut.intersect(second)];
          assert.sameMembers(actual, expected);

          sut = this.createSut(generator.from(first));
          actual = [...sut.intersect(generator.from(second))];
          assert.sameMembers(actual, expected)
        });
      });
    });

    describe('intersperse()', () => {
      it('should return sequence with separator value between each item from the source sequence', () => {
        const headers = ['name', 'age', 'score', 'date'];
        const separator = '|';
        const expected = ['name', '|', 'age', '|', 'score', '|', 'date'];

        const sut = this.createSut(headers);
        const actual = sut.intersperse(separator);

        assert.sameOrderedMembers([...actual], expected);

        const samples = array.samples;
        const separator2 = new Date();
        const expectedSamples: any[] = [];
        samples.forEach(s => expectedSamples.push(s, separator2));
        expectedSamples.pop();

        const sut2 = this.createSut(samples);
        const actual2 = sut2.intersperse(separator2);

        assert.sameOrderedMembers([...actual2], expectedSamples);
      });

      it('should return sequence with source items between the separator value when insideOut parameter is true', () => {
        const indexes = array.zeroToNine;
        const separator = '|';
        const expected = ['|', 0, '|', 1, '|', 2, '|', 3, '|', 4, '|', 5, '|', 6, '|', 7, '|', 8, '|', 9, '|'];

        const sut = this.createSut(indexes);
        const actual = sut.intersperse(separator, true);

        assert.sameOrderedMembers([...actual], expected);

        const samples = array.samples;
        const separator2 = new Date();
        const expectedSamples: any[] = [separator2];
        samples.forEach(s => expectedSamples.push(s, separator2));

        const sut2 = this.createSut(samples);
        const actual2 = sut2.intersperse(separator2, true);

        assert.sameOrderedMembers([...actual2], expectedSamples);
      });

      it('should return sequence prefixed with a start value and a separator value between each item from the source sequence', () => {
        const indexes = array.zeroToNine;
        const separator = ',';
        const expected = ['[', 0, ',', 1, ',', 2, ',', 3, ',', 4, ',', 5, ',', 6, ',', 7, ',', 8, ',', 9];

        const sut = this.createSut(indexes);
        const actual = sut.intersperse(separator, {prefix: '['});
        assert.sameOrderedMembers([...actual], expected);
      });

      it('should return sequence suffixed with an end value and a separator value between each item from the source sequence', () => {
        const indexes = array.zeroToNine;
        const separator = ',';
        const expected = [0, ',', 1, ',', 2, ',', 3, ',', 4, ',', 5, ',', 6, ',', 7, ',', 8, ',', 9, ']'];

        const sut = this.createSut(indexes);
        const actual = sut.intersperse(separator, {suffix: ']'});
        assert.sameOrderedMembers([...actual], expected);
      });

      it('should return sequence prefixed with a start value and suffixed with an end value and a separator value between each item from the source sequence', () => {
        const indexes = array.zeroToNine;
        const separator = '|';
        const expected = ['[', 0, '|', 1, '|', 2, '|', 3, '|', 4, '|', 5, '|', 6, '|', 7, '|', 8, '|', 9, ']'];

        const sut = this.createSut(indexes);
        const actual = sut.intersperse(separator, {prefix: '[', suffix: ']'});
        assert.sameOrderedMembers([...actual], expected);
      });
    });

    describe("map()", () => {
      it('should return same number of items as the source, converted by map function', () => {
        const input = array.oneToTen;
        const mapFn = (x: number) => x * 2;
        const expected = input.map(mapFn);

        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.map(mapFn)];
        assert.sameOrderedMembers(actual, expected);

        const input2 = array.grades;
        const mapFn2 = (x: { name: string, grade: number }) => x.grade;
        const expected2 = input2.map(mapFn2);
        let sut2 = this.createSut(input2);
        let actual2 = [...sut2.map(mapFn2)];
        assert.sameDeepOrderedMembers(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = [...sut2.map(mapFn2)];
        assert.sameDeepOrderedMembers(actual2, expected2);
      });

      it('when source sequence is empty, should return empty sequence', () => {
        const input: number[] = [];
        const mapFn = (x: number) => x * 2;
        const expected: number[] = [];

        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.sameOrderedMembers(actual, expected);

        sut = this.createSut();
        actual = [...sut.map(mapFn)];
        assert.sameOrderedMembers(actual, expected);
      });

      it("should map to items' index as expected", () => {
        const input = array.grades;
        const mapFn = (x: { name: string, grade: number }, index: number) => index;
        const expected = Array.from({length: input.length}, (v, i) => i);
        let sut = this.createSut(input);
        let actual = [...sut.map(mapFn)];
        assert.sameDeepOrderedMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.map(mapFn)];
        assert.sameDeepOrderedMembers(actual, expected);
      });
    });

    describe('ofType()', () => {
      it('should return filtered sequence with only the values of requested type', () => {
        const input = Array<any>().concat(
          array.oneToTen,
          array.abc,
          [false, true, false, true],
          [Symbol.iterator, Symbol.hasInstance],
          [() => 1, (x: number) => x, (() => void 0)],
          array.truthyValues,
          array.falsyValues,
          array.grades,
          array.folders);

        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));

        const expectedNumber = input.filter(x => typeof x === 'number');
        assert.deepEqual([...sutArray.ofType('number')], expectedNumber);
        assert.deepEqual([...sutGenerator.ofType('number')], expectedNumber);

        const expectedBoolean = input.filter(x => typeof x === 'boolean');
        assert.deepEqual([...sutArray.ofType('boolean')], expectedBoolean);
        assert.deepEqual([...sutGenerator.ofType('boolean')], expectedBoolean);

        const expectedObject = input.filter(x => typeof x === 'object');
        assert.deepEqual([...sutArray.ofType('object')], expectedObject);
        assert.deepEqual([...sutGenerator.ofType('object')], expectedObject);

        const expectedString = input.filter(x => typeof x === 'string');
        assert.deepEqual([...sutArray.ofType('string')], expectedString);
        assert.deepEqual([...sutGenerator.ofType('string')], expectedString);

        const expectedFunction = input.filter(x => typeof x === 'function');
        assert.deepEqual([...sutArray.ofType('function')], expectedFunction);
        assert.deepEqual([...sutGenerator.ofType('function')], expectedFunction);

        const expectedSymbol = input.filter(x => typeof x === 'symbol');
        assert.deepEqual([...sutArray.ofType('symbol')], expectedSymbol);
        assert.deepEqual([...sutGenerator.ofType('symbol')], expectedSymbol);

        assert.deepEqual([...sutArray.ofType(Number)], expectedNumber);
        assert.deepEqual([...sutGenerator.ofType(Number)], expectedNumber);
        assert.deepEqual([...sutArray.ofType(String)], expectedString);
        assert.deepEqual([...sutGenerator.ofType(String)], expectedString);
        assert.deepEqual([...sutArray.ofType(Boolean)], expectedBoolean);
        assert.deepEqual([...sutGenerator.ofType(Boolean)], expectedBoolean);
        assert.deepEqual([...sutArray.ofType(Object)], expectedObject);
        assert.deepEqual([...sutGenerator.ofType(Object)], expectedObject);
        assert.deepEqual([...sutArray.ofType(Symbol)], expectedSymbol);
        assert.deepEqual([...sutGenerator.ofType(Symbol)], expectedSymbol);

        const expectedClass = input.filter(x => x instanceof Folder);
        assert.deepEqual([...sutArray.ofType(Folder)], expectedClass);
        assert.deepEqual([...sutGenerator.ofType(Folder)], expectedClass);

      });

      it('should return empty sequence is non of the values is of the requested type', () => {
        const input = array.abc;
        const expected: any[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.ofType('number')];
        assert.sameMembers(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.ofType('number')];
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
      it('should return new sequence with new items added at the start', () => {
        const input = array.abc;
        const newItem1 = '-';
        const newItem2 = '0';
        const expected = [newItem1, newItem2].concat(input);
        let sut = this.createSut(input);
        let actual = [...sut.prepend(newItem1, newItem2)];
        assert.sameOrderedMembers(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = [...sut.prepend(newItem1, newItem2)];
        assert.sameOrderedMembers(actual, expected);

        const input2 = array.gradesFiftyAndAbove;
        const newItems = array.gradesFiftyAndBelow;
        const expected2 = newItems.concat(input2);

        let sut2 = this.createSut(input2);
        let actual2 = [...sut2.prepend(...newItems)];
        assert.sameDeepOrderedMembers(actual2, expected2);

        actual2 = [...sut2.prepend(newItems)];
        assert.sameDeepOrderedMembers(actual2, expected2);

        sut2 = this.createSut(generator.from(input2));
        actual2 = [...sut2.prepend(...newItems)];
        assert.sameDeepOrderedMembers(actual2, expected2);

        actual2 = [...sut2.prepend(newItems)];
        assert.sameDeepOrderedMembers(actual2, expected2);


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
    });

    describe("push()", () => {
      it('should add several items at the end of the sequence', () => {
        const input = [1, 2, 3, 4, 5];
        const referenceInput = [1, 2, 3, 4, 5];
        const concatWith = [6, 7, 8, 9, 10];
        const expected = input.concat(concatWith);

        const sut = this.createSut(input);
        const actual = [...sut.push(...concatWith)];
        assert.sameOrderedMembers(actual, expected);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = [...sut2.push(...concatWith)];
        assert.sameOrderedMembers(actual2, expected);
        // Verify input not changed
        assert.sameOrderedMembers(input, referenceInput);
      });
      it('should add several Iterable items at the end of the a sequence or Iterables', () => {
        const input = [[1], [2, 2], [3, 3, 3], [4, 4, 4], [5, 5, 5]];
        const referenceInput = input.slice();
        const concatWith = [[6], [7, 7], [8, 8, 8], [9, 9, 9, 9], [10]];
        const expected = input.concat(concatWith);

        const sut = this.createSut(input);
        const actual = [...sut.push(...concatWith)];
        assert.sameDeepOrderedMembers(actual, expected);

        const sut2 = this.createSut(generator.from(input));
        const actual2 = [...sut2.push(...concatWith)];
        assert.sameDeepOrderedMembers(actual2, expected);
        // Verify input not changed
        assert.sameDeepOrderedMembers(input, referenceInput);
      });

      it('should not change the sequence when pushing nothing', () => {
        const input = [1, 2, 3, 4, 5];
        const expected = input.slice();

        const sut = this.createSut(input);
        const actual = [...sut.push()];
        assert.sameOrderedMembers(actual, expected);
        assert.sameOrderedMembers(input, expected);
      });
    });

    describe('remove()', () => {
      it('should remove occurrences of items from the source sequence that exists on the seconds sequence, the same number of time they exists in the second sequence', () => {
        const input = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5];
        const toRemove = [0, 0, 2, 2, 4, 4, 6, 6, 5, 5, 3, 3, 1, 1];
        const expected = [3, 4, 4, 5, 5, 5];
        const sut = this.createSut(generator.from(input));

        let actual = sut.remove(toRemove);
        assert.sameOrderedMembers([...actual], expected);

        actual = sut.remove(generator.from(toRemove));
        assert.sameOrderedMembers([...actual], expected);

        actual = sut.remove(asSeq(toRemove));
        assert.sameOrderedMembers([...actual], expected);
      });

      it('should remove occurrences of items from the source sequence that exists on the seconds sequence according to key-selector, the same number of time they exists in the second sequence', () => {
        const input = [
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
        ];
        const toRemove = [
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
        ];
        const expected = [
          {x: 3, y: 3},
          {x: 4, y: 4},
          {x: 4, y: 4},
          {x: 5, y: 5},
          {x: 5, y: 5},
          {x: 5, y: 5}
        ];

        const keySelector = (point: { x: number; y: number; }) => point.x + point.y * 1000;
        const sut = this.createSut(generator.from(input));

        let actual = sut.remove(toRemove, keySelector);
        assert.deepEqual([...actual], expected);

        actual = sut.remove(generator.from(toRemove), keySelector);
        assert.deepEqual([...actual], expected);

        actual = sut.remove(asSeq(toRemove), keySelector);
        assert.deepEqual([...actual], expected);
      });
    });

    describe('removeAll()', () => {
      it('should remove all occurrences of items from the source sequence that exists on the seconds sequence', () => {
        const input = array.abc;
        const sentenceToRemove = 'Expected to be Removed';
        const expected = input.filter(ch => !sentenceToRemove.includes(ch));

        const sut = this.createSut(input);
        const actual = sut.removeAll(sentenceToRemove);

        assert.sameOrderedMembers([...actual], expected)
      });

      it('should remove all occurrences of items from the source sequence that exists on the seconds sequence according to key-selector', () => {
        const input = array.samples;
        const toRemove = array.samples.filter(s => s.type === 'A');
        const expected = input.filter(s => toRemove.findIndex(r => r.type === s.type) < 0);

        const sut = this.createSut(input);
        const actual = sut.removeAll(toRemove, sample => sample.type);

        assert.sameOrderedMembers([...actual], expected)
      });
    });

    describe('removeFalsy()', () => {
      it('should return a new sequence without falsy values', () => {
        const input = array.truthyValues.concat(array.falsyValues);
        const expected = array.truthyValues;
        let sut = this.createSut(input);
        let actual = [...sut.removeFalsy()];
        assert.deepEqual(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = [...sut.removeFalsy()];
        assert.deepEqual(actual, expected);
      });
    });

    describe('removeNulls()', () => {
      it('should return a new sequence without null and undefined values', () => {
        const input = array.truthyValues.concat(array.falsyValues);
        const expected = input.filter(x => x != null);
        let sut = this.createSut(input);
        let actual = [...sut.removeNulls()];
        assert.deepEqual(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = [...sut.removeNulls()];
        assert.deepEqual(actual, expected);
      });
    });

    describe('repeat()', () => {
      it('should return new sequence with original sequence concatenated to itself the requested number of times', () => {
        const input = array.oneToTen;
        const count = 5;
        const expected = input.concat(input, input, input, input);
        let sut = this.createSut(input);
        let actual = [...sut.repeat(count)];
        assert.deepEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.repeat(count)];
        assert.deepEqual(actual, expected);
      });

      it('should throw exception if count is not positive', () => {
        assert.throw(() => this.createSut().repeat(0));
        assert.throw(() => this.createSut().repeat(-1));
      });

      describe('manipulate', () => {
        it('should apply manipulation function on', () => {

        });
      });
    });

    describe('reverse()', () => {
      it('should return sequence in reverse order', () => {
        const input = array.range(-50, 50);
        const expected = input.slice().reverse();
        let sut = this.createSut(input);
        let actual = [...sut.reverse()];
        assert.deepEqual(actual, expected);
        sut = this.createSut(generator.from(input));
        actual = [...sut.reverse()];
        assert.deepEqual(actual, expected);

        sut = this.createSut(input.slice().reverse());
        actual = [...sut.reverse()];
        assert.deepEqual(actual, expected.slice().reverse());
        sut = this.createSut(input.slice().reverse());
        actual = [...sut.reverse()];
        assert.deepEqual(actual, expected.slice().reverse());
      });
    });

    describe("skip()", () => {
      it("Return rest of items when skipping only part of the items", () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        const greaterThanZeroLessThenNumberOfItems = 7;
        const expected = array.oneToTen.slice(greaterThanZeroLessThenNumberOfItems);
        const actual = [...sut.skip(greaterThanZeroLessThenNumberOfItems)];
        assert.sameOrderedMembers(actual, expected);

        // Using generator as source
        const sut2 = this.createSut(generator.from(array.oneToTen));
        const actual2 = [...sut2.skip(greaterThanZeroLessThenNumberOfItems)];
        assert.sameOrderedMembers(actual2, expected);

        assert.sameOrderedMembers(input, array.oneToTen);
      });

      it("Return all items when skipping zero items", () => {
        const sut = this.createSut(array.oneToTen);
        const expected = array.oneToTen.slice();
        const actual = [...sut.skip(0)];
        assert.sameOrderedMembers(actual, expected);

        // Using generator as source
        const sut2 = this.createSut(generator.from(array.oneToTen));
        const actual2 = [...sut2.skip(0)];
        assert.sameOrderedMembers(actual2, expected);
      });

      it("Return same instance when skipping zero items", () => {
        const sut = this.createSut(array.oneToTen);
        const expected = array.oneToTen.slice();
        const actual = [...sut.skip(0)];
        assert.sameOrderedMembers(actual, expected);

        // Using generator as source
        const sut2 = this.createSut(generator.from(array.oneToTen));
        const actual2 = [...sut2.skip(0)];
        assert.sameOrderedMembers(actual2, expected);
      });

      it("Return empty sequence when skipping all items", () => {
        const sut = this.createSut(array.oneToTen);
        const expected: number[] = [];
        const actual = [...sut.skip(array.oneToTen.length)];
        assert.sameOrderedMembers(actual, expected);

        // Using generator as source
        const sut2 = this.createSut(generator.from(array.oneToTen));
        const actual2 = [...sut2.skip(array.oneToTen.length)];
        assert.sameOrderedMembers(actual2, expected);
      });

      it("Return empty sequence when skipping more then existing items", () => {
        const moreThanExistingItems = array.oneToTen.length + 1;
        const sut = this.createSut(array.oneToTen);
        const expected: number[] = [];
        const actual = [...sut.skip(moreThanExistingItems)];
        assert.sameOrderedMembers(actual, expected);

        // Using generator as source
        const sut2 = this.createSut(generator.from(array.oneToTen));
        const actual2 = [...sut2.skip(moreThanExistingItems)];
        assert.sameOrderedMembers(actual2, expected);
      });

      it('should behave like Array.slice(0, count) also when count is negative', () => {
        const input = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        for (let skip = -input.length - 1; skip < input.length + 1; skip++) {
          for (let take = -input.length - 1; take <= input.length + 1; take++) {
            const expected = input.slice(skip);
            let actual = [...sutArray.skip(skip)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
            actual = [...sutGenerator.skip(skip)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
          }
        }
      });
    });

    describe('skipFirst()', () => {
      it('should skip first item in a sequence', () => {
        const input = array.zeroToTen;
        const expected = array.oneToTen;
        let sut = this.createSut(input);
        let actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);
      });

      it('should return empty sequence if only one item in source sequence', () => {
        const input = [1];
        const expected: number[] = [];
        let sut = this.createSut(input);
        let actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.skipFirst()];
        assert.deepEqual(actual, expected);
      });

      it('should return empty sequence is source sequence is empty', () => {

      });
    });

    describe('skipLast()', () => {
      it('should return new sequence without last skipped items', () => {
        const input = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        for (let count = 0; count < input.length + 1; count++) {
          const expected = input.slice(0, -count);
          let actual = [...sutArray.skipLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].skipLast(${count})`);
          actual = [...sutGenerator.skipLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].skipLast(${count})`);
        }
      });

      it('should return empty sequence is count is negative', () => {
        assert.sameOrderedMembers([...this.createSut().skipLast(-1)], []);
      });
    });

    describe("skipWhile()", () => {
      it("Return empty sequence when condition always met", () => {
        const expected: number[] = [];
        const alwaysTrueCondition = () => true;

        const sut = this.createSut(array.oneToTen);

        const actual = [...sut.skipWhile(alwaysTrueCondition)];

        assert.sameOrderedMembers(actual, expected);
      });

      it("Return empty sequence when source sequence is already empty", () => {
        const expected: number[] = [];
        const alwaysFalseCondition = () => false;

        const sut = this.createSut();

        const actual = [...sut.skipWhile(alwaysFalseCondition)];

        assert.sameOrderedMembers(actual, expected);
      });

      it('should return sub sequence from one item after condition no longer met, till end of sequence', () => {
        const input = array.oneToTen.concat(array.oneToTen);
        const expected = input.slice(5);
        let sut = this.createSut(input);
        let actual = [...sut.skipWhile(x => x <= 5)];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('slice()', () => {
      it('should return a section from the sequence according to start index and count', () => {
        const input = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        for (let skip = -input.length - 1; skip < input.length + 1; skip++) {
          for (let take = -input.length - 1; take <= input.length + 1; take++) {
            const expected = input.slice(skip, take);
            let actual = [...sutArray.slice(skip, take)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
            actual = [...sutGenerator.slice(skip, take)];
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

      // TODO:
      describe('by condition', () => {
        it('should return two sequences, first one with items while the condition met and the second with the rest', () => {
          const input = array.oneToTen;
          const expected = [input.filter(n => n < 5), input.filter(n => n >= 5)];
          const sut = this.createSut(input);
          const split = sut.split(n => n < 5);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(actual, expected);
        });

        it('should return first sequence with all items and second empty, if all items match a condition', () => {
          const input = array.oneToTen;
          const expected = [input.filter(n => n > 0), []];
          const sut = this.createSut(input);
          const split = sut.split(n => n > 0);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(actual, expected);
        });

        it('should return first sequence empty and second with all items, if none of the items match a condition', () => {
          const input = array.oneToTen;
          const expected = [[], input.filter(n => n > 0)];
          const sut = this.createSut(input);
          const split = sut.split(() => false);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(actual, expected);
        });
      });
    });

    describe('take()', () => {
      it('should behave like Array.slice(0, count) also when count is negative', () => {
        const input = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        for (let skip = -input.length - 1; skip < input.length + 1; skip++) {
          for (let take = -input.length - 1; take <= input.length + 1; take++) {
            const expected = input.slice(0, take);
            let actual = [...sutArray.take(take)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
            actual = [...sutGenerator.take(take)];
            assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip},${take})`);
          }
        }

      });
    });

    describe('takeLast()', () => {
      it('should return new sequence only with last N items', () => {
        const input = array.oneToTen;
        const sutArray = this.createSut(input);
        const sutGenerator = this.createSut(generator.from(input));
        for (let count = 1; count < input.length + 1; count++) {
          const expected = input.slice(-count);
          let actual = [...sutArray.takeLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].takeLast(${count})`);
          actual = [...sutGenerator.takeLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].takeLast(${count})`);
        }
      });

      it('should return empty sequence is count non positive', () => {
        assert.sameOrderedMembers([...this.createSut().takeLast(0)], []);
        assert.sameOrderedMembers([...this.createSut().takeLast(-1)], []);
      });
    });

    describe('takeWhile()', () => {
      it("Return empty sequence when condition never met", () => {
        const expected: number[] = [];
        const alwaysFalseCondition = () => false;

        const sut = this.createSut(array.oneToTen);

        const actual = [...sut.takeWhile(alwaysFalseCondition)];

        assert.sameOrderedMembers(actual, expected);
      });

      it("Return empty sequence when source sequence is empty", () => {
        const expected: number[] = [];
        const alwaysTrueCondition = () => false;

        const sut = this.createSut();

        const actual = [...sut.takeWhile(alwaysTrueCondition)];

        assert.sameOrderedMembers(actual, expected);
      });


      it('should return sub sequence from beginning of source sequence up to the one item before condition no longer met', () => {
        const input = array.oneToTen.concat(array.oneToTen);
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
      it('should call callback for each item in source sequence with correct index', () => {
        const expected = array.zeroToNine;
        const actual: number[] = [];

        const sut = this.createSut(expected);
        const tapped = sut.tap((item, index) => actual.push(index));
        for (const item of tapped) {
        }
        assert.deepEqual(actual, expected)
      });
      it('should produce same results before and after tap', () => {
        const input = array.oneToTen;
        const sut = this.createSut(input);
        const tapped = sut.tap(() => false);
        const actual = [...tapped];
        const expected = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should call provided callback for each item', () => {
        const expected = array.oneToTen;
        const sut = this.createSut(expected);
        const actual: number[] = [];
        const tapped = sut.tap(item => actual.push(item));
        for (const item of tapped) {
        }
        assert.sameOrderedMembers(actual, expected);
      });

      it('should call all callbacks in order when tap called several times', () => {
        const expected = array.oneToTen;
        const sut = this.createSut(expected);
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

      it('should use provided `this` argument with callback', () => {
        const expected = array.oneToTen;
        const actual = new class {
          items: number[] = [];

          add(value: number): void {
            this.items.push(value);
          }
        };

        const sut = this.createSut(expected);

        const tapped = sut.tap(actual.add, actual);
        for (const item of tapped) {
        }
        assert.sameOrderedMembers(actual.items, expected);
      });
    });

    describe('transform', () => {
      it('should replace sequence with concatenated filters of it', () => {
        const transformer = (seq: Seq<number>) => seq.filter(x => x % 2 === 0).concat(
          seq.filter(x => x % 2),
          seq.filter(x => x >= 5)
        );

        const input = array.oneToTen;
        let sut = this.createSut(input);
        let expected = transformer(asSeq(input));
        let actual = sut.transform(transformer);

        assert.sameOrderedMembers(actual.toArray(), expected.toArray());
      });

      it('should not replace when transform return the sequence itself', () => {
        const transformer = (seq: Seq<number>) => seq;

        const input = array.oneToTen;
        let sut = this.createSut(input);
        let actual = sut.transform(transformer);

        assert.strictEqual(actual, sut);
      });
    });

    describe('union()', () => {
      it('should return a sequence with distinct items from both sequences', () => {
        const input = array.zeroToNine;
        const input2 = array.oneToTen;

        const expected = [...new Set(input.concat(input2))];
        const sut = this.createSut(generator.from(input));

        let actual = [...sut.union(input2)];
        assert.deepEqual(actual, expected);

        actual = [...sut.union(generator.from(input2))];
        assert.deepEqual(actual, expected);

        actual = [...sut.union(this.createSut(input2))];
        assert.deepEqual(actual, expected);

        const expected2 = [...new Set(input.concat(input))];
        actual = [...sut.union(sut)];
        assert.deepEqual(actual, expected2);
      });

      it('should return a sequence with distinct items from both sequences according to a key-selector', () => {
        const input = array.gradesFiftyAndAbove;
        const input2 = array.gradesFiftyAndAbove;
        const union = input.concat(input2);

        const keySelector = (grade: { name: string; grade: number; }) => grade.name;
        const map = new Map<string, { name: string; grade: number; }>();
        union.concat(input2).forEach((grade) => map.set(keySelector(grade), grade));
        const expected = union.filter((x) => map.delete(keySelector(x)));

        const sut = this.createSut(generator.from(input));

        let actual = [...sut.union(input2, keySelector)];
        assert.deepEqual(actual, expected);

        actual = [...sut.union(generator.from(input2), keySelector)];
        assert.deepEqual(actual, expected);

        actual = [...sut.union(this.createSut(input2), keySelector)];
        assert.deepEqual(actual, expected);

        const expected2 = [...new Set(input.concat(input))];
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
      it('should pair all items, each with its index in the sequence', () => {
        const input = array.abc;
        const expected = input.slice().map((x, i) => [x, i]);

        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex()];
        assert.deepEqual(actual, expected);

        sut = this.createSut(generator.from(input));
        actual = [...sut.zipWithIndex()];
        assert.deepEqual(actual, expected);
      });

      it('when source sequence is empty, should return empty sequence', () => {
        const input: number[] = [];

        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex()];
        assert.isEmpty(actual);

        sut = this.createSut(generator.from(input));
        actual = [...sut.zipWithIndex()];
        assert.isEmpty(actual);

        sut = this.createSut();
        actual = [...sut.zipWithIndex()];
        assert.isEmpty(actual);
      });
    });

  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}
