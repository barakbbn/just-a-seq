import {createSeq, GeneratorSeqImpl} from "../lib/seq-impl";
import {SeqBase_Deferred_GetIterator_Tests} from "./seq-base/deferred-get-iterator";
import {SeqBase_Deferred_Tests} from "./seq-base/seq-base-deferred";
import {SeqBase_Immediate_Tests} from "./seq-base/seq-base-immediate";
import {describe, it} from "mocha";
import {SeqBase_Sorting_Tests} from "./seq-base/seq-base-sorting";
import {SeqBase_CachedSeq_Tests} from "./seq-base/seq-base-caching";
import {SeqBase_Grouping_Tests} from "./seq-base/seq-base-grouping";
import {array, generator} from "./test-data";
import {assert} from "chai";
import {SeqBase_Immutable_Tests} from "./seq-base/seq-base-immutable";
import {SeqBase_Close_Iterator_Tests} from "./seq-base/seq-base-close-iterator";
import {SeqBase} from "../lib/seq-base";
import {SeqBase_Change_Source_Tests} from "./seq-base/seq-base-change-source";
import {IterationContext, SeqTags, TaggedSeq} from "../lib/common";
import {Seq} from "../lib";

function createSut<T>(optimized: boolean) {
  const factory: (<T>(input?: Iterable<T>) => Seq<T>) & { fromGenerator?: <T>(generator: () => Iterator<T>) => Seq<T> } = <T>(input?: Iterable<T>): SeqBase<T> => {
    const tags: [symbol, any][] = optimized? [[SeqTags.$optimize, true]]: [];
    return createSeq(input, undefined, tags);
  };
  factory.fromGenerator = <T>(generator: () => Iterator<T>): SeqBase<T> => {
    const tags: [symbol, any][] = optimized? [[SeqTags.$optimize, true]]: [];
    return createSeq(undefined, generator, tags);
  };

  return factory;
}

class SeqImpl_Deferred_GetIterator_Tests extends SeqBase_Deferred_GetIterator_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_Deferred_Tests extends SeqBase_Deferred_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_Immediate_Tests extends SeqBase_Immediate_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_SortedSeq_Tests extends SeqBase_Sorting_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_CachedSeq_Tests extends SeqBase_CachedSeq_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_Grouping_Tests extends SeqBase_Grouping_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_Immutable_Tests extends SeqBase_Immutable_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_Close_Iterator_Tests extends SeqBase_Close_Iterator_Tests {
  protected createSut = createSut(this.optimized);
}

class SeqImpl_Change_Source_Tests extends SeqBase_Change_Source_Tests {
  protected readonly createSut = createSut(this.optimized);
}

class GeneratorSeqImpl_Optimized_Tests {
  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('GeneratorSeqImpl - Optimized', () => {
    if (!this.optimized) return;

    describe('all()', () => {
      it('should throw if source if tagged as infinite', () => {
        const source: number[] = [];
        const sut = this.createSut(source, function* () {
          yield false;
        });
        (sut as TaggedSeq)[SeqTags.$maxCount] = Number.POSITIVE_INFINITY;
        assert.throw(() => sut.all(() => true));
      });

      it('should return true if sequence tagged as empty', () => {
        const sut = this.createSut([], function* nonEmpty() {
          yield 'as long as tagged as empty, it does not matter if it is yielding';
        });
        (sut as TaggedSeq)[SeqTags.$maxCount] = 0;
        const actual = sut.all(v => v || true);
        assert.isTrue(actual);
      });

      it('should not optimize if condition parameter expect index argument and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut([], function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.all((value, index) => index - index);
        assert.isTrue(iterated);
      });

      it('should not optimize if not tagged as $notAffectingNumberOfItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut([], function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.all(n => n - n);
        assert.isTrue(iterated);
      });

      it('should not optimize if not tagged as $notMappingItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut([], function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;

        sut.all(n => n - n);
        assert.isTrue(iterated);
      });

      it('should not optimize if source is generator and conditions allow optimization', () => {
        function* source() {
          yield 1;
        }

        let iterated = false;
        const sut = this.createSut(source(), function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.all(n => n);
        assert.isTrue(iterated);
      });

      it('should call all() on source if it is a sequence and this sequence can be optimized', () => {
        const source = this.createSut(array.oneToTen, function* (source) {
          yield* source;
        });
        let allCalledOnSource = false;
        const inner = source.all;
        source.all = condition => {
          allCalledOnSource = true;
          return inner.bind(source)(condition);
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.all(n => n >= 0);

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(allCalledOnSource);
      });

      it('should call every() on source array if this sequence can be optimized', () => {
        let everyCalledOnSource = false;
        const source = new class extends Array<number> {
          constructor() {
            super(...array.oneToTen);
          }

          every<S extends number>(predicate: (value: number, index: number, array: number[]) => value is S, thisArg?: any): this is S[] {
            everyCalledOnSource = true;
            return super.every(predicate, thisArg);
          }
        }


        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.all(n => n >= 0);

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(everyCalledOnSource);
      });

      it('should optimize if condition parameter has no parameters and this sequence can be optimized', () => {
        let iterated = false;

        const sut = this.createSut(array.oneToTen, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.all(() => false);

        assert.isFalse(iterated);
        assert.isFalse(actual);
      });
    });

    describe('any()', () => {
      it('should return false if sequence tagged as empty', () => {
        const sut = this.createSut([], function* nonEmpty() {
          yield 'as long as tagged as empty, it does not matter if it is yielding';
        });
        (sut as TaggedSeq)[SeqTags.$maxCount] = 0;
        const actual = sut.any();
        assert.isFalse(actual);
      });

      it('should not optimize if condition parameter expect index argument and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut([], function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.any((value, index) => index - index);
        assert.isTrue(iterated);
      });

      it('should not optimize if not tagged as $notAffectingNumberOfItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut([], function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.any();
        assert.isTrue(iterated);
      });

      it('should not optimize if condition provided and not tagged as $notMappingItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut([], function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;

        sut.any(n => n > 5);
        assert.isTrue(iterated);
      });

      it('should not optimize if source is generator and conditions allow optimization', () => {
        function* source() {
          yield 1;
        }

        let iterated = false;
        const sut = this.createSut(source(), function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.any();
        assert.isTrue(iterated);
      });

      it('should call any() on source if it is a sequence and this sequence can be optimized', () => {
        const source = this.createSut(array.oneToTen, function* (source) {
          yield* source;
        });
        let anyCalledOnSource = false;
        const inner = source.any;
        source.any = condition => {
          anyCalledOnSource = true;
          return inner.bind(source)(condition);
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.any();

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(anyCalledOnSource);
      });

      it('should call some() on source array if this sequence can be optimized', () => {
        let someCalledOnSource = false;
        const source = new class extends Array<number> {
          constructor() {
            super(...array.oneToTen);
          }

          some<S extends number>(predicate: (value: number, index: number, array: number[]) => value is S, thisArg?: any): this is S[] {
            someCalledOnSource = true;
            return super.some(predicate, thisArg);
          }
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.any(n => n > 0);

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(someCalledOnSource);
      });

      it('should optimize if condition parameter has no parameters and this sequence can be optimized', () => {
        let iterated = false;

        const sut = this.createSut(array.oneToTen, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.any(() => false);

        assert.isFalse(iterated);
        assert.isFalse(actual);
      });

      it('should optimize using source Array.length property if no condition specified and this sequence can be optimized', () => {
        let lengthCalledOnSource = false;
        const source = new Proxy(array.oneToTen, {
          get(target: number[], p: PropertyKey): any {
            if (p === 'length') {
              lengthCalledOnSource = true;
              return target.length;
            }
            return Reflect.get(target, p);
          }
        });

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.any();

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(lengthCalledOnSource);
      });

      it('should return true if no condition provided and this sequence is infinite', () => {
        const sut = this.createSut([], function* () {
        });

        (sut as TaggedSeq)[SeqTags.$maxCount] = Number.POSITIVE_INFINITY;

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.any();

        assert.isTrue(actual);
      });

      it('should optimize using source Array.length is no condition provided and only tagged as $notAffectingNumberOfItems', () => {
        let lengthCalledOnSource = false;
        const source = new Proxy(array.oneToTen, {
          get(target: number[], p: PropertyKey): any {
            if (p === 'length') {
              lengthCalledOnSource = true;
              return target.length;
            }
            return Reflect.get(target, p);
          }
        });

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        const actual = sut.any();

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(lengthCalledOnSource);
      });
    });

    describe('count()', () => {

      it('should throw if sequence is infinite', () => {
        const source: number[] = [];
        const sut = this.createSut(source, function* () {
          yield false;
        });
        (sut as TaggedSeq)[SeqTags.$maxCount] = Number.POSITIVE_INFINITY;
        assert.throw(() => sut.count());
      });

      it('should return 0 if sequence tagged as empty', () => {
        const sut = this.createSut(array.oneToTen, function* nonEmpty() {
          yield 'as long as tagged as empty, it does not matter if it is yielding';
        });
        (sut as TaggedSeq)[SeqTags.$maxCount] = 0;
        const actual = sut.count(n => n);
        assert.strictEqual(actual, 0);
      });

      it('should not optimize if condition parameter expect index argument and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut(array.oneToTen, function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.count((value, index) => index > 0);
        assert.isTrue(iterated);
      });

      it('should not optimize if not tagged as $notAffectingNumberOfItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut(array.oneToTen, function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.count(n => n > 5);
        assert.isTrue(iterated);
      });

      it('should not optimize if not tagged as $notMappingItems and condition parameter provided and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut(array.oneToTen, function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;

        sut.count(n => n > 5);
        assert.isTrue(iterated);
      });

      it('should not optimize if source is sequence and not tagged as $notMappingItems and condition provided and other conditions allow optimization', () => {
        const source = this.createSut(array.oneToTen, function* (source) {
          yield* source;
        });
        let iterated = false;
        const sut = this.createSut(source, function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;

        sut.count(n => n > 5);
        assert.isTrue(iterated);
      });

      it('should not optimize if source is generator and conditions allow optimization', () => {
        function* source() {
          yield 1;
        }

        let iterated = false;
        const sut = this.createSut(source(), function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.count(n => n > 5);
        assert.isTrue(iterated);
      });

      it('should optimize using count() on source if it is a sequence and this sequence can be optimized', () => {
        const source = this.createSut(array.oneToTen, function* (source) {
          yield* source;
        });
        let countCalledOnSource = false;
        const inner = source.count;
        source.count = condition => {
          countCalledOnSource = true;
          return inner.bind(source)(condition);
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        sut.count(n => n > 5);

        assert.isFalse(iterated);
        assert.isTrue(countCalledOnSource);
      });

      it('should optimize using source Array.length property if no condition specified and this sequence can be optimized', () => {
        let lengthCalledOnSource = false;
        const source = new Proxy(array.oneToTen, {
          get(target: number[], p: PropertyKey): any {
            if (p === 'length') {
              lengthCalledOnSource = true;
              return target.length;
            }
            return Reflect.get(target, p);
          }
        });

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        sut.count();

        assert.isFalse(iterated);
        assert.isTrue(lengthCalledOnSource);
      });
    });

    describe('hasAtLeast()', () => {
      it('should return false if sequence $maxCount tag is less than count parameter', () => {
        const source = array.oneToTen;
        const sut = this.createSut(source, function* (source) {
          yield* source;
        });
        (sut as TaggedSeq)[SeqTags.$maxCount] = source.length;

        const actual = sut.hasAtLeast(source.length + 1);
        assert.isFalse(actual);
      });

      it('should optimize using source Array.length when tagged as $notAffectingNumberOfItems', () => {
        let lengthCalledOnSource = false;
        const source = new Proxy(array.oneToTen, {
          get(target: number[], p: PropertyKey): any {
            if (p === 'length') {
              lengthCalledOnSource = true;
              return target.length;
            }
            return Reflect.get(target, p);
          }
        });

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        sut.hasAtLeast(1);

        assert.isFalse(iterated);
        assert.isTrue(lengthCalledOnSource);
      });

      it('should optimize using source Seq.hasAtLeast when tagged as $notAffectingNumberOfItems', () => {
        const source = this.createSut(array.oneToTen, function* (source) {
          yield* source;
        });
        let hasAtLeastCalledOnSource = false;
        const inner = source.hasAtLeast;
        source.hasAtLeast = condition => {
          hasAtLeastCalledOnSource = true;
          return inner.bind(source)(condition);
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          for (const item of source) yield -item;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        sut.hasAtLeast(1);

        assert.isFalse(iterated);
        assert.isTrue(hasAtLeastCalledOnSource);
      });

      it('should not optimize if source is generator and other conditions allow optimization', () => {
        function* source() {
          yield 1;
        }

        let iterated = false;
        const sut = this.createSut(source(), function* () {
          iterated = true;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;

        sut.hasAtLeast(1);
        assert.isTrue(iterated);
      });

      it('should not optimize if sequence not tagged as $notAffectingNumberOfItems', () => {
        let iterated = false;
        const sut = this.createSut(array.oneToTen, function* (source) {
          iterated = true;
          yield* source;
        });
        sut.hasAtLeast(1);

        assert.isTrue(iterated);
      });
    });

    describe('includes()', () => {
      it('should not optimize if not tagged as $notAffectingNumberOfItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut(array.oneToTen, function* (source) {
          iterated = true;
          yield* source;
        });
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.includes(5, 1);
        assert.isTrue(iterated);
      });
      it('should not optimize if not tagged as $notMappingItems and other conditions allow optimization', () => {
        let iterated = false;
        const sut = this.createSut(array.oneToTen, function* (source) {
          iterated = true;
          yield* source;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;

        sut.includes(5, 1);
        assert.isTrue(iterated);
      });
      it('should not optimize if source is generator and conditions allow optimization', () => {
        function* source() {
          yield* array.oneToTen;
        }

        let iterated = false;
        const sut = this.createSut(source(), function* (source) {
          iterated = true;
          yield* source;
        });
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;

        sut.includes(5, 1);
        assert.isTrue(iterated);
      });

      it('should call any() on source if it is a sequence and this sequence can be optimized', () => {
        const source = this.createSut(array.oneToTen, function* (source) {
          yield* source;
        });
        let includesCalledOnSource = false;
        const inner = source.includes;
        source.includes = (item, from) => {
          includesCalledOnSource = true;
          return inner.bind(source)(item, from);
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          yield* source;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.includes(5, 1);

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(includesCalledOnSource);
      });

      it('should call includes() on source array if this sequence can be optimized', () => {
        let includesCalledOnSource = false;
        const source = new class extends Array<number> {
          constructor() {
            super(...array.oneToTen);
          }

          includes(searchElement: number, fromIndex?: number): boolean {
            includesCalledOnSource = true;
            return super.includes(searchElement, fromIndex);
          }
        }

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          yield* source;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.includes(5, 1);

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(includesCalledOnSource);
      });

      it('should optimize using source Array.length property if source array is empty and other conditions allow optimization', () => {
        let lengthCalledOnSource = false;
        const source = new Proxy(array.oneToTen, {
          get(target: number[], p: PropertyKey): any {
            if (p === 'length') {
              lengthCalledOnSource = true;
              return target.length;
            }
            return Reflect.get(target, p);
          }
        });

        let iterated = false;
        const sut = this.createSut(source, function* (source) {
          iterated = true;
          yield* source;
        });

        // Conditions to be optimized
        (sut as TaggedSeq)[SeqTags.$notAffectingNumberOfItems] = true;
        (sut as TaggedSeq)[SeqTags.$notMappingItems] = true;
        const actual = sut.includes(5, 1);

        assert.isFalse(iterated);
        assert.isTrue(actual);
        assert.isTrue(lengthCalledOnSource);
      });

    });
  });

  createSut<TSource, T>(source: Iterable<TSource>, generator: (source: Iterable<TSource>, iterationContext: IterationContext) => Iterator<T>) {
    return new GeneratorSeqImpl(source, generator, [[SeqTags.$optimize, true]]);
  }
}

export class SeqImpl_Tests {
  protected createSut = createSut(this.optimized);

  constructor(protected optimized: boolean) {
  }

  readonly run = () => describe('SeqImpl', () => {
    new SeqImpl_Deferred_GetIterator_Tests(this.optimized).run();
    new SeqImpl_Deferred_Tests(this.optimized).run();
    new SeqImpl_Immediate_Tests(this.optimized).run();
    new SeqImpl_SortedSeq_Tests(this.optimized).run();
    new SeqImpl_CachedSeq_Tests(this.optimized).run();
    new SeqImpl_Grouping_Tests(this.optimized).run();
    new SeqImpl_Immutable_Tests(this.optimized).run();
    new SeqImpl_Close_Iterator_Tests(this.optimized).run();
    new SeqImpl_Change_Source_Tests(this.optimized).run();

    describe('cache()', () => {
      it('should return same items on re-consume although source sequence changed', () => {
        const source = array.oneToTen;
        const sut = this.createSut(source);
        const cached = sut.cache();
        const actualAfterCache = [...cached];
        assert.sameOrderedMembers(actualAfterCache, source);

        // Change source
        source.pop(); // 1 - 9
        const actualBeforeCache = [...sut];
        assert.sameOrderedMembers(actualBeforeCache, source);

        const actualAfterCache2 = [...cached];
        assert.sameOrderedMembers(actualAfterCache2, actualAfterCache);
      });
    });

    describe('all()', () => {
      describe("On non-empty sequence", () => {
        it("Return true if any item match a condition and the source is endless", () => {
          const alwaysTrueCondition = () => true;

          const sut = this.createSut(generator.endlessFalsySequence());

          const actual = sut.any(alwaysTrueCondition);
          assert.isTrue(actual);
        });

        it("Return false if at least one item doesn't pass the condition and the source is endless", () => {

          const alwaysFalseCondition = () => false;
          const sut = this.createSut(generator.endlessTruthySequence());

          assert.isFalse(sut.all(alwaysFalseCondition));
        });
      });
    });

    new GeneratorSeqImpl_Optimized_Tests(this.optimized).run();
  });
}

