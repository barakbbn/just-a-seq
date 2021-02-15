
import {factories} from "./seq";

if(!factories.Seq) factories.Seq = require('./seq-impl').SeqImpl.create;
if(!factories.CachedSeq) factories.CachedSeq = require('./cached-seq').CachedSeqImpl.create;
if(!factories.OrderedSeq) factories.OrderedSeq = require('./ordered-seq').OrderedSeqImpl.create;
if(!factories.GroupedSeq) factories.GroupedSeq = require('./grouped-seq').GroupedSeqImpl.create;
if(!factories.SeqOfGroups) factories.SeqOfGroups = require('./grouped-seq').SeqOfMultiGroupsImpl.create;


export * from './seq';
export * from './seq-factory';
