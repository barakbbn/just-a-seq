import {SeqBase} from "../lib/seq-base";
import {EMPTY_ARRAY, SeqTags} from "../lib/common";

export const array = new class {
  get falsyValues(): any[] {
    return [0, '', null, false, undefined, Number.NaN];
  }

  get truthyValues(): any[] {
    return [1, 'x', true, [], {}, String, Symbol.iterator, Number.POSITIVE_INFINITY];
  }

  get oneToTen(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
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

  get abc(): string[] {
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
  }

  get strings(): string[] {
    return ['boolean', 'string', 'number', 'symbol', 'null', 'undefined', '', 'object', 'array', ' '];
  }

  get grades(): { name: string; grade: number; }[] {
    return [
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
    ];
  }

  get gradesFiftyAndAbove(): { name: string; grade: number; }[] {
    return this.grades.filter(x => x.grade >= 50);
  }

  get gradesAboveFifty(): { name: string; grade: number; }[] {
    return this.grades.filter(x => x.grade > 50);
  }

  get gradesFiftyAndBelow(): { name: string; grade: number; }[] {
    return this.grades.filter(x => x.grade <= 50);
  }

  get samples(): Sample[] {
    return [
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
    ];
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

  range(from: number, to: number, step: number = 1) {
    return [...generator.range(from, to, step)];
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

  from<T>(array:readonly T[]): Iterable<T>
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
};

type ArraysOnly = { [k in keyof typeof array]: (typeof array)[k] extends ArrayLike<infer T> ? Iterable<T> : never; };
export const iterables: ArraysOnly = new Proxy(array, {
  get(target: any, p: PropertyKey, receiver: any): any {
    const array = Reflect.get(target, p, receiver);
    return generator.from(array);
  }
});

export class TestableArray<T> extends Array<T> {
  getIteratorCount: number = 0;

  constructor(...items: T[]) {
    super(...items);
  }

  [Symbol.iterator](): IterableIterator<T> {
    this.getIteratorCount++;
    return super[Symbol.iterator]();
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
