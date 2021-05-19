import {SeqImpl_Tests} from './seq-impl';
import {CachedSeqImpl_Tests} from './cached-seq-impl';
import {SortedSeqImpl_Tests} from './sorted-seq-impl';
import {SeqFactory_Tests} from './seq-factory';
import {GroupedSeqImpl_Tests} from "./grouped-seq-impl";
import {Seq} from "../lib";
import {FilterMapSeqImpl_Tests} from "./filter-map-seq-impl";

describe('just-a-seq', () => {
  new SeqImpl_Tests(Seq.enableOptimization).run();
  new SeqFactory_Tests(Seq.enableOptimization).run();
  new CachedSeqImpl_Tests(Seq.enableOptimization).run();
  new SortedSeqImpl_Tests(Seq.enableOptimization).run();
  new GroupedSeqImpl_Tests(Seq.enableOptimization).run();
  new FilterMapSeqImpl_Tests(Seq.enableOptimization).run();
});

describe('just-a-seq/optimized', () => {
  Seq.enableOptimization = true;
  new SeqImpl_Tests(Seq.enableOptimization).run();
  new SeqFactory_Tests(Seq.enableOptimization).run();
  new CachedSeqImpl_Tests(Seq.enableOptimization).run();
  new SortedSeqImpl_Tests(Seq.enableOptimization).run();
  new GroupedSeqImpl_Tests(Seq.enableOptimization).run();
  new FilterMapSeqImpl_Tests(Seq.enableOptimization).run();
});
