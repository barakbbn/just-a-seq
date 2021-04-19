import {SeqImpl_Tests} from './seq-impl';
import {CachedSeqImpl_Tests} from './cached-seq-impl';
import {SortedSeqImpl_Tests} from './sorted-seq-impl';
import {SeqFactory_Tests} from './seq-factory';
import {GroupedSeqImpl_Tests} from "./grouped-seq-impl";
import {Seq} from "../lib";

Seq.enableOptimization = true;

describe('just-a-seq', () => {
  new SeqImpl_Tests().run();
  new SeqFactory_Tests().run();
  new CachedSeqImpl_Tests().run();
  new SortedSeqImpl_Tests().run();
  new GroupedSeqImpl_Tests().run();
});
