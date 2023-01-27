import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {describe, it} from "mocha";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {assert} from "chai";
import {SeqBase_Immutable_Tests} from "./seq-base/seq-base-immutable";
import {SeqBase_Close_Iterator_Tests} from "./seq-base/seq-base-close-iterator";
import {SeqBase} from "../lib/seq-base";
import {SeqBase_Deferred_Change_Source_Tests} from "./seq-base/seq-base-deferred-change-source";
import {SeqTags} from "../lib/common";
import {array, TestableDerivedSeq} from "./test-data";
import {TestIt} from "./test-harness";
import {SeqBase_Immediate_Change_Source_Tests} from "./seq-base/seq-base-immediate-change-source";


function createSut<T>(optimized: boolean) {
  return <T>(input?: Iterable<T>, ...tags: [tag: symbol, value: any][]): SeqBase<T> => {
    if (optimized) tags.push([SeqTags.$optimize, true]);
    return new TestableDerivedSeq(input, tags);
  };
}

class DerivedSeq_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_Immutable_Tests extends SeqBase_Immutable_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_Close_Iterator_Tests extends SeqBase_Close_Iterator_Tests {
  protected createSut = createSut(this.optimized);
}

class DerivedSeq_Deferred_Change_Source_Tests extends SeqBase_Deferred_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class DerivedSeq_Immediate_Change_Source_Tests extends SeqBase_Immediate_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

export class DerivedSeq_Tests extends TestIt {
  protected createSut = createSut(this.optimized);

  constructor(optimized: boolean) {
    super(optimized);
  }

  readonly run = () => describe('DerivedImpl', () => {
    new DerivedSeq_Deferred_GetIterator_Tests(this.optimized).run();
    new DerivedSeq_Deferred_Tests(this.optimized).run();
    new DerivedSeq_Immediate_Tests(this.optimized).run();
    new DerivedSeq_SortedSeq_Tests(this.optimized).run();
    new DerivedSeq_CachedSeq_Tests(this.optimized).run();
    new DerivedSeq_Grouping_Tests(this.optimized).run();
    new DerivedSeq_Immutable_Tests(this.optimized).run();
    new DerivedSeq_Deferred_Change_Source_Tests(this.optimized).run();
    new DerivedSeq_Close_Iterator_Tests(this.optimized).run();
    new DerivedSeq_Immediate_Change_Source_Tests(this.optimized).run();

    if (this.optimized) {
      describe('isEmpty()', () => {
        it("should return true if sequence is tagged as empty", () => {
          let sut = this.createSut(array.oneToTen, [SeqTags.$maxCount, 0]);
          let actual = sut.isEmpty();
          assert.isTrue(actual);
        });
      });

      describe('padEnd()', () => {
        this.it1('should return the source sequence instance, when padding count is known to be less than or same as the source sequence length',
          array.oneToTen, (input, inputArray) => {
            const expected = this.createSut(input).take(inputArray.length);
            let actual = expected.padEnd(1, 0); // less than source sequence length
            assert.equal(actual, expected);
            actual = expected.padEnd(inputArray.length, 0); // same length as source sequence
            assert.equal(actual, expected);
          });
      });
    }

    describe('takeLast()', () => {
      it('should optimize by not iterating all the items if source is an array', () => {
        const iteratedIndexes: number[] = [];
        const source = new Proxy(array.oneToTen, {
          get(target: number[], p: string, receiver: any): any {
            const asInt = Number.parseInt(p);
            if (Number.isInteger(asInt)) iteratedIndexes.push(asInt);
            return Reflect.get(target, p, receiver);
          }
        });
        const count = 2;
        const expected = new Array<number>(count).fill(0).map((_, i) => source.length - count + i);
        const sut = this.createSut(source);
        for (let _ of sut.takeLast(2)) {
        }
        assert.sameOrderedMembers(iteratedIndexes, expected);
      });
    });
  });
}


