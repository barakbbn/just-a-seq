# just-a-seq [![GitHub last commit](https://img.shields.io/github/last-commit/barakbbn/just-a-seq)](https://github.com/barakbbn/just-a-seq) [![GitHub license](https://img.shields.io/github/license/barakbbn/just-a-seq)](https://github.com/barakbbn/just-a-seq/LICENSE)

This is just a **sequence** that provides LINQ functionalities (and more)  
But with an API that resembles JavaScript Array ( `map()` instead of `Select()`, `filter()` instead of `Where()`).  
It wraps an array or other Iterable object, Generator function.  (`asSeq([1,2,3])` , `asSeq(map.values())`)

---

### Features

* Typescript type definitions
* Fluent API - chain functions calls to simplify the code:  `seq.filter().map().sorted().toArray()`
* Lazy/Deferred functionalities, similar to .NET LINQ.

  Instead of immediately producing a new Array from methods such as `map`, `filter`, it iterates the items only once
  when being consumed (i.e. `toArray()`, `foreach()`, `count()` ).
* Immutable - actions on the sequence won't change it, but return a new sequence with the changes
* API that more resemble to JavaScript Array
  (Since most existing libraries already mimics .Net IEnumerable).
* Additional useful functionalities that can make you more productive.

See: [![GitHub docs](https://img.shields.io/static/v1?label=docs&message=Full%20API&color=blueviolet)](https://github.com/barakbbn/just-a-seq/wiki/docs) [![NPM Badge](https://img.shields.io/npm/v/@barakbbn/just-a-seq)](https://www.npmjs.com/package/@barakbbn/just-a-seq)

#### Examples
 
```typescript
// Zip upto 64KB of files or max of 100 files into separate zip file
import {asSeq} from '@barakbbn/just-a-seq';

const files: { name: string; size: number; ext: string; }[] = getListOfFiles();

asSeq(files)
  .filter(file => file.ext === '.json')
  .chunkByLimit(64 * 1024 * 1024 /* 64MB */, file => file.size, {maxItemsInChunk: 100})
  .forEach((chunk, i) => {
    saveZipFile(`chunk-${i}.zip`, chunk.map(file => file.name));
  });
```

```typescript
// Count how many files for each file-extension
const extensions = new Set(['.txt', '.docx', '.xlsx', '.csv']);
const countOfEachFileType = asSeq(getListOfFiles())
  .filter( file => extensions.has(file.ext))
  .toMapOfOccurrences(file => file.ext)

console.log('count of each file type:', countOfEachFileType);
// Output:
// count of each file type: Map(3) { '.txt' => 24, '.docx' => 28, '.csv' => 24 }
```

<details>
<summary><i>Example 2</i></summary>

```typescript
// Join arrays of users-groups and groups-premissions to produce a sinlge array of users with their permissions
import {asSeq} from '@barakbbn/just-a-seq';

const users = [
  {user: 'sa', group: 'admins'},
  {user: 'system', group: null},
  {user: 'guest', group: 'guests'},
  {user: 'any', group: 'guests'},
  {user: 'me', group: 'admins'}
];

const permissions = [
  {group: 'admins', perm: 'read'},
  {group: 'admins', perm: 'write'},
  {group: 'services', perm: 'exec'},
  {group: 'guests', perm: 'read'},
  {group: 'admins', perm: 'exec'},
];

const usersPermissions = asSeq(users)
  // Match users with permissions having the same group, return object with username and permission name {user, perm}
  .innerJoin(permissions, user => user.group, perm => perm.group, (outer, inner) => ({user: outer.user, perm: inner.perm})) // results could be also mapped like this: ({user}, {perm}) => ({user, perm})
            // -> {user: 'sa', perm: 'read'}},
            //    {user: 'sa', perm: 'write'}},
            //    {user: 'sa', perm: 'exec'}},
            //    {user: 'guest', perm: 'read'}},
            //    {user: 'any', perm: 'read'}},
            //    {user: 'me', perm: 'read'}},
            //    {user: 'me', perm: 'write'}},
            //    {user: 'me', perm: 'exec'}}
  // Group by user and select/map only the permission name
  .groupBy(x => x.user, undefined, x => x.perm)
          // -> {key: 'sa',    __group__: [ 'read', 'write', 'exec' ]},
          //    {key: 'guest', __group__: [ 'read' ]},
          //    {key: 'any',   __group__: [ 'read' ]},
          //    {key: 'me' ,   __group__: [ 'read', 'write', 'exec' ]}
  // Map items into object with username and sorted array of its permissions
  .map(group => ({user: group.key, permissions: group.sorted().toArray()}))
      // -> {user: 'sa',    permissions: [ 'exec', 'read', 'write' ]},
      //    {user: 'guest', permissions: [ 'read' ]},
      //    {user: 'any',   permissions: [ 'read' ]},
      //    {user: 'me' ,   permissions: [ 'exec', 'read', 'write' ]}
  // Sort by username
  .sortBy(x => x.user)
        // -> {user: 'any',   permissions: [ 'read' ]},
        //    {user: 'guest', permissions: [ 'read' ]},
        //    {user: 'me' ,   permissions: [ 'exec', 'read', 'write' ]}
        //    {user: 'sa',    permissions: [ 'exec', 'read', 'write' ]},
  .toArray();

console.log('Users Permissions:', usersPermissions);
// Output: 
// Users Permissions: [
//   { user: 'any', permissions: [ 'read' ] },
//   { user: 'guest', permissions: [ 'read' ] },
//   { user: 'me', permissions: [ 'exec', 'read', 'write' ] },
//   { user: 'sa', permissions: [ 'exec', 'read', 'write' ] }
// ]
```
![innerJoin() animation](https://github.com/barakbbn/just-a-seq/wiki/images/inner-join-small.gif) <a href="https://github.com/barakbbn/just-a-seq/wiki/images/inner-join-large.gif"><samp>[+]</samp></a>
</details>
<br>

### Breaking changes
Version 1.2.0
* Optimized mode is enabled by default !   
  importing/requiring '@barakbbn/just-a-seq/optimized' is **no longer supported**.  
  To disable optimized mode:
  ```ts
  import {asSeq, Seq} from '@barakbbn/just-a-seq';
  Seq.enableOptimization = false;
  ```
* Package become a bundled CommonJS javascript file wrapped as UMD module (index.js).  
  In order to be able to use both in Node.JS and **Browser** (exported as global variable **jas**eq).
  ```html
  <html>
    <script src="file://node_modules/@barakbbn/just-a-seq/dist/index.js"></script>
    <script>
        var seq = jaseq.asSeq([1, 2]);
        var len = seq.length();
        document.getElementById("my-size").innerText = len;
    </script>
  </html>
  ```

#### More Examples

<!-- Example 2 -->

<!-- Example 3 -->
<details>
<summary><i>Example 3</i></summary>

```typescript
import {asSeq} from '@barakbbn/just-a-seq';

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
  .distinct(p => p.x + ',' + p.y) // Remove duplicate points
  .sortBy(p => p.x) // Sort by x then by y
  .thenSortBy(p => p.y)
  .prepend([{x: -1, y: -1, tag: '-'}]) // Add special point at the beginning
  .map(p => `{${p.x},${p.y}}`) // Map each point to string representation
  .toString() // Convert the sequence into string wrapped in brackets
);
// Output: [{-1,-1},{0,0},{1,1},{2,2},{3,3}]
```

</details>
<br>
<!-- Example 4 -->
<details>
<summary><i>Example 4</i></summary>

```typescript
import {asSeq} from '@barakbbn/just-a-seq';

const graphA = [
  {x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}, {x: 5, y: 10}
];
const graphB = [
  {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 4}, {x: 3, y: 7}, {x: 4, y: 6}, {x: 5, y: 8}
];

const averageDiff = asSeq(graphA)
  // Match points with same x value, return object with matching points from graphA and graphB {a,b}
  .innerJoin(graphB, a => a.x, b => b.x, (a, b) => ({a, b})) 
              // -> {a: {x: 0, y: 0 }, b: {x: 0, y: 0}},
              //    {a: {x: 1, y: 2 }, b: {x: 1, y: 1}},
              //    {a: {x: 2, y: 4 }, b: {x: 2, y: 4}},
              //    {a: {x: 3, y: 6 }, b: {x: 3, y: 7}},
              //    {a: {x: 4, y: 8 }, b: {x: 4, y: 6}},
              //    {a: {x: 5, y: 10}, b: {x: 5, y: 8}}
  // Map each matching item to the absolute difference between y value of points {a,b}
  .map(({a, b}) => Math.abs(a.y - b.y)) // -> 0, 1, 0, 1, 2, 2
  // Calculate average on all the values
  .average(); // -> 1

console.log('Average difference', averageDiff);
// Output: Average difference 1
```

</details>  
<br>
<!-- Example 5 -->
<details>
<summary><i>Example 5</i></summary>

```typescript
import {asSeq} from '@barakbbn/just-a-seq';

const files: { name: string; size: number; ext: string; }[] = getListOfFiles();

const chunksOfFiles = asSeq(files)
  .filter(file => file.ext === '.ndjson')
  .sortBy(file => file.size)
  .chunkByLimit(64 * 1024 * 1024 /* Max 64MB MEM */, file => file.size, {maxItemsInChunk: 100});
const chunksOfRecords = chunksOfFiles.map(chunk => chunk
  .map(file => loadfileContent(file.name))
  .map(json => JSON.parse(json))
  .flatMap(obj => buildDbRecords(obj))
);

chunksOfRecords.forEach(recordsSeq => saveToDatabase(recordsSeq));
```

</details>

### Functionality summary

#### Immediate actions


|            |                    |                    |                     |       |          |
|------------|--------------------|--------------------|---------------------|-------|----------|
| all        | any                | at                 | average             |       |          |
| consume    | count              |                    |                     |       |          |
| endsWith   | every              |                    |                     |       |          |
| find       | findIndex          | findLast           | findLastIndex       | first | forEach  |
| hasAtLeast |                    |                    |                     |       |          |
| includes   | includesAll        | includesAny        | includesSubSequence |       |          |
| indexOf    | indexOfSubSequence | isEmpty            |                     |       |          |
| last       | lastIndexOf        | length             |                     |       |          |
| max        | maxItem            | min                | minItem             |       |          |
| reduce     | reduceRight        |                    |                     |       |          |
| sameItems  | sameOrderedItems   | some               | startsWith          | sum   |          |
| toArray    | toMap              | toMapOfOccurrences | [toObject]          | toSet | toString |

#### Deferred actions


|               |                      |                    |                |                      |                    |
|---------------|----------------------|--------------------|----------------|----------------------|--------------------|
| append        | aggregate            | aggregateRight     |                |                      |                    |
| cache         | cartesian            | chunk              | chunkBy        | **chunkByLimit**     | concat             |
| diff          | diffDistinct         | diffMatch          | distinct       | distinctUntilChanged |                    |
| entries       |                      |                    |                |                      |                    |
| filter        | firstAndRest         | flat               | flatMap        |                      |                    |
| groupBy       | **groupBy$**         | groupJoin          | groupJoinRight |                      |                    |
| ifEmpty       | innerJoin            | insert             | insertAfter    | insertBefore         |                    |
| interleave    | intersect            | intersectBy        | intersperse    | intersperseBy        |                    |
| join          |                      |                    |                |                      |                    |
| map           | [mapInGroup]         | move               |                |                      |                    |
| ofType        |                      |                    |                |                      |                    |
| padEnd        | padStart             | partition          | partitionWhile | prepend              | push               |
| reduce        | reduceRight          | remove             | removeAll      | removeFalsy          |                    |
| removeKeys    | removeNulls          | repeat             | reverse        |                      |                    |
| scan          | skip                 | skipFirst          | skipLast       | skipWhile            | slice              |
| sort          | sortBy               | sorted             | splice         | split                | splitAt            |
| take          | takeBy               | takeLast           | takeOnly       | takeWhile            | **tap**            |
| [thenGroupBy] | &lt;thenSortBy&gt;   | transform     | traverseBreadthFirst | traverseDepthFirst  |                    |
| [ungroup]     | [ungroupAll]         | union              | unionRight     | unshift              |                    |
| window        | with                 |                    |                |                      |                    |
| zip           | zipAll               | zipWithIndex       |                |                      |                    |

#### Factories


|        |         |        |
|--------|---------|--------|
| asSeq  | indexes | empty  |
| random | range   | repeat |

## Optimized Mode

By default, some functionalities, in certain conditions are being optimized by doing "shortcuts".  
This behavior assumes no side effects are being done by your code. (especially through map() ).  
( for side effect should use tap(). )  


If witnessing some mis-behaviours in optimized mode (Enabled by default),  
It might be since relying on the optimized behaviours.  
In that case disable optimized mode.

##### Disabling optimized mode:
```ts
import {asSeq, Seq} from '@barakbbn/just-a-seq';
Seq.enableOptimization = false;
```

Example of side effect

```ts
import {asSeq, Seq} from '@barakbbn/just-a-seq';

let students = loadStudents();
let gotTopGrade = false;

// DON'T
students = students.map(s => {
  if (s.grade === 100) gotTopGrade = true; // Side Effect
  return s;
});

// DO
students = students.tap(s => gotTopGrade |= (s.grade === 100));

processStudents(students);
```
Example of optimization of sorted sequence
```ts
import {random, Seq} from '@barakbbn/just-a-seq';

class PointsComponent {
  points: Seq<{ x: number; y: number; }>;
  samePoints = 0;

  constructor() {
    const points = this.loadPoints();

    this.points = asSeq(points).sort((a, b) => {
      const comparable = (a.x - b.x) || (a.y - b.y);
      if (comparable === 0) samePoints++; // Side Effect
      return comparable;
    });
    // The comparer function is not guranteed to run in optimization mode, 
    // i.e When re-sort is performed, or performing functionality that not requires sorting (count, includes).
    // IF the side effect is required, disable optimized.
  }

  onUserSelectedPoint(selectedPoint: { x: number; y: number; }) {
    // Optimization-mode might skip the sorting since includes() can be performed without sorting first
    if (!this.points.includes(selectedPoint)) {
      this.points = this.points.push(selectedPoint);
    }
    // Optimization-mode might skip the sorting since count() can be performed without sorting first
    console.log('Total Points:', this.points.count());
  }
}
```
