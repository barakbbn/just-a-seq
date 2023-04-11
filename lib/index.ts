import {factories, Seq, SeqOfGroups} from './seq';
import type {Selector, ToComparableKey} from './seq';

import {createSeq} from './seq-impl';
import {CachedSeqImpl} from './cached-seq';
import {SortedSeqImpl} from './sorted-seq';
import {SeqOfMultiGroupsImpl} from './grouped-seq';
import {FilterMapSeqImpl} from './filter-map-seq';

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const writableFactories = factories as Writeable<typeof factories>;

if (!factories.Seq) writableFactories.Seq =
  createSeq as <T, U = T, TSeq extends Iterable<T> = Iterable<T>>(source?: Iterable<T>,
                                                                  generator?: (source: TSeq) => Iterator<U>,
                                                                  tags?: readonly [tag: symbol, value: any][]) => Seq<U>;

if (!factories.CachedSeq) writableFactories.CachedSeq = CachedSeqImpl.create;
if (!factories.SortedSeq) writableFactories.SortedSeq = SortedSeqImpl.create;
if (!factories.SeqOfGroups) writableFactories.SeqOfGroups =
  SeqOfMultiGroupsImpl.create as unknown as <K, T = K, U = T>(source: Iterable<T>,
                                                              keySelector?: Selector<T, K>,
                                                              toComparableKey?: ToComparableKey<K>,
                                                              valueSelector?: (x: T, index: number, key: K) => U) => SeqOfGroups<K, U>;
if (!factories.FilterMapSeq) writableFactories.FilterMapSeq = FilterMapSeqImpl.create;

export * from './seq';
export {Seq, asSeq} from './seq-factory';
