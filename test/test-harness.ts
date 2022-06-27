import {SeqTags} from "../lib/common";
import {it} from "mocha";
import {generator} from "./test-data";
import {asSeq, Seq} from "../lib";
import {asSeq as asSeqOptimized} from "../lib/optimized";

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
  protected abstract createSut: (<T>(input: Iterable<T>) => Seq<T>) & { fromGenerator?: <T>(generator: () => Iterator<T>) => Seq<T> };
  private asSeq: (input: Iterable<any>) => Seq<any>;

  constructor(protected optimized: boolean) {
    this.asSeq = optimized? asSeq: asSeqOptimized;
  }

  it1 = <T>(title: string, input: readonly T[], testFn: (input: Iterable<T>, inputArray: readonly T[]) => void): void => {
    it(title + ' - array source', () => testFn(input, input));
    it(title + ' - iterable source', () => testFn(generator.from(input), input));
    it(title + ' - sequence source', () => testFn(this.createSut(input), input));
    const generatorFunctionSut = this.tryCreateSutForGeneratorFunction(input);
    if (generatorFunctionSut != null) {
      it(title + ' - generator function', () => testFn(generatorFunctionSut, input));
    }
  }

  it2 = <T, U = T>(title: string, first: readonly T[], second: readonly U[], testFn: (first: Iterable<T>, second: Iterable<U>) => void): void => {
    const generatorFunctionSut1 = this.tryCreateSutForGeneratorFunction(first);
    const generatorFunctionSut2 = this.tryCreateSutForGeneratorFunction(second);

    it(title + ' - first array, second array', () => testFn(first, second));
    it(title + ' - first array, second iterable', () => testFn(first, generator.from(second)));
    it(title + ' - first array, second sequence', () => testFn(first, this.createSut(second)));
    if (generatorFunctionSut2 != null) {
      it(title + ' - first array, second generator fn', () => testFn(first, generatorFunctionSut2));
    }

    it(title + ' - first iterable, second array', () => testFn(generator.from(first), second));
    it(title + ' - first iterable, second iterable', () => testFn(generator.from(first), generator.from(second)));
    it(title + ' - first iterable, second sequence', () => testFn(generator.from(first), this.createSut(second)));
    if (generatorFunctionSut2 != null) {
      it(title + ' - first iterable, second generator fn', () => testFn(generator.from(first), generatorFunctionSut2));
    }

    it(title + ' - first sequence, second array', () => testFn(this.createSut(first), second));
    it(title + ' - first sequence, second iterable', () => testFn(this.createSut(first), generator.from(second)));
    it(title + ' - first sequence, second sequence', () => testFn(this.createSut(first), this.createSut(second)));
    if (generatorFunctionSut2 != null) {
      it(title + ' - first sequence, second generator fn', () => testFn(this.createSut(first), generatorFunctionSut2));
    }

    if (generatorFunctionSut1 != null) {
      it(title + ' - first generator fn, second array', () => testFn(generatorFunctionSut1, second));
      it(title + ' - first generator fn, second iterable', () => testFn(generatorFunctionSut1, generator.from(second)));
      it(title + ' - first generator fn, second sequence', () => testFn(generatorFunctionSut1, this.createSut(second)));
      if (generatorFunctionSut2 != null) {
        it(title + ' - first generator fn, second generator fn', () => testFn(this.createSut(first), generatorFunctionSut2));
      }
    }
  }

  itx = <T, U = T>(title: string, input: readonly T[], others: readonly U[][], testFn: (input: Iterable<T>, others: readonly Iterable<U>[]) => void): void => {
    it(title + ' - input array, others array', () => testFn(input, others));
    it(title + ' - input array, others generator', () => testFn(input, others.map(x => generator.from(x))));
    it(title + ' - input array, others sequence', () => testFn(input, others.map(x => this.createSut(x))));

    it(title + ' - input generator, others array', () => testFn(generator.from(input), others));
    it(title + ' - input generator, others generator', () => testFn(generator.from(input), others.map(x => generator.from(x))));
    it(title + ' - input generator, others sequence', () => testFn(generator.from(input), others.map(x => this.createSut(x))));

    it(title + ' - input sequence, others array', () => testFn(this.createSut(input), others));
    it(title + ' - input sequence, others generator', () => testFn(this.createSut(input), others.map(x => generator.from(x))));
    it(title + ' - input sequence, others sequence', () => testFn(this.createSut(input), others.map(x => this.createSut(x))));
  }

  private tryCreateSutForGeneratorFunction<T>(input: Iterable<T>) {
    if (this.createSut.fromGenerator != null) {
      const generator = function* testGenerator() {
        yield* input;
      };
      const seq = this.createSut.fromGenerator(generator);
      return seq;
    }
    return undefined;
  }
}
