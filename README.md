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

#### See: *[Full API documentation](https://github.com/barakbbn/just-a-seq/wiki/docs)*

#### Examples

```typescript
import {asSeq} from '@barakbbn/just-a-seq/optimized';

const graphA = [
  {x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}, {x: 5, y: 10}
];
const graphB = [
  {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 4}, {x: 3, y: 7}, {x: 4, y: 6}, {x: 5, y: 8}
];

const averageDiff = asSeq(graphA)
  .innerJoin(graphB, a => a.x, b => b.x, (a, b) => ({a, b}))
  .map(({a, b}) => Math.abs(a.y - b.y))
  .average();

console.log('Average difference', averageDiff);
// Output: Average difference 1
```

<!-- Example 2 -->
<details>
<summary><i>Example 2</i></summary>

```typescript
import {asSeq} from '@barakbbn/just-a-seq/optimized';

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
  .innerJoin(permissions, o => o.group, i => i.group, ({user}, {perm}) => ({user, perm}))
  .groupBy(x => x.user, undefined, x => x.perm)
  .map(x => ({user: x.key, permissions: x.sorted().toArray()}))
  .sortBy(x => x.user)
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

</details>
<br>
<!-- Example 3 -->
<details>
<summary><i>Example 3</i></summary>

```typescript
import {asSeq} from '@barakbbn/just-a-seq/optimized';

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

### Functionality summary

#### Immediate actions

|   |   |   |   |   |
|---|---|---|---|---|
|all|any|at|average|
|consume|count|
|endsWith|every|
|find|findIndex|findLast|findLastIndex|first|
|forEach|
|hasAtLeast|
|includes|includesAll|includesAny|includesSubSequence|
|indexOf|indexOfSubSequence|isEmpty|
|last|lastIndexOf|length|
|max|min|
|reduce|reduceRight|
|sameItems|sameOrderedItems|some|startsWith|sum|
|toArray|toMap|toSet|toString|

#### Deferred actions

|   |   |   |   |   |
|---|---|---|---|---|
|append|
|cache|chunk|concat|
|diff|diffDistinct|distinct|
|entries|
|filter|
|firstAndRest|flat|flatMap|
|groupBy|groupJoin|groupJoinRight|**thenGroupBy**|
|ifEmpty|innerJoin|insert|insertAfter|insertBefore|
|intersect|intersperse|
|join|
|map|
|ofType|
|prepend|push|
|reduce|reduceRight|remove|removeAll|removeFalsy|
|removeNulls|repeat|reverse|
|skip|skipFirst|skipLast|
|skipWhile|slice|sort|sortBy|**thenSortBy**|
|sorted|split|
|take|takeLast|takeOnly|takeWhile|**tap**|
|transform|
|union|unshift|
|zip|zipAll|zipWithIndex|

#### Factories

|   |   |   |
|---|---|---|
| asSeq |indexes| empty |
| random| range | repeat|

### Optimized Mode

There is an optimization mode (disabled by default) that optimize some functionalities in certain conditions.  
It assumes no side effects are performed (especially through map() ). for side effect should use tap().  
To use the optimized mode either:

```ts
import {asSeq, Seq} from '@barakbbn/just-a-seq/optimized';
```  

Or enable global optimization flag as follow:

```ts
import {asSeq, Seq} from '@barakbbn/just-a-seq';

Seq.enableOptimization = true;
```

If witnessing some mis-behaviours in optimized mode,  
It is probably since relying on behaviours that optimization mode do shortcuts for.  
In that case either switch to non-optimized mode, or consider adjusting the code.

Examples

```ts
import {asSeq, Seq} from '@barakbbn/just-a-seq/optimized';

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

```ts
import {random, Seq} from '@barakbbn/just-a-seq/optimized';

class PointsComponent {
  points: Seq<{ x: number; y: number; }> ;
  samePoints = 0;

  constructor() {
    const points = this.loadPoints();

    this.points = asSeq(points).sort((a, b) => {
      const comparable = (a.x - b.x) || (a.y - b.y);
      if (comparable === 0) samePoints++; // Side Effect
      return comparable;
    });
    // The comparer function is not guranteed to run in optimization mode, in case a re-sort is performed.
    // In that case don't use optimized mode. i.e. import {asSeq, random} from '@barakbbn/just-a-seq';
  }

  onUserSelectedPoint(selectedPoint: { x: number; y: number; }) {
    if (!this.points.includes(selectedPoint)) { // Optimization-mode might skip the sorting
      this.points = this.points.push(selectedPoint);
    }
    console.log('Total Points:', this.points.count()); // Optimization-mode might skip the sorting
  }
}
```
