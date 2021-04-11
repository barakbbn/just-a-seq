import {assert} from "chai";
import {array} from "./test-data";
import {asSeq, empty, indexes, random, range, repeat} from "../lib/optimized";
import {createSeq} from "../lib/seq-impl";
import {describe} from "mocha";

export class SeqFactory_Tests {
  readonly run = () => describe('Seq Factories', () => {
    describe('asSeq()', () => {
      it('should create new SeqImpl instance that produce provided array', function () {
        let sut = asSeq<number>([]);
        assert.sameOrderedMembers([...sut], []);

        sut = asSeq(array.oneToTen);
        assert.sameOrderedMembers([...sut], array.oneToTen);

        sut = asSeq(createSeq(array.oneToTen));
        assert.sameOrderedMembers([...sut], array.oneToTen);
      });

      it('should create new SeqImpl instance that produce provided Iterable', function () {
        let sut = asSeq<number>([].values());
        assert.sameOrderedMembers([...sut], []);

        const input = array.oneToTen;

        sut = asSeq(input.values());
        assert.sameOrderedMembers([...sut], input);

        sut = asSeq(createSeq(input));
        assert.sameOrderedMembers([...sut], input);
      });

      it('should create new SeqImpl instance that produce provided generator', function () {
        function* emptyGenerator() {
        }

        let sut = asSeq<number>(emptyGenerator);
        assert.sameOrderedMembers([...sut], []);

        const input = array.oneToTen;

        function* generator() {
          yield* input;
        }

        sut = asSeq(generator);
        assert.sameOrderedMembers([...sut], input);
      });

      it('should create new SeqImpl instance that produce provided generator and custom this', function () {
        const input = array.oneToTen;

        class GeneratorTester {
          constructor(private readonly input: number[]) {
          }

          * generate() {
            yield* this.input;
          }
        }

        const generator = new GeneratorTester(input);
        const sut = asSeq(()=> generator.generate());
        assert.sameOrderedMembers([...sut], input);
      });
    });

    describe('empty()', () => {
      it('should return same singleton instance', function () {
        assert.equal(empty<number>(), empty<any>());
      });

      it('should use anonymous object as generic type parameter', function () {
        const input = array.samples;
        const sut = empty(input[0]);
        sut.append(input[1]); // This should compile by typescript
      });
    });

    describe('range()', () => {
      it('should produce new sequence with numbers from start to end', function () {
        const sut = range(1, 10);
        const expected = array.oneToTen;
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should produce new infinite sequence with numbers from start', function () {
        const start = -1;
        const sut = range(start);
        const expected = Array.from({length: 20}, (v, i) => start + i);
        const actual: number[] = [];

        for (const item of sut) {
          actual.push(item);
          if (actual.length === expected.length) break;
        }
        assert.sameOrderedMembers(actual, expected);
      });

      it('should produce new sequence with numbers from start to end with with given step', function () {
        const sut = range(0, 10, 2);
        const expected = [0, 2, 4, 6, 8, 10];
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should throws if step is zero', function () {
        const zeroStep = 0;
        assert.throws(() => range(1, 10, zeroStep));
      });

      it('should throws if start is NaN', function () {
        const nanStart = Number.NaN;
        assert.throws(() => range(nanStart, 10));
      });

      it('should throws if start is Infinite', function () {
        assert.throws(() => range(Number.POSITIVE_INFINITY, 10));
        assert.throws(() => range(Number.NEGATIVE_INFINITY, 10));
      });

      it('should produce new sequence with numbers when start is greater than end', function () {
        const sut = range(10, -10);
        const expected = array.oneToTen.reverse().concat(array.zeroToTen.map(n => -n));
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should produce new sequence with 1 number when start equals end', function () {
        const singleValue = 3;
        const sut = range(singleValue, singleValue);
        const actual = [...sut];
        assert.sameOrderedMembers(actual, [singleValue])
      });

      it('should produce new sequence with last value less than end if step skip the end value', function () {
        const sut = range(0, 7, 3);
        const expected = [0, 3, 6];
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('indexes()', () => {
      it('should produce sequence of zero based indexes as the provided count', function () {
        const sut = indexes(10);
        const actual = [...sut];
        const expected = array.zeroToNine;
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('repeat()', () => {
      it('should produce sequence of provided value repeated as the number provided count', function () {
        const count = 10;
        const value = 'value';
        const sut = repeat(value, count);
        const actual = [...sut];
        const expected = Array(count).fill(value);
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('random()', () => {
      it('should generate endless random numbers', function () {
        const sut = random();
        const set = new Set<number>();
        const expected = 50;
        let count = 0;
        for (const n of sut) {
          set.add(n);
          count++;
          if (count == expected) break;
        }
        const actual = [...set.values()];
        assert.lengthOf(actual, expected);
      });
    });
  });
}


