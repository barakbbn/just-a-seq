import {describe, it} from "mocha";
import {Condition, Seq} from "../../lib";
import {assert} from "chai";
import {array, Folder, generator, Sample} from "../test-data";
import {TestHarness, TestIt} from "../test-harness";

export abstract class SeqBase_Deferred_Tests extends TestIt {
  constructor(optimized: boolean) {
    super(optimized);
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
        const sut = this.createSut<number>();
        const actual = sut.as<number>();

        assert.strictEqual(actual, sut);
      });
    });

    describe('asSeq()', () => {
      it('should create new instance of sequence', () => {
        const sut = this.createSut();
        const actual = sut.asSeq();
        assert.notEqual(actual, sut);
      });

      this.it1('should produce same results as before', array.oneToTen, input => {
        const sut = this.createSut(input);
        const seq = sut.asSeq();
        const expected = [...sut];
        const actual = [...seq];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('cartesian', () => {
      this.itx('should return all possible permutations for source sequences',
        [1, 2, 3], [[2, 3, 4], [3, 4, 5]], (input, others) => {

          const expected = [
            [1, 2, 3], [1, 2, 4], [1, 2, 5],
            [1, 3, 3], [1, 3, 4], [1, 3, 5],
            [1, 4, 3], [1, 4, 4], [1, 4, 5],

            [2, 2, 3], [2, 2, 4], [2, 2, 5],
            [2, 3, 3], [2, 3, 4], [2, 3, 5],
            [2, 4, 3], [2, 4, 4], [2, 4, 5],

            [3, 2, 3], [3, 2, 4], [3, 2, 5],
            [3, 3, 3], [3, 3, 4], [3, 3, 5],
            [3, 4, 3], [3, 4, 4], [3, 4, 5],
          ];

          const sut = this.createSut(input).cartesian(...others);

          const actual = [...sut].map(x => [...x]);

          assert.deepEqual(actual, expected);
        });

      this.it1('should return all possible permutations for source sequences, when all sources are same instance',
        [1, 2, 3], (input) => {
          const expected = [
            [1, 1, 1], [1, 1, 2], [1, 1, 3],
            [1, 2, 1], [1, 2, 2], [1, 2, 3],
            [1, 3, 1], [1, 3, 2], [1, 3, 3],

            [2, 1, 1], [2, 1, 2], [2, 1, 3],
            [2, 2, 1], [2, 2, 2], [2, 2, 3],
            [2, 3, 1], [2, 3, 2], [2, 3, 3],

            [3, 1, 1], [3, 1, 2], [3, 1, 3],
            [3, 2, 1], [3, 2, 2], [3, 2, 3],
            [3, 3, 1], [3, 3, 2], [3, 3, 3],
          ];

          const sut = this.createSut(input).cartesian(input, input);

          const actual = [...sut].map(x => [...x]);

          assert.deepEqual(actual, expected);
        });

      this.itx('should return empty sequence when at least one source sequences is empty',
        [1, 2, 3], [[] as number[], [3, 4, 5]], (input, others) => {
          const sut = this.createSut(input).cartesian(...others);

          const actual = [...sut].map(x => [...x]);

          assert.isEmpty(actual);
        });

      this.it1('should return each item from source sequence as separate permutation when no sources provided as parameter',
        [1,2,3], (input, inputArray) =>{
          const expected = inputArray.map(x => [x]);
          const sut = this.createSut(input).cartesian();

          const actual = [...sut].map(x => [...x]);

          assert.deepEqual(actual, expected);
        });
    });

    describe("chunk()", () => {
      const testRangeOfChunkSizes = <T>(input: Iterable<T>, inputArray: readonly T[], consumeOuterSequenceFirst: boolean) => {
        const sut = this.createSut(input);

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
          assert.strictEqual(actualChunksCount, expected.length);
        }
      };

      this.it1('should return inner sequences each with number of items as the chunk size and last one with remaining items',
        array.oneToTen, (input, inputArray) => {
          testRangeOfChunkSizes(input, inputArray, false);
          testRangeOfChunkSizes(input, inputArray, true);
        });

      this.it1('should not consume all chunks when iterating one chunk at a time',
        array.grades, input => {

          const sut = TestHarness.monitorIteration(this.createSut(input).chunk(2));

          for (const chunk of sut) {
            assert.isFalse(TestHarness.$$consumed(sut));
            assert.isFalse(TestHarness.$$getIteratorInvoked(chunk));
            assert.isFalse(TestHarness.$$yielded(chunk));

            for (const item of chunk) {
              assert.isFalse(TestHarness.$$consumed(chunk));
            }
          }
        });

      this.it1('should throw when chunk size is not positive', array.oneToTen, input => {
        assert.throw(() => this.createSut(input).chunk(0));
      });

      this.it1('should return 1 inner sequence with all items when chunk size equals or greater than number of existing items',
        array.oneToTen, (input, inputArray) => {
          const sut = this.createSut(input);
          const expected = inputArray.slice();
          let chunkSize = expected.length;
          let actual = [...sut.chunk(chunkSize)];

          assert.lengthOf(actual, 1);
          let actualInner = [...actual[0]];
          assert.sameOrderedMembers(actualInner, expected);

          chunkSize = expected.length * 2;
          actual = [...sut.chunk(chunkSize)];
          assert.lengthOf(actual, 1);
          actualInner = [...actual[0]];
          assert.sameOrderedMembers(actualInner, expected);
        });

      this.it1('should be able to iterate child chunked-sequence after main sequence closed',
        array.oneToTen, (input, inputArray) => {
          const expected = inputArray.slice().splice(0, 2);
          const sut = this.createSut(input).chunk(2);
          let [firstChunk] = sut; // will take first child chunked-sequence and close the iterator returned by sut
          const actual = [...firstChunk];
          assert.deepEqual(actual, expected);
        });

      describe('with maxChunks', () => {
        this.it1('should return number of chunks as specified in maxChunks', array.oneToTen, input => {
          const maxChunks = 3;
          const sut = this.createSut(input).chunk(1, maxChunks);
          const actual = [...sut];
          assert.lengthOf(actual, maxChunks);
        });
        this.it1('should return less chunks than maxChunks, if not enough items', array.oneToTen,
          (input, inputArray) => {
            const maxChunks = 3;
            const expected = 1;
            const sut = this.createSut(input).chunk(inputArray.length, maxChunks);
            const actual = [...sut];
            assert.lengthOf(actual, expected);
          });
        this.it1('should return empty sequence if maxChunks not positive', array.oneToTen, input => {
          const sut = this.createSut(input).chunk(1, 0);
          const actual = [...sut];
          assert.isEmpty(actual);
        });
      });
    });

    describe('chunkBy()', () => {
      this.it1('should create expected number of chunks with expected items in each',
        array.grades, (input, inputArray) => {
          const expected: { name: string; grade: number; }[][] = [
            [inputArray[0], inputArray[1], inputArray[2]],
            [inputArray[3], inputArray[4], inputArray[5]],
            [inputArray[6], inputArray[7]],
            [inputArray[8], inputArray[9]],
            [inputArray[10]]
          ];
          //chunk every 3 items, when absolute item index is greater than 5, move item to next chunk
          const createSut = () => this.createSut(input).chunkBy(info => ({
            endOfChunk: info.itemNumber % 3 === 0,
            whatAboutTheItem: info.index <= 5 || info.itemNumber === 1? 'KeepIt': 'MoveToNextChunk',
            userData: info.item.grade
          }));

          for (const outerFirst of [false, true]) {
            let actual: Iterable<Iterable<{ name: string; grade: number; }>> = createSut();
            if (outerFirst) actual = [...actual];

            let chunkIndex = 0;
            for (const actualChunk of actual) {
              const expectedChunk = expected[chunkIndex++];
              let itemIndex = 0;
              for (const actualItem of actualChunk) assert.strictEqual(actualItem, expectedChunk[itemIndex++]);
              assert.sameOrderedMembers([...actualChunk], expectedChunk);
            }
          }
        });

      this.it1('should not consume all chunks when iterating one chunk at a time',
        array.grades, input => {

          const sut = TestHarness.monitorIteration(this.createSut(input)
            .chunkBy(itemInfo => ({endOfChunk: itemInfo.itemNumber === 3})));

          for (const chunk of sut) {
            assert.isFalse(TestHarness.$$consumed(sut));
            assert.isFalse(TestHarness.$$getIteratorInvoked(chunk));
            assert.isFalse(TestHarness.$$yielded(chunk));

            for (const item of chunk) {
              assert.isFalse(TestHarness.$$consumed(chunk));
            }
          }
        });

      this.it1('should return empty sequence if source sequence is empty', [], input => {
        const sut = this.createSut(input).chunkBy(() => ({endOfChunk: true}));
        const actual = [...sut].map(x => [...x]);
        assert.isEmpty(actual);
      });

      this.it1('should create only one chunk if never calling endChunk method',
        array.grades, (input, inputArray) => {
          const sut = this.createSut(input).chunkBy(() => ({}));
          const expected = [inputArray.slice()];
          const actual = [...sut].map(x => [...x]);
          assert.sameDeepOrderedMembers(actual, expected);
        });

      this.it1('should call splitLogic function with correct arguments values',
        array.grades, (input, inputArray) => {

          const expected = [ //chunk every 3 items, when absolute item index is greater than 5, move item to next chunk
            {item: inputArray[0], index: 0, itemNumber: 1, chunkNumber: 1, userData: undefined},
            {item: inputArray[1], index: 1, itemNumber: 2, chunkNumber: 1, userData: inputArray[0].grade},
            {item: inputArray[2], index: 2, itemNumber: 3, chunkNumber: 1, userData: inputArray[1].grade},

            {item: inputArray[3], index: 3, itemNumber: 1, chunkNumber: 2, userData: -1},
            {item: inputArray[4], index: 4, itemNumber: 2, chunkNumber: 2, userData: inputArray[3].grade},
            {item: inputArray[5], index: 5, itemNumber: 3, chunkNumber: 2, userData: inputArray[4].grade},

            {item: inputArray[6], index: 6, itemNumber: 1, chunkNumber: 3, userData: -1},
            {item: inputArray[7], index: 7, itemNumber: 2, chunkNumber: 3, userData: inputArray[6].grade},
            {item: inputArray[8], index: 8, itemNumber: 3, chunkNumber: 3, userData: inputArray[7].grade},

            {item: inputArray[8], index: 8, itemNumber: 1, chunkNumber: 4, userData: -1},
            {item: inputArray[9], index: 9, itemNumber: 2, chunkNumber: 4, userData: inputArray[8].grade},
            {item: inputArray[10], index: 10, itemNumber: 3, chunkNumber: 4, userData: inputArray[9].grade},

            {item: inputArray[10], index: 10, itemNumber: 1, chunkNumber: 5, userData: -1}
          ];

          const actual: unknown[] = [];
          const sut = this.createSut(input).chunkBy(info => {
            const {item, index, itemNumber, chunkNumber, userData} = info;
            actual.push({item, index, itemNumber, chunkNumber, userData});
            const endOfChunk = info.itemNumber % 3 === 0;
            return {
              endOfChunk,
              whatAboutTheItem: info.index <= 5 || info.itemNumber === 1? 'KeepIt': 'MoveToNextChunk',
              userData: endOfChunk? -1: info.item.grade
            };
          });

          TestHarness.materialize(sut);
          assert.sameDeepOrderedMembers(actual, expected);
        });

      this.it1('should stop creating more chunks after calling endChunk with isLastCheck=true',
        array.grades, input => {
          const sut = this.createSut(input);
          for (let maxChunks = 1; maxChunks < 3; maxChunks++) {
            const chunkBy = sut.chunkBy(info => ({

              isLastChunk: info.chunkNumber === maxChunks,
              endOfChunk: true
            }));

            const actual = [...chunkBy];
            assert.lengthOf(actual, maxChunks);
          }
        });

      this.it1('should create new chunks until shouldStartNewChunk function returns false',
        array.grades, input => {

          const sut = this.createSut(input);
          for (let maxChunks = 0; maxChunks < 3; maxChunks++) {
            const chunkBy = sut.chunkBy(() => ({endOfChunk: true}),
              info => info.chunkNumber <= maxChunks);

            const actual = [...chunkBy];
            assert.lengthOf(actual, maxChunks);
          }
        });


      this.it1('should call shouldStartNewChunk function with correct arguments values',
        array.grades, (input, inputArray) => {

          const expected = inputArray.map((item, i) => ({
            chunkNumber: i + 1, processedItemsCount: i, userData: inputArray[i - 1]?.grade
          }));

          const actual: unknown[] = [];
          const sut = this.createSut(input).chunkBy(info => ({
            endOfChunk: true,
            userData: info.item.grade
          }), info => {
            actual.push({...info});
            return true;
          });

          TestHarness.materialize(sut);
          assert.sameDeepOrderedMembers(actual, expected);
        });

    });

    describe('chunkByLimit()', () => {
      this.it1('should split number sequence into each chunk, numbers having their total sum less or equals the limit',
        [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3], input => {
          const LIMIT = 6;
          const expected: number[][] = [
            [0, 0, 0, 1, 1, 1, 2],
            [2, 2],
            [3, 3],
            [3]
          ];

          const sut = this.createSut(input).chunkByLimit(LIMIT);
          const actual = [...sut].map(x => [...x]);
          assert.deepEqual(actual, expected);
        });

      this.it1('should split into each chunk, items having their total sum less or equals the limit',
        array.samples, (input, inputArray) => {
          const LIMIT = 150;
          const expected: Sample[][] = [
            inputArray.slice(0, 4), // 50 + 5 + 0 + 0 (?100) = 55
            inputArray.slice(4, 6), // 100 + 50 = 150
            inputArray.slice(6, 9), // 0 + 0 + 100 (?100) = 100
            inputArray.slice(9, 11), // 100 + 50 = 150
            inputArray.slice(11, 15), // 0 + 100 + 20 + 20 (?20) = 140
            inputArray.slice(15) // 20
          ];

          const createSut = () => this.createSut(input).chunkByLimit(LIMIT, sample => sample.score);
          for (const outerFirst of [false, true]) {
            let actual: Iterable<Iterable<Sample>> = createSut();
            if (outerFirst) actual = [...actual];

            let chunkIndex = 0;
            for (const actualChunk of actual) {
              const expectedChunk = expected[chunkIndex++];
              let itemIndex = 0;
              for (const actualItem of actualChunk) assert.strictEqual(actualItem, expectedChunk[itemIndex++]);
              assert.sameOrderedMembers([...actualChunk], expectedChunk);
            }
          }
        });

      this.it1('should return empty sequence if source sequence is empty', [], input => {
        const sut = this.createSut(input).chunkByLimit(0);
        const actual = [...sut].map(x => [...x]);
        assert.isEmpty(actual);
      });

      describe('with maxItemsInChunk', () => {

        this.it1('should split number sequence into each chunk, numbers having their total sum less or equals the limit and no more than specified max items in chunk',
          [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3], input => {
            const LIMIT = 6;
            const MAX = 4;
            const expected: number[][] = [
              [0, 0, 0, 1],
              [1, 1, 2, 2],
              [2, 3],
              [3, 3]
            ];

            const sut = this.createSut(input).chunkByLimit(LIMIT, {maxItemsInChunk: MAX});
            const actual = [...sut].map(x => [...x]);
            assert.deepEqual(actual, expected);
          });

        this.it1('should split into each chunk, items having their total sum less or equals the limit',
          array.samples, (input, inputArray) => {
            const LIMIT = 150;
            const MAX = 3;
            const expected: Sample[][] = [
              inputArray.slice(0, 3), // 50 + 5 + 0  -> |3|
              inputArray.slice(3, 6), // 0 + 100 + 50 = 150 -> |3|
              inputArray.slice(6, 9), // 0 + 0 + 100 -> |3|
              inputArray.slice(9, 11), // 100 + 50 = 150
              inputArray.slice(11, 14), // 0 + 100 + 20 -> |3|
              inputArray.slice(14) // 20 + 20 -> END
            ];

            const createSut = () => this.createSut(input).chunkByLimit(LIMIT, sample => sample.score, {maxItemsInChunk: MAX});
            for (const outerFirst of [false, true]) {
              let actual: Iterable<Iterable<Sample>> = createSut();
              if (outerFirst) actual = [...actual];

              let chunkIndex = 0;
              for (const actualChunk of actual) {
                const expectedChunk = expected[chunkIndex++];
                let itemIndex = 0;
                for (const actualItem of actualChunk) assert.strictEqual(actualItem, expectedChunk[itemIndex++]);
                assert.sameOrderedMembers([...actualChunk], expectedChunk);
              }
            }
          });

        this.it1('should return empty sequence if source sequence is empty', [], input => {
          const sut = this.createSut(input).chunkByLimit(0, {maxItemsInChunk: 1});
          const actual = [...sut].map(x => [...x]);
          assert.isEmpty(actual);
        });

        this.it1('should throw when maxItemsInChunk is not positive', [], input => {
          assert.throw(() => this.createSut(input).chunkByLimit(0, {maxItemsInChunk: 0}));
        });
      });

      describe('with maxChunks', () => {
        this.it1('should return number of chunks as specified in maxChunks', array.oneToTen, input => {
          const maxChunks = 3;
          const sut = this.createSut(input).chunkByLimit(10, {maxChunks});
          const actual = [...sut];
          assert.lengthOf(actual, maxChunks);
        });

        this.it1('should return less chunks than maxChunks, if not enough items', array.oneToTen,
          (input, inputArray) => {
            const moreChunksThenPossible = inputArray.length * 2;
            const expected = 1;
            const sut = this.createSut(input).chunkByLimit(Number.MAX_SAFE_INTEGER, {maxChunks: moreChunksThenPossible});
            const actual = [...sut];
            assert.lengthOf(actual, expected);
          });

        this.it1('should return empty sequence if maxChunks not positive', array.oneToTen, input => {
          const sut = this.createSut(input).chunkByLimit(10, {maxChunks: 0});
          const actual = [...sut];
          assert.isEmpty(actual);
        });
      });

    });

    describe("concat$()", () => {
      this.itx('should append one or more sequences at the end of the target sequence',
        [1, 2],
        [[3, 4], [5, 6], [7, 8, 9, 10]],
        (input, others) => {
          let sut = this.createSut(input);
          const expected = array.oneToTen;
          let actual = [...sut.concat$(...others)];
          assert.sameOrderedMembers(actual, expected);
        });

      this.it1('should concat sequence to itself', [1, 2], input => {
        let sut = this.createSut(input);
        const expected = [1, 2].concat([1, 2]);

        let actual = [...sut.concat$(sut)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should have no effect when concatenating empty sequences', [1, 2], input => {
        const sut = this.createSut(input);
        const expected = [...input];
        let actual = [...sut.concat$([], [], [])];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should concat non iterables items as is', array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const expected = [...input].concat(...input);
        const actual = [...sut.concat$(...input)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should concat non iterables items together with iterables items', array.oneToTen, (input) => {
        const sut = this.createSut(input);
        const expected = [...input].concat(0, 0, 0, ...input, 0, 0, 0);
        const actual = [...sut.concat$(0, 0, 0, ...input, 0, 0, 0)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return new sequence with same items, when no parameter is provided', [1, 2], input => {
        const sut = this.createSut(input);
        const actual = sut.concat$();
        assert.notEqual(actual, sut);
        assert.sameDeepMembers([...actual], [...sut]);
      });
    });

    describe("concat()", () => {
      this.itx('should append one or more sequences at the end of the target sequence',
        [1, 2],
        [[3, 4], [5, 6], [7, 8, 9, 10]],
        (input, others) => {
          let sut = this.createSut(input);
          const expected = array.oneToTen;
          let actual = [...sut.concat(...others)];
          assert.sameOrderedMembers(actual, expected);
        });

      this.it1('should concat sequence with itself', [1, 2], (input, inputArray) => {
        let sut = this.createSut(input);
        const expected = inputArray.concat(inputArray);

        let actual = [...sut.concat$(sut)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should have no effect when concatenating empty sequences', [1, 2], (input, inputArray) => {
        let sut = this.createSut(input);
        const expected = inputArray.slice();
        let actual = [...sut.concat([], [], [])];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return itself when no parameter is provided', [1, 2], input => {
        const sut = this.createSut(input);
        const actual = sut.concat();
        assert.equal(actual, sut);
      });
    });

    describe("diff()", () => {
      describe("without keySelector", () => {
        this.it2("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence",
          array.oneToTen.concat(array.oneToTen),
          array.zeroToNine.concat(array.zeroToNine),
          (first, second) => {
            const expected = [0, 0, 10, 10];

            const sut = this.createSut(first);
            const actual = sut.diff(second);
            assert.sameMembers([...actual], expected);
          });

        this.it2('should return empty sequence if all items in first sequence exist in second sequence and vise versa',
          array.oneToTen.concat(array.oneToTen),
          array.oneToTen,
          (first, second) => {
            const expected: number[] = [];

            const sut = this.createSut(first);
            const actual = [...sut.diff(second)];
            assert.sameMembers(actual, expected);
          });

        this.it1('when second sequence is empty, should return the first sequence', array.oneToTen, (input, inputArray) => {
          const second: number[] = [];
          const expected = inputArray.slice();

          const sut = this.createSut(input);
          const actual = [...sut.diff(second)];
          assert.sameMembers(actual, expected);
        });

        this.it2('when first sequence is empty, should return the second sequence',
          <number[]>[],
          array.oneToTen,
          (first, second) => {
            const expected = [...second];

            const sut = this.createSut(first);
            const actual = sut.diff(second);
            assert.sameMembers([...actual], expected);
          });

        this.it2('should return empty sequence when first and second sequences are empty',
          <number[]>[],
          <number[]>[],
          (first, second) => {
            const expected: number[] = [];

            const sut = this.createSut(first);
            const actual = sut.diff(second);
            assert.sameMembers([...actual], expected);
          });
      });

      describe("with keySelector", () => {
        const nonExistingGrade = {name: "not exists", grade: -1};
        this.it2("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence",
          array.grades.slice(0, -1),
          array.grades.slice(1).concat(nonExistingGrade),
          (first, second) => {

            let expected = [array.grades[0], array.grades[array.grades.length - 1], nonExistingGrade];

            const sut = this.createSut(first);
            const actual = sut.diff(second, x => x.grade);
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('should return empty sequence if all items in first sequence exist in second sequence and vise versa',
          array.grades.concat(array.grades),
          array.grades,
          (first, second) => {

            const expected: { name: string; grade: number; }[] = [];

            const sut = this.createSut(first);
            const actual = sut.diff(second, x => x.grade);
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('when second sequence is empty, should return the first sequence',
          array.grades.concat(array.grades),
          [] as { name: string; grade: number; }[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.diff(second, x => x.grade);

            const expected = [...first];
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('when first sequence is empty, should return the second sequence',
          [] as { name: string; grade: number; }[],
          array.grades.concat(array.grades),
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.diff(second, x => x.grade);
            const expected = [...second];
            assert.sameDeepMembers([...actual], expected);

          });

        this.it2('should return empty sequence when first and second sequences are empty',
          [] as { name: string; grade: number; }[],
          [] as { name: string; grade: number; }[],
          (first, second) => {

            const expected: { name: string; grade: number; }[] = [];

            const sut = this.createSut(first);
            const actual = sut.diff(second, x => x.grade);
            assert.sameDeepMembers([...actual], expected);
          });

        describe("second is partial type of first", () => {
          const FIRST: readonly { id: number; name: string; }[] = [
            {id: 11, name: 'only in first'}, {id: 1, name: 'B'}, {id: 2, name: 'C'}, {id: 33, name: 'only in first 2'},
            {id: 4, name: 'A'}, {id: 33, name: 'only in first 2'}, {id: 2, name: 'C'}
          ];
          const SECOND: readonly { id: number; }[] = [{id: 1}, {id: 2}, {id: 4}, {id: 1}, {id: 2}, {id: 555}];

          this.it2("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence",
            FIRST, SECOND, (first, second) => {

              let expected: ({ id: number; name: string; } | { id: number; })[] = [...FIRST.filter(x => x.id > 10), ...SECOND.filter(x => x.id > 100)];

              const sut = this.createSut(first);
              const actual = sut.diff(second, x => x.id);
              assert.sameDeepMembers([...actual], expected);
            });

          this.it2('should return empty sequence if all items in first sequence exist in second sequence and vise versa',
            FIRST.filter(f => SECOND.find(s => s.id === f.id)),
            SECOND.filter(s => FIRST.find(f => f.id === s.id)),
            (first, second) => {

              const expected: ({ id: number; name: string; } | { id: number; })[] = [];

              const sut = this.createSut(first);
              const actual = sut.diff(second, x => x.id);
              assert.sameDeepMembers([...actual], expected);
            });

          this.it2('when second sequence is empty, should return the first sequence',
            FIRST,
            [] as { id: number; }[],
            (first, second) => {

              const sut = this.createSut(first);
              const actual = sut.diff(second, x => x.id);

              const expected = [...first];
              assert.sameDeepMembers([...actual], expected);
            });

          this.it2('when first sequence is empty, should return the second sequence',
            [] as { id: number; name: string; }[], SECOND, (first, second) => {

              const sut = this.createSut(first);
              const actual = sut.diff(second, x => x.id);
              const expected = [...second];
              assert.sameDeepMembers([...actual], expected);

            });

          this.it2('should return empty sequence when first and second sequences are empty',
            [] as { id: number; name: string; }[],
            [] as { id: number; }[],
            (first, second) => {

              const expected: ({ id: number; name: string; } | { id: number; })[] = [];

              const sut = this.createSut(first);
              const actual = sut.diff(second, x => x.id);
              assert.sameDeepMembers([...actual], expected);
            });
        });

      });

      describe('with second key-selector', () => {
        const FIRST: readonly { id: number; name: string; }[] = [
          {id: 11, name: 'only in first'}, {id: 1, name: 'B'}, {id: 2, name: 'C'}, {id: 33, name: 'only in first 2'},
          {id: 4, name: 'A'}, {id: 33, name: 'only in first 2'}, {id: 2, name: 'C'}
        ];
        const SECOND: readonly number[] = [1, 2, 4, 1, 2, 555];

        this.it2("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence",
          FIRST, SECOND, (first, second) => {

            let expected: ({ id: number; name: string; } | number)[] = [...FIRST.filter(f => f.id > 10), ...SECOND.filter(s => s > 100)];

            const sut = this.createSut(first);
            const actual = sut.diff(second, f => f.id, s => s);
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('should return empty sequence if all items in first sequence exist in second sequence and vise versa',
          FIRST.filter(f => SECOND.find(s => s === f.id)),
          SECOND.filter(s => FIRST.find(f => f.id === s)),
          (first, second) => {

            const expected: ({ id: number; name: string; } | number)[] = [];

            const sut = this.createSut(first);
            const actual = sut.diff(second, f => f.id, s => s);
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('when second sequence is empty, should return the first sequence',
          FIRST,
          [] as number[],
          (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.diff(second, f => f.id, s => s);

            const expected = [...first];
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('when first sequence is empty, should return the second sequence',
          [] as { id: number; name: string; }[], SECOND, (first, second) => {

            const sut = this.createSut(first);
            const actual = sut.diff(second, f => f.id, s => s);
            const expected = [...second];
            assert.sameDeepMembers([...actual], expected);

          });

        this.it2('should return empty sequence when first and second sequences are empty',
          [] as { id: number; name: string; }[],
          [] as number[],
          (first, second) => {

            const expected: ({ id: number; name: string; } | number)[] = [];

            const sut = this.createSut(first);
            const actual = sut.diff(second, f => f.id, s => s);
            assert.sameDeepMembers([...actual], expected);
          });
      });
    });

    describe("diffDistinct()", () => {
      describe("without keySelector", () => {
        this.it2("should return distinct items from first sequence not existing in second sequence and items from second sequence not existing in first sequence",
          array.oneToTen.concat(array.oneToTen),
          array.zeroToNine.concat(array.zeroToNine),
          (first, second) => {

            const expected = [0, 10];

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second);
            assert.sameMembers([...actual], expected);
          });

        this.it2('should return empty sequence if all items in first sequence exist in second sequence and vise versa',
          array.oneToTen.concat(array.oneToTen),
          array.oneToTen,
          (first, second) => {

            const expected: number[] = [];

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second);
            assert.sameMembers([...actual], expected);
          });

        this.it2('when second sequence is empty, should return distinct items from the first sequence',
          array.oneToTen.concat(array.oneToTen),
          [] as number[],
          (first, second) => {

            const expected = array.oneToTen;

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second);
            assert.sameMembers([...actual], expected);
          });

        this.it2('when first sequence is empty, should return distinct items from the second sequence',
          [] as number[],
          array.zeroToNine.concat(array.zeroToNine),
          (first, second) => {

            const expected = array.zeroToNine;

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second);
            assert.sameMembers([...actual], expected);
          });

        this.it2('should return empty sequence when first and second sequences are empty',
          [] as number[], [] as number[], (first, second) => {

            const expected: number[] = [];

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second);
            assert.sameMembers([...actual], expected);
          });
      });

      describe("with keySelector", () => {
        const nonExistingGrade = {name: "not exists", grade: -1};
        this.it2("should return items from first sequence not existing in second sequence and items from second sequence not existing in first sequence",
          array.grades.concat(array.grades.reverse()),
          array.repeatConcat(array.grades.slice(1, -1).concat(nonExistingGrade), 2),
          (first, second) => {

            const expected = [array.grades[0], array.grades[array.grades.length - 1], nonExistingGrade];

            const sut = this.createSut(first);
            const actual = [...sut.diffDistinct(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it2('should return empty sequence if all items in first sequence exist in second sequence and vise versa',
          array.grades.concat(array.grades),
          array.grades,
          (first, second) => {

            const expected: { name: string; grade: number; }[] = [];

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second, x => x.grade);
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('when second sequence is empty, should return the first sequence distinct values',
          array.grades.x(2),
          [] as { name: string; grade: number; }[],
          (first, second) => {

            const expected = array.grades.filter((value, index, self) => self.findIndex(g => g.grade === value.grade) === index);

            const sut = this.createSut(first).diffDistinct(second, x => x.grade);
            const actual = [...sut];
            assert.sameDeepMembers(actual, expected);
          });

        this.it2('when first sequence is empty, should return the second sequence distinct values',
          [] as { name: string; grade: number; }[],
          array.grades.concat(array.grades),
          (first, second) => {

            const expected = array.grades.filter((value, index, self) => self.findIndex(g => g.grade === value.grade) === index);

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second, x => x.grade);
            assert.sameDeepMembers([...actual], expected);
          });

        this.it2('should return empty sequence when first and second sequences are empty',
          [] as { name: string; grade: number; }[],
          [] as { name: string; grade: number; }[],
          (first, second) => {

            const expected: { name: string; grade: number; }[] = [];

            const sut = this.createSut(first);
            const actual = sut.diffDistinct(second, x => x.grade);
            assert.sameDeepMembers([...actual], expected);
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

      this.it1('should return distinct values by key selector from non empty sequence',
        array.grades.concat(array.gradesAboveFifty).concat(array.grades.reverse()),
        (input) => {

          const expected = array.grades.filter((value, index, self) => self.findIndex(g => g.grade === value.grade) === index);
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

    describe("distinctUntilChanged()", () => {
      this.it1('should return a sequence without parts with consecutive same values',
        array.tenZeros.concat(array.tenOnes).x(2), (input) => {
          const expected = [0, 1, 0, 1];
          const sut = this.createSut(input).distinctUntilChanged();
          const actual = [...sut];
          assert.sameOrderedMembers(expected, actual);
        });

      this.it1('should return empty sequence when source sequence is empty', [], (input) => {
        const sut = this.createSut(input).distinctUntilChanged();
        const actual = [...sut];
        assert.isEmpty(actual);
      });

      describe('with key-selector', () => {
        this.it1('should return distinct values by key selector',
          array.grades.selfZip(3),
          (input) => {

            const expected = array.grades;
            const sut = this.createSut(input).distinctUntilChanged(x => x.grade);
            const actual = [...sut];
            assert.deepEqual(expected, actual);
          });

      });
      describe('with equality-comparer', () => {
        this.it1('should return distinct values by key selector',
          array.grades.selfZip(3),
          (input) => {

            const expected = array.grades;
            const sut = this.createSut(input).distinctUntilChanged({equals: (g1, g2) => g1.grade === g2.grade});
            const actual = [...sut];
            assert.deepEqual(expected, actual);
          });
      });

    });

    describe('entries()', () => {
      this.it1('should return sequence of tuples of index paired with the item, like Array.entries()', array.abc, (input) => {
        const sut = this.createSut(input);
        const expected = [...[...input].entries()];
        const actual = [...sut.entries()];
        assert.deepEqual(actual, expected);
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
        assert.strictEqual(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return first item in sequence and rest of items in new sequence - objects', array.grades, (input) => {
        const source = [...input];
        const expected = tuple(source[0], source.slice(1));
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.strictEqual(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return first item and and empty sequence when sequence has only one item - numbers', [1], (input) => {
        const expected = tuple(1, []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.strictEqual(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return first item and and empty sequence when sequence has only one item - objects', array.grades.slice(0, 1), (input) => {
        const source = [...input];
        const expected = tuple(source[0], []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.strictEqual(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return undefined and empty sequence when sequence is empty', [], (input) => {
        const expected = tuple(undefined, []);
        let sut = this.createSut(input);
        let actual = sut.firstAndRest();
        assert.strictEqual(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return default value and empty sequence when sequence is empty - default number', [], (input) => {
        const defaultValue = -1;
        const expected = tuple(defaultValue, []);
        let sut = this.createSut<number>(input);
        let actual = sut.firstAndRest(defaultValue);
        assert.strictEqual(actual[0], expected[0]);
        assert.sameOrderedMembers([...actual[1]], expected[1]);
      });

      this.it1('should return default value and empty sequence when sequence is empty - default object', [], (input) => {
        const defaultValue = {name: "default", grade: -1};
        const expected = tuple(defaultValue, []);
        let sut = this.createSut<{ name: string; grade: number; }>(input);
        let actual = sut.firstAndRest(defaultValue);
        assert.strictEqual(actual[0], expected[0]);
        assert.sameDeepOrderedMembers([...actual[1]], expected[1]);
      });
    });

    describe('flat()', () => {
      const buildHierarchy = (items: any[], depth: number, itemsPerUnit: number = 2) => {
        function* split(toSplit: any[]) {
          for (let i = 0; i < toSplit.length; i += itemsPerUnit) yield toSplit.slice(i, i + itemsPerUnit);
        }

        let results = items;
        for (let level = 0; level < depth; level++) results = [...split(results)];
        return results;
      };

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
          const expected: Folder[] = [];
          let sut = this.createSut(input);
          let actual = [...sut.flatMap(f => f.subFolders)];
          assert.sameDeepOrderedMembers(actual, expected);
        });

        this.it1('should not flatten if no child items - string', array.strings, (input) => {
          const expected = [...input].map(x => `[${x}]`);
          let sut = this.createSut(input);
          let actual = [...sut.flatMap(x => x, x => `[${x}]`)];
          assert.deepEqual(actual, expected);
        });
      });
    });

    describe('flatHierarchy()', () => {
      this.it1('should return empty sequence if all items have empty children sequence', [new Folder("1"), new Folder('2'), new Folder('2')], (input) => {
        const expected: { name: string; v0: Folder; v1: Folder; v2: Folder; v3: Folder; v4: Folder }[] = [];
        let sut = this.createSut(input);
        const flattened = sut.flatHierarchy(
          f => f.subFolders,
          f => f.subFolders,
          f => f.subFolders,
          f => f.subFolders,
          () => <string[]>[], // Force empty children
          (name, v4, v3, v2, v1, v0) =>
            ({name, v0, v1, v2, v3, v4}));

        let actual = [...flattened];
        assert.sameDeepOrderedMembers(actual, expected);
      });

      this.it1('should flattened items from a sequence of items having child items', array.folders, (input) => {
        let expected: { v0: string; v1: string; v2: string; v3: string; v4: string; v5: string; v6: string; v7: string; v8: string }[] = [];
        const safeChildren = (v: Folder): Folder[] => v.subFolders.length? v.subFolders: [v];
        [...input].forEach(v0 => safeChildren(v0)
          .forEach(v1 => safeChildren(v1)
            .forEach(v2 => safeChildren(v2)
              .forEach(v3 => safeChildren(v3)
                .forEach(v4 => safeChildren(v4)
                  .forEach(v5 => safeChildren(v5)
                    .forEach(v6 => safeChildren(v6)
                      .forEach(v7 => safeChildren(v7)
                        .forEach(v8 => expected.push({
                          v0: v0.name,
                          v1: v1.name,
                          v2: v2.name,
                          v3: v3.name,
                          v4: v4.name,
                          v5: v5.name,
                          v6: v6.name,
                          v7: v7.name,
                          v8: v8.name
                        }))))))))));

        let sut = this.createSut(input);
        const flattened = sut.flatHierarchy(
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          (last, v7, v6, v5, v4, v3, v2, v1, v0) =>
            ({
              v0: v0.name,
              v1: v1.name,
              v2: v2.name,
              v3: v3.name,
              v4: v4.name,
              v5: v5.name,
              v6: v6.name,
              v7: v7.name,
              v8: last.name
            }));

        let actual = [...flattened];
        assert.sameDeepOrderedMembers(actual, expected);
      });

      this.it1('should call all selector callbacks with expected parameters', array.folders, (input) => {
        const safeChildren = (v: Folder): Folder[] => v.subFolders.length? v.subFolders: [v];
        let expectedSelectorsParameters: any[][] = Array.from<any[]>({length: 9}).map(() => []);
        const expectedIndexes = new Array<number>(9).fill(0);
        let actualSelectorsParameters: any[][] = Array.from<any[]>({length: 9}).map(() => []);

        [...input].map((v0, index) => {
          expectedSelectorsParameters[0].push([v0, index, expectedIndexes[0]++]);
          safeChildren(v0)
            .forEach((v1, index) => {
              expectedSelectorsParameters[1].push([v1, v0, index, expectedIndexes[1]++]);
              safeChildren(v1)
                .forEach((v2, index) => {
                  expectedSelectorsParameters[2].push([v2, v1, v0, index, expectedIndexes[2]++]);
                  safeChildren(v2)
                    .forEach((v3, index) => {
                      expectedSelectorsParameters[3].push([v3, v2, v1, v0, index, expectedIndexes[3]++]);
                      safeChildren(v3)
                        .forEach((v4, index) => {
                          expectedSelectorsParameters[4].push([v4, v3, v2, v1, v0, index, expectedIndexes[4]++]);
                          safeChildren(v4)
                            .forEach((v5, index) => {
                              expectedSelectorsParameters[5].push([v5, v4, v3, v2, v1, v0, index, expectedIndexes[5]++]);
                              safeChildren(v5)
                                .forEach((v6, index) => {
                                  expectedSelectorsParameters[6].push([v6, v5, v4, v3, v2, v1, v0, index, expectedIndexes[6]++]);
                                  safeChildren(v6)
                                    .forEach((v7, index) => {
                                      expectedSelectorsParameters[7].push([v7, v6, v5, v4, v3, v2, v1, v0, index, expectedIndexes[7]++]);
                                      safeChildren(v7)
                                        .forEach((v8, index) => {
                                          expectedSelectorsParameters[8].push([v8, v7, v6, v5, v4, v3, v2, v1, v0, index, expectedIndexes[8]++]);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        let sut = this.createSut(input);
        const flattened = sut.flatHierarchy(
          (v0, index, absoluteIndex) => {
            actualSelectorsParameters[0].push([v0, index, absoluteIndex]);
            return safeChildren(v0);
          },
          (v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[1].push([v1, v0, index, absoluteIndex]);
            return safeChildren(v1);
          },
          (v2, v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[2].push([v2, v1, v0, index, absoluteIndex]);
            return safeChildren(v2);
          },
          (v3, v2, v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[3].push([v3, v2, v1, v0, index, absoluteIndex]);
            return safeChildren(v3);
          },
          (v4, v3, v2, v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[4].push([v4, v3, v2, v1, v0, index, absoluteIndex]);
            return safeChildren(v4);
          },
          (v5, v4, v3, v2, v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[5].push([v5, v4, v3, v2, v1, v0, index, absoluteIndex]);
            return safeChildren(v5);
          },
          (v6, v5, v4, v3, v2, v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[6].push([v6, v5, v4, v3, v2, v1, v0, index, absoluteIndex]);
            return safeChildren(v6);
          },
          (v7, v6, v5, v4, v3, v2, v1, v0, index, absoluteIndex) => {
            actualSelectorsParameters[7].push([v7, v6, v5, v4, v3, v2, v1, v0, index, absoluteIndex]);
            return safeChildren(v7);
          },
          (v8, v7, v6, v5, v4, v3, v2, v1, v0, index, absoluteIndex) => {
            return actualSelectorsParameters[8].push([v8, v7, v6, v5, v4, v3, v2, v1, v0, index, absoluteIndex]);
          });

        for (const item of flattened) {
        }
        assert.sameDeepOrderedMembers(actualSelectorsParameters, expectedSelectorsParameters);
      });

      this.it1('should flattened items from a sequence of items having child items expect children of type string (sequence of chars)', array.folders, (input) => {
        let expected: { v0: string; v1: string; v2: string; v3: string; v4: string; v5: string; v6: string; v7: string; v8: string; }[] = [];
        const safeChildren = (v: Folder): Folder[] => v.subFolders.length? v.subFolders: [v];
        [...input].forEach(v0 => safeChildren(v0)
          .forEach(v1 => safeChildren(v1)
            .forEach(v2 => safeChildren(v2)
              .forEach(v3 => safeChildren(v3)
                .forEach(v4 => safeChildren(v4)
                  .forEach(v5 => safeChildren(v5)
                    .forEach(v6 => safeChildren(v6)
                      .forEach(v7 => expected.push({
                        v0: `${v0.name} - 0`,
                        v1: `${v1.name} - 1`,
                        v2: `${v2.name} - 2`,
                        v3: `${v3.name} - 3`,
                        v4: `${v4.name} - 4`,
                        v5: `${v5.name} - 5`,
                        v6: `${v6.name} - 6`,
                        v7: `${v7.name} - 7`,
                        v8: `${v7.name} - 8` // NOT A MISTAKE: flatHierarchy() is expected to return as v8 the value of v7 since v7 doesn't have children
                      })))))))));

        let sut = this.createSut(input);
        const flattened = sut.flatHierarchy(
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => safeChildren(f),
          f => f.name,
          (v8, v7, v6, v5, v4, v3, v2, v1, v0) =>
            ({
              v0: `${v0.name} - 0`,
              v1: `${v1.name} - 1`,
              v2: `${v2.name} - 2`,
              v3: `${v3.name} - 3`,
              v4: `${v4.name} - 4`,
              v5: `${v5.name} - 5`,
              v6: `${v6.name} - 6`,
              v7: `${v7.name} - 7`,
              v8: `${v8} - 8`
            }));

        let actual = [...flattened];
        assert.sameDeepOrderedMembers(actual, expected);
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
        assert.strictEqual(actual, expected);
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

      this.it2('should match all outer items when there are duplicates', array.samples.filter(s => s.score >= 50), array.samples.filter(s => s.score < 50), (outer, inner) => {
        const expected: { outer: Sample, inner: Sample }[] = [];
        for (const o of outer) {
          expected.push(...[...inner].filter(s => s.score === o.score).map(i => ({outer: o, inner: i})));
        }

        const sut = this.createSut(outer).innerJoin(inner, s => s.score, s => s.score);
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
      this.it2('should insert items at specified index - numbers', array.oneToTen, array.tenZeros, (first, second) => {
        for (let i = 0; i < [...first].length; i++) {
          let expected = [...first].slice(0, i).concat([...second]).concat([...first].slice(i));
          let sut = this.createSut(first).insert(i, second);
          let actual = [...sut];
          let msg = `expected [${actual}] to deeply equals [${expected}] when doing [${[...first]}].insert(${i}, [${[...second]}])`;
          assert.deepEqual(actual, expected, msg);

          expected = [...first].slice(0, i).concat([...second, ...first]).concat([...first].slice(i));
          sut = this.createSut(first).insert(i, second, first);
          actual = [...sut];
          msg = `expected [${actual}] to deeply equals [${expected}] when doing [${[...first]}].insert(${i}, [${[...second, ...first]}])`;
          assert.deepEqual(actual, expected, msg);
        }
      });

      this.it2('should insert items at specified index - strings', array.abc, array.strings, (first, second) => {
        for (let i = 0; i < [...first].length; i++) {
          let expected = [...first].slice(0, i).concat([...second]).concat([...first].slice(i));
          let sut = this.createSut(first).insert(i, second);
          let actual = [...sut];
          assert.deepEqual(actual, expected);

          expected = [...first].slice(0, i).concat([...second, ...first]).concat([...first].slice(i));
          sut = this.createSut(first).insert(i, second, first);
          actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      it('should insert new items at specified index - chars', () => {
        const input = array.abc;
        const toInsert = "123";
        for (let i = 0; i < input.length; i++) {
          let expected = input.slice(0, i).concat(toInsert).concat(input.slice(i));
          let sut = this.createSut(input).insert(i, toInsert);
          let actual = [...sut];
          assert.deepEqual(actual, expected);

          expected = input.slice(0, i).concat(toInsert, input).concat(input.slice(i));
          sut = this.createSut(input).insert(i, toInsert, input);
          actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      this.it2('should insert items at specified index - falsy', array.falsyValues, array.falsyValues.reverse(), (first, second) => {
        for (let i = 0; i < [...first].length; i++) {
          let expected = [...first].slice(0, i).concat([...second]).concat([...first].slice(i));
          let sut = this.createSut(first).insert(i, second);
          let actual = [...sut];
          assert.deepEqual(actual, expected);

          expected = [...first].slice(0, i).concat([...second, ...first]).concat([...first].slice(i));
          sut = this.createSut(first).insert(i, second, first);
          actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      this.it2('should insert items at specified index - objects', array.grades, array.gradesFiftyAndAbove, (first, second) => {
        for (let i = 0; i < [...first].length; i++) {
          let expected = [...first].slice(0, i).concat([...second]).concat([...first].slice(i));
          let sut = this.createSut(first).insert(i, second);
          let actual = [...sut];
          assert.deepEqual(actual, expected);

          expected = [...first].slice(0, i).concat([...second, ...first]).concat([...first].slice(i));
          sut = this.createSut(first).insert(i, second, first);
          actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      this.it2('should not insert items if sequences to insert is are empty', array.oneToTen, [], (first, empty) => {
        for (let i = 0; i < [...first].length; i++) {
          const expected = [...first];
          let sut = this.createSut(first).insert(i, empty);
          let actual = [...sut];
          assert.deepEqual(actual, expected);

          sut = this.createSut(first).insert(i, empty, [...empty]);
          actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      this.it1('should not insert items if items parameter not specified', array.oneToTen, (input) => {
        for (let i = 0; i < [...input].length; i++) {
          const expected = [...input];
          const sut = this.createSut(input).insert(i);
          const actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      this.it2('should insert items at any index if source sequence is empty', [], array.oneToTen, (empty: Iterable<number>, second) => {
        for (let i = 0; i < 5; i++) {
          let expected = [...second];
          let sut = this.createSut(empty).insert(i, second);
          let actual = [...sut];
          assert.deepEqual(actual, expected);

          expected = [...second, ...second];
          sut = this.createSut(empty).insert(i, second, [...second]);
          actual = [...sut];
          assert.deepEqual(actual, expected);
        }
      });

      this.it2('should insert items at the beginning if index is negative', array.oneToTen, array.tenZeros, (first, second) => {
        const expected = [...second, ...first];
        const sut = this.createSut(first).insert(-2, second);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      this.it2('should insert items at the end if index is greater or equal to the length of the source sequence', array.oneToTen, array.tenZeros, (first, second) => {
        const expected = [...first, ...second];
        let sut = this.createSut(first).insert([...first].length, second);
        let actual = [...sut];
        assert.deepEqual(actual, expected);
        sut = this.createSut(first).insert([...first].length + 1, second);
        actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      this.it1('should insert items at the end if index is greater or equal to the length of the source sequence', [], (input: Iterable<string>) => {
        const toInsert = "123";
        const expected = [toInsert];
        let sut = this.createSut(input).insert(1, toInsert);
        let actual = [...sut];
        assert.deepEqual(actual, expected);
      });
    });

    describe('insertAfter()', () => {
      this.it2('should insert new items in source sequence immediately after the first item that meets the condition - numbers', [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1], array.oneToTen, (first, second) => {
        const source = [...first];
        const sut = this.createSut<any>(first);

        for (let i = 0; i <= source.length; i++) {
          const condition: Condition<number> = (x: number, index: number) => index === i;
          const secondArray = [...second];
          let atIndex = source.findIndex(condition);
          let expected = [...first];
          if (atIndex >= 0) expected.splice(atIndex + 1, 0, ...secondArray);

          const secondForLog = (() => {
            const quoted: any[] = secondArray.map(x => typeof x === 'string'? `'${x}'`: x);
            return Array.isArray(second)? (`[${quoted}]`): second === undefined? 'undefined': [quoted[0]];
          })();
          const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${source}].insertAfter((x, index) => index === ${i}, ${secondForLog})`;

          let actual = [...sut.insertAfter(condition, second)];
          assert.deepEqual(actual, expected, failedMessage(actual));
        }
      });

      this.it2('should insert new items in source sequence immediately after the first item that meets the condition - strings', array.abc, array.strings, (first, second) => {
        const source = [...first];
        const sut = this.createSut<any>(first);

        for (let i = 0; i <= source.length; i++) {
          const condition: Condition<string> = (x: string, index: number) => index === i;
          const secondArray = [...second];
          let atIndex = source.findIndex(condition);
          let expected = [...first];
          if (atIndex >= 0) expected.splice(atIndex + 1, 0, ...secondArray);

          const secondForLog = (() => {
            const quoted: any[] = secondArray.map(x => typeof x === 'string'? `'${x}'`: x);
            return Array.isArray(second)? (`[${quoted}]`): second === undefined? 'undefined': [quoted[0]];
          })();
          const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${source}].insertAfter((x, index) => index === ${i}, ${secondForLog})`;

          let actual = [...sut.insertAfter(condition, second)];
          assert.deepEqual(actual, expected, failedMessage(actual));
        }
      });

      it('should insert new items in source sequence immediately before the first item that meets the condition - chars', () => {
        const input = array.abc;
        const toInsert = "123";
        const expected = input.slice(0, 2).concat(toInsert).concat(input.slice(2));
        const sut = this.createSut(input).insertAfter(s => s === 'b', toInsert);
        const actual = [...sut];

        assert.deepEqual(actual, expected);
      });

      this.it2('should not add new items if none of the sources items meets the condition - numbers', array.zeroToNine, [-1, -2, -3], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertAfter(() => false, second);
        assert.deepEqual([...actual], expected);
      });

      this.it2('should not add new items if none of the sources items meets the condition - string', array.abc, ['', '1', '-'], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertAfter(() => false, second);
        assert.deepEqual([...actual], expected);
      });

      this.it2('should not add new items if none of the sources items meets the condition - objects', array.grades, [{
        name: Date.now().toString(),
        grade: -101
      }], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertAfter(() => false, second);
        assert.deepEqual([...actual], expected);
      });
    });

    describe('insertBefore()', () => {
      this.it2('should insert new items in source sequence immediately before the first item that meets the condition - numbers', [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1], array.oneToTen, (first, second) => {
        const source = [...first];
        const sut = this.createSut(first);

        for (let i = 0; i <= source.length; i++) {
          const condition: Condition<number> = (x: number, index: number) => index === i;
          const secondArray = [...second];
          let atIndex = source.findIndex(condition);
          let expected = [...first];
          if (atIndex >= 0) expected.splice(atIndex, 0, ...secondArray);

          const secondForLog = (() => {
            const quoted: any[] = secondArray.map(x => typeof x === 'string'? `'${x}'`: x);
            return Array.isArray(second)? (`[${quoted}]`): second === undefined? 'undefined': [quoted[0]];
          })();
          const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${source}].insertBefore((x, index) => index === ${i}, ${secondForLog})`;

          let actual = [...sut.insertBefore(condition, second)];
          assert.deepEqual(actual, expected, failedMessage(actual));
        }
      });

      this.it2('should insert new items in source sequence immediately before the first item that meets the condition - strings', array.abc, array.strings, (first, second) => {
        const source = [...first];
        const sut = this.createSut(first);

        for (let i = 0; i <= source.length; i++) {
          const condition: Condition<string> = (x: string, index: number) => index === i;
          const secondArray = [...second];
          let atIndex = source.findIndex(condition);
          let expected = [...first];
          if (atIndex >= 0) expected.splice(atIndex, 0, ...secondArray);

          const secondForLog = (() => {
            const quoted: any[] = secondArray.map(x => typeof x === 'string'? `'${x}'`: x);
            return Array.isArray(second)? (`[${quoted}]`): second === undefined? 'undefined': [quoted[0]];
          })();
          const failedMessage = (act: any) => `expected [${act}] to deeply equal [${expected}] when doing [${source}].insertBefore((x, index) => index === ${i}, ${secondForLog})`;

          let actual = [...sut.insertBefore(condition, second)];
          assert.deepEqual(actual, expected, failedMessage(actual));
        }
      });

      it('should insert new items in source sequence immediately before the first item that meets the condition - chars', () => {
        const input = array.abc;
        const toInsert = "123";
        const expected = input.slice(0, 1).concat(toInsert).concat(input.slice(1));
        const sut = this.createSut(input).insertBefore(s => s === 'b', toInsert);
        const actual = [...sut];

        assert.deepEqual(actual, expected);
      });

      this.it2('should not add new items if none of the sources items meets the condition - numbers', array.zeroToNine, [-1, -2, -3], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertBefore(() => false, second);
        assert.deepEqual([...actual], expected);
      });

      this.it2('should not add new items if none of the sources items meets the condition - string', array.abc, ['', '1', '-'], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertBefore(() => false, second);
        assert.deepEqual([...actual], expected);
      });

      this.it2('should not add new items if none of the sources items meets the condition - objects', array.grades, [{
        name: Date.now().toString(),
        grade: -101
      }], (first, second) => {
        const expected: any[] = [...first];
        const sut = this.createSut<any>(first);
        const actual = sut.insertBefore(() => false, second);
        assert.deepEqual([...actual], expected);
      });
    });

    describe('interleave()', () => {
      this.it2('should return a sequence composed with all items from all source sequences positioned ordered by their positional index in source sequence and then by the position of their  source sequence in the arguments - 1 sequence',
        array.range(0, 10, 2), array.range(1, 9, 2), (first, second, firstArray, secondArray) => {

          const expected = new Array<number>()
            .concat(...firstArray.map((first, i) => [first, secondArray[i]]))
            .filter(x => x != null);

          const sut = this.createSut(first).interleave(second);
          const actual = [...sut];

          assert.sameOrderedMembers(actual, expected);
        });

      this.itx('should return a sequence composed with all items from all source sequences positioned ordered by their positional index in source sequence and then by the position of their  source sequence in the arguments - many sequence',
        array.repeat(0, 10), [
          array.repeat(1, 11),
          array.repeat(2, 12),
          array.repeat(3, 13),
          array.repeat(4, 11),
          array.repeat(5, 10)
        ],
        (first, second, firstArray, secondArray) => {

          const maxLen = Math.max(firstArray.length, ...secondArray.map(second => second.length));
          let expected = [] as number[];
          for (let i = 0; i < maxLen; i++) {
            expected.push(firstArray[i]);
            expected.push(...secondArray.map(second => second[i]));
          }
          expected = expected.filter(x => x != null);

          const sut = this.createSut(first).interleave(...second);
          const actual = [...sut];

          assert.sameOrderedMembers(actual, expected);
        });
    });

    describe('intersect()', () => {
      this.it2('should return items that exists in both sequences without duplications',
        array.zeroToNine.concat(array.oneToTen),
        array.zeroToTen.concat(array.tenOnes).filter(x => x % 2 === 1).reverse(),
        (first, secondOdds) => {
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
        let sut = this.createSut(first);
        let actual = [...sut.intersect(second)];
        assert.sameMembers(actual, expected);
      });

      describe('with key-selector', () => {
        this.it2('should return items that exists in both sequences without duplications',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove),
          array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow),
          (first, second) => {
            const expected = array.grades.filter(x => x.grade === 50).slice(-1);
            let sut = this.createSut(first);
            let actual = [...sut.intersect(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it2('should return empty sequence if none of items exists in both sequences',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove).filter(x => x.grade !== 50),
          array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).filter(x => x.grade !== 50),
          (first, second) => {
            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersect(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it2('should return empty sequence if second sequence is empty',
          array.grades, [] as { name: string; grade: number }[], (first, second) => {
            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersect(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it2('should return empty sequence if first sequence is empty', [], array.grades, (first: Iterable<{ name: string; grade: number }>, second) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersect(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });
      });
    });

    describe('intersectBy()', () => {
      this.it2('should return items that exists in both sequences without duplications',
        array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove),
        array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).map(g => g.grade),
        (first, grades) => {

          const expected = array.grades.filter(x => x.grade === 50).slice(-1);
          let sut = this.createSut(first);
          let actual = [...sut.intersectBy(grades, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

      this.it2('should return empty sequence if none of items exists in both sequences',
        array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove).filter(x => x.grade !== 50),
        array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).filter(x => x.grade !== 50).map(g => g.grade),
        (first, second) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersectBy(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

      this.it2('should return empty sequence if second sequence is empty',
        array.grades,
        [] as number[],
        (first, second) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersectBy(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

      this.it2('should return empty sequence if first sequence is empty',
        [], array.grades.map(g => g.grade),
        (first: Iterable<{ name: string; grade: number }>, second) => {
          const expected: { name: string; grade: number; }[] = [];
          let sut = this.createSut(first);
          let actual = [...sut.intersectBy(second, x => x.grade)];
          assert.sameDeepMembers(actual, expected);
        });

      describe('by Set', () => {
        this.it1('should return items that exists in both sequences without duplications',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove),
          first => {
            const secondIterable = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).map(g => g.grade);
            const second = new Set(secondIterable);
            const expected = array.grades.filter(x => x.grade === 50).slice(-1);
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it1('should return empty sequence if none of items exists in both sequences',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove).filter(x => x.grade !== 50),
          first => {
            const secondIterable = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow).filter(x => x.grade !== 50).map(g => g.grade);
            const second = new Set(secondIterable);

            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it1('should return empty sequence if second sequence is empty',
          array.grades, first => {

            const second = new Set<number>();
            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it1('should return empty sequence if first sequence is empty',
          [] as { name: string; grade: number }[], first => {

            const secondIterable = array.grades.map(g => g.grade);
            const second = new Set(secondIterable);

            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });
      });

      describe('by Map', () => {
        this.it1('should return items that exists in both sequences without duplications',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove),
          first => {
            const secondIterable: [number, { name: string; grade: number; }][] = array.gradesFiftyAndBelow
              .concat(array.gradesFiftyAndBelow)
              .map(g => [g.grade, g]);

            const second = new Map(secondIterable);
            const expected = array.grades.filter(x => x.grade === 50).slice(-1);
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it1('should return empty sequence if none of items exists in both sequences',
          array.gradesFiftyAndAbove.concat(array.gradesFiftyAndAbove).filter(x => x.grade !== 50),
          first => {
            const secondIterable: [number, { name: string; grade: number; }][] = array.gradesFiftyAndBelow
              .concat(array.gradesFiftyAndBelow)
              .filter(x => x.grade !== 50)
              .map(g => [g.grade, g]);

            const second = new Map(secondIterable);

            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it1('should return empty sequence if second sequence is empty',
          array.grades, first => {

            const second = new Map<number, unknown>();
            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
            assert.sameDeepMembers(actual, expected);
          });

        this.it1('should return empty sequence if first sequence is empty',
          [] as { name: string; grade: number }[], first => {

            const secondIterable: [number, { name: string; grade: number; }][] = array.grades.map(g => [g.grade, g]);
            const second = new Map(secondIterable);

            const expected: { name: string; grade: number; }[] = [];
            let sut = this.createSut(first);
            let actual = [...sut.intersectBy(second, x => x.grade)];
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
        const actual = (opts?.insideOut)? sut.intersperse(separator, true): sut.intersperse(separator, opts);
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

    describe('intersperseBy()', () => {

      this.it1('should return sequence with separator value between each item from the source sequence',
        array.samples, (input, inputArray) => {
          const separatorFactory: () => Sample = () => ({type: '-', period: 0, score: 0, ok: false});
          const expected = Array<Sample | number>().concat(...inputArray.map(x => [x, separatorFactory()]));
          expected.pop();
          const sut = this.createSut(input).intersperseBy(separatorFactory);
          const actual = [...sut];
          assert.deepEqual(actual, expected);
        });

      this.it1('should return sequence with source items between the separator value when separatorAlignment is "Outer"',
        array.samples, (input, inputArray) => {
          const separatorFactory: () => Sample = () => ({type: '-', period: 0, score: 0, ok: false});
          const expected = Array<Sample | number>().concat(separatorFactory(), ...inputArray.map(x => [x, separatorFactory()]));
          const sut = this.createSut(input).intersperseBy(separatorFactory, 'Outer');
          const actual = [...sut];
          assert.deepEqual(actual, expected);
        });

      this.it1('should return sequence starting with a separator value when separatorAlignment is "Left"',
        array.zeroToNine, (input, inputArray) => {
          const separator = '|';
          const expected = Array<number | string>().concat(...inputArray.map(x => [separator, x]));
          const sut = this.createSut(input).intersperseBy(() => separator, 'Left');
          const actual = [...sut];
          assert.deepEqual(actual, expected);
        });

      this.it1('should return sequence ending with a separator value when separatorAlignment is "Right"',
        array.zeroToNine, (input, inputArray) => {
          const separator = '|';
          const expected = Array<number | string>().concat(...inputArray.map(x => [x, separator]));
          const sut = this.createSut(input).intersperseBy(() => separator, 'Right');
          const actual = [...sut];
          assert.deepEqual(actual, expected);
        });

      this.it1('should return empty sequence when source sequence is empty', [] as number[], input => {
        const separator = '|';
        const expected = [] as number[];
        const sut = this.createSut(input).intersperseBy(() => separator);
        const actual = [...sut];
        assert.deepEqual(actual, expected);
      });

      describe('should provide correct arguments to separatorFactory function', () => {
        this.it1(`when separatorAlignment is "Inner"`, [0, 1, 2], (input, inputArray) => {
          let i = 0;
          const innerInfo: { prevItem: number, hasPervItem: boolean, prevItemIndex: number, nextItem: number, hasNextItem: boolean, isPrefixSeparator: boolean, isSuffixSeparator: boolean }[] = [
            {
              prevItem: inputArray[0],
              hasPervItem: true,
              prevItemIndex: 0,
              nextItem: 1,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[1],
              hasPervItem: true,
              prevItemIndex: 1,
              nextItem: 2,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[2],
              hasPervItem: true,
              prevItemIndex: 2,
              nextItem: 2,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
          ];
          const sut = this.createSut(input).intersperseBy(actual => {
            const expected = innerInfo[i++];
            assert.deepEqual(actual, expected);
          }, 'Inner');

          TestHarness.materialize(sut);
        });

        this.it1(`when separatorAlignment is "Outer"`, [0, 1, 2], (input, inputArray) => {
          let i = 0;
          const innerInfo: { prevItem: number, hasPervItem: boolean, prevItemIndex: number, nextItem: number, hasNextItem: boolean, isPrefixSeparator: boolean, isSuffixSeparator: boolean }[] = [
            {
              prevItem: undefined as unknown as number,
              hasPervItem: false,
              prevItemIndex: -1,
              nextItem: 0,
              hasNextItem: true,
              isPrefixSeparator: true,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[0],
              hasPervItem: true,
              prevItemIndex: 0,
              nextItem: 1,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[1],
              hasPervItem: true,
              prevItemIndex: 1,
              nextItem: 2,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[2],
              hasPervItem: true,
              prevItemIndex: 2,
              nextItem: undefined as unknown as number,
              hasNextItem: false,
              isPrefixSeparator: false,
              isSuffixSeparator: true
            }
          ];
          const sut = this.createSut(input).intersperseBy(actual => {
            const expected = innerInfo[i++];
            assert.deepEqual(actual, expected);
          }, 'Outer');

          TestHarness.materialize(sut);
        });

        this.it1(`when separatorAlignment is "Left"`, [0, 1, 2], (input, inputArray) => {
          let i = 0;
          const innerInfo: { prevItem: number, hasPervItem: boolean, prevItemIndex: number, nextItem: number, hasNextItem: boolean, isPrefixSeparator: boolean, isSuffixSeparator: boolean }[] = [
            {
              prevItem: undefined as unknown as number,
              hasPervItem: false,
              prevItemIndex: -1,
              nextItem: 0,
              hasNextItem: true,
              isPrefixSeparator: true,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[0],
              hasPervItem: true,
              prevItemIndex: 0,
              nextItem: 1,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[1],
              hasPervItem: true,
              prevItemIndex: 1,
              nextItem: 2,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[2],
              hasPervItem: true,
              prevItemIndex: 2,
              nextItem: 2,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
          ];
          const sut = this.createSut(input).intersperseBy(actual => {
            const expected = innerInfo[i++];
            assert.deepEqual(actual, expected);
          }, 'Left');

          TestHarness.materialize(sut);
        });

        this.it1(`when separatorAlignment is "Right"`, [0, 1, 2], (input, inputArray) => {
          let i = 0;
          const innerInfo: { prevItem: number, hasPervItem: boolean, prevItemIndex: number, nextItem: number, hasNextItem: boolean, isPrefixSeparator: boolean, isSuffixSeparator: boolean }[] = [
            {
              prevItem: inputArray[0],
              hasPervItem: true,
              prevItemIndex: 0,
              nextItem: 1,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[1],
              hasPervItem: true,
              prevItemIndex: 1,
              nextItem: 2,
              hasNextItem: true,
              isPrefixSeparator: false,
              isSuffixSeparator: false
            },
            {
              prevItem: inputArray[2],
              hasPervItem: true,
              prevItemIndex: 2,
              nextItem: undefined as unknown as number,
              hasNextItem: false,
              isPrefixSeparator: false,
              isSuffixSeparator: true
            }
          ];
          const sut = this.createSut(input).intersperseBy(actual => {
            const expected = innerInfo[i++];
            assert.deepEqual(actual, expected);
          }, 'Right');

          TestHarness.materialize(sut);
        });
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

    describe('partition()', () => {
      describe("matched sequence", () => {
        this.it1('should return only items that meet the condition - numbers', array.oneToTen, (input) => {
          const expectedEvens = [...input].filter(x => x % 2 == 0);
          let sut = this.createSut(input);
          const matchResults = sut.partition(x => x % 2 == 0);
          const actual = [...matchResults.matched];
          assert.sameOrderedMembers(actual, expectedEvens);
        });

        this.it1('should return only items that meet the condition - objects', array.grades, (input) => {
          const expectedAboveFifty = [...input].filter(x => x.grade > 50);
          let sut2 = this.createSut(input);
          let actual2 = [...sut2.partition(x => x.grade > 50).matched];
          assert.sameOrderedMembers(actual2, expectedAboveFifty);
        });

        this.it1('should return empty sequence if non of the items meet the condition - numbers', array.oneToTen, (input) => {
          const expectedEmpty: any[] = [];
          let sut = this.createSut(input);
          let actual = [...sut.partition(() => false).matched];
          assert.sameOrderedMembers(actual, expectedEmpty);
        });

        this.it1('should return empty sequence if non of the items meet the condition - objects', array.grades, (input) => {
          const expectedEmpty: any[] = [];
          const sut = this.createSut(input);
          const actual = [...sut.partition(() => false).matched];
          assert.sameOrderedMembers(actual, expectedEmpty);
        });
      });

      describe("unmatched sequence", () => {
        this.it1('should return only items that do not meet the condition - numbers', array.oneToTen, (input) => {
          const expectedOdds = [...input].filter(x => x % 2 == 1);
          let sut = this.createSut(input);
          const matchResults = sut.partition(x => x % 2 == 0);
          const actual = [...matchResults.unmatched];
          assert.sameOrderedMembers(actual, expectedOdds);
        });

        this.it1('should return only items that do not meet the condition - objects', array.grades, (input) => {
          const expectedFiftyAndBelow = [...input].filter(x => x.grade <= 50);
          let sut2 = this.createSut(input);
          let actual2 = [...sut2.partition(x => x.grade > 50).unmatched];
          assert.sameOrderedMembers(actual2, expectedFiftyAndBelow);
        });

        this.it1('should return empty sequence if all of the items meet the condition - numbers', array.oneToTen, (input) => {
          const expectedEmpty: any[] = [];
          let sut = this.createSut(input);
          let actual = [...sut.partition(() => true).unmatched];
          assert.sameOrderedMembers(actual, expectedEmpty);
        });

        this.it1('should return empty sequence if all of the items meet the condition - objects', array.grades, (input) => {
          const expectedEmpty: any[] = [];
          const sut = this.createSut(input);
          const actual = [...sut.partition(() => true).unmatched];
          assert.sameOrderedMembers(actual, expectedEmpty);
        });

        this.it1('should convert unmatched results by provided map function',
          [{x: 1}, {y: 2}, {x: 3}, {y: 4}], input => {

            const expected = [...input]
              .filter((x): x is { y: number; } => 'y' in x)
              .map(x => x.y);

            const sut = this.createSut(input);
            const actual = sut.partition(
              (x): x is { x: number; } => 'x' in x,
              (matched, unmatched) => unmatched.map(_ => _.y!).toArray());
            assert.deepEqual(actual, expected);
          });
      });

      this.it1('should have the items in .matched property exactly the same as result tuple at index 0', array.oneToTen, (input) => {
        let sut = this.createSut(input);
        const matchResults = sut.partition(x => x % 2 == 0);
        assert.sameOrderedMembers([...matchResults.matched], [...matchResults[0]]);
      });
      this.it1('should have the items in .unmatched property exactly the same as result tuple at index 1', array.oneToTen, (input) => {
        let sut = this.createSut(input);
        const matchResults = sut.partition(x => x % 2 == 0);
        assert.sameOrderedMembers([...matchResults.unmatched], [...matchResults[1]]);
      });

    });

    describe('partitionWhile', () => {
      this.it1('should return two sequences, first one with items while the condition met and the second with the rest',
        array.oneToTen.x(2), (input, inputArray) => {
          const condition = (n: number) => n < 5;
          let expectedIndex = 0;
          const expected: [number[], number[]] = [[], []];
          for (const n of inputArray) {
            expectedIndex = (expectedIndex === 0 && condition(n))? 0: 1;
            expected[expectedIndex].push(n);
          }
          const sut = this.createSut(input);
          const split = sut.partitionWhile(condition);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(expected, actual);
        });

      this.it1('should return first sequence with all items and second empty, if all items match a condition',
        array.oneToTen.x(2), (input, inputArray) => {

          const expected = [inputArray.slice(), []];
          const sut = this.createSut(input);
          const split = sut.partitionWhile(() => true);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(expected, actual);
        });

      this.it1('should return first sequence empty and second with all items, if none of the items match a condition',
        array.oneToTen.x(2), (input, inputArray) => {
          const expected = [[], inputArray.slice()];
          const sut = this.createSut(input);
          const split = sut.partitionWhile(() => false);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(expected, actual);
        });

      this.it1('should return first and second sequences empty, when source sequence is empty',
        [] as number[], input => {
          const expected = [[], []] as number[][];
          const sut = this.createSut(input);
          const split = sut.partitionWhile(() => false);
          const actual = [[...split[0]], [...split[1]]];
          assert.deepEqual(expected, actual);
        });

      this.it1('result properties: first, second should be same instance as the result tuple at index 0, 1 respectively',
        array.oneToTen.x(2), input => {
          const sut = this.createSut(input);
          const actual = sut.partitionWhile(n => n < 5);
          assert.equal(actual[0], actual.first, 'Tuple at index 0 is not same instance as property: first');
          assert.equal(actual[1], actual.second, 'Tuple at index 1 is not same instance as property: second');
        });
    });

    describe('prepend()', () => {
      this.it1('should return new sequence with new items added at the start - strings', array.abc, (input) => {
        const newItem1 = '-';
        const newItem2 = '0';
        const expected = [newItem1, newItem2].concat([...input]);
        let sut = this.createSut(input);
        let actual = [...sut.prepend([newItem1, newItem2])];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it2('should return new sequence with new items added at the start - objects', array.gradesFiftyAndAbove, array.gradesFiftyAndBelow, (first, second) => {
        const expected = [...second, ...first];
        let sut = this.createSut(first);
        let actual = [...sut.prepend(second)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return new sequence with new items added to an empty iterable', [], (input: Iterable<string>) => {
        const newItems = 'abc';
        const expected = [newItems];
        let sut = this.createSut(input);
        let actual = [...sut.prepend([newItems])];
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

      describe('with key-selector', () => {
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

        describe('with second of different type', () => {
          this.it2('should return true if both sequences have the same items in same order',
            array.grades,
            array.gradesAboveFifty.map(g => ({grade: g.grade})),
            (first, second) => {

              const expected = array.gradesFiftyAndBelow;

              const sut = this.createSut(first);
              let actual = sut.remove(second, x => x.grade);
              assert.deepEqual([...actual], expected);

            });
        });
      });

      describe('with second key-selector', () => {
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
            {X: 0, Y: 0},
            {X: 0, Y: 0},
            {X: 2, Y: 2},
            {X: 2, Y: 2},
            {X: 4, Y: 4},
            {X: 4, Y: 4},
            {X: 6, Y: 6},
            {X: 6, Y: 6},
            {X: 5, Y: 5},
            {X: 5, Y: 5},
            {X: 3, Y: 3},
            {X: 3, Y: 3},
            {X: 1, Y: 1},
            {X: 1, Y: 1}
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

            const sut = this.createSut(first);
            let actual = sut.remove(second,
              point => point.x + point.y * 1000,
              point => point.X + point.Y * 1000);
            const actualArray = [...actual];
            assert.deepEqual(actualArray, expected);
          });
      });
    });

    describe('removeAll()', () => {
      this.it2('should remove all occurrences of items from the source sequence that exists on the seconds sequence',
        array.abc, [...'Expected to be Removed'], (first, second) => {
          const expected = [...first].filter(ch => ![...second].includes(ch));
          const sut = this.createSut(first);
          const actual = sut.removeAll(second);
          assert.sameOrderedMembers([...actual], expected);
        });

      describe('with key-selector', () => {
        this.it2('should remove all occurrences of items from the source sequence that exists on the seconds sequence according to key-selector',
          array.samples,
          array.samples.filter(s => s.type === 'A'),
          (first, second) => {
            const expected = [...first].filter(s => [...second].findIndex(r => r.type === s.type) < 0);

            const sut = this.createSut(first);
            const actual = sut.removeAll(second, sample => sample.type);

            assert.deepEqual([...actual], expected);
          });

        // TODO: second sequence of different type
      });

      describe('with second key-selector', () => {
        this.it2('should remove all occurrences of items from the source sequence that exists on the seconds sequence according to key-selector',
          array.samples,
          array.samples.filter(s => s.type === 'A').map(s => ({kind: s.type})),
          (first, second) => {
            const expected = [...first].filter(s => [...second].findIndex(r => r.kind === s.type) < 0);

            const sut = this.createSut(first);
            const actual = sut.removeAll(second, sample => sample.type, sample => sample.kind);
            const actualArray = [...actual];
            assert.deepEqual(actualArray, expected);
          });
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

    describe('removeKeys()', () => {

      this.it2('should remove all occurrences of items from the source sequence that exists on the seconds sequence according to key-selector',
        array.grades,
        array.gradesAboveFifty.map(x => x.grade),
        (first, second) => {
          const expected = array.gradesFiftyAndBelow;

          const sut = this.createSut(first);
          const actual = sut.removeKeys(second, g => g.grade);

          assert.deepEqual([...actual], expected);
        });

      describe('by Set', () => {
        this.it1('should remove all occurrences of items from the source sequence that exists in the Set of keys, according to key-selector',
          array.repeatConcat(array.grades, 2), first => {

            const expected = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow);
            const second = new Set(array.gradesAboveFifty.map(x => x.grade));
            const sut = this.createSut(first);
            const actual = sut.removeKeys(second, g => g.grade);

            assert.deepEqual([...actual], expected);
          });
      });

      describe('by Map', () => {
        this.it1('should remove all occurrences of items from the source sequence that exists in the Map parameter, according to key-selector',
          array.repeatConcat(array.grades, 2), first => {

            const expected = array.gradesFiftyAndBelow.concat(array.gradesFiftyAndBelow);
            const second = new Map(array.gradesAboveFifty.map(x => [x.grade, x]));

            const sut = this.createSut(first);
            const actual = sut.removeKeys(second, g => g.grade);

            assert.deepEqual([...actual], expected);
          });
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
          const expected = input.slice(Math.max(skip, 0));
          const actual = [...sut.skip(skip)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(${skip})`);
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
        const sut = this.createSut(source);
        for (let count = 0; count < input.length + 1; count++) {
          const expected = input.slice(0, -count || undefined);
          let actual = [...sut.skipLast(count)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].skipLast(${count})`);
        }
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

    describe('splitAt', () => {
      this.it1('should return two sequences, first one with items before the split index and the second with the rest', array.oneToTen, (input, inputArray) => {
        let sut = this.createSut(input);

        for (let index = -1; index < inputArray.length + 1; index++) {
          const expectedFirst = index < 1? []: inputArray.slice(0, index);
          const expectedSecond = index < 1? inputArray.slice(): inputArray.slice(index);

          let actual = sut.splitAt(index);
          assert.deepEqual([...actual[0]], expectedFirst);
          assert.deepEqual([...actual[1]], expectedSecond);
          // Second first
          actual = sut.splitAt(index);
          assert.deepEqual([...actual[1]], expectedSecond);
          assert.deepEqual([...actual[0]], expectedFirst);
        }
      });

      this.it1('result properties: first, second should be same instance as the result tuple at index 0, 1 respectively',
        array.oneToTen.x(2), input => {
          const sut = this.createSut(input);
          const actual = sut.splitAt(5);
          assert.equal(actual[0], actual.first, 'Tuple at index 0 is not same instance as property: first');
          assert.equal(actual[1], actual.second, 'Tuple at index 1 is not same instance as property: second');
        });
    });

    describe('split()', () => {
      this.it1('should split the sequence into expected number of sub sequences with expected items in each',
        Array<string>().concat(...array.loremIpsum.map(w => [w, ' '])), (input, inputArray) => {

          const expected: string[][] = [];
          let indexOfSpace = -2;
          const inputData = inputArray.slice();
          while (true) {
            indexOfSpace = inputData.findIndex(w => w === ' ');
            if (indexOfSpace > -1) {
              expected.push(inputData.splice(0, indexOfSpace));
              inputData.shift();
            } else break;
          }

          const sut = this.createSut(input).split(w => w === ' ');
          const split = [...sut];
          const actual = split.map(seq => [...seq]);
          assert.deepEqual(actual, expected);
        });

      this.it1('should return an empty first sub-sequence if condition meets on the first item', array.oneToTen, (input, inputArray) => {
        const expected: number[][] = [[], inputArray.slice(1)];
        const sut = this.createSut(input).split(n => n === inputArray[0]);
        const actual = [...sut].map(seq => [...seq]);
        assert.deepEqual(actual, expected);
      });

      this.it1('should return only one sub-sequence with all items, if condition never meets', array.oneToTen, (input, inputArray) => {
        const expected = [inputArray.slice()];
        const NUN_EXISTING_VALUE = -1;
        const sut = this.createSut(input).split(n => n === NUN_EXISTING_VALUE);
        const actual = [...sut].map(seq => [...seq]);
        assert.deepEqual(actual, expected);
      });

      this.it1('should return empty sequence if source sequence is empty', [] as number[], (input) => {
        const expected = [] as number[][];
        const sut = this.createSut(input).split(() => true);
        const actual = [...sut].map(seq => [...seq]);
        assert.deepEqual(actual, expected);
      });

      this.it1('should included the "separator" item in a separated sub-sequence when opts.keepSeparator = SeparateChunk',
        array.oneToTen, input => {
          const expected = [[1, 2, 3, 4], [5], [6, 7, 8, 9, 10]];
          const sut = this.createSut(input).split(n => n === 5, {keepSeparator: 'SeparateChunk'});
          const actual = [...sut].map(x => [...x]);
          assert.deepEqual(actual, expected);
        });

      this.it1('should included "separator" item, appended to the left chunk when opts.keepSeparator = LeftChunk',
        array.oneToTen, input => {
          const expected = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];
          const sut = this.createSut(input).split(n => n === 5, {keepSeparator: 'LeftChunk'});
          const actual = [...sut].map(x => [...x]);
          assert.deepEqual(actual, expected);
        });


      this.it1('should included the "separator" item, prepend to the next chunk when opts.keepSeparator = RightChunk',
        array.oneToTen, input => {
          const expected = [[1, 2, 3, 4], [5, 6, 7, 8, 9, 10]];
          const sut = this.createSut(input).split(n => n === 5, {keepSeparator: 'RightChunk'});
          const actual = [...sut].map(x => [...x]);
          assert.deepEqual(actual, expected);
        });

      describe('with {opts.maxChunks: 2}', () => {
        const maxChunks = 2;
        this.it1('should split the sequence into number of sub sequences as specified in {opts.maxChunks}, when source sequence can be split to more',
          array.oneToTen, input => {

            const expected = [[1], [3]] as number[][];

            const sut = this.createSut(input).split(n => n % 2 == 0, {maxChunks});
            const split = [...sut];
            const actual = split.map(seq => [...seq]);
            assert.deepEqual(actual, expected);
          });

        this.it1('should return only one sub-sequence with all items, if condition never meets', array.oneToTen, (input, inputArray) => {
          const expected = [inputArray.slice()];
          const NONE_EXISTING_VALUE = -1;
          const sut = this.createSut(input).split(n => n === NONE_EXISTING_VALUE, {maxChunks});
          const actual = [...sut].map(seq => [...seq]);
          assert.deepEqual(actual, expected);
        });

        this.it1('should return empty sequence if source sequence is empty', [] as number[], (input) => {
          const expected = [] as number[][];
          const sut = this.createSut(input).split(() => true, {maxChunks});
          const actual = [...sut].map(seq => [...seq]);
          assert.deepEqual(actual, expected);
        });

        this.it1('should included the "separator" item in a separated sub-sequence when opts.keepSeparator = SeparateChunk',
          array.oneToTen, input => {
            const expected = [[1, 2, 3, 4], [5]];
            const sut = this.createSut(input).split(n => n % 5 === 0, {keepSeparator: 'SeparateChunk', maxChunks});
            const actual = [...sut].map(x => [...x]);
            assert.deepEqual(actual, expected);
          });

        this.it1('should included "separator" item, appended to the left chunk when opts.keepSeparator = LeftChunk',
          array.oneToTen, input => {
            const expected = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];
            const sut = this.createSut(input).split(n => n % 5 === 0, {keepSeparator: 'LeftChunk', maxChunks});
            const actual = [...sut].map(x => [...x]);
            assert.deepEqual(actual, expected);
          });

        this.it1('should included the "separator" item, prepend to the next chunk when opts.keepSeparator = RightChunk',
          array.oneToTen, input => {
            const expected = [[1, 2, 3, 4], [5, 6, 7, 8, 9]];
            const sut = this.createSut(input).split(n => n % 5 === 0, {keepSeparator: 'RightChunk', maxChunks});
            const actual = [...sut].map(x => [...x]);
            assert.deepEqual(actual, expected);
          });
      });
    });

    describe('take()', () => {
      this.it1('should return sequence with number of items as specified in count parameter', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(source);
        for (let take = 1; take <= input.length; take++) {
          const expected = input.slice(0, take);
          let actual = [...sut.take(take)];
          assert.sameOrderedMembers(actual, expected, `expected [${actual}] to have the same ordered members as [${expected}] when doing [${input}].slice(0,${take})`);
        }
      });
      this.it1('should return sequence with same items if count parameter is grater then number of items', array.oneToTen, (source) => {
        const input = [...source];
        const sut = this.createSut(source);

        const expected = input.slice(0, input.length + 1);
        let actual = [...sut.take(input.length + 1)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return empty sequence when count zero negative', array.oneToTen, (source) => {
        const sut = this.createSut(source);
        const expected: number[] = [];
        let actual = [...sut.take(0)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it1('should return empty sequence when count is negative', array.oneToTen, (source) => {
        const sut = this.createSut(source);
        const expected: number[] = [];
        let actual = [...sut.take(-2)];
        assert.sameOrderedMembers(actual, expected);
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

      this.it1('should return empty sequence is count non positive', array.oneToTen, (input) => {
        assert.sameOrderedMembers([...this.createSut(input).takeLast(0)], []);
        assert.sameOrderedMembers([...this.createSut(input).takeLast(-1)], []);
      });

      this.it1('should return empty sequence is source sequence is empty', [], (input) => {
        assert.sameOrderedMembers([...this.createSut(input).takeLast(10)], []);
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
      describe('with key-selector', () => {
        describe('should return items from source sequence that exists in seconds sequence with same key', () => {
          const existsOnlyInFirst = {name: 'first', grade: -1};
          const existsOnlyInSecond = {name: 'second', grade: -2};

          this.it2(
            'first sequence is same length as second ',
            array.grades.concat(existsOnlyInFirst),
            array.grades.concat(existsOnlyInSecond).reverse(),
            (input, second) => {
              const expected = array.grades;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second, x => x.grade)];
              assert.deepEqual(actual, expected);
            });

          this.it2(
            'first sequence is longer then second ',
            array.grades.concat(existsOnlyInFirst),
            array.gradesFiftyAndAbove.concat(existsOnlyInSecond).reverse(),
            (input, second) => {
              const expected = array.gradesFiftyAndAbove;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second, x => x.grade)];
              assert.deepEqual(actual, expected);
            });

          this.it2(
            'first sequence is shorter then second ',
            array.gradesFiftyAndAbove.concat(existsOnlyInFirst),
            array.grades.concat(existsOnlyInSecond).reverse(),
            (input, second) => {
              const expected = array.gradesFiftyAndAbove;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second, x => x.grade)];
              assert.deepEqual(actual, expected);
            });
        });

        this.it2(
          'should return empty sequence if non of the source items exists in second sequence',
          array.gradesAboveFifty,
          array.gradesFiftyAndBelow,
          (first, second) => {
            let sut = this.createSut(first);
            let actual = [...sut.takeOnly(second, x => x.grade)];
            assert.isEmpty(actual);
          });

        this.it2('should return duplicate items same as they appear in seconds sequence',
          [{v: 1}, {v: 2}, {v: 3}, {v: 3}, {v: 2}, {v: 3}],
          [{v: 0}, {v: 0}, {v: 1}, {v: 1}, {v: 2}, {v: 2}, {v: 3}, {v: 3}, {v: 4}, {v: 4}],
          (first, second) => {

            const expected = [{v: 1}, {v: 2}, {v: 3}, {v: 3}, {v: 2}];
            let sut = this.createSut(first);
            let actual = [...sut.takeOnly(second, x => x.v)];
            assert.deepEqual(actual, expected);
          });

        describe('second of different type', () => {
          this.it2('should return duplicate items same as they appear in seconds sequence',
            [{v: 1}, {v: 2}, {v: 3}, {v: 3}, {v: 2}, {v: 3}],
            [{v: 0, k: 9}, {v: 0, k: 9}, {v: 1, k: 8}, {v: 1, k: 8}, {v: 2, k: 7},
              {v: 2, k: 7}, {v: 3, k: 6}, {v: 3, k: 6}, {v: 4, k: 5}, {v: 4, k: 5}],
            (first, second) => {

              const expected = [{v: 1}, {v: 2}, {v: 3}, {v: 3}, {v: 2}];
              let sut = this.createSut(first);
              let actual = [...sut.takeOnly(second, x => x.v)];
              assert.deepEqual(actual, expected);
            });
        });
      });

      describe('without key-selector', () => {
        describe('should return items from source sequence that exists in seconds sequence', () => {
          this.it2(
            'first sequence is same length as second ',
            array.zeroToNine,
            array.oneToTen.reverse(),
            (input, second) => {
              const expected = array.oneToNine;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second)];
              assert.deepEqual(actual, expected);
            });

          this.it2(
            'first sequence is longer then second ',
            array.zeroToTen,
            array.oneToNine.reverse(),
            (input, second) => {
              const expected = array.oneToNine;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second)];
              assert.deepEqual(actual, expected);
            });

          this.it2(
            'first sequence is shorter then second ',
            array.oneToNine,
            array.zeroToTen.reverse(),
            (input, second) => {
              const expected = array.oneToNine;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second)];
              assert.deepEqual(actual, expected);
            });
        });

        this.it2('should return duplicate items same as they appear in seconds sequence',
          array.tenOnes.concat(array.tenZeros),
          array.tenZeros.concat(array.tenOnes),
          (first, second) => {

            const expected = [...first];
            let sut = this.createSut(first);
            let actual = [...sut.takeOnly(second)];
            assert.deepEqual(actual, expected);
          });

        this.it2(
          'should return empty sequence if non of the source items exists in second sequence',
          array.tenZeros,
          array.oneToTen,
          (first, second) => {
            let sut = this.createSut(first);
            let actual = [...sut.takeOnly(second)];
            assert.isEmpty(actual);
          });
      });

      describe('with first & second key-selectors', () => {
        describe('should return items from source sequence that exists in seconds sequence with same key', () => {
          const existsOnlyInFirst = {name: 'first', grade: -1};
          const existsOnlyInSecond = {name: 'second', grade: -2};

          this.it2(
            'first sequence is same length as second ',
            array.grades.concat(existsOnlyInFirst),
            array.grades.concat(existsOnlyInSecond).reverse(),
            (input, second) => {
              const expected = array.grades;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second, x => x.grade)];
              assert.deepEqual(actual, expected);
            });

          this.it2(
            'first sequence is longer then second ',
            array.grades.concat(existsOnlyInFirst),
            array.gradesFiftyAndAbove.concat(existsOnlyInSecond).reverse(),
            (input, second) => {
              const expected = array.gradesFiftyAndAbove;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second, x => x.grade)];
              assert.deepEqual(actual, expected);
            });

          this.it2(
            'first sequence is shorter then second ',
            array.gradesFiftyAndAbove.concat(existsOnlyInFirst),
            array.grades.concat(existsOnlyInSecond).reverse(),
            (input, second) => {
              const expected = array.gradesFiftyAndAbove;
              let sut = this.createSut(input);
              let actual = [...sut.takeOnly(second, x => x.grade)];
              assert.deepEqual(actual, expected);
            });
        });

        this.it2('should return empty sequence if non of the source items exists in second sequence',
          [{a: -1}, {a: -2}, {a: -3}],
          [{b: 1}, {b: 2}, {b: 3}],
          (first, second) => {
            let sut = this.createSut(first);
            let actual = [...sut.takeOnly(second, x => x.a, x => x.b)];
            assert.isEmpty(actual);
          });

        this.it2(
          'should return duplicate items same as they appear in seconds sequence',
          [{v: 1}, {v: 2}, {v: 3}, {v: 3}, {v: 2}, {v: 3}],
          [{k: 0}, {k: 0}, {k: 1}, {k: 1}, {k: 2}, {k: 2}, {k: 3}, {k: 3}, {k: 4}, {k: 4}],
          (first, second) => {

            const expected = [{v: 1}, {v: 2}, {v: 3}, {v: 3}, {v: 2}];

            let sut = this.createSut(first);
            let actual = [...sut.takeOnly(second, x => x.v, x => x.k)];
            assert.deepEqual(actual, expected);
          });
      });

      this.it2('should return empty sequence if second sequence is empty',
        array.oneToTen, [], (first, second) => {
          const sut = this.createSut(first);
          const takeOnly = [...sut.takeOnly(second)];
          assert.equal(takeOnly.length, 0);
        });

      this.it2('should return empty sequence if first sequence is empty',
        <number[]>[], array.oneToTen, (first, second) => {
          const sut = this.createSut(first);
          const takeOnly = [...sut.takeOnly(second)];
          assert.equal(takeOnly.length, 0);
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
        assert.deepEqual(actual, expected);
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
    });

    describe('transform', () => {
      this.it1('should replace sequence with concatenated filters of it', array.oneToTen, (input) => {
        const transformer = (seq: Seq<number>) => seq.filter(x => x % 2 === 0).concat$(
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
      this.it2('should return a sequence with distinct items from both sequences',
        array.zeroToNine.concat(array.zeroToNine),
        array.oneToTen.concat(array.oneToTen),
        (first, second) => {
          const expected = [...new Set([...first].concat([...second]))];
          const sut = this.createSut(first);

          let actual = [...sut.union(second)];
          assert.deepEqual(actual, expected);
        });

      this.it2('should return a sequence with distinct items from both sequences according to a key-selector',
        array.gradesFiftyAndAbove,
        array.gradesFiftyAndAbove,
        (first, second) => {
          const union = [...first].concat([...second]);

          const keySelector = (grade: { name: string; grade: number; }) => grade.name;
          const map = new Map<string, { name: string; grade: number; }>();
          union.forEach((grade) => map.set(keySelector(grade), grade));
          const expected = [...map.values()];

          const sut = this.createSut(first);

          let actual = [...sut.union(second, keySelector)];
          assert.deepEqual(actual, expected);
        });

      this.it2('should return a sequence with distinct items only from first sequence if duplicates exists in second sequence',
        [{a: 1}, {a: 2}, {a: 3}, {a: 4}, {a: 5}],
        [{a: 0, b: 0}, {a: 2, b: 2}, {a: 4, b: 4}, {a: 6, b: 6}],
        (first, second) => {
          const expected = [
            {a: 1}, {a: 2}, {a: 3}, {a: 4}, {a: 5},
            {a: 0, b: 0}, {a: 6, b: 6}
          ];

          const sut = this.createSut(first);

          let actual = [...sut.union(second as { a: number }[], x => x.a)];
          assert.deepEqual(actual, expected);
        });
    });

    describe('unionRight()', () => {
      this.it2('should return a sequence with items from second sequence followed by item from first sequence',
        array.tenOnes, array.tenZeros, (first, second) => {
          const expected = [...new Set([...second].concat([...first]))];
          const sut = this.createSut(first);

          let actual = [...sut.unionRight(second)];
          assert.deepEqual(actual, expected);
        });

      this.it2('should return a sequence with distinct items from both sequences',
        array.zeroToNine.concat(array.zeroToNine),
        array.oneToTen.concat(array.oneToTen),
        (first, second) => {
          const expected = [...new Set([...second].concat([...first]))];
          const sut = this.createSut(first);

          let actual = [...sut.unionRight(second)];
          assert.deepEqual(actual, expected);
        });

      this.it2('should return a sequence with distinct items only from both sequences according to a key-selector',
        array.gradesFiftyAndAbove,
        array.gradesFiftyAndAbove,
        (first, second) => {
          const union = [...second].concat([...first]);

          const keySelector = (grade: { name: string; grade: number; }) => grade.name;
          const map = new Map<string, { name: string; grade: number; }>();
          union.forEach((grade) => map.set(keySelector(grade), grade));
          const expected = [...map.values()];

          const sut = this.createSut(first);

          let actual = [...sut.unionRight(second, keySelector)];
          assert.deepEqual(actual, expected);
        });

      this.it2('should return a sequence with distinct items from second sequence if duplicates exists in first sequence',
        [{a: 1}, {a: 2}, {a: 3}, {a: 4}, {a: 5}],
        [{a: 0, b: 0}, {a: 2, b: 2}, {a: 4, b: 4}, {a: 6, b: 6}],
        (first, second) => {
          const expected = [
            {a: 0, b: 0}, {a: 2, b: 2}, {a: 4, b: 4}, {a: 6, b: 6}, //beginning with second (preferSecond = true)
            {a: 1}, {a: 3}, {a: 5}];

          const sut = this.createSut(first);

          let actual = [...sut.unionRight(second as { a: number }[], x => x.a)];
          assert.deepEqual(actual, expected);
        });

    });

    describe('unshift()', () => {
      this.it1('should return new sequence with new items added at the start - strings', array.abc, (input) => {
        const newItem1 = '-';
        const newItem2 = '0';
        const expected = [newItem1, newItem2].concat([...input]);
        let sut = this.createSut(input);
        let actual = [...sut.unshift(newItem1, newItem2)];
        assert.sameOrderedMembers(actual, expected);
      });

      this.it2('should return new sequence with new items added at the start - objects', array.gradesFiftyAndAbove, array.gradesFiftyAndBelow, (first, second) => {
        const expected = [...second, ...first];
        let sut = this.createSut(first);
        let actual = [...sut.unshift(...second)];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return new sequence with new items added to an empty iterable', [], (input: Iterable<string>) => {
        const newItems = 'abc';
        const expected = [newItems];
        let sut = this.createSut(input);
        let actual = [...sut.unshift(newItems)];
        assert.deepEqual(actual, expected);
      });
    });

    describe('window()', () => {
      const overflowLeftArgs = [false, false];
      const overflowRightArgs = [false, true];
      const exactSizeArgs = [false, true];
      const padWithArgs = [undefined, -1];

      // ==========================================
      function buildExpected(values: number[], step: number, size: number, fixedSize: boolean): number[][] {
        let sliceLength = Math.max(values.length - size + 1, 1);
        const result: number[][] = [];

        for (let i = 0; i < sliceLength; i += step) {
          const win = values.slice(i, i + size).filter(x => x !== undefined);
          if (!win.length || fixedSize && win.length < size) continue;
          const prevWin = result[result.length - 1];
          let equals = false;
          if (prevWin && prevWin.length === win.length) {
            equals = win.every((value, index) => value === prevWin[index]);
          }
          if (!equals) result.push(win);
        }

        return result;
      }

      const sources = [[1, 2, 3], [] as number[]];

      for (const source of sources) {
        this.it1(`combination of all parameters${source.length? '': ' - empty source'}`, source, (input, inputArray) => {
          const test = (exactSize: boolean, slidingStep: number, rightOverflow: boolean, leftOverflow: boolean, padWith: any, windowSize: number) => {
            const size = Math.max(windowSize, 0);
            const step = Math.max(Math.min(slidingStep, inputArray.length), 1);
            const paddings = new Array<number>(Math.max(size, 1) - 1).fill(padWith!);
            const undefinedPaddings = new Array<number>(Math.max(size, 1) - 1);

            const opts = {leftOverflow, rightOverflow, padWith, exactSize};

            const leftPadding = leftOverflow?
              padWith !== undefined?
                paddings:
                undefinedPaddings:
              [];
            const rightPadding = rightOverflow?
              padWith !== undefined?
                paddings:
                undefinedPaddings:
              [];

            const overflowString = ['none', 'left', 'right', 'left/right'][+leftOverflow + (+rightOverflow * 2)];
            const testInfo = `size: ${windowSize}, step: ${slidingStep}, overflow: ${overflowString}, padWith: ${padWith}, exactSize: ${exactSize}`;

            // console.log('window - combined', testInfo);

            const expectedBase = leftPadding.concat(inputArray, rightPadding);
            const expected = buildExpected(expectedBase, step, size, exactSize);

            const sut = this.createSut(input).window(windowSize, slidingStep, opts);
            const actual = [...sut].map(s => [...s]);
            assert.deepEqual(actual, expected, testInfo);
          };

          for (const exactSize of exactSizeArgs) {
            for (let slidingStep = 0; slidingStep <= inputArray.length * 2; slidingStep++) {
              for (const rightOverflow of overflowRightArgs) {
                for (const leftOverflow of overflowLeftArgs) {
                  for (const padWith of padWithArgs) {
                    for (let windowSize = 0; windowSize <= inputArray.length * 2; windowSize++) {
                      test(exactSize, slidingStep, rightOverflow, leftOverflow, padWith, windowSize);
                    }
                  }
                }
              }
            }
          }
        });
      }
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
      this.it1('should pair all items, each with its index in the sequence', array.abc, input => {
        const expected = [...input].map((x, i) => [x, i]);

        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex()];
        assert.deepEqual(actual, expected);
      });

      this.it1('should return pairs or items with their index value plus the startIndex parameter value', array.abc, input => {
        const noneZeroStartIndex = 10;
        const expected = [...input].map((x, i) => [x, i + noneZeroStartIndex]);

        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex(noneZeroStartIndex)];
        assert.deepEqual(actual, expected);
      });

      this.it1('when source sequence is empty, should return empty sequence', [], (input) => {
        let sut = this.createSut(input);
        let actual = [...sut.zipWithIndex()];
        assert.isEmpty(actual);
      });
    });

  });
}
