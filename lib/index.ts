import {factories} from "./seq";

if (!factories.Seq) factories.Seq = require('./seq-impl').createSeq;
if (!factories.CachedSeq) factories.CachedSeq = require('./cached-seq').CachedSeqImpl.create;
if (!factories.SortedSeq) factories.SortedSeq = require('./sorted-seq').SortedSeqImpl.create;
if (!factories.GroupedSeq) factories.GroupedSeq = require('./grouped-seq').GroupedSeqImpl.create;
if (!factories.SeqOfGroups) factories.SeqOfGroups = require('./grouped-seq').SeqOfMultiGroupsImpl.create;
if (!factories.FilterMapSeq) factories.FilterMapSeq = require('./filter-map-seq').FilterMapSeqImpl.create;

export * from './seq';
export * from './seq-factory';
