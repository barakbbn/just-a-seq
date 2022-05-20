import {KeyedSeq, Seq, SeqOfGroups} from "../../lib";
import {describe, it} from "mocha";
import {array, generator, Sample} from "../test-data";
import {assert} from "chai";
import {SeqTags} from "../../lib/common";

export abstract class SeqBase_Grouping_Tests {
  constructor(protected optimized: boolean) {
  }

  it2<T, U = T>(title: string, first: T[], second: U[], testFn: (first: Iterable<T>, second: Iterable<U>) => void) {
    it(title + ' - first array, second array', () => testFn(first, second));
    it(title + ' - first array, second generator', () => testFn(first, generator.from(second)));
    it(title + ' - first array, second sequence', () => testFn(first, this.createSut(second)));

    it(title + ' - first generator, second array', () => testFn(generator.from(first), second));
    it(title + ' - first generator, second generator', () => testFn(generator.from(first), generator.from(second)));
    it(title + ' - first generator, second sequence', () => testFn(generator.from(first), this.createSut(second)));

    it(title + ' - first sequence, second array', () => testFn(this.createSut(first), second));
    it(title + ' - first sequence, second generator', () => testFn(this.createSut(first), generator.from(second)));
    it(title + ' - first sequence, second sequence', () => testFn(this.createSut(first), this.createSut(second)));
  }

  it<T, U = T>(title: string, input: T[], testFn: (input: Iterable<T>, inputArray: T[]) => void): void {
    it(title + ' - array', () => testFn(input, input));
    it(title + ' - generator', () => testFn(generator.from(input), input));
    it(title + ' - sequence', () => testFn(this.createSut(input), input));
  }

  readonly run = () => describe("SeqBase - Grouping", () => {
    describe('groupBy()', () => {
      this.it('should return sequence of groups by key-selector of primitive (comparable) key - numbers', array.oneToTen, (input) => {
        const expectedMap = new Map<number, number[]>();
        [...input].forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
        const expected = [...expectedMap.entries()];

        const sut = this.createSut(input).groupBy(n => n % 3);
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        assert.deepEqual(actual, expected);
      });

      this.it('should return sequence of groups by key-selector of primitive (comparable) key - objects', array.samples, (input, inputArray) => {
        const expectedMap = new Map<string, any>();
        inputArray.forEach(s => expectedMap.set(s.type, [...(expectedMap.get(s.type) || []), s]));
        const expected = [...expectedMap.entries()];

        const sut = this.createSut(input).groupBy(g => g.type);
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        assert.deepEqual(actual, expected);
      });

      this.it('should return sequence of groups by key-selector of some object and to-comparable-key selector', array.samples, (input) => {
        const expectedMap = new Map<string, any[]>();
        [...input].forEach(s => {
          const key = s.type + s.ok ? '+' : '-';
          expectedMap.set(key, [...(expectedMap.get(key) || []), s]);
        });
        const expected = [...expectedMap.entries()].map(([, items]) => [{
          type: items[0].type,
          ok: items[0].ok
        }, items]);

        const sut = this.createSut(input).groupBy(
          s => ({type: s.type, ok: s.ok}),
          ({type, ok}) => type + ok ? '+' : '-');
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        assert.deepEqual(actual, expected);
      });

      this.it(`should group items into hierarchy when iterating each group's items and before moving to the next group`, array.oneToTen, (input) => {
        const expectedMap = new Map<number, number[]>();
        [...input].forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
        const expectedValues = [...expectedMap.values()];

        const sut = this.createSut(input).groupBy(n => n % 3);
        const actualGroups: number[] = [];
        let index = 0;
        for (const group of sut) {
          actualGroups.push(group.key);
          const actual = [...group];
          assert.deepEqual(actual, expectedValues[index++]);
        }

        assert.deepEqual(actualGroups, [...expectedMap.keys()]);
      });

      this.it(`should group items into hierarchy when iterating some of the groups' items and before moving to the next group`, array.oneToTen, input => {
        const expectedMap = new Map<number, number[]>();
        [...input].forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
        const expectedValues = [...expectedMap.values()];

        const sut = this.createSut(input).groupBy(n => n % 3);
        const actualGroups: number[] = [];
        let index = 0;
        for (const group of sut) {
          actualGroups.push(group.key);
          if (index % 1 == 0) {
            const actual = [...group];
            assert.deepEqual(actual, expectedValues[index++]);
          }
        }

        assert.deepEqual(actualGroups, [...expectedMap.keys()]);
      });

      this.it('should produce same result when iterated more than once', array.oneToTen, input => {
        const expectedMap = new Map<number, number[]>();
        [...input].forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
        const expected = [...expectedMap.entries()];

        const sut = this.createSut(input).groupBy(n => n % 3);
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        const actualGrouped2 = [...sut];
        const actual2 = actualGrouped2.map(group => [group.key, [...group]]);

        assert.deepEqual(actual2, actual);
        assert.deepEqual(actual2, expected);
      });

      this.it('should filter grouped sequences as expected', array.samples, input => {
        const expectedMap = new Map<string, Sample[]>();
        for (const s of input) {
          const items = expectedMap.get(s.type) ?? [];
          items.push(s);
          expectedMap.set(s.type, items);
        }
        const expectedSet = new Set<number>();
        for (const samples of expectedMap.values()) {
          if (samples.length <= 5) continue;
          samples.map(s => s.score).forEach(s => expectedSet.add(s));
        }
        const expected = [...expectedSet];

        const sut = this.createSut(input)
          .groupBy(s => s.type)
          .filter(group => group.hasAtLeast(6))
          .flat()
          .map(s => s.score)
          .distinct()

        const actual = [...sut];

        assert.deepEqual(actual, expected);
      });

      this.it('should be able to iterate child grouped-sequence after main sequence closed', array.samples, input => {
        const firstItem = array.samples[0];
        const expected = [...input].filter(s => s.type === firstItem.type)
        const sut = this.createSut(input).groupBy(s => s.type);
        let [firstGroup] = sut; // will take first child grouped-sequence and close the iterator returned by sut
        const actual = [...firstGroup];
        assert.deepEqual(actual, expected);
      });

      this.it('should return empty sequence when source sequence is empty', [], (input: Iterable<number>) => {
        const sut = this.createSut(input).groupBy(s => s > 5);
        const actual = [...sut];
        assert.lengthOf(actual, 0);
      });

      this.it('should map items in group by provided selector', array.oneToTen, (input, inputArray) => {
        const expectedMap = new Map<number, number[]>();
        inputArray.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n * 2]));
        const expected = [...expectedMap.entries()];
        const expectedKeys = inputArray.map(n => n % 3);
        const expectedIndexes = inputArray.map((n, i) => i);

        const actualIndexes: number[] = [];
        const actualKeys: number[] = [];
        const sut = this.createSut(input).groupBy(
          n => n % 3,
          undefined,
          (n, index, key) => {
            actualIndexes.push(index);
            actualKeys.push(key);
            return n * 2;
          });
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        assert.deepEqual(actual, expected);
        assert.deepEqual(actualKeys, expectedKeys);
        assert.deepEqual(actualIndexes, expectedIndexes);
      });

      describe('thenGroupBy()', () => {
        type ScoreLevel = 'low' | 'middle' | 'high';

        function expectedSamplesHierarchy() {
          const input = array.samples;

          const expected = new Map<boolean, Map<string, Map<number, Sample[]>>>();
          // Level 1
          input.forEach(s => expected.set(s.ok, [...(expected.get(s.ok) || []), s] as any));
          // Level 2
          expected.forEach((items, key) => {
            const map = new Map<string, Sample[]>();
            const samples = items as unknown as Sample[];
            samples.forEach(s => map.set(s.type, [...(map.get(s.type) || []), s]));
            expected.set(key, map as any);
          });
          // Level 3
          expected.forEach(mapByType => mapByType.forEach((items, key) => {
            const map = new Map<number, Sample[]>();
            const samples = items as unknown as Sample[];
            samples.forEach(s => map.set(s.period, [...(map.get(s.period) || []), s]));
            mapByType.set(key, map as any);
          }));

          return {expected, input};
        }

        function expectedSamplesHierarchyWithComplexKeyAndComparableKeys() {
          const input = array.samples;

          const expected = new Map<{ ok: boolean; type: string; }, Map<{ scoreLevel: string; }, Map<{ period: number; scoreAbovePeriod: boolean; }, Sample[]>>>();

          const level1 = {
            cache: new Map<string, { ok: boolean; type: string; }>(),
            comparableKey: (key: { ok: boolean; type: string; }) => key.type + (key.ok ? '+' : '-'),
            key: (s: Sample) => ({ok: s.ok, type: s.type}),
            cachedKey(s: Sample) {
              const [key, comparable] = [this.key(s), this.comparableKey(s)];
              return this.cache.get(comparable) ?? this.cache.set(comparable, key).get(comparable)!;
            }
          };
          const level2 = {
            cache: new Map<string, { scoreLevel: string; }>(),
            comparableKey: (key: { scoreLevel: string; }) => key.scoreLevel,
            key: (s: Sample) => ({scoreLevel: s.score < 50 ? 'low' : s.score >= 80 ? 'high' : 'middle'}),
            cachedKey(s: Sample) {
              const [key, comparable] = [this.key(s), this.comparableKey(this.key(s))];
              return this.cache.get(comparable) ?? this.cache.set(comparable, key).get(comparable)!;
            }
          };
          const level3 = {
            cache: new Map<string, { period: number; scoreAbovePeriod: boolean; }>(),
            comparableKey: (key: { period: number; scoreAbovePeriod: boolean; }) => key.period + (key.scoreAbovePeriod ? '+' : '-'),
            key: (s: Sample) => ({period: s.period, scoreAbovePeriod: s.score > s.period}),
            cachedKey(s: Sample) {
              const [key, comparable] = [this.key(s), this.comparableKey(this.key(s))];
              return this.cache.get(comparable) ?? this.cache.set(comparable, key).get(comparable)!;
            }
          };

          // Level 1
          input.forEach(s => expected.set(level1.cachedKey(s), [...(expected.get(level1.cachedKey(s)) || []), s] as any));
          // Level 2
          expected.forEach((items, key) => {
            const map = new Map<any, any[]>();
            (items as unknown as Sample[]).forEach(s => map.set(level2.cachedKey(s), [...(map.get(level2.cachedKey(s)) || []), s]));
            expected.set(key, map as any);
          });
          // Level 3
          expected.forEach(mapByType => mapByType.forEach((items, key) => {
            const map = new Map<any, any[]>();
            (items as unknown as Sample[]).forEach(s => map.set(level3.cachedKey(s), [...(map.get(level3.cachedKey(s)) || []), s]));
            mapByType.set(key, map as any);
          }));

          return {
            expected,
            input,
            level1: {key: level1.key, comparableKey: level1.comparableKey},
            level2: {key: level2.key, comparableKey: level2.comparableKey},
            level3: {key: level3.key, comparableKey: level3.comparableKey}
          };
        }

        function expectedSamplesHierarchyWithComplexKeyAndComparableKeysAndValueSelectors() {
          const input = array.samples;
          const expected = new Map<{ ok: boolean, type: string }, Map<{ scoreLevel: string }, Map<{ period: number, scoreAbovePeriod: boolean }, { scoreAbovePeriod: boolean, period: number, score: number, diff: number, scoreLevel: ScoreLevel, TYPE: string }[]>>>();

          const level1 = {
            cache: new Map<string, { ok: boolean; type: string; }>(),
            comparableKey: (key: { ok: boolean; type: string; }) => key.type + (key.ok ? '+' : '-'),
            key: (s: Sample) => ({ok: s.ok, type: s.type}),
            mapValueFactory: (addKeyParametersIntoThisArray: any[]) => (s: Sample, index: number, key: { ok: boolean; type: string; }) => {
              addKeyParametersIntoThisArray.push(key);
              return ({...s, diff: s.score - s.period});
            },
            cachedKey(s: Sample) {
              const [key, comparable] = [this.key(s), this.comparableKey(s)];
              return this.cache.get(comparable) ?? this.cache.set(comparable, key).get(comparable)!;
            }
          };
          const level2 = {
            cache: new Map<string, { scoreLevel: string; }>(),
            comparableKey: (key: { scoreLevel: string; }) => key.scoreLevel,
            key: (s: Sample & { diff: number; }) => ({scoreLevel: s.score < 50 ? 'low' : s.score >= 80 ? 'high' : 'middle'}),
            mapValueFactory: (addKeyParametersIntoThisArray: any[]) => (s: Sample & { diff: number; }, index: number, keys: any[]) => {
              addKeyParametersIntoThisArray.push(keys);
              return ({
                ...s,
                scoreLevel: (s.score < 50 ? 'low' : s.score >= 80 ? 'high' : 'middle') as ScoreLevel
              });
            },
            mapValue2Factory: (addKeyParametersIntoThisArray: any[]) => (s: Sample & { diff: number; scoreLevel: ScoreLevel }, index: number, keys: any[]) => {
              addKeyParametersIntoThisArray.push(keys);
              return ({
                diff: s.diff,
                scoreLevel: s.scoreLevel,
                period: s.period,
                score: s.score,
                TYPE: s.type.toLowerCase()
              });
            },
            cachedKey(s: Sample & { diff: number; }) {
              const [key, comparable] = [this.key(s), this.comparableKey(this.key(s))];
              return this.cache.get(comparable) ?? this.cache.set(comparable, key).get(comparable)!;
            }
          };
          const level3 = {
            cache: new Map<string, { period: number; scoreAbovePeriod: boolean; }>(),
            comparableKey: (key: { period: number; scoreAbovePeriod: boolean; }) => key.period + (key.scoreAbovePeriod ? '+' : '-'),
            key: (s: { period: number; score: number; diff: number; scoreLevel: ScoreLevel; TYPE: string; }) => ({
              period: s.period,
              scoreAbovePeriod: s.score > s.period
            }),
            mapValueFactory: (addKeyParametersIntoThisArray: any[]) => (s: { period: number; score: number; diff: number; scoreLevel: ScoreLevel; TYPE: string; }, index: number, keys: any[]) => {
              addKeyParametersIntoThisArray.push(keys);
              return ({
                ...s,
                scoreAbovePeriod: s.score > s.period
              });
            },
            cachedKey(s: { period: number; score: number; diff: number; scoreLevel: ScoreLevel; TYPE: string; }) {
              const [key, comparable] = [this.key(s), this.comparableKey(this.key(s))];
              return this.cache.get(comparable) ?? this.cache.set(comparable, key).get(comparable)!;
            }
          };

          // Level 1
          const expectedLevel1MapValueKeys: { ok: boolean; type: string; }[] = [];
          input.forEach((s, i) => expected.set(
            level1.cachedKey(s),
            [...(expected.get(level1.cachedKey(s)) || []),
              level1.mapValueFactory(expectedLevel1MapValueKeys)(s, i, level1.key(s))] as any));

          // Level 2
          const expectedLevel2MapValue1Keys: { ok: boolean; type: string; }[] = [];
          const expectedLevel2MapValue2Keys: { ok: boolean; type: string; }[] = [];
          expected.forEach((items, key) => {
            const map = new Map<any, any[]>();
            (items as unknown as (Sample & { diff: number; })[]).forEach((s, i) => map.set(level2.cachedKey(s),
              [...(map.get(level2.cachedKey(s)) || []),
                level2.mapValue2Factory(expectedLevel2MapValue2Keys)(
                  level2.mapValueFactory(expectedLevel2MapValue1Keys)(s, i, [level1.key(s), level2.key(s)]),
                  i,
                  [level1.key(s), level2.key(s)]
                )]));
            expected.set(key, map as any);
          });

          // Level 3
          const expectedLevel3MapValueKeys: { ok: boolean; type: string; }[] = [];
          expected.forEach((mapByType, key1) =>
            mapByType.forEach((items, key2) => {
              const map = new Map<any, any[]>();
              (items as unknown as ({ period: number; score: number; diff: number; scoreLevel: ScoreLevel; TYPE: string; })[])
                .forEach((s, i) => map.set(level3.cachedKey(s), [
                    ...(map.get(level3.cachedKey(s)) || []),
                    level3.mapValueFactory(expectedLevel3MapValueKeys)(s, i, [key1, key2, level3.key(s)])]
                  )
                );
              mapByType.set(key2, map as any);
            }));

          return {
            expected,
            input,
            level1: {
              key: level1.key,
              comparableKey: level1.comparableKey,
              mapValueFactory: level1.mapValueFactory,
              expectedLevel1MapValueKeys
            },
            level2: {
              key: level2.key,
              comparableKey: level2.comparableKey,
              mapValueFactory: level2.mapValueFactory,
              mapValueFactory2: level2.mapValue2Factory,
              expectedLevel2MapValue1Keys,
              expectedLevel2MapValue2Keys
            },
            level3: {
              key: level3.key,
              comparableKey: level3.comparableKey,
              mapValueFactory: level3.mapValueFactory,
              expectedLevel3MapValueKeys
            }
          };
        }

        it('should group items into hierarchy by several grouped primitive-key', () => {
          const {expected, input} = expectedSamplesHierarchy();
          const sut = this.createSut(input)
            .groupBy(s => s.ok)
            .thenGroupBy(s => s.type)
            .thenGroupBy(s => s.period);

          const actual = new Map([...sut].map(groupedByOk =>
            [groupedByOk.key, new Map([...groupedByOk].map(groupedByType =>
              [groupedByType.key, new Map([...groupedByType].map(groupedByPeriod =>
                [groupedByPeriod.key, [...groupedByPeriod]]))]
            ))]));

          assert.deepEqual(actual, expected);
        });

        it('should group items into hierarchy by several grouped composite keys and to-comparable-key selectors', () => {
          const {expected, input, level1, level2, level3} = expectedSamplesHierarchyWithComplexKeyAndComparableKeys();

          const sut = this.createSut(input)
            .groupBy(s => level1.key(s), level1.comparableKey)
            .thenGroupBy(s => level2.key(s), level2.comparableKey)
            .thenGroupBy(s => level3.key(s), level3.comparableKey);

          const actual = new Map([...sut].map(level1 =>
            [level1.key, new Map([...level1].map(level2 =>
              [level2.key, new Map([...level2].map(level3 =>
                [level3.key, [...level3]]))]
            ))]));

          assert.deepEqual(actual, expected);
        });

        it('should group items into hierarchy when iterating each group and before moving to the next group', () => {
          // TODO:
        });

        describe('toMap()', () => {
          it('should group items into hierarchy by several grouped key', () => {
            const {expected, input} = expectedSamplesHierarchy();
            const sut = this.createSut(input)
              .groupBy(s => s.ok)
              .thenGroupBy(s => s.type)
              .thenGroupBy(s => s.period);

            const actual = sut.toMap();
            assert.deepEqual(actual, expected);
          });

          it('should group items into hierarchy by several grouped composite keys and to-comparable-key selectors', () => {
            const {expected, input, level1, level2, level3} = expectedSamplesHierarchyWithComplexKeyAndComparableKeys();

            const sut = this.createSut(input)
              .groupBy(s => level1.key(s), level1.comparableKey)
              .thenGroupBy(s => level2.key(s), level2.comparableKey)
              .thenGroupBy(s => level3.key(s), level3.comparableKey);

            assert.deepEqual(sut.toMap(), expected);
          });

          it('should group items into hierarchy by several grouped composite keys and to-comparable-key selectors and multiple value-selectors', () => {
            const {
              expected,
              input,
              level1,
              level2,
              level3
            } = expectedSamplesHierarchyWithComplexKeyAndComparableKeysAndValueSelectors();

            const actualLevel1MapValueKeys: any[] = [];
            const actualLevel2MapValue1Keys: any[] = [];
            const actualLevel2MapValue2Keys: any[] = [];
            const actualLevel3MapValueKeys: any[] = [];

            const sut = this.createSut(input)
              .groupBy(s => level1.key(s), level1.comparableKey, level1.mapValueFactory(actualLevel1MapValueKeys))
              .thenGroupBy(s => level2.key(s), level2.comparableKey)
              .mapInGroup(level2.mapValueFactory(actualLevel2MapValue1Keys))
              .mapInGroup(level2.mapValueFactory2(actualLevel2MapValue2Keys))
              .thenGroupBy(s => level3.key(s), level3.comparableKey)
              .mapInGroup(level3.mapValueFactory(actualLevel3MapValueKeys));

            const actual = sut.toMap();

            assert.deepEqual(actual, expected);
            assert.sameDeepMembers(actualLevel1MapValueKeys, level1.expectedLevel1MapValueKeys);
            assert.sameDeepMembers(actualLevel2MapValue1Keys, level2.expectedLevel2MapValue1Keys);
            assert.sameDeepMembers(actualLevel2MapValue2Keys, level2.expectedLevel2MapValue2Keys);
            assert.sameDeepMembers(actualLevel3MapValueKeys, level3.expectedLevel3MapValueKeys);

          });

        });

        describe('mapInGroup()', () => {
          it('should group items into hierarchy by several grouped composite keys and to-comparable-key selectors and multiple value-selectors', () => {
            const {
              expected,
              input,
              level1,
              level2,
              level3
            } = expectedSamplesHierarchyWithComplexKeyAndComparableKeysAndValueSelectors();

            const actualLevel1MapValueKeys: any[] = [];
            const actualLevel2MapValue1Keys: any[] = [];
            const actualLevel2MapValue2Keys: any[] = [];
            const actualLevel3MapValueKeys: any[] = [];

            const sut = this.createSut(input)
              .groupBy(s => level1.key(s), level1.comparableKey, level1.mapValueFactory(actualLevel1MapValueKeys))
              .thenGroupBy(s => level2.key(s), level2.comparableKey)
              .mapInGroup(level2.mapValueFactory(actualLevel2MapValue1Keys))
              .mapInGroup(level2.mapValueFactory2(actualLevel2MapValue2Keys))
              .thenGroupBy(s => level3.key(s), level3.comparableKey)
              .mapInGroup(level3.mapValueFactory(actualLevel3MapValueKeys));

            const actual = new Map([...sut].map(level1 =>
              [level1.key, new Map([...level1].map(level2 =>
                [level2.key, new Map([...level2].map(level3 =>
                  [level3.key, [...level3]]))]
              ))]));

            assert.deepEqual(actual, expected);
            assert.sameDeepMembers(actualLevel1MapValueKeys, level1.expectedLevel1MapValueKeys);
            assert.sameDeepMembers(actualLevel2MapValue1Keys, level2.expectedLevel2MapValue1Keys);
            assert.sameDeepMembers(actualLevel2MapValue2Keys, level2.expectedLevel2MapValue2Keys);
            assert.sameDeepMembers(actualLevel3MapValueKeys, level3.expectedLevel3MapValueKeys);

          });

          it('should produce same results when traversed in breadth-first (level) manner and in depth-first manner', () => {
            const createNewSut = () => this.createSut(array.samples)
              .groupBy(s => ({ok: s.ok, type: s.type}), key => key.type + (key.ok ? '+' : '-'), s => ({
                ...s,
                diff: s.score - s.period
              }))
              .thenGroupBy(s => ({scoreLevel: s.score < 50 ? 'low' : s.score >= 80 ? 'high' : 'middle'}), key => key.scoreLevel)
              .mapInGroup(s => ({
                ...s,
                scoreLevel: (s.score < 50 ? 'low' : s.score >= 80 ? 'high' : 'middle') as ScoreLevel
              }))
              .mapInGroup(s => ({
                diff: s.diff,
                scoreLevel: s.scoreLevel,
                period: s.period,
                score: s.score,
                TYPE: s.type.toLowerCase()
              }))
              .thenGroupBy(s => ({
                period: s.period,
                scoreAbovePeriod: s.score > s.period
              }), key => key.period + (key.scoreAbovePeriod ? '+' : '-'))
              .mapInGroup(s => ({
                ...s,
                scoreAbovePeriod: s.score > s.period
              }));

            function traverseBreadthFirst(seq: ReturnType<typeof createNewSut>): Map<any, any> {
              const breadthFirstResults = new Map<any, any>();
              const levelsCache: any[] = [[], [], []];
              const seqToMap = new Map<KeyedSeq<any, any>, Map<any, any>>();
              // Traverse 1st level
              for (const level1 of seq) {
                const map = new Map<any, any>();
                breadthFirstResults.set(level1.key, map);
                seqToMap.set(level1, map);
                levelsCache[0].push(level1);
              }

              // Traverse 2nd level
              for (const level1 of levelsCache[0]) {
                for (const level2 of level1) {
                  const level1Map = seqToMap.get(level1)!;
                  const level2Map = new Map<any, any>();
                  level1Map.set(level2.key, level2Map);
                  seqToMap.set(level2, level2Map);
                  levelsCache[1].push(level2);
                }
              }

              // Traverse 3rd level
              for (const level2 of levelsCache[1]) {
                for (const level3 of level2) {
                  const level3Map = seqToMap.get(level2)!;
                  level3Map.set(level3.key, []);
                  seqToMap.set(level3, level3Map);
                  levelsCache[2].push(level3);
                }
              }

              // Traverse 4th level
              for (const level3 of levelsCache[2]) {
                const level3Map = seqToMap.get(level3)!;
                for (const level4 of level3) {
                  const array = level3Map.get(level3.key);
                  array.push(level4);
                }
              }

              return breadthFirstResults;
            }

            function traverseDepthFirst(seq: ReturnType<typeof createNewSut>): Map<any, any> {
              const depthFirstResults = new Map<any, any>();

              for (const level1 of seq) {
                const level1Map = depthFirstResults.set(level1.key, depthFirstResults.get(level1.key) ?? new Map<any, any>()).get(level1.key);
                for (const level2 of level1) {
                  const level2Map = level1Map.set(level2.key, level1Map.get(level2.key) ?? new Map<any, any>()).get(level2.key);
                  for (const level3 of level2) {
                    level2Map.set(level3.key, [...level3]);
                  }
                }
              }

              return depthFirstResults;
            }

            const breadthFirstResults = traverseBreadthFirst(createNewSut());
            const depthFirstResults = traverseDepthFirst(createNewSut());

            assert.deepEqual(breadthFirstResults, depthFirstResults);
          });
        });
      });

      describe('mapInGroup()', () => {
        this.it('should return sequence of groups by key-selector of primitive (comparable) key - numbers', array.oneToTen, (input, inputArray) => {
          const expectedMap = new Map<number, number[]>();
          inputArray.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), -n]));
          const expected = [...expectedMap.entries()];

          const sut = this.createSut(input)
            .groupBy(n => n % 3)
            .mapInGroup(n => -n);
          const actualGrouped = [...sut];
          const actual = actualGrouped.map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);
        });
        this.it('should return sequence of groups by key-selector of primitive (comparable) key - strings', array.strings, (input, inputArray) => {
          const expectedMap = new Map<string, string[]>();
          inputArray.forEach(s => expectedMap.set(s.trim()[0] ?? '', [...(expectedMap.get(s.trim()[0] ?? '') || []), s.toUpperCase()]));
          const expected = [...expectedMap.entries()];

          const sut = this.createSut(input)
            .groupBy(s => s.trim()[0] ?? '')
            .mapInGroup(s => s.toUpperCase());
          const actualGrouped = [...sut];
          const actual = actualGrouped.map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);
        });
        this.it('should return sequence of groups by key-selector of primitive (comparable) key - objects', array.samples, (input, inputArray) => {
          const expectedMap = new Map<string, any>();
          inputArray.forEach(s => expectedMap.set(s.type, [...(expectedMap.get(s.type) || []), {
            period: s.period,
            diff: s.score - s.period
          }]));
          const expected = [...expectedMap.entries()];

          const sut = this.createSut(input)
            .groupBy(g => g.type)
            .mapInGroup(s => ({period: s.period, diff: s.score - s.period}));
          const actualGrouped = [...sut];
          const actual = actualGrouped.map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);
        });

        describe('with initial value-selector', () => {
          this.it('should return sequence of groups by key-selector of primitive (comparable) key - numbers', array.oneToTen, (input, inputArray) => {
            const expectedMap = new Map<number, number[]>();
            inputArray.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), -(n ** 2)]));
            const expected = [...expectedMap.entries()];

            const sut = this.createSut(input)
              .groupBy(n => n % 3, undefined, n => n ** 2)
              .mapInGroup(n => -n);
            const actualGrouped = [...sut];
            const actual = actualGrouped.map(group => [group.key, [...group]]);

            assert.deepEqual(actual, expected);
          });
          this.it('should return sequence of groups by key-selector of primitive (comparable) key - strings', array.strings, (input, inputArray) => {
            const expectedMap = new Map<string, string[]>();
            inputArray.forEach(s => expectedMap.set(s.trim()[0] ?? '', [...(expectedMap.get(s.trim()[0] ?? '') || []), `(${s.toUpperCase()})`]));
            const expected = [...expectedMap.entries()];

            const sut = this.createSut(input)
              .groupBy(s => s.trim()[0] ?? '', undefined, s => s.toUpperCase())
              .mapInGroup(s => `(${s})`);
            const actualGrouped = [...sut];
            const actual = actualGrouped.map(group => [group.key, [...group]]);

            assert.deepEqual(actual, expected);
          });
          this.it('should return sequence of groups by key-selector of primitive (comparable) key - objects', array.samples, (input, inputArray) => {
            const expectedMap = new Map<string, any>();
            inputArray.forEach(s => expectedMap.set(s.type, [...(expectedMap.get(s.type) || []), {
              period: s.period,
              diff: s.score - s.period,
              overflow: s.score - s.period > 50
            }]));
            const expected = [...expectedMap.entries()];

            const sut = this.createSut(input)
              .groupBy(g => g.type, undefined, s => ({period: s.period, diff: s.score - s.period}))
              .mapInGroup(s => ({...s, overflow: s.diff > 50}));
            const actualGrouped = [...sut];
            const actual = actualGrouped.map(group => [group.key, [...group]]);

            assert.deepEqual(actual, expected);
          });
        });
      });

      describe('tap()', () => {
        it('should produce same results before and after tap', () => {
          const input = array.oneToTen;
          const expectedSeq = this.createSut(input).groupBy(n => n % 3);
          let actualSeq = expectedSeq.tap(() => void (0));

          const expected = [...expectedSeq].map(group => [group.key, [...group]]);
          let actual = [...actualSeq].map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);

          actualSeq = actualSeq.tap(() => void (0));
          actual = [...actualSeq].map(group => [group.key, [...group]]);
          assert.deepEqual(actual, expected);
        });

        it('should call tap callback for each group', () => {
          const input = array.oneToTen;
          const expected = [{key: 1, index: 0}, {key: 2, index: 1}, {key: 0, index: 2}];
          const actual: { key: number; index: number; }[] = [];
          const sut = this.createSut(input)
            .groupBy(n => n % 3)
            .tap((group, index) => actual.push({key: group.key, index}));

          for (const x of sut) {
          }

          assert.deepEqual(actual, expected);
        });

        it('should call tap callback for each top level group after performing thenGroupBy()', () => {
          const input = array.oneToTen;
          const expected = [{key: 1, index: 0}, {key: 2, index: 1}, {key: 0, index: 2}];
          const actual: { key: number; index: number; }[] = [];
          const sut = this.createSut(input)
            .groupBy(n => n % 3)
            .thenGroupBy(n => n % 2)
            .tap((group, index) => actual.push({key: group.key, index}));

          for (const x of sut) {
          }

          assert.deepEqual(actual, expected);
        });

        // it('should call tap callback for each top level group after performing mapInGroup()', () => {
        //   const input = array.samples;
        //   const maps: Map<any, number>[] = [new Map(), new Map(), new Map()];
        //   array.samples.forEach(sample => {
        //     maps[0].set(sample.type, (maps[0].get(sample.type) ?? 0) + sample.score);
        //     maps[1].set(sample.type, (maps[1].get(sample.type) ?? 0) + sample.period);
        //     maps[1].set(sample.type, (maps[1].get(sample.type) ?? 0) + sample.score);
        //   });
        //
        //   const expected = maps.map(map => [...map.entries()].map(([key, value]) => ({key, value})));
        //
        //   const actual: { key: string; value: number; }[][] = [[], [], []];
        //
        //   const sut = this.createSut(input)
        //     .groupBy(sample => sample.type, undefined, sample => ({
        //       period: sample.period,
        //       result: {value: sample.score}
        //     }))
        //     .tap(group => actual[0].push({key: group.key, value: group.sum(s => s.result.value)}))
        //     .mapInGroup(sample => ({point: {x: sample.period, y: sample.result.value}}))
        //     .tap(group => actual[1].push({key: group.key, value: group.sum(s => s.point.x)}))
        //     .thenGroupBy(point => point.point.x)
        //     .tap(group => actual[2].push({key: group.key, value: group.sum(s => s.sum(ss => ss.point.y))}));
        //
        //   for (const x of sut) {
        //   }
        //
        //   assert.deepEqual(actual, expected);
        // });

        describe('on each grouped sequence', () => {
          it('should produce same results before and after tap', () => {
            const input = array.oneToTen;
            const sut = this.createSut(input).groupBy(n => n % 3);
            for (const group of sut) {
              const tapped = group.tap(() => void (0)).tap(() => void (0));
              const expected = [...group];
              const actual = [...tapped];
              assert.deepEqual(actual, expected);
            }
          });

          it('should call tap callback for each item', () => {
            const input = array.oneToTen;
            const sut = this.createSut(input).groupBy(n => n % 3);
            for (const group of sut) {
              const actual: { value: number; index: number; }[] = [];
              const tapped = group.tap((value, index) => actual.push({value, index}));
              const expected = [...group].map((value, index) => ({value, index}));
              for (const x of tapped) {
              }
              assert.deepEqual(actual, expected);
            }
          });
        });
      });

      describe('consume()', () => {
        it('should iterate all source items', () => {
          const expected = array.oneToTen;
          const actual: number[] = [];
          const source = expected.map(n => actual.push(n));
          const sut = this.createSut(source).groupBy(n => n % 3);
          sut.consume();

          assert.deepEqual(actual, expected);
        });

        it('should call tap callback for each group', () => {
          const input = array.oneToTen;
          const expected = [{key: 1, index: 0}, {key: 2, index: 1}, {key: 0, index: 2}];
          const actual: { key: number; index: number; }[] = [];
          const sut = this.createSut(input)
            .groupBy(n => n % 3)
            .tap((group, index) => actual.push({key: group.key, index}));

          sut.consume();

          assert.deepEqual(actual, expected);
        });
      });

      describe('cache()', () => {
        it('should not iterate items', () => {
          let wasIterated = false;
          const input = new class {
            * [Symbol.iterator]() {
              for (const n of array.oneToTen) {
                wasIterated = true;
                yield n;
              }
            }
          }

          this.createSut(input).groupBy(n => n % 3).cache();

          assert.isFalse(wasIterated);
        });

        it('should not iterate source items again after being cached', () => {
          let wasIterated: boolean;
          const input = new class {
            * [Symbol.iterator]() {
              for (const n of array.oneToTen) {
                wasIterated = true;
                yield n;
              }
            }
          }

          const sut = this.createSut(input).groupBy(n => n % 3).cache();
          for (const x of sut) {
          }
          wasIterated = false;
          for (const x of sut) {
          }
          assert.isFalse(wasIterated);
        });

        it('should produce same results before and after cached', () => {
          const input = array.oneToTen;
          const sut = this.createSut(input).groupBy(n => n % 3);
          const expected = [...sut].map(group => [group.key, [...group]]);

          const cached = sut.cache();
          const actual = [...cached].map(group => [group.key, [...group]]);
          const actualAfterCachedExecuted = [...cached].map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);
          assert.deepEqual(actualAfterCachedExecuted, expected);
        });

        it('should return same items on re-iteration although source sequence changed', () => {
          const input = array.oneToTen;
          const sut = this.createSut(input).groupBy(n => n % 3);
          const expected = [...sut].map(group => [group.key, [...group]]);

          const cached = sut.cache();
          const actual = [...cached].map(group => [group.key, [...group]]);
          input.pop();
          const actualAfterCachedExecuted = [...cached].map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);
          assert.deepEqual(actualAfterCachedExecuted, expected);
        });

        it('should return same instance if calling cache again', () => {
          const expected = this.createSut(array.oneToTen).groupBy(n => n % 3).cache();
          const actual = expected.cache();

          assert.strictEqual(actual, expected);
        });

        it('should save cached results in array property', () => {
          const input = array.oneToTen;
          const sut = this.createSut(input).groupBy(n => n % 3);

          const cached = sut.cache();
          const actual = [...cached].map(group => [group.key, [...group]]);
          const expected = [...cached.array].map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);
        });
      });

      describe('hasAtLeast()', () => {
        it('should return true if sequence as number of expected items', () => {
          const input = array.oneToTen;
          let sut = this.createSut(input).groupBy(n => n % 3);
          for (let count = 1; count <= 3; count++) {
            let actual = sut.hasAtLeast(count);
            assert.isTrue(actual);
          }

          sut = this.createSut(generator.from(input)).groupBy(n => n % 3);
          for (let count = 1; count <= 3; count++) {
            let actual = sut.hasAtLeast(count);
            assert.isTrue(actual);
          }
        });

        it('should return false if sequence has less items than expected', () => {
          const input = array.oneToTen;
          let sut = this.createSut(input).groupBy(n => n % 3);
          let actual = sut.hasAtLeast(input.length + 1);
          assert.isFalse(actual);

          sut = this.createSut(generator.from(input)).groupBy(n => n % 3);
          actual = sut.hasAtLeast(input.length + 1);
          assert.isFalse(actual);
        });

        it('should throw exception if count parameter is not positive', () => {
          const input = array.oneToTen;
          let sut = this.createSut(input).groupBy(n => n % 3);
          assert.throws(() => sut.hasAtLeast(0));
          assert.throws(() => sut.hasAtLeast(-1));
        });
      });

      describe('toObject()', () => {
        describe('Latest leaf item', () => {
          this.it('should return empty object if source sequence is empty', [], (input: Iterable<number>) => {
            const expected: { [key: number]: number; } = {};
            const sut = this.createSut(input);
            const actual = sut.groupBy(n => n % 3).toObject();

            assert.deepEqual(actual, expected);
          });

          this.it('should return an object with keys/values same as the grouped-seq keys and latest value from each group', array.samples, input => {
            const expected: { [type: string]: { [score: number]: { score: number; }; }; } = {};
            [...array.samples].map(sample => expected[sample.type] = {} as any);
            [...array.samples].map(sample => expected[sample.type][sample.period] = {score: sample.score});

            const sut = this.createSut(input)
              .groupBy(s => s.type)
              .thenGroupBy(s => s.period)
              .mapInGroup(s => ({score: s.score}));

            const actual = sut.toObject();

            assert.deepEqual(actual, expected);
          });
        });

        describe('array of items', () => {
          this.it('should return empty object if source sequence is empty', [], (input: Iterable<number>) => {
            const expected: { [key: number]: number[]; } = {};
            const sut = this.createSut(input);
            const actual = sut.groupBy(n => n % 3).toObject(true);

            assert.deepEqual(actual, expected);
          });

          this.it('should return an object with keys/values same as the grouped-seq keys and value as array of items in the group', array.samples, input => {
            const expected: { [type: string]: { [score: number]: { score: number; }[]; }; } = {};
            [...array.samples].map(sample => expected[sample.type] = {} as any);
            [...array.samples].map(sample => expected[sample.type][sample.period] = []);
            [...array.samples].map(sample => expected[sample.type][sample.period].push({score: sample.score}));

            const sut = this.createSut(input)
              .groupBy(s => s.type)
              .thenGroupBy(s => s.period)
              .mapInGroup(s => ({score: s.score}));

            const actual = sut.toObject(true);

            assert.deepEqual(actual, expected);
          });
        });
      });

      function sumBy<T>(items: Iterable<T>, map: (item: T) => number): number {
        return [...items].reduce((prev, curr) => prev + map(curr), 0);
      }

      describe('ungroup()', () => {
        const sum = (items: Iterable<number>): number => [...items].reduce((prev, curr) => prev + curr, 0);

        this.it('should remove the most inner group', array.zeroToTen, input => {
          const grouped = this.createSut(input).groupBy(n => n % 3).thenGroupBy(n => n % 2);
          const sut = grouped.ungroup(group => sum(group));

          function countDepth(seq: Seq<any>): number {
            // noinspection LoopStatementThatDoesntLoopJS
            for (const group of seq) {
              return ((SeqTags.isSeq(group) && 'key' in group) ? (1 + countDepth(group)) : 0);
            }
            return 0;
          }

          const depthBeforeUngroup = countDepth(grouped);
          const depthAfterUngroup = countDepth(sut);

          assert.equal(depthBeforeUngroup, 2);
          assert.equal(depthAfterUngroup, 1);
        });

        this.it('should map items in new inner group according to aggregator function', array.zeroToTen, input => {
          const grouped = this.createSut(input).groupBy(n => n % 3).thenGroupBy(n => n % 2);
          const sut = grouped.ungroup(group => sum(group));

          const expected = [
            [0, [
              sum([0, 6]),
              sum([3, 9])
            ]],
            [1, [
              sum([1, 7]),
              sum([4, 10])
            ]],
            [2, [
              sum([2, 8]),
              sum([5])
            ]]
          ];

          const actual = sut.toArray().map(g => [g.key, g.toArray()]);

          assert.deepEqual(actual, expected);
        });

        this.it('should not affect the sequence before the ungroup', array.zeroToTen, input => {
          const grouped = this.createSut(input).groupBy(n => n % 3).thenGroupBy(n => n % 2);
          const expectedBeforeUngroup = grouped.toMap();
          grouped.ungroup(group => sum(group)).toMap();
          const actualAfterUngroup = grouped.toMap();

          assert.deepEqual(actualAfterUngroup, expectedBeforeUngroup);
        });

        this.it('should provide correct list of keys parameters to aggregator function', array.zeroToTen, input => {
          const expectedKeysToValues = [
            '0,0,false -> [0]',
            '0,0,true -> [6]',
            '0,1,false -> [4]',
            '0,1,true -> [10]',
            '0,2,false -> [2]',
            '0,2,true -> [8]',
            '1,0,false -> [3]',
            '1,0,true -> [9]',
            '1,1,false -> [1]',
            '1,1,true -> [7]',
            '1,2,false -> [5]'
          ];
          const actualKeysToValues: string[] = [];
          const grouped = this.createSut(input)
            .groupBy(n => n % 2)
            .thenGroupBy(n => n % 3)
            .thenGroupBy(n => n > 5);

          grouped
            .ungroup((group, keys) => {
              actualKeysToValues.push(`${keys} -> ${group.toString()}`);
              return sum(group);
            })
            .toMap();

          assert.sameMembers(actualKeysToValues, expectedKeysToValues);
        });

        describe('chaining ungroup()', () => {
          this.it('should remove the most inner group', array.samples, input => {
            const grouped = this.createSut(input)
              .groupBy(s => s.ok)
              .thenGroupBy(s => s.type)
              .thenGroupBy(s => s.period)
              .thenGroupBy(s => s.score);

            const sut = grouped
              .ungroup(group => group.key * group.length())
              .ungroup(group => group.key * group.length());

            function countDepth(seq: Seq<any>): number {
              // noinspection LoopStatementThatDoesntLoopJS
              for (const group of seq) {
                return ((SeqTags.isSeq(group) && 'key' in group) ? (1 + countDepth(group)) : 0);
              }
              return 0;
            }

            const depthBeforeUngroup = countDepth(grouped);
            const depthAfterUngroup = countDepth(sut);

            assert.equal(depthBeforeUngroup, 4);
            assert.equal(depthAfterUngroup, 2);
          });
        });
      });

      describe('aggregate', () => {
        this.it('should return sequence of the results of the aggregator function on each inner group',
          array.samples,
          (input, inputArray) => {

            const grouped = this.createSut(input)
              .groupBy(s => s.ok)
              .thenGroupBy(s => s.type)
              .thenGroupBy(s => s.period);

            const sut = grouped.aggregate(group => group.sum(s => s.score));

            const distinctKeys = [...new Set(inputArray.map(s => `${s.ok}|${s.type}|${s.period}`))];
            const expected = distinctKeys.map(key => {
              const itemsWithSameKey = inputArray.filter(s => `${s.ok}|${s.type}|${s.period}` === key);
              return sumBy(itemsWithSameKey, s => s.score);
            });

            const actual = [...sut];
            assert.sameMembers(actual, expected);
          });

        this.it('should provide correct list of keys parameters to aggregator function',
          array.samples,
          (input, inputArray) => {

            const grouped = this.createSut(input)
              .groupBy(s => s.ok)
              .thenGroupBy(s => s.type)
              .thenGroupBy(s => s.period);

            const distinctKeys = [...new Map(inputArray.map(s => [`${s.ok}|${s.type}|${s.period}`, s])).values()];
            const expectedKeys = distinctKeys.map(s => [s.ok, s.type, s.period]);

            const actualKeys: [boolean, string, number][] = [];
            const sut = grouped.aggregate((group, keys) => actualKeys.push(keys));
            materialize(sut);

            assert.sameDeepMembers(actualKeys, expectedKeys);
          });
      });
    });

    describe('groupJoin()', () => {
      function test<TOuter, TInner>(sut: SeqOfGroups<TOuter, TInner>, expected: any[]) {
        const actual = [...sut].map(group => [group.key, [...group]]);
        assert.deepEqual(actual, expected);
      }

      const matchingTest = {
        simpleInputsForTest() {
          const outer = [0, 1, 2];
          const inner = array.oneToTen;
          const expected = [
            [0, [3, 6, 9]],
            [1, [1, 4, 7, 10]],
            [2, [2, 5, 8]]
          ];

          return {outer, inner, expected, outerKeySelector: (n: number) => n, innerKeySelector: (n: number) => n % 3};
        },
        complexInputForTest() {
          const inner = array.samples;
          const outer = [...new Set(inner.map(s => s.type))].map(type => ({type}));
          const expected = outer.map(key => [key, inner.filter(s => s.type === key.type)]);

          return {
            outer,
            inner,
            expected,
            outerKeySelector: (key: { type: string; }) => key.type,
            innerKeySelector: (s: Sample) => s.type
          };
        },
      };
      const unmatchedTest = {
        simpleInputsForTest() {
          const outer = [-1];
          const inner = array.oneToTen;
          const expected = [[-1, []] as [key: number, value: number[]]];
          return {outer, inner, expected, outerKeySelector: (n: number) => n, innerKeySelector: (n: number) => n % 3};
        },
        complexInputForTest() {
          const inner = array.samples;
          const outer = [{type: 'Non Existing Type'}];
          const expected = outer.map(key => [key, []] as [key: { type: string; }, value: Sample[]]);

          return {
            outer,
            inner,
            expected,
            outerKeySelector: (key: { type: string; }) => key.type,
            innerKeySelector: (s: Sample) => s.type
          };
        },
      };

      it('should group each outer item with sequence of matched inner items - simple values', () => {
        const {outer, inner, expected, outerKeySelector, innerKeySelector} = matchingTest.simpleInputsForTest();
        const sut = this.createSut(outer).groupJoin(inner, outerKeySelector, innerKeySelector);

        test(sut, expected);
      });

      it('should group each outer item with sequence of matched inner items - complex values', () => {
        const {outer, inner, expected, outerKeySelector, innerKeySelector} = matchingTest.complexInputForTest();
        const sut = this.createSut(outer).groupJoin(inner, outerKeySelector, innerKeySelector);

        test(sut, expected);
      });

      it('should return outer without matching inner, paired with empty sequence of matched inners - simple values', () => {
        const {outer, inner, expected, outerKeySelector, innerKeySelector} = unmatchedTest.simpleInputsForTest();
        const sut = this.createSut(outer).groupJoin(inner, outerKeySelector, innerKeySelector);
        test(sut, expected);
      });

      it('should return outer without matching inner, paired with empty sequence of matched inners - complex values', () => {
        const {outer, inner, expected, outerKeySelector, innerKeySelector} = unmatchedTest.complexInputForTest();
        const sut = this.createSut(outer).groupJoin(inner, outerKeySelector, innerKeySelector);
        test(sut, expected);
      });

      it('should return all outer with empty matching inners if inner sequence is empty', () => {
        const outer = array.oneToTen;
        const sut = this.createSut(outer).groupJoin([], _ => _, _ => _);
        const expected = outer.map(v => [v, []]);
        test(sut, expected);
      });

      this.it2('should match all outer items when there are duplicates', array.samples.filter(s => s.score >= 50), array.samples.filter(s => s.score < 50), (outer, inner) => {
        const expected: [Sample, Sample[]][] = [...outer].map(o => [o, [...inner].filter(s => s.score === o.score)]);
        const sut = this.createSut(outer).groupJoin(inner, s => s.score, s => s.score);
        const actual: [Sample, Sample[]][] = [...sut].map(group => [group.key, [...group]]);
        assert.deepEqual(actual, expected);
      });

      describe('toMap()', () => {
        it('should return a map with empty array for keys without items', () => {
          const {outer, inner, expected, outerKeySelector, innerKeySelector} = unmatchedTest.simpleInputsForTest();
          const sut = this.createSut(outer).groupJoin(inner, outerKeySelector, innerKeySelector);
          const actual = [...sut.toMap().entries()];
          assert.deepEqual(actual, expected);
        });
      });

      describe('groupJoinRight()', () => {
        it('should group each outer item with sequence of matched inner items - simple values', () => {
          const {outer, inner, expected, outerKeySelector, innerKeySelector} = matchingTest.simpleInputsForTest();
          const sut = this.createSut(inner).groupJoinRight(outer, innerKeySelector, outerKeySelector);

          test(sut, expected);
        });

        it('should group each outer item with sequence of matched inner items - complex values', () => {
          const {outer, inner, expected, outerKeySelector, innerKeySelector} = matchingTest.complexInputForTest();
          const sut = this.createSut(inner).groupJoinRight(outer, innerKeySelector, outerKeySelector);

          test(sut, expected);
        });

        it('should return outer without matching inner using with empty sequence of matched inners - simple values', () => {
          const {outer, inner, expected, outerKeySelector, innerKeySelector} = unmatchedTest.simpleInputsForTest();
          const sut = this.createSut(inner).groupJoinRight(outer, innerKeySelector, outerKeySelector);
          test(sut, expected);
        });

        it('should return outer without matching inner using with empty sequence of matched inners - complex values', () => {
          const {outer, inner, expected, outerKeySelector, innerKeySelector} = unmatchedTest.complexInputForTest();
          const sut = this.createSut(inner).groupJoinRight(outer, innerKeySelector, outerKeySelector);
          test(sut, expected);
        });

        it('should return all outer with empty matching inners if inner sequence is empty', () => {
          const outer = array.oneToTen;
          const sut = this.createSut([]).groupJoinRight(outer, _ => _, _ => _);
          const expected = outer.map(v => [v, []]);
          test(sut, expected);
        });

        this.it2('should match all outer items when there are duplicates', array.samples.filter(s => s.score >= 50), array.samples.filter(s => s.score < 50), (outer, inner) => {
          const expected: [Sample, Sample[]][] = [...inner].map(o => [o, [...outer].filter(s => s.score === o.score)]);
          const sut = this.createSut(outer).groupJoinRight(inner, s => s.score, s => s.score);
          const actual: [Sample, Sample[]][] = [...sut].map(group => [group.key, [...group]]);
          assert.deepEqual(actual, expected);
        });
      });
    });
  });

  protected abstract createSut<T>(input?: Iterable<T>): Seq<T>;
}

function materialize(value: any): any {
  function isIterable(value: any): value is Iterable<any> {
    return value && typeof value !== 'string' && typeof value[Symbol.iterator] === 'function';
  }

  function* deepToArray(iterable: Iterable<any>): Generator<any> {
    for (const item of iterable) yield isIterable(item) ? [...deepToArray(item)] : item;
  }

  return isIterable(value) ? [...deepToArray(value)] : value;
}
