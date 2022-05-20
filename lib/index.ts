import {factories} from "./seq";
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const writableFactories = factories as Writeable<typeof factories>;
if (!factories.Seq) writableFactories.Seq = require('./seq-impl').createSeq;
if (!factories.CachedSeq) writableFactories.CachedSeq = require('./cached-seq').CachedSeqImpl.create;
if (!factories.SortedSeq) writableFactories.SortedSeq = require('./sorted-seq').SortedSeqImpl.create;
if (!factories.SeqOfGroups) writableFactories.SeqOfGroups = require('./grouped-seq').SeqOfMultiGroupsImpl.create;
if (!factories.FilterMapSeq) writableFactories.FilterMapSeq = require('./filter-map-seq').FilterMapSeqImpl.create;

export * from './seq';
export {Seq, asSeq} from './seq-factory';
export {Seq as Optimized} from './optimized'
