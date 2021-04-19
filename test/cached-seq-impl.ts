import {describe} from "mocha";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {CachedSeqImpl} from "../lib/cached-seq";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {array} from "./test-data";
import {assert} from "chai";
import {Seq} from "../lib";
import {SeqTags, TaggedSeq} from "../lib/common";

function createSut<T>(input?: Iterable<T>): CachedSeqImpl<T> {
  const seq = new CachedSeqImpl(input ?? []);
  if (Seq.enableOptimization) (seq as TaggedSeq)[SeqTags.$optimize] = true;
  return seq;
}

class CachedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected readonly createSut = createSut
}

class CachedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected readonly createSut = createSut
}

class CachedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected readonly createSut = createSut
}

class CachedSeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected readonly createSut = createSut
}

class CachedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected readonly createSut = createSut;
}

export class CachedSeqImpl_Tests {

  protected readonly createSut = createSut;

  readonly run = () => describe('CachedSeqImpl', () => {
    new CachedSeqImpl_Deferred_GetIterator_Tests().run();
    new CachedSeqImpl_Deferred_Tests().run();
    new CachedSeqImpl_Immediate_Tests().run();
    new CachedSeqImpl_SortedSeq_Tests().run();
    new CachedSeqImpl_CachedSeq_Tests().run();

    describe('source is array', () => {
      it('should contain exactly same items as if sequence iterated', () => {
        const source = array.oneToTen;
        let sut = this.createSut(source);
        let expected = sut.array;
        let actual = [...sut];
        assert.deepEqual(actual, expected);

        sut = this.createSut(source);
        actual = [...sut];
        expected = sut.array;
        assert.deepEqual(actual, expected);
      });
    });
  });
}

