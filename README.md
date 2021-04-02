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
  .distinct(p => p.x + ',' + p.y) // Remove duplicate points
  .sortBy(p => p.x) // Sort by x then by y
  .thenSortBy(p => p.y)
  .prepend([{x: -1, y: -1, tag: '-'}]) // Add special point at the beginning
  .map(p => `{${p.x},${p.y}}`) // Map each point to string representation
  .toString({start: '[', end: ']'}) // Convert the sequence into string wrapped in brackets
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
