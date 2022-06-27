import {Comparer} from "./seq";
import {sameValueZero} from "./common";
export const LEGACY_COMPARER: any = {};
export const DONT_COMPARE: any = {};

export function binarySearch<T = any>(items: ArrayLike<T>, item: T, comparer: (a: T, b: T) => number, opts: { start?: number; end?: number; checkEdgesFirst?: boolean; } = {}): number {

  if (items.length === 0) return ~0;

  let left = opts?.start ?? 0;
  let right = opts?.end ?? items.length - 1;
  if (left >= items.length) left = items.length - 1;
  if (right < 0) right = 0;
  if (left > right) left = right;

  if (opts?.checkEdgesFirst) {
    let compared = comparer(item, items[left]);
    if (compared < 0) return ~left;
    if (compared === 0) return left;
    if (right > left) { // No need to compare if right item is also the left item
      compared = comparer(item, items[right]);
    }
    if (compared > 0) return ~(right + 1);
    if (compared === 0) return right;

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
  if (comparer === LEGACY_COMPARER) return undefined;
  if (comparer === DONT_COMPARE) return comparer;

  let baseComparer: (a: any, b: any) => number = comparer ?? defaultCompare;
  let finalComparer = baseComparer;
  if (keySelector) {
    finalComparer = reverse?
      (a, b) => baseComparer(keySelector(b), keySelector(a)):
      (a, b) => baseComparer(keySelector(a), keySelector(b));

  } else if (reverse) {
    finalComparer = (a, b) => baseComparer(b, a);
  }
  return finalComparer;
}

export function defaultCompare(a: any, b: any): number {
  if (sameValueZero(a, b)) return 0;

  const [aIsNullOrUndefined, bIsNullOrUndefined] = [a == null, b == null];
  if (aIsNullOrUndefined && bIsNullOrUndefined) return a === undefined? 1: -1; // undefined is bigger than null
  else if (aIsNullOrUndefined || bIsNullOrUndefined) return aIsNullOrUndefined? 1: -1;

  return a > b? 1: -1;
}


export function partialQuickSort<T>(items: T[], count: number, comparer: (a: T, b: T) => number, opts?: { start?: number; end?: number; }): T[] {
  const takeFromEnd = count < 0;
  count = Math.abs(count);
  if (count > items.length) count = items.length;
  const swap = (i1: number, i2: number) => [items[i1], items[i2]] = [items[i2], items[i1]];

  function partition(left: number, right: number): number {
    const pivotIndex = (right + left) >>> 1;
    const pivot = items[pivotIndex];

    if (pivotIndex < right) swap(pivotIndex, right);


    let indexOfSmallest = left - 1;
    for (let i = left; i < right; i++) {
      const compared = comparer(items[i], pivot);
      if (compared <= 0) {
        indexOfSmallest++;
        if (i - indexOfSmallest > 0) swap(i, indexOfSmallest);
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

export function getComparer<T>(keySelectorOrComparer?: ((item: T) => unknown) | { comparer: Comparer<T> }, reverse = false): Comparer<T> {
  const comparer = typeof keySelectorOrComparer === 'function'?
    createComparer(keySelectorOrComparer, undefined, reverse):
    keySelectorOrComparer?
      createComparer(undefined, keySelectorOrComparer.comparer, reverse):
      createComparer(undefined, undefined, reverse);

  return comparer!;
}
