# just-a-seq

This is just a **sequence** that wraps an array or other Iterable object, Generator function.  
It provides query functionalities and helpers over the items.
___

### Features

* Typescript type definitions
* Lazy/Deferred functionalities, similar to .NET LINQ.

  The actions are only being recorded, and executed when the sequence is iterated or when performing a consuming action.
* Immutable - actions on the sequence won't change it, but return a new sequence with the changes
* Fluent API - chain functions calls to simplify the code
* API that more resemble to JavaScript Array  
  (Since most existing libraries already mimics .Net IEnumerable).
* Additional useful functionalities that can make you more productive.

#### Examples

```typescript
import {asSeq} from 'just-a-seq';

let cells: { col: number; row: number; userValue?: number; }[] = [
  {col: 0, row: 0, userValue: 0}, {col: 0, row: 1, userValue: 1},
  {col: 1, row: 0, userValue: 10}, {col: 1, row: 1, userValue: 11},
];
const newPoints = [{x: 0, y: 0}, {x: 1, y: 1}, {x: 11, y: 11}];
// Sync cells with new points, by keeping existing cells (with user changes) and adding newer
const changed = !asSeq(cells).includesAll(newPoints, cell => cell.col + ',' + cell.row, p => p.x + ',' + p.y);
if (changed) {
  cells = asSeq(newPoints)
    .groupJoin(cells, p => p.x + ',' + p.y, cell => cell.col + ',' + cell.row)
    .map(group => group.ifEmpty({col: group.key.x, row: group.key.y}))
    .flat()
    .toArray();
}
console.log(cells);
// Output: [
//   {col: 0, row: 0, userValue: 0}, 
//   {col: 1, row: 1, userValue: 11},
//   {col: 11, row: 11}
// ]
```

<!-- Example 2 -->
<details>
<summary><i>Example 2</i></summary>

```typescript
const layers = [
  {layerId: 1, name: 'L-01', points: [{x: 0, y: 0, tag: 'center'}, {x: 1, y: 1, tag: 'opt'}], type: 'static'},
  {layerId: 2, name: 'L-02', points: [{x: 0, y: 0, tag: 'relative'}, {x: 2, y: 2, tag: 'opt'}], type: 'static'},
  {layerId: 3, name: 'L-0A', points: [{x: 0, y: 0, tag: 'relative'}, {x: 3, y: 3, tag: 'relative'}], type: 'static'},
  {layerId: 4, name: 'L-0B', points: [{x: 0, y: 0, tag: 'offset'}, {x: 1, y: 1, tag: 'center'}], type: 'float'},
  {layerId: 5, name: 'L---', points: [{x: 0, y: 0, tag: '-'}, {x: 1, y: 1, tag: '-'}], type: 'hidden'}
];

console.log(asSeq(layers)
  .filter(l => l.type !== 'hidden') // None hidden layers
  .flatMap(l => l.points) // Flat all layers' points into a sequence
  .distinct(p => p => p.x + ',' + p.y) // Remove duplicate points
  .sortBy(p => p.x) // Sort by x then by y
  .thenSortBy(p => p.y)
  .prepend({x: -1, y: -1}) // Add special point at the beginning
  .map(p => `{${p, x},${p.y}}`) // Map each point to string representation 
  .toString({start: '[', end: ']'}) // Convert the sequence into string wrapped in brackets
);
// Output: [{-1,-1},{0,0},{1,1},{2,2},{3,3}]
```

</details>

### Functionality summary

### `Seq` Interface

<!-- all() -->
<details>
  <summary><samp><b>all()</b></samp> - <small><i>(same as <b>every</b>)</i></small> Checks whether all items match a condition</summary>

> Always returns true if sequence is empty

<h3><code>all(condition: Condition&lt;T&gt;): boolean</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item and returns a truthy or falsy value</dd>
  </dl><hr>
</details>

<!-- any() -->
<details>
  <summary><samp><b>any()</b></samp> - <small><i>(same as <b>some</b>)</i></small> Checks if any item matches a condition</summary>
  <h3><code>any(condition: Condition&lt;T&gt;): boolean</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item and returns a truthy or falsy value</dd>
  </dl><hr>  
</details>

<!-- as() -->
<details>
  <summary><samp><b>as()</b></samp> - <small><i>(Typescript only)</i></small> Cast the sequence's item type to another</summary>

> The sequence instance remains the same

<h3><code>as&lt;U&gt;(): Seq&lt;U&gt;</code></h3>
  <dl>
    <dt>- U generic type</dt>
    <dd>The type to cast to</dd>
  </dl><hr>  
</details>

<!-- asSeq() -->
<details>
  <summary><samp><b>asSeq()</b></samp> - Wraps the sequence with new basic Seq implementation</summary>

> Used in cases need to avoid passing inherited Seq implementation (i.e. SortedSeq, GroupedSeq, etc...)

<h3><code>asSeq(): Seq&lt;T&gt;</code></h3>
  <hr>  
</details>

<!-- at() -->
<details>
  <summary><samp><b>at()</b></samp> - <small><i>(Like Array.at)</i></small> Returns an item at index</summary>
  <h3><code>at(index: number, fallback?: T): T &#124; undefined</code></h3>
  <dl>
    <dt>- index</dt>
    <dd>Can be negative, relative to end of sequence</dd>
    <dt>- fallback?</dt>
    <dd>Value to return if index not in range</dd>
  </dl><hr>  
</details>

<!-- append() -->
<details>
  <summary><samp><b>append()</b></samp> - <small><i>(same as <b>push</b>)</i></small> Returns a new sequence, with appended items at the end of the sequence</summary>
  <h3><code>append(...items: T[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Zero or more items to append</dd>
  </dl><hr>  
</details>

<!-- average() -->
<details>
  <summary><samp><b>average()</b></samp> - Return the average value from a sequence of numbers</summary>
  <h3><code>average(): T extends number ? number : never</code></h3>

  <h3><code>average(selector: Selector&lt;T, number&gt;): number</code></h3>
  <dl>
    <dt>- selector</dt>
    <dd>
    Function that return numeric value from each item in the sequence<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- cache() -->
<details>
  <summary><samp><b>cache()</b></samp> - Returns a sequence that will cache the items once iterated</summary>

Used in cases the sequence need to be iterated more than once, and we want to avoid the default behavior that each
iteration will re-consume the entire sequence chain and might introduce unnecessary overhead or potentially different
results for each iteration

> Cache() is a shorthand for <code>const cachedSeq = asSeq(seq.toArray());</code><br>
> But by default won't immediately consume the sequence like toArray does

<h3><code>cache(now?: boolean): Seq&lt;T&gt;</code></h3>
Will return a new sequence instance, unless done on already cached sequence
  <dl>
    <dt>- now? <small>[default false]</small></dt>
    <dd>If true will cache the sequence immediately instead of deferring it to first iteration</dd>
  </dl>

 <details>
   <summary><small>Example</small></summary>

```typescript
const cached = asSeq(allStudentsGrades)
  .filter(x => x.grade > 50)
  .sortBy(x => x.class)
  .thensortBy(x => x.grade, true)
  .map(x => ({name: x.firstName + ' ' + x.lastName, class: x.class, grade: x.grade}))
  .cache();

console.log('Top 5 Students', cached
  .filter(x => x.grade > 95)
  .groupBy(x => x.name)
  .map(group => ({name: group.key, grade: group.average(x => x.grade)}))
  .sortBy(x => x.grade, true)
  .take(5)
  .map(x => x.name + ': ' + x.grade)
  .toString()
);

console.log('Top 3 Classes', cached
  .groupBy(x => x.class)
  .map(group => ({class: group.key, grade: group.average(x => x.grade)}))
  .sortBy(x => x.grade, true)
  .take(3)
  .map(x => x.class + ': ' + x.grade)
  .toString()
)
```

  </details>
  <hr>  
</details>

<!-- chunk() -->
<details>
  <summary><samp><b>chunk()</b></samp> - Split the sequence into fixed sized chunks</summary>
  <h3><code>chunk(count: number): Seq&lt;Seq&lt;T&gt;&gt;</code></h3>
  <dl>
    <dt>- count</dt>
    <dd>Number of items in each chunk</dd>
  </dl>

  <details>
   <summary><small>Example</small></summary>

```typescript
const chunkOfFilesToUpoad = asSeq(loadFilenamesRecursively())
  .filter(file => file.extension === '.txt')
  .sorted()
  .chunk(100);
  ```

  </details>
  <hr>
</details>

<!-- concat() -->
<details>
  <summary><samp><b>concat()</b></samp> - <small><i>(Like Array.concat)</i></small> Combine two or more sequences</summary>
  <h3><code>concat(...items: Iterable&lt;T&gt;[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Additional sequences to concatenate to the end of the sequence</dd>
  </dl>
  <h3><code>concat$(...items: (T | Iterable&lt;T&gt;)[]): Seq&lt;T&gt;</code></h3>
  Behaves like Array.concat
  <dl>
    <dt>- items</dt>
    <dd>Additional discrete items or sequences to concatenate to the end of the sequence</dd>
  </dl>
  <hr>
</details>

<!-- consume() -->
<details>
  <summary><samp><b>consume()</b></samp> - Iterates over the items without performing any action</summary>
  <h3><code>consume(): void</code></h3><hr>  
</details>

<!-- count() -->
<details>
  <summary><samp><b>count()</b></samp> - Count number of items in the sequence either all or those that match a condition</summary>
  <h3><code>count(condition?: Condition&lt;T&gt;): number</code></h3>
  <dl>
    <dt>- condition?</dt>
    <dd>
      Function to perform on each item, and returns a truthy or falsy value to determine if to count it.<br>
      If no condition provided, will count how many items in the sequence
    </dd>
  </dl><hr>  
</details>

<!-- diff() -->
<details>
  <summary><samp><b>diff()</b></samp> - Performs a diff with another iterable</summary>

Returns items that only exists in one of the sequences, but not on both

  <h3><code>diff&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: (item: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Items to perform a diff with</dd>
    <dt>- keySelector?</dt>
    <dd>Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- diffDistinct() -->
<details>
  <summary><samp><b>diffDistinct()</b></samp> - Perform diff with another sequence and keep only distinct items</summary>

Like diff() but also perform distinct() to remove duplicated items

  <h3><code>diffDistinct&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: (item: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Items to perform a diff with</dd>
    <dt>- keySelector?</dt>
    <dd>Function that returns a comparable value from each item, to match by it<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- distinct() -->
<details>
  <summary><samp><b>distinct()</b></samp> - Return distinct items, by removing duplicated items</summary>

<h3><code>distinct&lt;K&gt;(keySelector?: Selector&lt;T, K&gt;): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- keySelector?</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it for finding duplicates<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- endsWith() -->
<details>
  <summary><samp><b>endsWith()</b></samp> - Determines if the sequence includes another sequence at its end</summary>

<h3><code>endsWith&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: Selector&lt;T, K&gt;): boolean</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Items to check if exists at the end of the source sequence</dd>
    <dt>- keySelector?</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- entries() -->
<details>
  <summary><samp><b>entries()</b></samp> - <small><i>(Like Array.entries)</i></small> Returns a sequence of each item paired with its index as tuple [index, item]</summary>

<h3><code>entries(): Seq&lt;[number, T]&gt;</code></h3>
  <hr>  
</details>

<!-- every() -->
<details>
  <summary><samp><b>every()</b></samp> - <small><i>(Like Array.every)</i></small> Checks whether all items match a condition</summary>

> Alias to `all()`

> Always returns true if sequence is empty

  <h3><code>every(condition: Condition&lt;T&gt;): boolean</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item and returns a truthy or falsy value</dd>
  </dl><hr>
</details>

<!-- filter() -->
<details>
  <summary><samp><b>filter()</b></samp> - <small><i>(Like Array.filter)</i></small> Keeps only items that match a condition</summary>

<h3><code>filter(condition: Condition&lt;T&gt;): boolean</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item and returns a truthy value if should keep the item or or falsy value if to remove it</dd>
  </dl><hr>
</details>

<!-- find() -->
<details>
  <summary><samp><b>find()</b></samp> - <small><i>(Like Array.find)</i></small> Find the first item that matches a condition</summary>

<h3><code>find(condition: Condition&lt;T&gt;, fallback?: T | undefined): T | undefined</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item if it's the one to find</dd>
    <dt>- fallback?</dt>
    <dd>Value to return if not found. default is <code>undefined</code></dd>
  </dl>

<h3><code>find(fromIndex: number, condition: Condition&lt;T&gt;, fallback?: T | undefined): T | undefined</code></h3>
  <dl>
    <dt>- fromIndex</dt>
    <dd>An index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- findIndex() -->
<details>
  <summary><samp><b>findIndex()</b></samp> - <small><i>(Like Array.find)</i></small> Find the index of the first item that matches a condition</summary>

> Returns <b>-1</b> if not found

  <h3><code>findIndex(condition: Condition&lt;T&gt;): number</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item if it's the one to find</dd>
  </dl>

<h3><code>find(fromIndex: number, condition: Condition&lt;T&gt;): number</code></h3>
  <dl>
    <dt>- fromIndex</dt>
    <dd>An index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- findLast() -->
<details>
  <summary><samp><b>findLast()</b></samp> - Find the last item that matches a condition</summary>

<h3><code>find(condition: Condition&lt;T&gt;, fallback?: T | undefined): T | undefined</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item if it's the one to find</dd>
    <dt>- fallback?</dt>
    <dd>Value to return if not found. default is <code>undefined</code></dd>
  </dl>

<h3><code>find(tillIndex: number, condition: Condition&lt;T&gt;, fallback?: T | undefined): T | undefined</code></h3>
  <dl>
    <dt>- tillIndex</dt>
    <dd>Last index to search till (including)</dd>
  </dl>
  <hr>
</details>

<!-- findLastIndex() -->
<details>
  <summary><samp><b>findLastIndex()</b></samp> - Returns the index of last item that matches a condition</summary>

Returns <b>-1</b> if not found
<h3><code>findLastIndex(condition: Condition&lt;T&gt;): number</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item if it's the one to find</dd>
  </dl>

  <h3><code>findLastIndex(fromIndex: number, condition: Condition&lt;T&gt;): number</code></h3>
  <dl>
    <dt>- tillIndex</dt>
    <dd>Last index to search till (including)</dd>  </dl>
  <hr>
</details>

<!-- first() -->
<details>
  <summary><samp><b>first()</b></samp> - Get first item in the sequence (at index 0)</summary>

<h3><code>first(defaultIfEmpty?: T): T | undefined</code></h3>
  <dl>
    <dt>- defaultIfEmpty?</dt>
    <dd>Value to return if sequence if empty. default is <code>undefined</code></dd>
  </dl>
  <hr>
</details>

<!-- firstAndRest() -->
<details>
  <summary><samp><b>firstAndRest()</b></samp> - Splits the sequence into a paired tuple with the first item and a sequence with the rest of the items</summary>

> Similar to spreading `const [first, ...rest] = sequence`<br>
> But with the **rest** being a lazy sequence (Seq interface)

<h3><code>firstAndRest(defaultIfEmpty?: T): [T, Seq&lt;T&gt;]</code></h3>
  <dl>
    <dt>- defaultIfEmpty?</dt>
    <dd>Value to return as <b>first</b> if sequence if empty. default is <code>undefined</code></dd>
  </dl>
  <hr>
</details>

<!-- flat() -->
<details>
  <summary><samp><b>flat()</b></samp> - <small><i>(Like Array.flat)</i></small> Flatten sequences of sequences by specified depth</summary>

<h3><code>flat&lt;D extends number&gt;(depth?: D): Seq&lt;FlatSeq&lt;T, D&gt;&gt;</code></h3>
  <dl>
    <dt>- depth?</dt>
    <dd>How deep to flatten. default is <b>1</b></dd>
  </dl>
  <hr>
</details>

<!-- flatMap() -->
<details>
  <summary><samp><b>flatMap()</b></samp> - <small><i>(Like Array.flatMap)</i></small> Map each item into Iterable and flat them all into a new sequence</summary>

> flatMap() is a shorthand for <code>const flatSeq = seq.map(x => x.items).flat();</code>

  <h3><code>flatMap&lt;U, R&gt;(selector: Selector&lt;T, Iterable&lt;U&gt;&gt;, mapResult?: (subItem: U, parent: T, index:number) => R): Seq&lt;R&gt;</code></h3>
  <dl>
    <dt>- selector?</dt>
    <dd>Function that returns an iterable from each item, to flat it.</dd>
    <dt>- mapResult?</dt>
    <dd>Function further map each sub-item to a different value.<br>
    Commonly used to select by which property to match the items.
    </dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const allFilesPaths = foldersSeq.flatMap(f => f.files, (file, folder) => folder.name + '/' + file.name);
```

  </details>
<hr>  
</details>

<!-- forEach() -->
<details>
  <summary><samp><b>forEach()</b></samp> - <small><i>(Like Array.forEach)</i></small> Iterate the sequence items by calling a callback</summary>

> It's possible to break the loop, by returning the `breakLoop` argument provided to the callback

<h3><code>forEach(callback: (x: T, index: number, breakLoop: object) => void, thisArg?: any): void</code></h3>
  <dl>
    <dt>- callback</dt>
    <dd>Callback function to call for each item in the sequence</dd>
    <dt>- thisArg?</dt>
    <dd>Object to bind as `this` to the callback
    </dd>
  </dl>

> It's advisable to use `for..of` loop instead of `forEach` when the callback is more than 1 line of code

  <details>
    <summary><small>Example</small></summary>

```typescript
let totalSize = 0;
logFilesSeq.forEach((logfile, index, breakLoop) => {
  uploadFile(logfile.path);
  totalSize += logfile.size;
  // Stop uploading if reached 1 GB of files
  if (totalSize >= /*1 GB*/ 1024 ** 3) return breakLoop;
});
```

  </details>
<hr>  
</details>

<!-- groupBy() -->
<details>
  <summary><samp><b>groupBy()</b></samp> - Groups the items according to a key-selector function and returns a sequence of groups</summary>

<h3><code>groupBy&lt;K&gt;(keySelector: Selector&lt;T, K&gt;, toComparableKey?: ToComparableKey&lt;K&gt;):
SeqOfGroups&lt;K, T&gt;</code></h3>
  <dl>
    <dt>- keySelector</dt>
    <dd>
    Function that returns a value served as the group's key.<br>
    Commonly used to select by which property to match the items 
    </dd>
    <dt>- toComparableKey?</dt>
    <dd>
    Returns a primitive value that can be compared for equality for the group's key (string, number, boolean, undefined, null)<br>
    In case the group's key is not a comparable value (i.e. an object or array)
    </dd>
    <dt>RETURNS</dt>
    <dd><code>SeqOfGroups</code>interface which is <code>Seq&lt;GroupedSeq&lt;Key, TValue&gt;&gt;</code>with additional functionalities</dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const xyz = asSeq([
  {x: 0, y: 0, z: 0},
  {x: 0, y: 0, z: 1},
  {x: 1, y: 1, z: 0},
  {x: 1, y: 1, z: 1},
  {x: 2, y: 2, z: 0},
  {x: 2, y: 2, z: 1}
]);
const groupByXY = xyz.groupBy(
  xyz => ({x: xyz.x, y: xyz.y}), // key: {x, y}
  ({x, y}) => x + ',' + y // comparable: 'number, number'
);
```

  </details>
<hr>  
</details>

<!-- groupJoin() -->
<details>
  <summary><samp><b>groupJoin()</b></samp> - Groups items from another sequence under each item in this sequence by matching a key value based on them</summary>

The items from the source/outer sequence becomes the keys in the resulting sequence of groups,  
Items from the inner sequence are grouped together under the matched key item from the outer sequence.  
In case no matching items for one of the source items, it will refer to an empty grouped sequence.
> Functionality is variation of Outer Left Join with groupBy()

<h3><code>groupJoin&lt;I, K&gt;(inner: Iterable&lt;I&gt;, outerKeySelector: Selector&lt;T, K&gt;, innerKeySelector: Selector&lt;I, K&gt;): SeqOfGroups&lt;T, I&gt;</code></h3>
  <dl>
    <dt>- inner</dt>
    <dd>The other items to join with</dd>
    <dt>- outerKeySelector</dt>
    <dd>Returns a value that can be compared for equality for the <b>outer</b> item</dd>
    <dt>- innerKeySelector</dt>
    <dd>Returns a value that can be compared for equality for the <b>inner</b> item</dd>
    <dt>RETURNS</dt>
    <dd><code>SeqOfGroups</code>interface which is <code>Seq&lt;GroupedSeq&lt;KOuter, TInner&gt;&gt;</code>with additional functionalities</dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const outer = asSeq([
  {x: 0, y: 0, z: 0},
  {x: 1, y: 1, z: 0},
  {x: 2, y: 2, z: 0}
]);
const inner = [
  {col: 0, row: 0, value: 0},
  {col: 0, row: 0, value: 1},
  {col: 1, row: 1, value: 11},
  {col: 1, row: 1, value: 12},
  {col: -1, row: -1, value: -1},
];
const grouped = outer.groupJoin(inner,
  ({x, y}) => x + ',' + y, // outer comparable: 'number, number'
  ({col, row}) => col + ',' + row // inner comparable: 'number, number'
);
// Result:
// [
//   {key: {x: 0, y: 0, z: 0}, items: [{col: 0, row: 0, value: 0}, {col: 0, row: 0, value: 1}]},
//   {key: {x: 1, y: 1, z: 0}, items: [{col: 1, row: 1, value: 11}, {col: 1, row: 1, value: 12}]},
//   {key: {x: 2, y: 2, z: 0}, items: []}
// ]
```
  </details>
<hr>  
</details>

<!-- groupJoinRight() -->
<details>
  <summary><samp><b>groupJoinRight()</b></samp> - Same as groupJoin(), but group current sequence items under the other sequence items</summary>

In opposite to groupJoin(), The items from the inner sequence becomes the keys in the resulting sequence of groups,
Items from the outer sequence are grouped together under the matched key item from the inner sequence.
> Functionality is variation of Outer Right Join with groupBy()

  <h3><code>groupJoinRight&lt;I, K&gt;(inner: Iterable&lt;I&gt;, outerKeySelector: Selector&lt;T, K&gt;, innerKeySelector: Selector&lt;I, K&gt;): SeqOfGroups&lt;I, T&gt;</code></h3>
  <dl>
    <dt>- inner</dt>
    <dd>The other items to join with</dd>
    <dt>- outerKeySelector</dt>
    <dd>Returns a primitive value that can be compared for equality for the <b>outer</b> item</dd>
    <dt>- innerKeySelector</dt>
    <dd>Returns a primitive value that can be compared for equality for the <b>inner</b> item</dd>
    <dt>RETURNS</dt>
    <dd><code>SeqOfGroups</code>interface which is <code>Seq&lt;GroupedSeq&lt;KInner, TOuter&gt;&gt;</code>with additional functionalities</dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const outer = asSeq([
  {x: 0, y: 0, z: 0},
  {x: 1, y: 1, z: 0},
  {x: 2, y: 2, z: 0}
]);
const inner = [
  {col: 0, row: 0, value: 0},
  {col: 0, row: 0, value: 1},
  {col: 1, row: 1, value: 11},
  {col: 1, row: 1, value: 12},
  {col: -1, row: -1, value: -1},
];
const grouped = outer.groupJoinRight(inner,
  ({x, y}) => x + ',' + y, // outer comparable: 'number, number'
  ({col, row}) => col + ',' + row // inner comparable: 'number, number'
);
// Result:
// [
//   {key: {col: 0, row: 0, value: 0}, items: [{x: 0, y: 0, z: 0}]},
//   {key: {col: 0, row: 0, value: 1}, items: [{x: 0, y: 0, z: 0}]},
//   {key: {col: 1, row: 1, value: 11}, items: [{x: 1, y: 1, z: 0}]},
//   {key: {col: 1, row: 1, value: 12}, items: [{x: 1, y: 1, z: 0}]},
//   {key: {col: -1, row: -1, value: -1}, items: []}
// ]
```
  </details>
<hr>  
</details>

<!-- hasAtLeast() -->
<details>
  <summary><samp><b>hasAtLeast()</b></samp> - Checks whether the sequence has at least minimum number of items</summary>
  Since the sequence is not necessarily an array, than it's more optimized to use hasAtLeast() instead count()
  <h3><code>hasAtLeast(count: number): boolean</code></h3>
  <dl>
    <dt>- count</dt>
    <dd>Number of items to check if the sequence contains</dd>
  </dl>
  <details>
    <summary><small>Example</small></summary>

```typescript
const files: Iterable<File> = iterateFiles('/'); // there might be 1 Million files
const shouldCompress = asSeq(files).hasAtLeat(1000);
// It' better than: [...files].length >= 1000;
```

  </details>
<hr>  
</details>

<!-- ifEmpty() -->
<details>
  <summary><samp><b>ifEmpty()</b></samp> - Returns another sequence if this sequence is empty, otherwise return the same sequence</summary>

<h3><code>ifEmpty(value: T): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- value</dt>
    <dd>Return a sequence with this <b>value</b> if this sequence is empty</dd>
  </dl>
  <h3><code>ifEmpty({useSequence}: { useSequence: Iterable&lt;T&gt; }): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- useSequence</dt>
    <dd>A sequence to return if sequence this is empty</dd>
  </dl>
  <h3><code>ifEmpty({useFactory}: { useFactory: () => T; }): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- useFactory</dt>
    <dd>A Function that returns alternative sequence, if this sequence is empty</dd>
  </dl>
  <details>
    <summary><small>Example</small></summary>

```typescript
const allItems: Iterable<{ id: number; name: string }> = loadLatestItems();

const itemsSeq1 = asSeq(allItems).ifDefault({id: 0, name: 'There are not Items'});
const itemsSeq2 = asSeq(allItems).ifDefault({useSequence: loadHistoryItems()}); // Load in advance history items
const itemsSeq3 = asSeq(allItems).ifDefault({useFactory: () => loadHistoryItems()}); // Load history items only if needed
```
  </details>
  <hr>  
</details>

<!-- includes() -->
<details>
  <summary><samp><b>includes()</b></samp> - <small><i>(Like Array.includes)</i></small> Checks whether an item exists in the sequence</summary>

  <h3><code>includes(itemToFind: T, fromIndex?: number): boolean</code></h3>
  <dl>
    <dt>- itemToFind</dt>
    <dd>Item to search for</dd>
    <dt>- fromIndex?</dt>
    <dd>An index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- includesAll() -->
<details>
  <summary><samp><b>includesAll()</b></samp> - Checks whether the sequence includes all the items of another sequence</summary>

>  The check doesn't care about the order of the items to search for 

  <h3><code>includesAll&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: Selector&lt;T, K&gt;): boolean</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Items to check exists in the sequence</dd>
    <dt>- keySelector?</dt>
    <dd>Function that returns a comparable value from each item, to match by it</dd>
  </dl>
  <h3><code>includesAll&lt;U, K&gt;(items: Iterable&lt;U&gt;, firstKeySelector: Selector&lt;T, K&gt;, secondKeySelector: Selector&lt;U, K&gt;): boolean</code></h3>
  <dl>
    <dt>- firstKeySelector</dt>
    <dd>Function that returns a comparable value from each item in the <b>first</b> sequence, to match by it from the second sequence</dd>
    <dt>- secondKeySelector</dt>
    <dd>Function that returns a comparable value from each item in the <b>second</b> sequence, to match by it with items from the first sequence</dd>
  </dl>
  <hr>
</details>

<!-- includesAny() -->
<details>
  <summary><samp><b>includesAny()</b></samp> - Checks whether the sequence includes any items from another sequence</summary>

  <h3><code>includesAny&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: Selector&lt;T, K&gt;): boolean</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Items to check exists in the sequence</dd>
    <dt>- keySelector?</dt>
    <dd>Function that returns a comparable value from each item, to match by it</dd>
  </dl>
  <h3><code>includesAny&lt;U, K&gt;(items: Iterable&lt;U&gt;, firstKeySelector: Selector&lt;T, K&gt;, secondKeySelector: Selector&lt;U, K&gt;): boolean</code></h3>
  <dl>
    <dt>- firstKeySelector</dt>
    <dd>Function that returns a comparable value from each item in the <b>first</b> sequence, to match by it from the second sequence</dd>
    <dt>- secondKeySelector</dt>
    <dd>Function that returns a comparable value from each item in the <b>second</b> sequence, to match by it with items from the first sequence</dd>
  </dl>
  <hr>
</details>

<!-- includesSubSequence() -->
<details>
  <summary><samp><b>includesSubSequence()</b></samp> - Checks whether the sequence includes another sequence</summary>

> It differs from includesAll() by checking items also in same order

  <h3><code>includesSubSequence&lt;K&gt;(subSequence: Iterable&lt;T&gt;, keySelector?: (item: T) => K): boolean</code></h3>
  <dl>
    <dt>- subSequence</dt>
    <dd>Items to check all of them exists in the sequence in same order</dd>
    <dt>- keySelector?</dt>
    <dd>Function that returns a comparable value from each item, to match by it</dd>
  </dl>
  <h3><code>includesSubSequence&lt;K&gt;(subSequence: Iterable&lt;T&gt;, fromIndex: number, keySelector?: Selector&lt;T, K&gt;): boolean</code></h3>
  <dl>
    <dt>- fromIndex</dt>
    <dd>And index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- indexOf() -->
<details>
  <summary><samp><b>indexOf()</b></samp> - <small><i>(Like Array.indexOf)</i></small> Returns the index of an item in the sequence</summary>

> Returns <b>-1</b> if not found

  <h3><code>indexOf(item: T, fromIndex?: number): number</code></h3>
  <dl>
    <dt>- item</dt>
    <dd>Item to search for</dd>
    <dt>- fromIndex?</dt>
    <dd>An index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- indexOfSubSequence() -->
<details>
  <summary><samp><b>indexOfSubSequence()</b></samp> - Returns an index of a sub-sequence that's included in the sequence</summary>

> Returns <b>-1</b> if not found

  <h3><code>indexOfSubSequence&lt;K&gt;(subSequence: Iterable&lt;T&gt;, keySelector?: Selector&lt;T, K&gt;): number</code></h3>
  <dl>
    <dt>- subSequence</dt>
    <dd>Items to check all of them exists in the sequence in same order</dd>
    <dt>- keySelector?</dt>
    <dd>Function that returns a comparable value from each item, to match by it</dd>
  </dl>
  <h3><code>indexOfSubSequence&lt;K&gt;(subSequence: Iterable&lt;T&gt;, fromIndex: number, keySelector?: Selector&lt;T, K&gt;): number</code></h3>
  <dl>
    <dt>- fromIndex</dt>
    <dd>And index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- innerJoin() -->
<details>
  <summary><samp><b>innerJoin()</b></samp> - Returns a sequence with only matching pairs of items from both sequences</summary>

  <h3><code>innerJoin<I, R = { outer: T; inner: I }>(inner: Iterable&lt;I&gt;, outerKeySelector: Selector&lt;T, K&gt;, innerKeySelector: Selector&lt;I, K&gt;, resultSelector?: (outer: T, inner: I) => R): Seq&lt;R&gt;</code></h3>
  <dl>
    <dt>- inner</dt>
    <dd>The other items to join with</dd>
    <dt>- outerKeySelector</dt>
    <dd>Returns a value that can be compared for equality from the <b>outer</b> item</dd>
    <dt>- innerKeySelector</dt>
    <dd>Returns a value that can be compared for equality from the <b>inner</b> item</dd>
    <dt>- resultSelector?</dt>
    <dd>
    Function that map the pair of items from outer and inner sequences into a different value.<br>
    By default the resulting values is <code>{ outer: T; inner: I }</code>
    </dd>
  </dl>
  <hr>
</details>

<!-- insert() -->
<details>
  <summary><samp><b>insert()</b></samp> - Insert one or more sequences at specified index</summary>

  <h3><code>insert(atIndex: number, ...items: Iterable&lt;T&gt;[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- atIndex</dt>
    <dd>Index in sequence to insert the other sequences at</dd>
    <dt>- items</dt>
    <dd>One or more sequences to insert at the specified index</dd>
  </dl>
  <hr>
</details>

<!-- insertAfter() -->
<details>
  <summary><samp><b>insertAfter()</b></samp> - Search first item that matches a condition and insert new items immediately after it</summary>

  <h3><code>insertAfter(condition: Condition&lt;T&gt;, ...items: Iterable&lt;T&gt;[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item if it's the one to find</dd>
    <dt>- items</dt>
    <dd>One or more sequences to insert</dd>
  </dl>
  <hr>
</details>

<!-- insertBefore() -->
<details>
  <summary><samp><b>insertBefore()</b></samp> - Search first item that matches a condition and insert new items just before it</summary>

  <h3><code>insertBefore(condition: Condition&lt;T&gt;, ...items: Iterable&lt;T&gt;[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item if it's the one to find</dd>
    <dt>- items</dt>
    <dd>One or more sequences to insert</dd>
  </dl>
  <hr>
</details>

<!-- intersect() -->
<details>
  <summary><samp><b>intersect()</b></samp> - Return distinct items that only exists in both sequences</summary>

  <h3><code>intersect&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: (item: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- inner</dt>
    <dd>The other items to join with</dd>
    <dt>- outerKeySelector</dt>
    <dd>Returns a value that can be compared for equality from the <b>outer</b> item</dd>
    <dt>- innerKeySelector</dt>
    <dd>Returns a value that can be compared for equality from the <b>inner</b> item</dd>
    <dt>- resultSelector?</dt>
    <dd>
    Function that map the pair of items from outer and inner sequences into a different value.<br>
    By default the resulting values is <code>{ outer: T; inner: I }</code>
    </dd>
  </dl>
  <hr>
</details>

<!-- intersperse(*) -->
<details>
  <summary><samp><b>intersperse()</b></samp> - Insert a value between every item</summary>

  <h3><code>intersperse(separator: T, insideOut?: boolean): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- separator</dt>
    <dd>A value to insert after each item</dd>
    <dt>- insideOut? [default false]</dt>
    <dd>If true, separator value will be inserted as the first and last item<b>outer</b> item</dd>
  </dl>
  <h3><code>intersperse&lt;U = T, TPrefix = T, TSuffix = T&gt(separator: U, opts?: { prefix?: TPrefix; suffix?: TSuffix }): Seq&lt;TPrefix | T | U | TSuffix&gt</code></h3>
  Optionally add a prefix and/or suffix to the sequence 
  <dl>
    <dt>- opts?</dt>
    <dd>
    Options to affect how to intersperse the sequence<br>
    - prefix?<br>
      Prefix value to insert as the first item in the sequence<br>
    - suffix?<br>
      Prefix value to insert as the last item in the sequence
    </dd>
  </dl>
  <hr>
</details>

<!-- isEmpty() -->
<details>
  <summary><samp><b>isEmpty()</b></samp> - Checks whether the sequence is empty</summary>

  <h3><code>isEmpty(): boolean</code></h3>
  <hr>
</details>

<!-- join() -->
<details>
  <summary><samp><b>join()</b></samp> - <small><i>(Like Array.join)</i></small> Joins the items into a string using a separator (plus some more abilities)</summary>

> Same as toString()

  <h3><code>join(separator?: string): string</code></h3>
  <dl>
    <dt>- separator? [default: ',' ]</dt>
    <dd>String value to insert between each item when converting to a string</dd>
  </dl>
  <h3><code>join(opts: { start?: string; separator?: string, end?: string; }): string</code></h3>
  <dl>
    <dt>- opts</dt>
    <dd>
    - start?<br>
    Optional string to put as the start of the resulting string.<br>
    - end?<br>
    Optional string to put as the end of the resulting string.<br>
    </dd>
  </dl>
  <hr>
</details>

<!-- last() -->
<details>
  <summary><samp><b>last()</b></samp> - Returns the last item in the sequence</summary>
  
  <h3><code>last(): T | undefined</code></h3>
  If sequence is empty, returns undefined
  <h3><code>last(fallback: T): T</code></h3>
  If sequence is empty, returns a fallback value
  <hr>
</details>

<!-- lastIndexOf() -->
<details>
  <summary><samp><b>lastIndexOf()</b></samp> - <small><i>(Like Array.lastIndexOf)</i></small> Returns the index of an item being searched from the end of the sequence</summary>

> Returns <b>-1</b> if not found

  <h3><code>lastIndexOf(item: T, fromIndex?: number): number</code></h3>
  <dl>
    <dt>- item</dt>
    <dd>Item to search for</dd>
    <dt>- fromIndex?</dt>
    <dd>An index to start searching from</dd>
  </dl>
  <hr>
</details>

<!-- length() -->
<details>
  <summary><samp><b>length()</b></samp> - Returns number of items in the sequence</summary>

  <h3><code>length(): number</code></h3>
  <hr>
</details>

<!-- map() -->
<details>
  <summary><samp><b>map()</b></samp> - <small><i>(Like Array.map)</i></small> Maps each item in the sequence into a different form</summary>

  <h3><code>map&lt;U = T&gt;(mapFn: Selector&lt;T, U&gt;): Seq&lt;U&gt;</code></h3>
  <dl>
    <dt>- mapFn</dt>
    <dd>Mapping function called on each item and returns another desired value</dd>
  </dl>
  <hr>
</details>

<!-- max() -->
<details>
  <summary><samp><b>max()</b></samp> - Return the maximum value from a sequence of numbers</summary>
  <h3><code>max(): T extends number ? number : never</code></h3>

  <h3><code>max(selector: Selector&lt;T, number&gt;): number</code></h3>
  <dl>
    <dt>- selector</dt>
    <dd>
    Function that return numeric value from each item in the sequence<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- min() -->
<details>
  <summary><samp><b>min()</b></samp> - Return the minimum value from a sequence of numbers</summary>
  <h3><code>min(): T extends number ? number : never</code></h3>

  <h3><code>min(selector: Selector&lt;T, number&gt;): number</code></h3>
  <dl>
    <dt>- selector</dt>
    <dd>
    Function that return numeric value from each item in the sequence<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- ofType() -->
<details>
  <summary><samp><b>ofType()</b></samp> - Keeps only items of specified type</summary>
  <h3><code>ofType(type: 'number'): Seq&lt;number&gt;</code></h3>
  <h3><code>ofType(type: typeof Number): Seq&lt;number&gt;</code></h3>
  Keeps only numeric values
  <h3><code>ofType(type: 'string'): Seq&lt;string&gt;</code></h3>
  <h3><code>ofType(type: typeof String): Seq&lt;string&gt;</code></h3>
  Keeps only string values
  <h3><code>ofType(type: 'boolean'): Seq&lt;boolean&gt;</code></h3>
  <h3><code>ofType(type: typeof Boolean): Seq&lt;boolean&gt;</code></h3>
  Keeps only boolean values
  <h3><code>ofType(type: 'function'): Seq&lt;Function&gt;</code></h3>
  Keeps only values which are functions values
  <h3><code>ofType(type: 'symbol'): Seq&lt;symbol&gt;</code></h3>
  <h3><code>ofType(type: typeof Symbol): Seq&lt;symbol&gt;</code></h3>
  Keeps only values which are symbols
  <h3><code>ofType(type: 'object'): Seq&lt;object&gt;</code></h3>
  <h3><code>ofType(type: typeof Object): Seq&lt;object&gt;</code></h3>
  Keeps only values which are objects
  <h3><code>ofType&lt;V extends Class&gt;(type: V): Seq&lt;InstanceType&lt;V&gt;&gt;</code></h3>
  Keeps only objects of specified class
  <hr>  
</details>

<!-- orderBy() -->
<!-- 
<details>
  <summary><samp><b>orderBy()</b></samp> - Sort items by value produced from each item in the sequence</summary>
  <h3><code>orderBy&lt;K = T&gt;(keySelector: (x: T) => K, comparer?: Comparer&lt;K&gt;): OrderedSeq&lt;T&gt;</code></h3>
  <dl>
    <dt>- selector</dt>
    <dd>
    Function that returns a comparable value from each item, to sort by it<br>
    Commonly used to select by which property to sort the items 
    </dd>
    <dt>- comparer?</dt>
    <dd>
    Function that receives two values produced by the <code>selector</code> and compares them.<br>
    It's usually used when the selector produced and object (non comparable) that need custom compare logic 
    </dd>
  </dl>
  <details>
    <summary>Example</summary>

```typescript
const orderedBySalary = employees.orderBy(e => e.salary);
```    
  </details>
  <details>
    <summary>Example 2 - with comparer</summary>

```typescript
const orderedByPosition = results.orderBy(
    res => res.position,
    (pos1, pos2) => (pos1.x - pos2.x) || (pos1.y - pos2.y)
  );
```    
  </details>
<hr>  
</details>
 -->
<!-- orderByDescending() -->
<!-- 
<details>
  <summary><samp><b>orderByDescending()</b></samp> - Sort items in reverse, by value produced from each item in the sequence</summary>
  <h3><code>orderByDescending&lt;K = T&gt;(keySelector: (x: T) => K, comparer?: Comparer&lt;K&gt;): OrderedSeq&lt;T&gt;</code></h3>
  <dl>
    <dt>- selector</dt>
    <dd>
    Function that returns a comparable value from each item, to sort by it<br>
    Commonly used to select by which property to sort the items 
    </dd>
    <dt>- comparer?</dt>
    <dd>
    Function that receives two values produced by the <code>selector</code> and compares them.<br>
    It's usually used when the selector produced and object (non comparable) that need custom compare logic 
    </dd>
  </dl>
  <hr>  
</details>
 -->
<!-- prepend() -->
<details>
  <summary><samp><b>prepend()</b></samp> - Insert one or more sequences at beginning</summary>

  <h3><code>prepend(...items: Iterable&lt;T&gt;[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>One or more sequences to insert at the beginning</dd>
  </dl>
  <hr>
</details>

<!-- push() -->
<details>
  <summary><samp><b>push()</b></samp> - <small><i>(Like Array.push)</i></small> Appends one or more items at the end of the sequence</summary>
  
> Same as append()

  <h3><code>push(...items: T[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Zero or more items to append</dd>
  </dl><hr>  
</details>

<!-- reduce() -->
<details>
  <summary><samp><b>reduce()</b></samp> - <small><i>(Like Array.reduce)</i></small> Reduces the items in the sequence into a single value</summary>

  <h3><code>reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T</code></h3>
  <dl>
    <dt>- reducer</dt>
    <dd>Function that takes an accumulated value and the next value in the sequence and return a reduced/accumulated value</dd>
  </dl>

  <h3><code>reduce(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T</code></h3>
  <h3><code>reduce&lt;U&gt;>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U</code></h3>
  <dl>
    <dt>- initialValue</dt>
    <dd>Initial value start reducing with</dd>
  </dl>
  <hr>
</details>

<!-- reduceRight() -->
<details>
  <summary><samp><b>reduceRight()</b></samp> - <small><i>(Like Array.reduce)</i></small> Reduces the items in the sequence in reverse order, into a single value</summary>

  <h3><code>reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T): T</code></h3>
  <dl>
    <dt>- reducer</dt>
    <dd>Function that takes an accumulated value and the next value in the sequence and return a reduced/accumulated value</dd>
  </dl>

  <h3><code>reduceRight(reducer: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T</code></h3>
  <h3><code>reduceRight&lt;U&gt;>(reducer: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue: U): U</code></h3>
  <dl>
    <dt>- initialValue</dt>
    <dd>Initial value start reducing with</dd>
  </dl>
  <hr>
</details>

<!-- remove() -->
<details>
  <summary><samp><b>remove()</b></samp> - Remove items that exist in another sequence</summary>

  <h3><code>remove&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: (item: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Other items to remove from source sequence</dd>
  </dl>
  <hr>
</details>

<!-- removeAll() -->
<details>
  <summary><samp><b>removeAll()</b></samp> - Remove <b>all</b> occurrences of items that exist in another sequence</summary>

  <h3><code>removeAll&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: (item: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Other items to remove from source sequence</dd>
  </dl>
  <hr>
</details>

<!-- removeFalsy() -->
<details>
  <summary><samp><b>removeFalsy()</b></samp> - Remove all falsy item</summary>

  <h3><code>removeFalsy(): Seq&lt;T&gt;</code></h3>
  <hr>
</details>

<!-- removeNulls() -->
<details>
  <summary><samp><b>removeFalsy()</b></samp> - Remove null and undefined values</summary>

<h3><code>removeNulls(): Seq&lt;T&gt;</code></h3>
  <hr>
</details>

<!-- repeat() -->
<details>
  <summary><samp><b>repeat()</b></samp> - Mupliple the sequence</summary>

  <h3><code>repeat(count: number): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- count</dt>
    <dd>
    Value to multiple the sequence (sequence * count).<br>
    <i>value of <b>1</b> return the same sequence (return sequence * 1)</i>
    </dd>
  </dl>
  <hr>
</details>

<!-- reverse() -->
<details>
  <summary><samp><b>reverse()</b></samp> - <small><i>(Like Array.reverse)</i></small> Reverse the order of the sequnce</summary>

  <h3><code>reverse(): Seq&lt;T&gt;</code></h3>
  <hr>
</details>

<!-- sameItems() -->
<details>
  <summary><samp><b>sameItems()</b></samp> - Checks that the two sequences have the same items in any order</summary>

  <h3><code>sameItems&lt;K&gt;(second: Iterable&lt;T&gt;, keySelector?: (item: T) => K): boolean</code></h3>
  <dl>
    <dt>- second</dt>
    <dd>The second sequence to check if has the same items</dd>
    <dt>- keySelector?</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items
    </dd>
  </dl>

  <h3><code>sameItems&lt;U, K&gt;(second: Iterable&lt;U&gt;, firstKeySelector: Selector&lt;T, K&gt;, secondKeySelector: Selector&lt;U, K&gt;): boolean</code></h3>
  <dl>
    <dt>- firstKeySelector?</dt>
    <dd>Function that returns a comparable value from each item from the source sequence, to match by it.</dd>
    <dt>- secondKeySelector?</dt>
    <dd>Function that returns a comparable value from each item from the second sequence, to match by it.</dd>
  </dl>
  <hr>
</details>

<!-- sameOrderedItems() -->
<details>
  <summary><samp><b>sameOrderedItems()</b></samp> - Checks that the two sequences have the same items in the same order</summary>

  <h3><code>sameOrderedItems&lt;K&gt;(second: Iterable&lt;T&gt;, keySelector?: (item: T) => K): boolean</code></h3>
  <dl>
    <dt>- second</dt>
    <dd>The second sequence to check if has the same items</dd>
    <dt>- keySelector?</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items
    </dd>
  </dl>

  <h3><code>sameOrderedItems&lt;U, K&gt;(second: Iterable&lt;U&gt;, firstKeySelector: Selector&lt;T, K&gt;, secondKeySelector: Selector&lt;U, K&gt;): boolean</code></h3>
  <dl>
    <dt>- firstKeySelector?</dt>
    <dd>Function that returns a comparable value from each item from the source sequence, to match by it.</dd>
    <dt>- secondKeySelector?</dt>
    <dd>Function that returns a comparable value from each item from the second sequence, to match by it.</dd>
  </dl>
  <hr>
</details>

<!-- skip() -->
<details>
  <summary><samp><b>skip()</b></samp> - Remove one or more items from beginning of the sequence</summary>

  <h3><code>skip(count: number): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- count</dt>
    <dd>Number of items to skip</dd>
  </dl>
  <hr>
</details>

<!-- skipFirst() -->
<details>
  <summary><samp><b>skipFirst()</b></samp> - Remove the first item</summary>

  <h3><code>skipFirst(): Seq&lt;T&gt;</code></h3>
  <hr>
</details>

<!-- skipLast() -->
<details>
  <summary><samp><b>skipLast()</b></samp> - Remove one or more items from the end of the sequence</summary>

  <h3><code>skipLast(count: number): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- count?</dt>
    <dd>Number of items to skip <i>[default 1]</i></dd>
  </dl>
  <hr>
</details>

<!-- skipWhile() -->
<details>
  <summary><samp><b>skipWhile()</b></samp> - Remove items from beginning of sequence while they match a condition</summary>

  <h3><code>skipWhile(condition: Condition&lt;T&gt;): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function that checks the condition on each item</dd>
  </dl>
  <hr>
</details>

<!-- slice() -->
<details>
  <summary><samp><b>slice()</b></samp> - <small><i>(Like Array.slice)</i></small> Returns a section from the sequence</summary>

  <h3><code>slice(start: number, end: number): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- start</dt>
    <dd>Index to start taking items from</dd>
    <dt>- end</dt>
    <dd>Upto which index <b>Not Including</b> to take items till. (Can be considered as count)</dd>
  </dl>
  <hr>
</details>

<!-- some() -->
<details>
  <summary><samp><b>some()</b></samp> - <small><i>(Like Array.some)</i></small> Checks if any item matches a condition</summary>

> Alias to `any()`

  <h3><code>some(condition: Condition&lt;T&gt;): boolean</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item and returns a truthy or falsy value</dd>
  </dl><hr>
</details>

<!-- sort() -->
<details>
  <summary><samp><b>sort()</b></samp> - <small><i>(Like Array.sort)</i></small> Sort items by a comparer</summary>

  <h3><code>sort(comparer?: Comparer&lt;T&gt;): OrderedSeq&lt;T&gt;</code></h3>
  <dl>
    <dt>- comparer</dt>
    <dd>
    Function that receives two items from the sequence and compares them.<br>
    <small><i>
    If not provided, sequence is sorted by comparing each item.toString()<br>
    If that is not the desired behavior, consider calling sorted() or sortBy()
    </i></small>
    </dd>
  </dl><hr>
</details>

<!-- sortBy() -->
<details>
  <summary><samp><b>sortBy()</b></samp> - Sort items by value produced from each item in the sequence</summary>
  <h3><code>sortBy&lt;K = T&gt;(valueSelector: (x: T) => K): OrderedSeq&lt;T&gt;</code></h3>
  <dl>
    <dt>- valueSelector</dt>
    <dd>
    Function that returns a comparable value from each item, to sort by it<br>
    Commonly used to select by which property to sort the items 
    </dd>
    <dt>- reverse? <i>[Default: false]</i></dt>
    <dd>If <b>true</b>, sort in reverse order</dd>
  </dl>
  <details>
    <summary>Example</summary>

```typescript
const topFiveSalaries = employees.sortBy(e => e.salary, true).distinct().take(5);
```    
  </details>
<hr>  
</details>

<!-- sorted() -->
<details>
  <summary><samp><b>sorted()</b></samp> - Returns a sorted sequence according to plain comparison</summary>
  <h3><code>sorted(reverse?: boolean): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- reverse? <i>[Default: false]</i></dt>
    <dd>If <b>true</b>, sort in reverse order</dd>
  </dl>
  <details>
    <summary>Example</summary>

```typescript
years.sorted(true);
```    
  </details>
<hr>  
</details>

<!-- split() -->
<details>
  <summary><samp><b>split()</b></samp> - Split into two sequences at index or by condition</summary>

  <h3><code>split(atIndex: number): [Seq&lt;T&gt;, Seq&lt;T&gt;]</code></h3>
  <dl>
    <dt>- atIndex</dt>
    <dd>Index to split the sequence at</dd>
  </dl>

  <h3><code>split(condition: Condition&lt;T&gt;): [Seq&lt;T&gt;, Seq&lt;T&gt;]</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function to test each item to determine if to split at that position in the sequence</dd>
  </dl>
<hr>
</details>

<!-- startsWith() -->
<details>
  <summary><samp><b>startsWith()</b></samp> - Determines if the sequence include another sequence at the beginning</summary>

  <h3><code>startsWith&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: (item: T) => K): boolean</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>The other sequence to check if exists at the start of the sequence</dd>
    <dt>- keySelector</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items
    </dd>
  </dl>
  <hr>
</details>

<!-- sum() -->
<details>
  <summary><samp><b>sum()</b></samp> - Returns the sum of values for sequence of numbers</summary>
  <h3><code>sum(): T extends number ? number : never</code></h3>

  <h3><code>sum(selector: Selector&lt;T, number&gt;): number</code></h3>
  <dl>
    <dt>- selector</dt>
    <dd>
    Function that return numeric value from each item in the sequence<br>
    Commonly used to select by which property to match the items 
    </dd>
  </dl><hr>  
</details>

<!-- take() -->
<details>
  <summary><samp><b>take()</b></samp> - Keeps/Take only first one or more items from the sequence</summary>

  <h3><code>take(count: number): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- count</dt>
    <dd>Number of items to take from the start of the sequence</dd>
  </dl><hr>  
</details>

<!-- takeLast() -->
<details>
  <summary><samp><b>takeLast()</b></samp> - Keeps/Take only last one or more items from the end</summary>

  <h3><code>takeLast(count: number): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- count</dt>
    <dd>Number of items to take from the end of the sequence</dd>
  </dl><hr>  
</details>

<!-- takeOnly() -->
<details>
  <summary><samp><b>takeOnly()</b></samp> - Takes/Keep only items that existing in another sequence</summary>

  <h3><code>takeOnly&lt;K = T&gt;(items: Iterable&lt;T&gt;, keySelector: (item: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>The second sequence to check if has the same items</dd>
    <dt>- keySelector?</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items
    </dd>
  </dl>

  <h3><code>takeOnly&lt;U, K = T&gt;(items: Iterable&lt;U&gt;, firstKeySelector: Selector&lt;T, K&gt;, secondKeySelector?: Selector&lt;U, K&gt;): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- firstKeySelector?</dt>
    <dd>Function that returns a comparable value from each item from the source sequence, to match by it.</dd>
    <dt>- secondKeySelector?</dt>
    <dd>Function that returns a comparable value from each item from the second sequence, to match by it.</dd>
  </dl>
  <hr>
</details>

<!-- takeWhile() -->
<details>
  <summary><samp><b>takeWhile()</b></samp> - Take items from beginning of sequence while they match a condition</summary>

  <h3><code>takeWhile(condition: Condition&lt;T&gt;): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- condition</dt>
    <dd>Function that checks the condition on each item</dd>
  </dl>
  <hr>
</details>

<!-- tap() -->
<details>
  <summary><samp><b>tap()</b></samp> - Perform a side effect action on each item when the sequence is iterated</summary>

  <h3><code>tap(callback: Selector&lt;T, void&gt;, thisArg?: any): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- callback</dt>
    <dd>Function to call for each item in the sequence</dd>
    <dt>- thisArg</dt>
    <dd><code>this</code> object to bind to the callback</dd>
  </dl><hr>  
</details>

<!-- toArray() -->
<details>
  <summary><samp><b>toArray()</b></samp> - Returns a new array with the items</summary>

  <h3><code>toArray(): T[]</code></h3>
  <hr>  
</details>

<!-- toMap() -->
<details>
  <summary><samp><b>toMap()</b></samp> - Return a new Map with the items under a key by a key-selector</summary>

  <h3><code>toMap&lt;K, V&gt;(keySelector: Selector&lt;T, K&gt;, valueSelector?: Selector&lt;T, V&gt;, toComparableKey?: ToComparableKey&lt;K&gt;): Map&lt;K, V&gt;</code></h3>
  <dl>
    <dt>- keySelector</dt>
    <dd>
    Function that returns a value from each item, to serve as the key in the Map.<br>
    Commonly used to select by which property to match the items
    </dd>
    <dt>- valueSelector?</dt>
    <dd>Function to map each item to another form</dd>
    <dt>- toComparableKey?</dt>
    <dd>
    Returns a primitive value that can be compared for equality, for the key that produced by the <b>keySelector</b>.<br>
    <small>(In case the key is not a comparable value (i.e. an object or array)</small>
    </dd>
  </dl>
  <hr>  
</details>

<!-- toSet() -->
<details>
  <summary><samp><b>toSet()</b></samp> - Return a new Set with distinct items</summary>

  <h3><code>toSet&lt;K, V&gt;(keySelector: Selector&lt;T, K&gt;): Map&lt;K, V&gt;</code></h3>
  <dl>
    <dt>- keySelector?</dt>
    <dd>
    Function that returns a comparable value from each item, to match by it.<br>
    Commonly used to select by which property to match the items
    </dd>
  </dl>
  <hr>  
</details>

<!-- toString() -->
<details>
  <summary><samp><b>toString()</b></samp> - <small><i>(same as <b>join</b>)</i></small> Converts the sequence into a string</summary>

  <h3><code>toString(separator?: string): string</code></h3>
  <dl>
    <dt>- separator? [default: ',' ]</dt>
    <dd>String value to insert between each item when converting to a string</dd>
  </dl>
  <h3><code>toString(opts: { start?: string; separator?: string, end?: string; }): string</code></h3>
  <dl>
    <dt>- opts</dt>
    <dd>
    - start?<br>
    Optional string to put as the start of the resulting string.<br>
    - end?<br>
    Optional string to put as the end of the resulting string.<br>
    </dd>
  </dl>
  <hr>
</details>

<!-- transform() -->
<details>
  <summary><samp><b>transform()</b></samp> - Manipulate the sequence using a custom action</summary>

> Convenient if need to keep fluent methods calls

  <h3><code>transform&lt;U = T&gt;(transformer: (seq: Seq&lt;T&gt;) => Seq&lt;U&gt;): Seq&lt;U&gt;</code></h3>
  <dl>
    <dt>- transformer</dt>
    <dd>Function that accept the current sequence and return a sequence after custom manipulations</dd>
  </dl>
  <details>
    <summary>Example</summary>

```typescript
  // Concat some items from the start of the sequence to its end 
  seq.transform(seq => seq.concat(seq.take(10)))
```
  </details>

  <hr>
</details>

<!-- union() -->
<details>
  <summary><samp><b>union()</b></samp> - Returns distinct items from both sequences</summary>

  <h3><code>union&lt;K&gt;(second: Iterable&lt;T&gt;, keySelector?: (value: T) => K): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- second</dt>
    <dd>The other items to add</dd>
    <dt>- keySelector</dt>
    <dd>Returns a value that can be compared for equality from each item in both sequences</dd>
  </dl>
  <hr>
</details>

<!-- unshift() -->
<details>
  <summary><samp><b>unshift()</b></samp> - <small><i>(Like Array.unshift)</i></small> Add one or more items at the beginning of the sequence</summary>

  <h3><code>unshift(...items: T[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>One or more items to prepend</dd>
  </dl>
  <hr>
</details>

<!-- zip() -->
<details>
  <summary><samp><b>zip()</b></samp> - Returns a sequence that each item is a Tuple with items from each sequence at the same index</summary>

  <h3><code>zip&lt;T1, Ts extends any[]&gt;(items: Iterable&lt;T1&gt;, ...moreItems: Iterables&lt;Ts&gt;): Seq&lt;[T, T1, ...Ts]&gt;</code></h3>
  
  <dl>
    <dt>- items</dt>
    <dd>Other sequence to combine items from</dd>
    <dt>- moreItems</dt>
    <dd>Other sequences to combine items from</dd>
    <dt>RETURNS</dt>
    <dd>
    Sequence of tuples, where each tuple correspond to specific item's index from the source sequence and contains other items from from same index in the other sequences<br>
    <small><i>The produces sequence is as short as the shortest sequence</i></small>
    </dd>
  </dl>
  <details>
    <summary>Example</summary>

```typescript
const results1 = [{x:0, y:0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4}];
const results2 = [{x:1, y:0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3}];
const results3 = [{x:2, y:0}, {x: 2, y: 1}, {x: 2, y: 2}];
console.log(results1.zip(results2, results3).toArray());
// Output:
// [
//   [{x:0, y:0}, {x:1, y:0}, {x:2, y:0}],
//   [{x:0, y:1}, {x:1, y:1}, {x:2, y:1}],
//   [{x:0, y:2}, {x:1, y:2}, {x:2, y:2}]
// ]
```
  </details>
  <hr>
</details>

<!-- zipAll() -->
<details>
  <summary><samp><b>zipAll()</b></samp> - Like zip() but takes the longest sequence instead of shortest one</summary>

  <h3><code>zipAll&lt;T1, Ts extends any[]&gt;(items: Iterable&lt;T1&gt;, ...moreItems: Iterables&lt;Ts&gt; | [...Iterables&lt;Ts&gt;, { defaults?: [T?, T1?, ...Ts] }]): Seq&lt;[T, T1, ...Ts]&gt;</code></h3>

  <dl>
    <dt>- items</dt>
    <dd>Other sequence to combine items from</dd>
    <dt>- moreItems</dt>
    <dd>Other sequences to combine items from</dd>
    <dt>- { defaults? }</dt>
    <dd>Default to use for shorter sequences</dd>
    <dt>RETURNS</dt>
    <dd>
    Sequence of tuples, where each tuple correspond to specific item's index from the source sequence and contains other items from from same index in the other sequences<br>
    <small><i>The produces sequence is as long as the longest sequence</i></small>
    </dd>
  </dl>
  <details>
    <summary>Example</summary>

```typescript
const results1 = [{x:0, y:0}, {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4}];
const results2 = [{x:1, y:0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3}];
const results3 = [{x:2, y:0}, {x: 2, y: 1}, {x: 2, y: 2}];
console.log(results1.zipAll(results2, results3, {defaults: [undefined, {x:-1, y: -1}]}).toArray());
// Output:
// [
//   [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
//   [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}],
//   [{x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}],
//   [{x: 0, y: 3}, {x: 1, y: 3}, undefeind],
//   [{x: 0, y: 4}, {x:-1, y: -1}, undefeind]
// ]
```
  </details>
  <hr>
</details>

<!-- zipWithIndex() -->
<details>
  <summary><samp><b>zipWithIndex()</b></samp> - Pairs each item with its index [item, index] (opposite order of entries())</summary>

  <h3><code>zipWithIndex&lt;U = T&gt;(): Seq&lt;[T, number]&gt;</code></h3>
  <hr>
</details>

### Grouping functionality
groupBy() operation returns a sequence of groups which provides additional functionalities over `seq` interface.

### `GroupedSeq` Interface
Represents and item in a sequence returned by groupBy().<br/>
i.e. `Seq<GroupedSeq<K, T>>`
```typescript
interface GroupedSeq<K, T> extends Seq<T> {
  readonly key: K;
}
```

<!-- key -->
<details>
  <summary><samp><b>key</b></samp> - A value that serves as the group's key</summary>

  <h3><code>readonly key: K</code></h3>
  <hr>
</details>
<hr>


### `SeqOfGroups` Interface
Returned by groupBy() on regular sequence.   
It's `Seq<GroupedSeq>` with the following functionalities

<!-- mapInGroup() -->
<details>
  <summary><samp><b>mapInGroup()</b></samp> - Maps each leaf item in already groups sequence</summary>

  <h3><code>mapInGroup&lt;U&gt;(mapFn: Selector&lt;T, U&gt;): SeqOfGroups&lt;K, U&gt;</code></h3>
  <dl>
    <dt>- mapFn</dt>
    <dd>Mapping function called on each leaf item and returns another desired value</dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const xyz = asSeq([
  {x: 0, y: 0, z: 0},
  {x: 0, y: 0, z: 1},
  {x: 1, y: 1, z: 0},
  {x: 1, y: 1, z: 1},
  {x: 2, y: 2, z: 0},
  {x: 2, y: 2, z: 1}
]);
const grouped = xyz.groupBy(
  xyz => ({x: xyz.x, y: xyz.y}), // key: {x, y}
  ({x, y}) => x + ',' + y // comparable: "x,y"
);

const formatted = grouped.mapInGroup(({x, y, z}) => `[${x}, ${y}, ${z}]`);
console.log('XYZ Stringify:', formatted.toMap());
// OUTPUT:
// XYZ Stringify: Map(3) {
//   { x: 0, y: 0 } => [ '[0, 0, 0]', '[0, 0, 1]' ],
//   { x: 1, y: 1 } => [ '[1, 1, 0]', '[1, 1, 1]' ],
//   { x: 2, y: 2 } => [ '[2, 2, 0]', '[2, 2, 1]' ]
// }

const distances = grouped.mapInGroup(xyz => (xyz.x ** 2 + xyz.y ** 2 + xyz.z ** 2) ** 0.5);
console.log('XYZ Distances:',distances.toMap());
// OUTPUT:
// XYZ Distances: Map(3) {
//   { x: 0, y: 0 } => [ 0, 1 ],
//   { x: 1, y: 1 } => [ 1.4142135623730951, 1.7320508075688772 ],
//   { x: 2, y: 2 } => [ 2.8284271247461903, 3 ]
// }
```
  </details>
  <hr>
</details>

<!-- thenGroupBy() -->
<details>
  <summary><samp><b>thenGroupBy()</b></samp> - Performs additional sub grouping of the items</summary>

<h3><code>thenGroupBy&lt;K2&gt;(keySelector?: Selector&lt;T, K2&gt;, toComparableKey?: ToComparableKey&lt;K2&gt;): SeqOfMultiGroups&lt;[K, K2], T&gt;</code></h3>
  <dl>
    <dt>- keySelector</dt>
    <dd>
    Function that returns a value served as the group's key.<br>
    Commonly used to select by which property to match the items 
    </dd>
    <dt>- toComparableKey?</dt>
    <dd>
    Returns a primitive value that can be compared for equality for the group's key (string, number, boolean, undefined, null)<br>
    In case the group's key is not a comparable value (i.e. an object or array)
    </dd>
    <dt>RETURNS</dt>
    <dd><code>SeqOfMultiGroups</code>interface which is <code>Seq&lt;MultiGroupedSeq&lt;Key, TValue&gt;&gt;</code>with additional functionalities</dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const data = asSeq([
  {id: 1, x: 0, y: 0, series: 'hits', radius: 1},
  {id: 2, x: 0, y: 0, series: 'hits', radius: 1},
  {id: 3, x: 1, y: 1, series: 'hits', radius: 10},
  {id: 4, x: 2, y: 2, series: 'hits', radius: 10},
  {id: 5, x: 0, y: 0, series: 'misses', radius: 1},
  {id: 6, x: 1, y: 1, series: 'misses', radius: 5},
  {id: 7, x: 2, y: 2, series: 'misses', radius: 5},
  {id: 8, x: 2, y: 2, series: 'misses', radius: 1}
]);
const groupHierarchy = data
  .groupBy(p => p.series)
  .thenGroupBy(
    p => ({x: p.x, y: p.y}), // key: {x, y}
    ({x, y}) => x + ',' + y) // comparable: "x,y"
  .thenGroupBy(p => p.radius)
  .mapInGroup(p => p.id)
  .toMap();

groupHierarchy.forEach((value, key) => console.log(`"${key}" => `, value));
// OUTPUT:
// "hits" =>  Map(3) {
//     { x: 0, y: 0 } => Map(1) { 1 => [ 1, 2 ] },
//     { x: 1, y: 1 } => Map(1) { 10 => [ 3 ] },
//     { x: 2, y: 2 } => Map(1) { 10 => [ 4 ] }
// }
// "misses" =>  Map(3) {
//     { x: 0, y: 0 } => Map(1) { 1 => [ 5 ] },
//     { x: 1, y: 1 } => Map(1) { 5 => [ 6 ] },
//     { x: 2, y: 2 } => Map(2) { 5 => [ 7 ], 1 => [ 8 ] }
// }
```
  </details>
  <hr>
</details>

<!-- toMap() -->
<details>
  <summary><samp><b>toMap()</b></samp> - Return new Map object with groups hierarchy with sub Maps for sub groups and arrays of leaf items)</summary>

  <h3><code>toMap(): MapHierarchy&lt;[K], T&gt;</code></h3>
  <dl>
    <dt>RETURNS</dt>
    <dd>
    <code>MapHierarchy</code> type alias for the Map within Map within ... upto Array hierarchy<br>
    i.e. Map&lt;K1, Map&lt;K2, Map&lt;K3, T[]&gt;&gt;&gt;
    </dd>
  </dl>

  <details>
    <summary><small>Example</small></summary>

```typescript
const data = asSeq([
  {id: 1, x: 0, y: 0, series: 'hits', radius: 1},
  {id: 2, x: 0, y: 0, series: 'hits', radius: 1},
  {id: 3, x: 1, y: 1, series: 'hits', radius: 10},
  {id: 4, x: 2, y: 2, series: 'hits', radius: 10},
  {id: 5, x: 0, y: 0, series: 'misses', radius: 1},
  {id: 6, x: 1, y: 1, series: 'misses', radius: 5},
  {id: 7, x: 2, y: 2, series: 'misses', radius: 5},
  {id: 8, x: 2, y: 2, series: 'misses', radius: 1}
]);

const group1: Map<string, Map<{x: number, y: number}, number[]>> = data
  .groupBy(p => p.series)
  .thenGroupBy(p => ({x: p.x, y: p.y }))
  .mapInGroup(p => p.id)
  .toMap();

const group2: Map<string, Map<number, Map<number, Map<number, { id: number; }[]>>>> = data
  .groupBy(p => p.series)
  .thenGroupBy(p => p.x)
  .thenGroupBy(p => p.y)
  .thenGroupBy(p => p.radius)
  .mapInGroup(p => ({id: p.id}))
  .toMap();
```
  </details>
  <hr>
</details>

<hr>

### `MultiGroupedSeq` Interface

Represents and item in a sequence of multiple groups' hierarchy, returned by thenGroupBy().

```typescript
interface MultiGroupedSeq<Ks extends any[], T> extends Seq<MultiGroupedSeq | GroupedSeq> {
  readonly key: Ks[0];
}
```

<!-- key -->
<details>
  <summary><samp><b>key</b></samp> - A value that serves as the group's key</summary>

  <h3><code>readonly key: Ks[0]</code></h3>
  The type of the key is the top type in a tuple of key-types, which represents all the key's in the groups' hierarchy.
  <hr>
</details>
<hr>

### `SeqOfMultiGroups` Interface
Same functionalities as `SeqOfGroups` but represent a hierarchy of groups.

The Keys types of the entire hierarchy of groups is visible thru a tuple of all the keys types, and having he top key-type in the tuple represent the top group

<details>
  <summary>Example</summary>

```typescript
const data = asSeq([
  {id: 1, x: 0, y: 0, series: 'hits', radius: 1},
  {id: 2, x: 0, y: 0, series: 'hits', radius: 1},
  {id: 3, x: 1, y: 1, series: 'hits', radius: 10},
  {id: 4, x: 2, y: 2, series: 'hits', radius: 10},
  {id: 5, x: 0, y: 0, series: 'misses', radius: 1},
  {id: 6, x: 1, y: 1, series: 'misses', radius: 5},
  {id: 7, x: 2, y: 2, series: 'misses', radius: 5},
  {id: 8, x: 2, y: 2, series: 'misses', radius: 1}
]);
const group: SeqOfMultiGroups<[string, number, number, number, { id: number; }], number> = data
  .groupBy(p => p.series)
  .thenGroupBy(p => p.x)
  .thenGroupBy(p => p.y)
  .thenGroupBy(p => p.radius)
  .thenGroupBy(p => ({id: p.id }))
  .mapInGroup(p => p.radius);
;
```
</details>

>  The Tuple of [...Keys Types] is an alternative to representing the type as hierarchy of GroupedSeq one inside another<br>
>  Meaning, this:<br>
>  `SeqOfMultiGroups<[string, number, number, number, { id: number; }], number>`<br>
>  is preferred over this:<br>
>  `Seq<GroupedSeq<string, GroupedSeq<number, GroupedSeq<number, GroupedSeq<number, GroupedSeq<{id: number;}, number>>>>>>`

<hr>


| Method      | Description |
| ----------- | ----------- |
| -- | `OrderedSeq Interface` |
| -- thenBy | Perform sub sorting |
| -- thenByDescending | Perform sub sorting in reverse |

### Factories

| Function    | Description |
| ----------- | ----------- |
| asSeq | Creates a sequence by wrapping an Iterable object (Array, Generator function) |
| empty | Creates an empty sequence based on anonymous Typescript Type |
| range | Creates a sequence for a range of numbers |
| indexes | Creates a sequence for range of numbers starting from zero |
| repeat | Creates a sequence filled with repeated value |
| random | Creates infinite sequence of random numbers |

### Difference among actions that involve two sequences
|**Left**|**0**|**0**|**1**|**1**|**2**|**3**| |**4**|**4**| | | |
|---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|**Right**|**0**|**0**| | | |**3**|**3**|**4**| |**5**|**5**|**6**|
|diff| | |`1`|`1`|`2`| | | | |`5`|`5`|`6`|
|diffDistinct| | |`1`| |`2`| | | | |`5`| |`6`|
|innerJoin|`0.0`|`0.0`|`0.0`|`0.0`| |`3.3`|`3.3`|`4.4`|`4.4`| | | | |
|intersect|`0`| | | | |`3`| |`4`|
|remove| | |`1`|`1`|`2`| | | |`4`|
|removeAll| | |`1`|`1`|`2`|
|takeOnly|`0`|`0`| | | |`3`| |`4`|
|union|0| |`1`| |`2`|`3`| |`4`| |`5`| |`6`|
