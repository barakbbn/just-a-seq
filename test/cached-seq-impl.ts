import {describe} from "mocha";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {CachedSeqImpl} from "../lib/cached-seq";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {array} from "./test-data";
import {assert} from "chai";
import {SeqTags, TaggedSeq} from "../lib/common";

function createSut<T>(optimize: boolean) {
  return <T>(input?: Iterable<T>) => {
    const seq = new CachedSeqImpl(input ?? []);
    if (optimize) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}

class CachedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class CachedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class CachedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class CachedSeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class CachedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected readonly createSut = createSut(this.optimized);
}

export class CachedSeqImpl_Tests {
  protected readonly createSut = createSut(this.optimized);

  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('CachedSeqImpl', () => {
    new CachedSeqImpl_Deferred_GetIterator_Tests(this.optimized).run();
    new CachedSeqImpl_Deferred_Tests(this.optimized).run();
    new CachedSeqImpl_Immediate_Tests(this.optimized).run();
    new CachedSeqImpl_SortedSeq_Tests(this.optimized).run();
    new CachedSeqImpl_CachedSeq_Tests(this.optimized).run();

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

