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
const cells: { col: number; row: number; userValue?: number; }[] = [
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
  // Output: [
  //   {col: 0, row: 0, userValue: 0}, {col: 1, row: 1, userValue: 11},
  //   {col: 11, row: 11} 
  // ]
}
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
  .orderBy(p => p.x) // Sort by x then by y
  .thenBy(p => p.y)
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

> Used in cases need to avoid passing inherited Seq implementation (i.e. OrderedSeq, GroupedSeq, etc...) 

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
  <summary><samp><b>average()</b></samp> - <small><i>(same as <b>push</b>)</i></small> Return the average value from a sequence of numbers</summary>
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

  Used in cases the sequence need to be iterated more than once, and we want to avoid the default behavior that each iteration will re-consume the entire sequence chain and might introduce unnecessary overhead or potentially different results for each iteration

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
  .orderBy(x => x.class)
  .thenByDescending(x => x.grade)
  .map(x=> ({name: x.firstName + ' ' + x.lastName, class: x.class, grade: x.grade}))
  .cache();

console.log('Top 5 Students', cached
  .filter(x => x.grade > 95)
  .groupBy(x => x.name)
  .map(group => ({name: group.key, grade: group.average(x => x.grade)}))
  .orderByDescending(x => x.grade)
  .take(5)
  .map(x => x.name + ': ' + x.grade)
  .toString()
);

console.log('Top 3 Classes', cached
  .groupBy(x => x.class)
  .map(group => ({class: group.key, grade: group.average(x => x.grade)}))
  .orderByDescending(x => x.grade)
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
  <summary><samp><b>concat()</b></samp> - <small><i>(Like Array.concat)</i></small> Combine two or more Iterables</summary>
  <h3><code>concat(...items: Iterable&lt;T&gt;[]): Seq&lt;T&gt;</code></h3>
  <dl>
    <dt>- items</dt>
    <dd>Additional Iterables to concatenate to the end of the sequence</dd>
  </dl><hr>  
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

  <h3><code>diff&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: Selector&lt;T, K&gt;): Seq&lt;T&gt;</code></h3>
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

  <h3><code>diffDistinct&lt;K&gt;(items: Iterable&lt;T&gt;, keySelector?: Selector&lt;T, K&gt;): Seq&lt;T&gt;</code></h3>
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

  Returns <b>-1</b> if not found
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
  <summary><samp><b>flat()</b></samp> - <small><i>(Like Array.flat)</i></small> Flatten iterables of iterables by specified depth</summary>

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

  <h3><code>flatMap&lt;U, R&gt;(selector: Selector&lt;T, Iterable&lt;U&gt;&gt;, mapResult?: (subItem: U, parent: T, index: number) => R): Seq&lt;R&gt;</code></h3>
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
const allFilesPaths = foldersSeq.flatMap(f => f.files, (file, folder) => folder.name+'/'+file.name);
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
    if(totalSize >= /*1 GB*/ 1024**3 ) return breakLoop;
});
```
  </details>
<hr>  
</details>


| Method      | Description |
| ----------- | ----------- |
| groupBy | Group items in the sequence |
| groupJoin | Group items from another sequence under each item in this sequence by matching a key value based on them |
| groupJoinRight | Same as groupJoin, but group current sequence items under the other sequence items |
| -- | `SeqOfGroups , SeqOfMultiGroups Interfaces` |
| -- thenGroupBy | Further group already grouped sequence in to sub groups |
| -- mapInGroup | Map each leaf item in groups hierarchy sequence |
| -- toMap | Return new Map of groups hierarchy with sub Maps for sub groups and arrays of leaf items |
| hasAtLeast | Checks whether the sequence has at least number of items |
| ifEmpty | Returns another sequence if this sequence is empty, otherwise return the same sequence |
| includes | Checks whether item exists in the sequence |
| includesAll | Checks whether the sequence includes all the items of another sequence |
| includesAny | Checks whether the sequence includes any items from another sequence |
| includesSubSequence | Checks whether the sequence includes another sequence |
| indexOf | Return index of an item in the sequence |
| indexOfSubSequence | Return an index of a sub-sequence that's included in the sequence |
| innerJoin | Return a sequence with pair of only matching items from both sequences |
| insert | Insert items to the sequence at specified index |
| insertAfter | Search first item that matches a condition and insert new items immediately after it |
| insertBefore | Search first item that matches a condition and insert new items just before it |
| intersect | Return only items that exists in another sequence |
| intersperse | Insert after each item a specified value |
| isEmpty | Checks whether the sequence is empty |
| join | *(same as **toString**)* Join the items into a string (with some more abilities than Array.join) |
| last | Return last item in the sequence |
| lastIndexOf | return the index of item being searched from the end of the sequence |
| length | return number of items in the sequence |
| map | Like Array.map |
| max | Return maximum value of sequence of numbers |
| min | Return minimum value of sequence of numbers |
| ofType | Keeps only items of specified type |
| orderBy | Sort items by comparer |
| orderByDescending | Sort items by comparer in reverse order |
| -- | `OrderedSeq Interface` |
| -- thenBy | Perform sub sorting |
| -- thenByDescending | Perform sub sorting in reverse |
| prepend | Add items at start of the sequence |
| push | Like Array.push |
| reduce | Like Array.reduce |
| reduceRight | Like Array.reduceRight |
| remove | Remove items that exist in another sequence |
| removeAll | Remove all occurrences of items that exist in another sequence |
| removeFalsy | Remove all falsy item |
| removeNulls | Remove null and undefined values |
| repeat | Concat the sequence with itself |
| reverse | Like Array.reverse |
| sameItems | Checks that two sequences have the same items | 
| sameOrderedItems | Checks that two sequences have the same items in the same order |
| skip | Remove number of items from beginning of the sequence |
| skipFirst | Remove the first item |
| skipLast | Remove one or more items from the end of the sequence |
| skipWhile | Remove items from beginning of sequence while they match a condition |
| slice | Like Array.slice |
| some | Like Array.some |
| sort | Like Array.sort |
| sorted | Return sorted sequence according to plain comparison either ascending or in reverse |
| split | Split into two sequences at index |
| startsWith | Determines if the sequence include another sequence at its beginning |
| sum | Return sum of values for sequence of numbers |
| take | Keep only first number of items | 
| takeLast | Keep only first number of items from the end |
| takeWhile | Keep items from beginning of sequence while they match a condition |
| takeOnly | Keep only items that existing in another sequence |
| tap | Perform a side effect action on each item when it will be later iterated |
| toArray | return a new array with the items |
| toMap | Return a new Map with the items  under a key by a key-selector |
| toSet | Return a new Set with distinct the items |
| toString | *(same as **join**)*
| transform | Manipulate the sequence using a custom action (Convenient if want to keep fluent methods calls) |
| union | Return distinct items from both sequences |
| unshift | Like Array.unshift |
| zip | Return a sequence that each item is a Tuple with items from each sequence at the same index |
| zipAll | Like Zip but take the longest sequence instead of shortest one |
| zipWithIndex | Pair each item with its index [item, index] (opposite order of entries() method)

### Factories

| Function    | Description |
| ----------- | ----------- |
| asSeq | Creates a sequence by wrapping an Iterable object (Array, Generator function) |
| empty | Creates an empty sequence based on anonymous Typescript Type |
| range | Creates a sequence for a range of numbers |
| indexes | Creates a sequence for range of numbers starting from zero |
| repeat | Creates a sequence filled with repeated value |
| random | Creates infinite sequence of random numbers |
