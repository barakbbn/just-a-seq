import {GroupedSeqImpl} from "../lib/grouped-seq";
import {describe} from "mocha";
import {assert} from "chai";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {SeqBase_Deferred_Change_Source_Tests} from "./seq-base/seq-base-deferred-change-source";
import {SeqTags, TaggedSeq} from "../lib/common";
import {SeqBase_Immediate_Change_Source_Tests} from "./seq-base/seq-base-immediate-change-source";

function createSut<T>(optimized: boolean) {
  return <T>(input?: Iterable<T>): GroupedSeqImpl<string, T> => {
    const seq = new GroupedSeqImpl('key', input ?? []);
    if (optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  };
}

class GroupedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut(this.optimized);
}

class GroupedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut(this.optimized);
}

class GroupedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut(this.optimized);
}

class GroupedSeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut(this.optimized);
}

class GroupedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut(this.optimized);
}

class GroupedSeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut(this.optimized);

}

class GroupedSeqImpl_Deferred_Change_Source_Tests extends SeqBase_Deferred_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class GroupedSeqImpl_Immediate_Change_Source_Tests extends SeqBase_Immediate_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

export class GroupedSeqImpl_Tests {
  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('GroupedSeqImpl', () => {
    new GroupedSeqImpl_Deferred_GetIterator_Tests(this.optimized).run();
    new GroupedSeqImpl_Deferred_Tests(this.optimized).run();
    new GroupedSeqImpl_Immediate_Tests(this.optimized).run();
    new GroupedSeqImpl_SortedSeq_Tests(this.optimized).run();
    new GroupedSeqImpl_CachedSeq_Tests(this.optimized).run();
    new GroupedSeqImpl_Grouping_Tests(this.optimized).run();
    new GroupedSeqImpl_Deferred_Change_Source_Tests(this.optimized).run();
    new GroupedSeqImpl_Immediate_Change_Source_Tests(this.optimized).run();

    describe('key property', () => {
      it('should return value that was set in creation', () => {
        for (const key of [1, 'key', true, false, Symbol.iterator, new Date(2021, 1, 1), null, undefined, '']) {
          const sut = this.createSut(key);
          assert.strictEqual(sut.key, key);
        }
      });
    });
  });

  createSut<K, T>(key: K, input?: Iterable<T>): GroupedSeqImpl<K, T> {
    const seq = new GroupedSeqImpl(key, input ?? []);
    if (this.optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}
