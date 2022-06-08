import {SeqTags} from "../../lib/common";

export class TestHarness {
  private static $getIteratorInvoked = Symbol('[[$getIteratorInvoked]]');
  private static $consumed = Symbol('[[consumed]]');
  private static $yielded = Symbol('[[yielded]]');

  static materialize(value: any): any {
    function isIterable(value: any): value is Iterable<any> {
      return value && typeof value !== 'string' && typeof value[Symbol.iterator] === 'function';
    }

    function* deepToArray(iterable: Iterable<any>): Generator<any> {
      for (const item of iterable) yield isIterable(item) ? [...deepToArray(item)] : item;
    }

    return isIterable(value) ? [...deepToArray(value)] : value;
  }

  static $$getIteratorInvoked(iterable: any) : boolean {
    return (iterable[TestHarness.$getIteratorInvoked] as boolean) ?? false;
  }
  static $$consumed(iterable: any) : boolean {
    return (iterable[TestHarness.$consumed] as boolean) ?? false;
  }
  static $$yielded(iterable: any) : boolean {
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
