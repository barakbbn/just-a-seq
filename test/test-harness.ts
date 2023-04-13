import {EMPTY_ARRAY, SeqTags} from "../lib/common";
import {it} from "mocha";
import {generator} from "./test-data";
import {Seq} from "../lib";
import {asSeqInternal} from "../lib/internal";

import {SeqBase} from "../lib/seq-base";

export class TestHarness {
  private static $getIteratorInvoked = Symbol('[[$getIteratorInvoked]]');
  private static $consumed = Symbol('[[consumed]]');
  private static $yielded = Symbol('[[yielded]]');

  static materialize(value: any): any {
    function isIterable(value: any): value is Iterable<any> {
      return value && typeof value !== 'string' && typeof value[Symbol.iterator] === 'function';
    }

    function* deepToArray(iterable: Iterable<any>): Generator<any> {
      for (const item of iterable) yield isIterable(item)? [...deepToArray(item)]: item;
    }

    return isIterable(value)? [...deepToArray(value)]: value;
  }

  static $$getIteratorInvoked(iterable: any): boolean {
    return (iterable[TestHarness.$getIteratorInvoked] as boolean) ?? false;
  }

  static $$consumed(iterable: any): boolean {
    return (iterable[TestHarness.$consumed] as boolean) ?? false;
  }

  static $$yielded(iterable: any): boolean {
    return (iterable[TestHarness.$yielded] as boolean) ?? false;
  }

  static monitorIteration<T extends Iterable<any>>(seq: T): T {
    const self = this;
    const iterable = seq as any;

    const generator = iterable[Symbol.iterator].bind(iterable) as () => Iterator<any>;
    iterable[Symbol.iterator] = function* wrappedIteration() {
      iterable[TestHarness.$getIteratorInvoked] = true;
      const iterator = generator();
      for (let next = iterator.next(); !next.done; next = iterator.next()) {
        iterable[TestHarness.$yielded] = true;
        if (SeqTags.isSeq(next.value)) self.monitorIteration(next.value);
        yield next.value;
      }
      iterable[TestHarness.$consumed] = true;
    }.bind(iterable);

    return seq as any;
  }
}

export abstract class TestIt {
  protected abstract createSut: (<T>(input?: Iterable<T>) => Seq<T>) & {
    fromGenerator?: <T>(generator: () => Iterator<T>) => Seq<T>
  };
  private asSeq: (input: Iterable<any>) => Seq<any>;

  protected constructor(protected optimized: boolean) {
    this.asSeq = (input: Iterable<any>) => asSeqInternal([input], optimized);
  }

  it1 = <T>(title: string, input: readonly T[], testFn: (input: Iterable<T>, inputArray: readonly T[]) => void): void => {
    it(title + ' - array source', () => testFn(input, input));
    it(title + ' - iterable source', () => testFn(generator.from(input), input));
    it(title + ' - sequence source', () => testFn(this.createSut(input), input));
    const generatorFunctionSut = this.tryCreateSutForGeneratorFunction(input);
    if (generatorFunctionSut != null) {
      it(title + ' - generator function', () => testFn(generatorFunctionSut, input));
    }
  };

  it2 = <T, U = T>(title: string, first: readonly T[], second: readonly U[], testFn: (first: Iterable<T>, second: Iterable<U>, firstArray: readonly T[], secondArray: readonly U[]) => void): void => {
    const generatorFunctionSut1 = this.tryCreateSutForGeneratorFunction(first);
    const generatorFunctionSut2 = this.tryCreateSutForGeneratorFunction(second);

    it(title + ' - first array, second array', () => testFn(first, second, first, second));
    it(title + ' - first array, second iterable', () => testFn(first, generator.from(second), first, second));
    it(title + ' - first array, second sequence', () => testFn(first, this.createSut(second), first, second));
    if (generatorFunctionSut2 != null) {
      it(title + ' - first array, second generator fn', () => testFn(first, generatorFunctionSut2, first, second));
    }

    it(title + ' - first iterable, second array', () => testFn(generator.from(first), second, first, second));
    it(title + ' - first iterable, second iterable', () => testFn(generator.from(first), generator.from(second), first, second));
    it(title + ' - first iterable, second sequence', () => testFn(generator.from(first), this.createSut(second), first, second));
    if (generatorFunctionSut2 != null) {
      it(title + ' - first iterable, second generator fn', () => testFn(generator.from(first), generatorFunctionSut2, first, second));
    }

    it(title + ' - first sequence, second array', () => testFn(this.createSut(first), second, first, second));
    it(title + ' - first sequence, second iterable', () => testFn(this.createSut(first), generator.from(second), first, second));
    it(title + ' - first sequence, second sequence', () => testFn(this.createSut(first), this.createSut(second), first, second));
    if (generatorFunctionSut2 != null) {
      it(title + ' - first sequence, second generator fn', () => testFn(this.createSut(first), generatorFunctionSut2, first, second));
    }

    if (generatorFunctionSut1 != null) {
      it(title + ' - first generator fn, second array', () => testFn(generatorFunctionSut1, second, first, second));
      it(title + ' - first generator fn, second iterable', () => testFn(generatorFunctionSut1, generator.from(second), first, second));
      it(title + ' - first generator fn, second sequence', () => testFn(generatorFunctionSut1, this.createSut(second), first, second));
      if (generatorFunctionSut2 != null) {
        it(title + ' - first generator fn, second generator fn', () => testFn(this.createSut(first), generatorFunctionSut2, first, second));
      }
    }
  };

  itx = <T, U = T>(title: string, input: readonly T[], others: readonly U[][], testFn: (input: Iterable<T>, others: readonly Iterable<U>[], inputArray: readonly T[], otherArrays: readonly U[][]) => void): void => {
    it(title + ' - input array, others array', () => testFn(input, others, input, others));
    it(title + ' - input array, others generator', () => testFn(input, others.map(x => generator.from(x)), input, others));
    it(title + ' - input array, others sequence', () => testFn(input, others.map(x => this.createSut(x)), input, others));

    it(title + ' - input generator, others array', () => testFn(generator.from(input), others, input, others));
    it(title + ' - input generator, others generator', () => testFn(generator.from(input), others.map(x => generator.from(x)), input, others));
    it(title + ' - input generator, others sequence', () => testFn(generator.from(input), others.map(x => this.createSut(x)), input, others));

    it(title + ' - input sequence, others array', () => testFn(this.createSut(input), others, input, others));
    it(title + ' - input sequence, others generator', () => testFn(this.createSut(input), others.map(x => generator.from(x)), input, others));
    it(title + ' - input sequence, others sequence', () => testFn(this.createSut(input), others.map(x => this.createSut(x)), input, others));
  };

  private tryCreateSutForGeneratorFunction<T>(input: Iterable<T>) {
    if (this.createSut.fromGenerator != null) {
      const generator = function* testGenerator() {
        yield* input;
      };
      return this.createSut.fromGenerator(generator);
    }
    return undefined;
  }
}

export class TestableDerivedSeq<T> extends SeqBase<T> {
  private _wasIterated = false;

  constructor(
    protected readonly source: Iterable<T> = EMPTY_ARRAY,
    tags: readonly [tag: symbol, value: any][] = EMPTY_ARRAY) {

    super();

    SeqTags.setTagsIfMissing(this, tags);
  }

  get wasIterated(): boolean {
    return this._wasIterated;
  }

  * [Symbol.iterator](): Iterator<T> {
    this._wasIterated = true;
    yield* this.source;
  }

  protected getSourceForNewSequence(): Iterable<T> {
    return this.source;
  }
}
