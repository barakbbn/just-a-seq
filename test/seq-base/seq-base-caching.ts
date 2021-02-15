import {Seq} from "../../lib";
import {assert} from "chai";
import {describe, it} from "mocha";

export abstract class SeqBase_CachedSeq_Tests {
  readonly run = () => describe('SeqBase - cache()', () => {
    it('should return same instance if calling cache again', () => {
      const expected = this.createSut().cache();
      const actual = expected.cache();

      assert.equal(actual, expected);
    });
  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}
