import {SeqTags, TaggedSeq} from "../lib/common";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {describe} from "mocha";
import {FilterMapSeqImpl} from "../lib/filter-map-seq";

function createSut<T>(optimized: boolean) {
  return <T>(input?: Iterable<T>): FilterMapSeqImpl<T> => {
    const seq = FilterMapSeqImpl.create(input ?? [], {map: x => x});
    if (optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}

class FilterMapSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class FilterMapSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class FilterMapSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class FilterMapSeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class FilterMapSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected readonly createSut = createSut(this.optimized);
}

export class FilterMapSeqImpl_Tests {
  protected readonly createSut = createSut(this.optimized);

  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('FilterMapSeqImpl', () => {
    new FilterMapSeqImpl_Deferred_GetIterator_Tests(this.optimized).run();
    new FilterMapSeqImpl_Deferred_Tests(this.optimized).run();
    new FilterMapSeqImpl_Immediate_Tests(this.optimized).run();
    new FilterMapSeqImpl_SortedSeq_Tests(this.optimized).run();
    new FilterMapSeqImpl_CachedSeq_Tests(this.optimized).run();
  });
}
