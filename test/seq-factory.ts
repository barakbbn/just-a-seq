import {assert} from "chai";
import {array} from "./test-data";
import {asSeq, empty, indexes, Optimized, random, range, repeat} from "../lib";
import {createSeq} from "../lib/seq-impl";
import {describe} from "mocha";

export class SeqFactory_Tests {
  constructor(protected optimized: boolean) {
  }

  get asSeq() {
    return this.optimized ? Optimized.asSeq : asSeq;
  }

  get empty() {
    return this.optimized ? Optimized.empty : empty;
  }

  get indexes() {
    return this.optimized ? Optimized.indexes : indexes;
  }

  get random() {
    return this.optimized ? Optimized.random : random;
  }

  get range() {
    return this.optimized ? Optimized.range : range;
  }

  get repeat() {
    return this.optimized ? Optimized.repeat : repeat;
  }

  readonly run = () => describe('Seq Factories', () => {
    describe('asSeq()', () => {
      it('should create new SeqImpl instance that produce provided array', () => {
        let sut = asSeq<number>([]);
        assert.sameOrderedMembers([...sut], []);

        sut = asSeq(array.oneToTen);
        assert.sameOrderedMembers([...sut], array.oneToTen);

        sut = asSeq(createSeq(array.oneToTen));
        assert.sameOrderedMembers([...sut], array.oneToTen);
      });

      it('should create new SeqImpl instance that produce provided Iterable', () => {
        let sut = this.asSeq<number>([].values());
        assert.sameOrderedMembers([...sut], []);

        const input = array.oneToTen;

        sut = this.asSeq(input.values());
        assert.sameOrderedMembers([...sut], input);

        sut = this.asSeq(createSeq(input));
        assert.sameOrderedMembers([...sut], input);
      });

      it('should create new SeqImpl instance that produce provided generator',  () => {
        function* emptyGenerator() {
        }

        let sut = this.asSeq<number>(emptyGenerator);
        assert.sameOrderedMembers([...sut], []);

        const input = array.oneToTen;

        function* generator() {
          yield* input;
        }

        sut = this.asSeq(generator);
        assert.sameOrderedMembers([...sut], input);
      });

      it('should create new SeqImpl instance that produce provided generator and custom this', () => {
        const input = array.oneToTen;

        class GeneratorTester {
          constructor(private readonly input: number[]) {
          }

          * generate() {
            yield* this.input;
          }
        }

        const generator = new GeneratorTester(input);
        const sut = this.asSeq(() => generator.generate());
        assert.sameOrderedMembers([...sut], input);
      });
    });

    describe('empty()', () => {
      it('should return same singleton instance', () => {
        assert.strictEqual(this.empty<number>(), this.empty<any>());
      });

      it('should use anonymous object as generic type parameter', () => {
        const input = array.samples;
        const sut = this.empty(input[0]);
        sut.append(input[1]); // This should compile by typescript
      });
    });

    describe('range()', () => {
      it('should produce new sequence with numbers from start to end', () => {
        const sut = this.range(1, 10);
        const expected = array.oneToTen;
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should produce new infinite sequence with numbers from start', () => {
        const start = -1;
        const sut = this.range(start);
        const expected = Array.from({length: 20}, (v, i) => start + i);
        const actual: number[] = [];

        for (const item of sut) {
          actual.push(item);
          if (actual.length === expected.length) break;
        }
        assert.sameOrderedMembers(actual, expected);
      });

      it('should produce new sequence with numbers from start to end with with given step', () => {
        const sut = this.range(0, 10, 2);
        const expected = [0, 2, 4, 6, 8, 10];
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should throws if step is zero', () => {
        const zeroStep = 0;
        assert.throws(() => this.range(1, 10, zeroStep));
      });

      it('should throws if start is NaN', () => {
        const nanStart = Number.NaN;
        assert.throws(() => this.range(nanStart, 10));
      });

      it('should throws if start is Infinite', () => {
        assert.throws(() => this.range(Number.POSITIVE_INFINITY, 10));
        assert.throws(() => this.range(Number.NEGATIVE_INFINITY, 10));
      });

      it('should produce new sequence with numbers when start is greater than end', () => {
        const sut = this.range(10, -10);
        const expected = array.oneToTen.reverse().concat(array.zeroToTen.map(n => -n));
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });

      it('should produce new sequence with 1 number when start equals end', () => {
        const singleValue = 3;
        const sut = this.range(singleValue, singleValue);
        const actual = [...sut];
        assert.sameOrderedMembers(actual, [singleValue])
      });

      it('should produce new sequence with last value less than end if step skip the end value', () => {
        const sut = this.range(0, 7, 3);
        const expected = [0, 3, 6];
        const actual = [...sut];
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('indexes()', () => {
      it('should produce sequence of zero based indexes as the provided count', () => {
        const sut = this.indexes(10);
        const actual = [...sut];
        const expected = array.zeroToNine;
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('repeat()', () => {
      it('should produce sequence of provided value repeated as the number provided count', () => {
        const count = 10;
        const value = 'value';
        const sut = this.repeat(value, count);
        const actual = [...sut];
        const expected = Array(count).fill(value);
        assert.sameOrderedMembers(actual, expected);
      });
    });

    describe('random()', () => {
      it('should generate endless random numbers', () => {
        const sut = this.random();
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


