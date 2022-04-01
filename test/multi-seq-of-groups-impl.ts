import {SeqOfMultiGroupsImpl} from "../lib/grouped-seq";
import {describe} from "mocha";
import {assert} from "chai";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {SeqBase_Change_Source_Tests} from "./seq-base/seq-base-change-source";
import {SeqTags, TaggedSeq} from "../lib/common";
import {Seq, SeqOfMultiGroups} from "../lib";
import {SeqBase} from "../lib/seq-base";

function createSut<T>(optimized: boolean) {
  return <T>(input?: Iterable<T>) => {
    const seq = SeqOfMultiGroupsImpl.create(input ?? []);
    if (optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  };
}

class SeqOfMultiGroupsImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => Seq<T>);
}

class SeqOfMultiGroupsImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => Seq<T>);
}

class SeqOfMultiGroupsImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => SeqBase<T>);
}

class SeqOfMultiGroupsImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => Seq<T>);
}

class SeqOfMultiGroupsImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => Seq<T>);
}

class SeqOfMultiGroupsImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => Seq<T>);

}

class SeqOfMultiGroupsImpl_Change_Source_Tests extends SeqBase_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized) as unknown as (<T>(input?: Iterable<T>) => SeqBase<T>);
}

export class SeqOfMultiGroupsImpl_Tests {
  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('SeqOfMultiGroupsImpl_', () => {
    // new SeqOfMultiGroupsImpl_Deferred_GetIterator_Tests(this.optimized).run();
    // new SeqOfMultiGroupsImpl_Deferred_Tests(this.optimized).run();
    // new SeqOfMultiGroupsImpl_Immediate_Tests(this.optimized).run();
    // new SeqOfMultiGroupsImpl_SortedSeq_Tests(this.optimized).run();
    // new SeqOfMultiGroupsImpl_CachedSeq_Tests(this.optimized).run();
    // new SeqOfMultiGroupsImpl_Grouping_Tests(this.optimized).run();
    // new SeqOfMultiGroupsImpl_Change_Source_Tests(this.optimized).run();
  });

  createSut<K, T>(input?: Iterable<T>): SeqOfMultiGroups<[K], T> {
    const seq = SeqOfMultiGroupsImpl.create<K, T, T>(input ?? []);
    if (this.optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}
