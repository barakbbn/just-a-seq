import {describe} from "mocha";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {CachedSeqImpl} from "../lib/cached-seq";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Ordering_Tests} from "./seq-base/seq-base-ordering";

function createSut<T>(input?: Iterable<T>): CachedSeqImpl<T> {
  return new CachedSeqImpl(input ?? []);
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

class CachedSeqImpl_OrderedSeq_Tests extends SeqBase_Ordering_Tests {
  protected readonly createSut = createSut
}

class CachedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected readonly createSut = createSut;
}

export class CachedSeqImpl_Tests {

  readonly run = () => describe('CachedSeqImpl', () => {
    new CachedSeqImpl_Deferred_GetIterator_Tests().run();
    new CachedSeqImpl_Deferred_Tests().run();
    new CachedSeqImpl_Immediate_Tests().run();
    new CachedSeqImpl_OrderedSeq_Tests().run();
    new CachedSeqImpl_CachedSeq_Tests().run();
  });
}

