import {createSeq} from "../lib/seq-impl";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {describe, it} from "mocha";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {array, generator} from "./test-data";
import {assert} from "chai";
import {SeqBase_Immutable_Tests} from "./seq-base/seq-base-immutable";
import {SeqBase_Close_Iterator_Tests} from "./seq-base/seq-base-close-iterator";
import {Seq} from "../lib";
import {SeqBase} from "../lib/seq-base";

function createSut<T>(input: Iterable<T>): SeqBase<T> {
  return createSeq(input);
}

class SeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  createSut<T>(input: Iterable<T>): Seq<T> {
    return createSeq(input);
  }
}

class SeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut
}

class SeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut
}

class SeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut
}

class SeqIImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut
}

class SeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut
}

class SeqImpl_Immutable_Tests extends SeqBase_Immutable_Tests {
  protected createSut = createSut
}

class SeqImpl_Close_Iterator_Tests extends SeqBase_Close_Iterator_Tests {
  protected createSut = createSut
}

export class SeqImpl_Tests {
  protected createSut = createSut;

  readonly run = () => describe('SeqImpl', () => {
    new SeqImpl_Deferred_GetIterator_Tests().run();
    new SeqImpl_Deferred_Tests().run();
    new SeqImpl_Immediate_Tests().run();
    new SeqImpl_SortedSeq_Tests().run();
    new SeqIImpl_CachedSeq_Tests().run();
    new SeqImpl_Grouping_Tests().run();
    new SeqImpl_Immutable_Tests().run();
    new SeqImpl_Close_Iterator_Tests().run();

    describe('cache()', () => {
      it('should return same items on re-consume although source sequence changed', () => {
        const source = array.oneToTen;
        const sut = this.createSut(source);
        const cached = sut.cache();
        const actualAfterCache = [...cached];
        assert.sameOrderedMembers(actualAfterCache, source);

        // Change source
        source.pop(); // 1 - 9
        const actualBeforeCache = [...sut];
        assert.sameOrderedMembers(actualBeforeCache, source);

        const actualAfterCache2 = [...cached];
        assert.sameOrderedMembers(actualAfterCache2, actualAfterCache);
      });
    });

    describe('all()', () => {
      describe("On non-empty sequence", () => {
        it("Return true if any item match a condition and the source is endless", () => {
          const alwaysTrueCondition = () => true;

          const sut = this.createSut(generator.endlessFalsySequence());

          const actual = sut.any(alwaysTrueCondition);
          assert.isTrue(actual);
        });

        it("Return false if at least one item doesn't pass the condition and the source is endless", () => {

          const alwaysFalseCondition = () => false;
          const sut = this.createSut(generator.endlessTruthySequence());

          assert.isFalse(sut.all(alwaysFalseCondition));
        });
      });
    });
  });
}

