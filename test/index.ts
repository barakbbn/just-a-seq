import {SeqImpl_Tests} from './seq-impl';
import {CachedSeqImpl_Tests} from './cached-seq-impl';
import {OrderedSeqImpl_Tests} from './ordered-seq-impl';
import {SeqFactory_Tests} from './seq-factory';

describe('just-a-seq', ()=>{
  new SeqImpl_Tests().run();
  new SeqFactory_Tests().run();
  new CachedSeqImpl_Tests().run();
  new OrderedSeqImpl_Tests().run();
});
