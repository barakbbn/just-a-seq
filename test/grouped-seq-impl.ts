import {GroupedSeqImpl} from "../lib/grouped-seq";
import {describe} from "mocha";
import {assert} from "chai";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";

function createSut<T>(input?: Iterable<T>): GroupedSeqImpl<string, T> {
  return new GroupedSeqImpl('key', input ?? []);
}

class GroupedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut
}

class GroupedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut
}

class GroupedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut
}

class GroupedSeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut
}

class GroupedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut
}

class GroupedSeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut

}

export class GroupedSeqImpl_Tests {
  readonly run = () => describe('GroupedSeqImpl', () => {
    new GroupedSeqImpl_Deferred_GetIterator_Tests().run();
    new GroupedSeqImpl_Deferred_Tests().run();
    new GroupedSeqImpl_Immediate_Tests().run();
    new GroupedSeqImpl_SortedSeq_Tests().run();
    new GroupedSeqImpl_CachedSeq_Tests().run();
    new GroupedSeqImpl_Grouping_Tests().run();

    describe('key property', () => {
      it('should return value that was set in creation', () => {
        for (const key of [1, 'key', true, false, Symbol.iterator, new Date(2021, 1, 1), null, undefined, '']) {
          const sut = this.createSut(key);
          assert.equal(sut.key, key);
        }
      });
    });
  });

  createSut<K, T>(key: K, input?: Iterable<T>): GroupedSeqImpl<K, T> {
    return new GroupedSeqImpl(key, input ?? []);
  }
}
