import {SeqOfMultiGroupsImpl} from "../lib/grouped-seq";
import {describe} from "mocha";
import {SeqTags, TaggedSeq} from "../lib/common";
import {SeqOfMultiGroups} from "../lib";


export class SeqOfMultiGroupsImpl_Tests {
  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('SeqOfMultiGroupsImpl', () => {
    // TODO
  });

  createSut<K, T>(input?: Iterable<T>): SeqOfMultiGroups<[K], T> {
    const seq = SeqOfMultiGroupsImpl.create<K, T, T>(input ?? []);
    if (this.optimized) (seq as TaggedSeq)[SeqTags.$optimize] = true;
    return seq;
  }
}
