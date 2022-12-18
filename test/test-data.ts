import {SeqBase} from "../lib/seq-base";
import {EMPTY_ARRAY, generate, SeqTags} from "../lib/common";

export const array = new class {
  get falsyValues(): any[] {
    return [0, '', null, false, undefined, Number.NaN];
  }

  get truthyValues(): any[] {
    return [1, 'x', true, [], {}, String, Symbol.iterator, Number.POSITIVE_INFINITY];
  }

  get oneToTen(): TestableArray<number> {
    return new TestableArray<number>(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
  }

  get oneToNine(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }

  get zeroToNine(): number[] {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  }

  get zeroToTen(): number[] {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }

  get tenZeros(): number[] {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  get tenOnes(): number[] {
    return [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  }

  get abc(): TestableArray<string> {
    return new TestableArray<string>(...array.range(97, 122).map(c => String.fromCharCode(c)));
  }

  get strings(): string[] {
    return ['boolean', 'string', 'number', 'symbol', 'null', 'undefined', '', 'object', 'array', ' '];
  }

  get grades(): TestableArray<{ name: string; grade: number; }> {
    // DON'T change number of items and order, since tests relies on it
    return new TestableArray(
      {name: "0", grade: 0},
      {name: "A", grade: 10},
      {name: "B", grade: 20},
      {name: "C", grade: 30},
      {name: "D", grade: 40},
      {name: "E", grade: 50},
      {name: "F", grade: 60},
      {name: "G", grade: 70},
      {name: "H", grade: 80},
      {name: "I", grade: 90},
      {name: "J", grade: 100}
    );
  }

  get gradesFiftyAndAbove(): TestableArray<{ name: string; grade: number; }> {
    return this.grades.filter(x => x.grade >= 50) as TestableArray<{ name: string; grade: number; }>;
  }

  get gradesAboveFifty(): TestableArray<{ name: string; grade: number; }> {
    return this.grades.filter(x => x.grade > 50) as TestableArray<{ name: string; grade: number; }>;
  }

  get gradesFiftyAndBelow(): TestableArray<{ name: string; grade: number; }> {
    return this.grades.filter(x => x.grade <= 50) as TestableArray<{ name: string; grade: number; }>;
  }

  get samples(): TestableArray<Sample> {
    return new TestableArray(
      {type: "C", period: 30, score: 50, ok: true},
      {type: "C", period: 30, score: 5, ok: false},
      {type: "C", period: 10, score: 0, ok: true},
      {type: "C", period: 10, score: 0, ok: false},
      {type: "C", period: 20, score: 100, ok: false},
      {type: "A", period: 30, score: 50, ok: true},
      {type: "A", period: 10, score: 0, ok: false},
      {type: "A", period: 20, score: 0, ok: false},
      {type: "A", period: 20, score: 100, ok: true},
      {type: "A", period: 20, score: 100, ok: true},
      {type: "B", period: 30, score: 50, ok: false},
      {type: "B", period: 10, score: 0, ok: true},
      {type: "B", period: 20, score: 100, ok: false},
      {type: "B", period: 20, score: 20, ok: false},
      {type: "B", period: 20, score: 20, ok: true},
      {type: "B", period: 20, score: 20, ok: true},
    );
  }

  get folders(): Folder[] {
    return [
      new Folder("1").withSubFolders(
        [
          new Folder('11').withSubFolders([
            new Folder('111'),
            new Folder('112').withSubFolders([
              new Folder('1111'),
              new Folder('1112')
            ]),
            new Folder('113')
          ]),
          new Folder('12').withSubFolders([
            new Folder('121').withSubFolders([
              new Folder('1211')
            ]),
            new Folder('122'),
            new Folder('123')
          ])
        ]),
      new Folder("2"),
      new Folder("3").withSubFolders([
        new Folder("31")
      ])
    ];
  }

  get flatFolders(): Folder[] {
    const folders = this.folders;

    function* folderChildren(folder: Folder): Generator<Folder> {
      yield folder;
      for (const child of folder.subFolders) {
        yield* folderChildren(child);
      }
    }

    const flattened = [];
    for (const root of folders) {
      flattened.push(...folderChildren(root));
    }

    return flattened;
  }

  // buildFoldersTree(): Folder[] {
  //   const buildPath = (folder: Folder | undefined): string | undefined => {
  //     let path: string[] = [];
  //     while (folder) {
  //       path.unshift(folder.name);
  //       folder = folder.parent;
  //     }
  //     return path.length ? path.join("/") : undefined;
  //   }
  //
  //   const flatFolders = this.flatFolders.map(f => ({
  //     path: buildPath(f)!,
  //     name: f.name,
  //     parent: buildPath(f.parent)
  //   }));
  //
  //   const map = new Map<any, any>();
  //   const context = {
  //     ancestors: <Folder[]>[]
  //   };
  //   for (const folder of flatFolders) {
  //
  //   }
  //
  // }

  get loremIpsum(): TestableArray<string> {
    return new TestableArray(...
      "Lorem ipsum dolor sit amet consectetur adipiscing elit Sed ut nibh diam Morbi leo erat porta congue facilisis vitae hendrerit ac dolor Nunc et nisl sit amet tortor pellentesque auctor Morbi sit amet arcu risus Ut efficitur purus turpis id egestas massa rhoncus a Donec imperdiet eros ut mollis posuere Mauris at tellus turpis Mauris in felis nec sapien condimentum interdum Fusce vulputate libero a finibus sollicitudin Donec aliquam est at nibh condimentum semper convallis diam porta Nulla ut eros id turpis fermentum condimentum Etiam fringilla magna sit amet odio blandit vitae porta eros posuere Integer at ligula auctor bibendum dui sit amet venenatis libero Proin convallis eros et arcu dapibus sodales Vivamus maximus ultricies libero ac mattis justo euismod eu"
        .split(' ')
    );
  }

  range(from: number, to: number, step: number = 1): TestableArray<number> {
    return new TestableArray(...generator.range(from, to, step));
  };

  repeat<T>(value: T, count: number) {
    return [...generator.repeat(value, count)];
  };

  repeatConcat<T>(value: T[], count: number): T[] {
    return new Array<T>().concat(...generator.repeat(value, count));
  };

  reverse<T>(value: T[]): T[] {
    return value.slice().reverse()
  }

  random(count: number, min = 0, max = 1.0, seed?: number): TestableArray<number> {
    const values = new TestableArray<number>();
    for (const n of generator.random(min, max, seed)) {
      if (count--) values.push(n);
      else break;
    }
    return values;
  }
};

export class Folder {
  subFolders: Folder[] = [];
  parent?: Folder;

  constructor(public name: string) {
  }

  get depth(): number {
    return (this.parent?.depth ?? -1) + 1;
  }

  withSubFolders(subFolders: Folder[]): this {
    subFolders.forEach(f => f.parent = this);
    this.subFolders = subFolders;
    return this;
  }

  toString(): string {
    return this.name;
  }
}

export interface Sample {
  type: string;
  period: number;
  score: number;
  ok: boolean;
}

export interface Grade {
  name: string;
  grade: number;
}

export class ReusableGenerator<T> implements Iterable<T> {
  constructor(private readonly generatorFunc: (...args: any[]) => Generator<T>) {
  }

  [Symbol.iterator](): Iterator<T> {
    return this.generatorFunc();
  }
}

export const generator = new class {
  endlessTruthySequence() {
    return new ReusableGenerator(function* endlessTruthySequence() {
      while (true) yield 1;
    })
  };

  endlessFalsySequence() {
    return new ReusableGenerator(function* endlessFalsySequence() {
      while (true) yield 0;
    })
  };

  from<T>(array: readonly T[]): Iterable<T>
  from(string: string): Iterable<string>
  from<T>(arrayOrString: Iterable<T>): Iterable<T> {
    return new ReusableGenerator<T>(function* from() {
      yield* arrayOrString;
    });
  };

  range(from: number, to: number, step: number = 1): Iterable<number> {
    return new ReusableGenerator(function* range() {
      if (step < 1) throw new RangeError("step must be greater than zero");

      if (to < from) step *= -1;

      let count = 0;
      while (true) {
        const value = from + step * count++;
        if (!(step > 0 ? value <= to : to <= value)) break;
        yield value;
      }
    })
  };

  repeat<T>(value: T, count: number): Iterable<T> {
    return new ReusableGenerator<T>(function* repeat() {
      while (count--) yield value;
    });
  }

  random(min = 0, max = 2 ** 31 - 1, seed?: number): Iterable<number> {
    return new ReusableGenerator(function* random() {
      const random = new Random(seed);
      while (true) yield random.next(min, max);
    });
  }
};

class Random {
  constructor(private seed?: number) {
  }

  next(min = 0, max = 2 ** 31 - 1): number {
    if (this.seed == null) return Math.random() * (max - min) + min;
    this.seed = this.seed += Math.E;
    const x = Math.sin(this.seed += Math.E) * 2 ** 32;
    const res = Math.floor((x - Math.floor(x)) * (max - min) + min);
    return res;
  }
}

type ArraysOnly = { [k in keyof typeof array]: (typeof array)[k] extends ArrayLike<infer T> ? Iterable<T> : never; };
export const iterables: ArraysOnly = new Proxy(array, {
  get(target: any, p: PropertyKey, receiver: any): any {
    const array = Reflect.get(target, p, receiver);
    return generator.from(array);
  }
});

export class TestableArray<T> extends Array<T> {
  getIteratorCount = 0;
  yieldCount = 0;

  constructor(...items: T[]) {
    super(...items);
  }

  * [Symbol.iterator](): IterableIterator<T> {
    this.getIteratorCount++;
    for (const item of super[Symbol.iterator]()) {
      this.yieldCount++;
      yield item;
    }
  }

  x(multiplyBy: number): TestableArray<T> {
    return new TestableArray<T>().concat(...Array.from({length: multiplyBy}, _ => this)) as TestableArray<T>;
  }

  randomize(seed?: number): this {
    const random = new Random(seed);
    for (let i = this.length - 1; i > 0; i--) {
      const rnd = random.next(0, i);
      [this[i], this[rnd]] = [this[rnd], this[i]];
    }
    return this;
  }

  selfZip(count: number): TestableArray<T> {
    return new TestableArray<T>().concat(...this.map(x => Array.from({length: count}, _ => x))) as TestableArray<T>;
  }

  pollute(undefineds: number, nulls: number = 0): this {
    const random = new Random(undefineds + nulls);
    const uniqueRandomIndexes = new Set<number>();
    const maxIndexes = Math.min(undefineds + nulls, this.length);

    while (uniqueRandomIndexes.size < maxIndexes) uniqueRandomIndexes.add(random.next(0, this.length - uniqueRandomIndexes.size - 1));
    const randomIndexes = [...uniqueRandomIndexes];
    while (undefineds--) this[randomIndexes.pop()!] = undefined as any;
    while (nulls--) this[randomIndexes.pop()!] = null as any;

    return this;
  }

  randomNulls(count: number): this {
    const random = new Random(count);
    const uniqueRandomIndexes = new Set<number>();
    const maxIndexes = Math.min(count, this.length);

    while (uniqueRandomIndexes.size < maxIndexes) uniqueRandomIndexes.add(random.next(0, this.length - uniqueRandomIndexes.size - 1));
    const randomIndexes = [...uniqueRandomIndexes];
    while (count--) this[randomIndexes.pop()!] = null as any;

    return this;
  }

  prependNulldefined(undefineds: number, nulls: number = 0): this {
    while (nulls--) this.unshift(null as any);
    while (undefineds--) this.unshift(undefined as any);
    return this;
  }

  appendNulldefined(undefineds: number, nulls: number = 0): this {
    while (nulls--) this.push(null as any);
    while (undefineds--) this.push(undefined as any);
    return this;
  }
}

Object.defineProperty(TestableArray, 'getIteratorCount', {enumerable: false});
Object.defineProperty(TestableArray, 'yieldCount', {enumerable: false});

export class TestableDerivedSeq<T> extends SeqBase<T> {
  constructor(
    protected readonly source: Iterable<T> = EMPTY_ARRAY,
    tags: readonly [tag: symbol, value: any][] = EMPTY_ARRAY) {

    super();

    SeqTags.setTagsIfMissing(this, tags);
  }

  private _wasIterated = false;

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
