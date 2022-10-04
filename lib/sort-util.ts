const JAVASCRIPT_QUIRK_SORT = true;

import {Comparer} from "./seq";
import {sameValueZero} from "./common";

export function LEGACY_COMPARER(a: any, b: any): number {

  const [aIsNullOrUndefined, bIsNullOrUndefined] = [a == null, b == null];
  if (aIsNullOrUndefined && bIsNullOrUndefined) return a === undefined? 1: -1; // undefined is bigger than null
  else if (aIsNullOrUndefined || bIsNullOrUndefined) return aIsNullOrUndefined? 1: -1;

  return a.toString().localeCompare(b.toString());
}

export function DONT_COMPARE(a: any, b: any): number {
  throw new Error('CANNOT COMPARE');
}

export function binarySearch<T = any>(items: ArrayLike<T>, item: T, comparer: (a: T, b: T) => number, opts: { start?: number; end?: number; checkEdgesFirst?: boolean; } = {}): number {

  if (items.length === 0) return ~0;

  let left = opts?.start ?? 0;
  let right = opts?.end ?? items.length - 1;
  if (left >= items.length) left = items.length - 1;
  if (right < 0) right = 0;
  if (left > right) left = right;

  if (opts?.checkEdgesFirst) {
    let compared = comparer(item, items[right]);
    if (compared > 0) return ~(right + 1);
    if (compared === 0) return right + 1;

    if (right > left) { // No need to compare if right item is also the left item
      compared = comparer(item, items[left]);
    }
    if (compared < 0) return ~left;
    if (compared === 0) return left;

    // Skip edges
    left++;
    right--;
  }

  while (left <= right) {
    const pivot = (right + left) >>> 1; // Faster than Math.floor((right + left) / 2)
    const compared = comparer(item, items[pivot]);
    if (compared === 0) return pivot;
    if (compared > 0) left = pivot + 1;
    else right = pivot - 1;
  }
  // Not found
  return ~left;
}

export function createComparer<T, K = T>(keySelector: ((x: T) => K) | undefined,
                                         comparer: Comparer<K> | undefined,
                                         reverse: boolean): ((a: any, b: any) => number) | undefined {
  if (comparer === LEGACY_COMPARER && !reverse) return undefined;
  if (comparer === DONT_COMPARE) return comparer;

  let baseComparer: (a: any, b: any) => number = comparer ?? DEFAULT_COMPARER;
  let finalComparer = baseComparer;
  if (keySelector) {
    finalComparer = reverse?
      (a, b) => baseComparer(keySelector(b), keySelector(a)):
      (a, b) => baseComparer(keySelector(a), keySelector(b));

  } else if (reverse) {
    finalComparer = (a, b) => -baseComparer(a, b);
  }
  return finalComparer;
}

export function DEFAULT_COMPARER(a: any, b: any): number {
  if (sameValueZero(a, b)) return 0;

  const [aIsNullOrUndefined, bIsNullOrUndefined] = [a == null, b == null];
  if (aIsNullOrUndefined && bIsNullOrUndefined) return a === undefined? 1: -1; // undefined is bigger than null
  else if (aIsNullOrUndefined || bIsNullOrUndefined) return aIsNullOrUndefined? 1: -1;

  return a > b? 1: -1;
}

export function partialQuickSort<T>(items: T[], count: number, comparer: (a: T, b: T) => number, opts?: { start?: number; end?: number; }): T[] {
  const takeFromEnd = count < 0;
  count = Math.floor(Math.abs(count));

  if (count > items.length) count = items.length;
  const swap = (i1: number, i2: number) => [items[i1], items[i2]] = [items[i2], items[i1]];

  function partition(left: number, right: number): number {
    const pivotIndex = (right + left) >>> 1;
    const pivot = items[pivotIndex];
    let indexOfSmallest = left - 1;

    if (pivotIndex < right) swap(pivotIndex, right);

    for (let i = left; i < right; i++) {
      const item = items[i];
      if (JAVASCRIPT_QUIRK_SORT && item === undefined) continue;
      const compared = comparer(item, pivot);
      if (compared <= 0) {
        indexOfSmallest++;
        if (i !== indexOfSmallest) swap(i, indexOfSmallest);
      }
    }

    swap(right, ++indexOfSmallest);

    return indexOfSmallest;
  }


  let left = opts?.start ?? 0;
  let right = opts?.end ?? items.length - 1;

  if (left >= right) return items;
  const partitionsStack = [[left, right]];

  while (partitionsStack.length) {
    [left, right] = partitionsStack.pop()!;
    if (left >= right) continue;

    const pivotIndex = partition(left, right);

    if (takeFromEnd) {
      if (items.length - pivotIndex < count) partitionsStack.push([left, pivotIndex - 1]);
      partitionsStack.push([pivotIndex + 1, right]);
    } else {
      if (pivotIndex < count - 1) partitionsStack.push([pivotIndex + 1, right]);
      partitionsStack.push([left, pivotIndex - 1]);
    }
  }

  if (takeFromEnd) items = items.slice(-count);
  if (items.length > count) items.length = count;
  return items;
}


export function partialBinaryInsertionSort<T>(source: Iterable<T>, count: number, comparer: Comparer<T>, opts?: { stable?: boolean; }): readonly T[] {
  count = Math.floor(Math.max(0, count));

  const sorted: T[] = [];
  if (count === 0) return sorted;

  let shouldSort = true;
  let undefinedCount = 0;
  for (const item of source) {

    if (sorted.length < count) {
      if (JAVASCRIPT_QUIRK_SORT && item === undefined) undefinedCount++;
      else sorted.push(item);
      continue;
    }

    if (shouldSort && sorted.length === count) {
      sorted.sort(comparer);
      shouldSort = false;
    }

    let bsIndex = JAVASCRIPT_QUIRK_SORT && item === undefined?
      ~count:
      binarySearch(sorted, item, comparer, {checkEdgesFirst: true});

    const alreadyExists = bsIndex >= 0;
    if (opts?.stable && alreadyExists && bsIndex < count) {
      do bsIndex++;
      while (comparer(item, sorted[bsIndex]) == 0);
    }
    const insetAtIndex = alreadyExists? bsIndex: ~bsIndex;

    if (bsIndex >= 0 && bsIndex < count || insetAtIndex < count) {
      sorted.length--;
      sorted.splice(insetAtIndex, 0, item);
    }
  }
  if (shouldSort) sorted.sort(comparer);
  // pad at end with remaining undefined
  const length = sorted.length;
  sorted.length = Math.min(count, length + undefinedCount);
  sorted.fill(undefined as unknown as any, length);

  return sorted;
}
