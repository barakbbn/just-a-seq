import {Seq, SeqOfGroups} from "../../lib";
import {describe, it} from "mocha";
import {array, generator, Sample} from "../test-data";
import {assert} from "chai";

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

  readonly run = () => describe("SeqBase - Grouping", () => {
    describe('groupBy()', () => {
      it('should return sequence of groups by key-selector of primitive (comparable) key', () => {
        const input = array.range(1, 10);
        const expectedMap = new Map<number, number[]>();
        input.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
        const expected = [...expectedMap.entries()];

        const sut = this.createSut(input).groupBy(n => n % 3);
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        assert.deepEqual(actual, expected);

        const input2 = array.samples;
        const expectedMap2 = new Map<string, any>();
        input2.forEach(s => expectedMap2.set(s.type, [...(expectedMap2.get(s.type) || []), s]));
        const expected2 = [...expectedMap2.entries()];

        const sut2 = this.createSut(input2).groupBy(g => g.type);
        const actualGrouped2 = [...sut2];
        const actual2 = actualGrouped2.map(group => [group.key, [...group]]);

        assert.deepEqual(actual2, expected2);
      });

      it('should return sequence of groups by key-selector of some object and to-comparable-key selector', () => {
        const input = array.samples;
        const expectedMap = new Map<string, any[]>();
        input.forEach(s => {
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

      it(`should group items into hierarchy when iterating each group's items and before moving to the next group`, () => {
        const input = array.range(1, 10);
        const expectedMap = new Map<number, number[]>();
        input.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
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

      it(`should group items into hierarchy when iterating some of the groups' items and before moving to the next group`, () => {
        const input = array.range(1, 10);
        const expectedMap = new Map<number, number[]>();
        input.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
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

      it('should produce same result when iterated more than once', () => {
        const input = array.range(1, 10);
        const expectedMap = new Map<number, number[]>();
        input.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), n]));
        const expected = [...expectedMap.entries()];

        const sut = this.createSut(input).groupBy(n => n % 3);
        const actualGrouped = [...sut];
        const actual = actualGrouped.map(group => [group.key, [...group]]);

        const actualGrouped2 = [...sut];
        const actual2 = actualGrouped2.map(group => [group.key, [...group]]);

        assert.deepEqual(actual2, actual);
        assert.deepEqual(actual2, expected);
      });

      it('should filter grouped sequences as expected', () => {
        const input = array.samples;
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

      it('should be able to iterate child grouped-sequence after main sequence closed', () => {
        const input = array.samples;
        const expected = input.filter(s => s.type === input[0].type)
        const sut = this.createSut(input).groupBy(s => s.type);
        let [firstGroup] = sut; // will take first child grouped-sequence and close the iterator returned by sut
        const actual = [...firstGroup];
        assert.deepEqual(actual, expected);
      });

      it('should return empty sequence when source sequence is empty', () => {
        const input: number[] = [];
        const sut = this.createSut(input).groupBy(s => s > 5);
        const actual = [...sut];
        assert.lengthOf(actual, 0);
      });

      describe('thenGroupBy()', () => {
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
            comparableKey: (key: { ok: boolean; type: string; }) => key.type + key.ok ? '+' : '-',
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
            key: (s: Sample) => ({period: s.period, scoreAbovePeriod: s.period + s.score > s.period}),
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

        it('should group items into hierarchy by several grouped key', () => {
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

          const actual = new Map([...sut].map(groupedByOk =>
            [groupedByOk.key, new Map([...groupedByOk].map(groupedByType =>
              [groupedByType.key, new Map([...groupedByType].map(groupedByPeriod =>
                [groupedByPeriod.key, [...groupedByPeriod]]))]
            ))]));

          assert.deepEqual(actual, expected);
        });

        it('should group items into hierarchy when iterating each group and before moving to the next group', () => {

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
        });
      });

      describe('mapInGroup()', () => {
        it('should return sequence of groups by key-selector of primitive (comparable) key', () => {
          const input = array.range(1, 10);
          const expectedMap = new Map<number, number[]>();
          input.forEach(n => expectedMap.set(n % 3, [...(expectedMap.get(n % 3) || []), -n]));
          const expected = [...expectedMap.entries()];

          const sut = this.createSut(input)
            .groupBy(n => n % 3)
            .mapInGroup(n => -n);
          const actualGrouped = [...sut];
          const actual = actualGrouped.map(group => [group.key, [...group]]);

          assert.deepEqual(actual, expected);

          const input2 = array.samples;
          const expectedMap2 = new Map<string, any>();
          input2.forEach(s => expectedMap2.set(s.type, [...(expectedMap2.get(s.type) || []), {
            period: s.period,
            diff: s.score - s.period
          }]));
          const expected2 = [...expectedMap2.entries()];

          const sut2 = this.createSut(input2)
            .groupBy(g => g.type)
            .mapInGroup(s => ({period: s.period, diff: s.score - s.period}));
          const actualGrouped2 = [...sut2];
          const actual2 = actualGrouped2.map(group => [group.key, [...group]]);

          assert.deepEqual(actual2, expected2);
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

          assert.equal(actual, expected);
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
          const expected = [[-1, []]];
          return {outer, inner, expected, outerKeySelector: (n: number) => n, innerKeySelector: (n: number) => n % 3};
        },
        complexInputForTest() {
          const inner = array.samples;
          const outer = [{type: 'Non Existing Type'}];
          const expected = outer.map(key => [key, []]);

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
