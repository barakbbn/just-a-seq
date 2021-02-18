# just-a-seq
Query functionalities over JavaScript Iterable.  
Using a Sequence/Collection written in Typescript that wraps any Iterable object (Array, Generator function)  
Operations are lazy/deferred and immutable (Similar to .NET LINQ) with a fluent api that more resemble to JavaScript Array.  
___
### Functionality summary

### `Seq` Interface
| Method      | Description |
| ----------- | ----------- |
| all | *(same as **every**)* Checks whether all items match a condition |
| any | *(same as **some**)* Checks if any item matches a condition |
| at | return item at index |
| append | *(same as **push**)* Appends items to the end of the sequence |
| average | Return the average value of sequence of numbers |
| cache | Breaks the deferred nature of the sequence by keeping the items in internal array. |
| chunk | split the sequence into sub sequences with fixes number of items |
| concat | Concat several Iterables to the sequence |
| consume | iterating over the items without performing any action |
| count | Count number of items in the sequence that match a condition |
| diffDistinct | Perform diff with another sequence and keep only distinct items |
| diff | Perform diff with another sequence |
| distinct | Remove duplicate items |
| endsWith | Determines if the sequence include another sequence at its end |
| entries | Like Array.entries. Pair each item with its index [index, item]
| every | *(same as **all**)* Like Array.every |
| filter | Keeps only items that match a condition |
| find | Find the first item that matches a condition | 
| findIndex | Return the index of first item that matches a condition |
| findLastIndex | Return the index of last item that matches a condition |
| findLast | Find the last item that matches a condition | 
| first | Get first item in the sequence (at index 0) |
| firstAndRest | Split the sequence into a tuple of the first item and the rest of the items |
| flatMap | Map each item into Iterable and flat them all into a new sequence |
| forEach | Like Array.forEach, but with ability to break the loop |
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
| Function      | Description |
| ----------- | ----------- |
| asSeq | Creates a sequence by wrapping an Iterable object (Array, Generator function) |
| empty | Creates an empty sequence based on anonymous Typescript Type |
| range | Creates a sequence for a range of numbers |
| indexes | Creates a sequence for range of numbers starting from zero |
| repeat | Creates a sequence filled with repeated value |
| random | Creates infinite sequence of random numbers |
