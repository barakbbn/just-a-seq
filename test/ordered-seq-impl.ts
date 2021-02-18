import {describe} from "mocha";
import {OrderedSeqImpl} from "../lib/ordered-seq";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {SeqBase_Ordering_Tests} from "./seq-base/seq-base-ordering";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {DONT_COMPARE} from "../lib/common";
import {array} from "./test-data";
import {assert} from "chai";

function createSut<T>(input: Iterable<T>): OrderedSeqImpl<T> {
  return OrderedSeqImpl.create(input ?? [], undefined, DONT_COMPARE);
}

class OrderedSeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_OrderedSeq_Tests extends SeqBase_Ordering_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut
}

class OrderedSeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut

}

export class OrderedSeqImpl_Tests {

  protected createSut = createSut

  readonly run = () => describe('OrderedSeqImpl', () => {
    new OrderedSeqImpl_Deferred_GetIterator_Tests().run();
    new OrderedSeqImpl_Deferred_Tests().run();
    new OrderedSeqImpl_Immediate_Tests().run();
    new OrderedSeqImpl_OrderedSeq_Tests().run();
    new OrderedSeqImpl_CachedSeq_Tests().run();
    new OrderedSeqImpl_Grouping_Tests().run();

    describe('takeLast()', () => {
      it('should return last item after ordering', () => {
        const input = array.oneToTen;
        const expected = input.slice(0, 1);
        const sut = OrderedSeqImpl.create(input ?? [], undefined, (a, b) => b - a);
        const last = sut.takeLast(1);
        const actual = [...last];
        assert.sameOrderedMembers(actual, expected);
      });
    });
  });

}

