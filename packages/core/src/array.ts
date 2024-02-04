
/**
 * A function that returns 0 if the arguments are equal, 1 if the first argument
 * is greater, and -1 if the second argument is greater.
 *
 * @param a The first object to be compared.
 * @param b The second object to be compared.
 * @return A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second.
 */
export type Comparator<T = any> = (a: T, b: T) => number;


/**
 * Performs a binary search on the provided sorted list and returns the index
 * of the item if found.
 *
 * If it can't be found it'll return -1.
 *
 * @see https://github.com/darkskyapp/binary-search
 *
 * @param haystack Items to search through (sorted).
 * @param needle The item to look for.
 * @param comparator Comparator function. Defaults to a function that uses
 *     the `<` and `>` operators.
 * @return The index of the item if found, -1 if not.
 */
export function binarySearch<T = any>(
    haystack: Array<T>, needle: T, comparator?: Comparator<T>
): number {
    let mid: number, cmp: number;
    const finalComparator = comparator || ascending<T>;
    let low = 0;
    let high = haystack.length;
    let found = false;

    while (low < high) {
        // Note that "(low + high) >>> 1" may overflow, and results in
        // a typecast to double (which gives the wrong results).
        mid = low + ((high - low) >> 1);
        cmp = +finalComparator(haystack[mid], needle);

        if (cmp < 0.0) {
            // Too low.
            low = mid + 1;
        } else {
            // Key found or too high
            high = mid;
            found = !cmp;
        }
    }

    // Key not found.
    return found ? low : ~low;
}


/**
 * Compare function sorting arrays in ascending order.
 *
 * Safe to use for numeric values. The function simply uses the `<` and `>`
 * operators to compare the two arguments.
 *
 * @param a The first object to be compared.
 * @param b The second object to be compared.
 * @return A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second.
 */
export function ascending<T = any>(a: T, b: T): number {
    return a > b ? 1 : a < b ? -1 : 0;
}


/**
 * Compare function sorting arrays in descending order.
 *
 * Safe to use for numeric values. The function simply uses the `<` and `>`
 * operators to compare the two arguments.
 *
 * @param a The first object to be compared.
 * @param b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is greater than, equal to, or less than the second.
 */
export function descending<T = any>(a: T, b: T): number {
    return a < b ? 1 : a > b ? -1 : 0;
}


/**
 * Decide which numeric value to use between two values.
 *
 * {@link TileGrid.getZForResolution} can use a function
 * of this type to determine which nearest resolution to use.
 *
 * This function takes a `{number}` representing a value between two array
 * entries, a `{number}` representing the value of the nearest higher entry and
 * a `{number}` representing the value of the nearest lower entry as arguments.
 *
 * @param value The value to be used.
 * @param high The value of the nearest entry numerically higher than the value.
 * @param low The value of the nearest entry numerically lower than the value.
 * @return If a negative number or zero is returned the lower value will
 *     be used, if a positive number is returned the higher value will be
 *     used.
 * @api
 */
export type NearestDirectionFunction = (
    value: number, high: number, low: number
) => number;


/**
 * @param arr Array in descending order.
 * @param target Target.
 * @param direction can be a function returning a number or a number where:
 *    * `0` means return the nearest,
 *    * `> 0` means return the largest nearest,
 *    * `< 0` means return the smallest nearest.
 * @return {number} Index.
 */
export function linearFindNearest(
    arr: number[],
    target: number,
    direction: number | NearestDirectionFunction
): number {
    // The list is in descending order. If the first element is less than
    // the target, then the target is larger than all elements (and the
    // first element is the nearest).
    if (arr[0] <= target) {
        return 0;
    }

    // If the last element is greater than the target, then the target is
    // smaller than all elements (and the last element is the nearest).
    const n = arr.length;
    if (target <= arr[n - 1]) {
        return n - 1;
    }

    if (typeof direction === 'function') {
        for (let i = 1; i < n; ++i) {
            const candidate = arr[i];
            if (candidate === target) {
                return i;
            }
            // Once we located the first element that is less than the target...
            if (candidate < target) {
                // ...we let the function decide between the smaller and
                // higher values.
                const funDirection = direction(target, arr[i - 1], candidate);
                if (funDirection > 0) {
                    return i - 1;
                } else if (funDirection < 0) {
                    return i;
                } else if (arr[i - 1] - target < target - arr[i]) {
                    return i - 1;
                } else {
                    return i;
                }
            }
        }
        return n - 1;
    }

    // Always choose the higher value.
    if (direction > 0) {
        for (let i = 1; i < n; ++i) {
            if (arr[i] < target) {
                return i - 1;
            }
        }
        return n - 1;
    }

    // Always choose the smaller value.
    if (direction < 0) {
        for (let i = 1; i < n; ++i) {
            if (arr[i] <= target) {
                return i;
            }
        }
        return n - 1;
    }

    // Choose the value that is closer.
    for (let i = 1; i < n; ++i) {
        if (arr[i] == target) {
            return i;
        }
        if (arr[i] < target) {
            if (arr[i - 1] - target < target - arr[i]) {
                return i - 1;
            }
            return i;
        }
    }
    return n - 1;
}


/**
 * Reverse the elements of a section of an array in place.
 *
 * @param arr The array to change.
 * @param begin The index of the first element to be reversed.
 * @param end The index of the last element to be reversed (inclusive).
 */
export function reverseSubArray<T = any>(
    arr: Array<T>, begin: number, end: number
) {
    while (begin < end) {
        const tmp = arr[begin];
        arr[begin] = arr[end];
        arr[end] = tmp;
        ++begin;
        --end;
    }
}


/**
 * Append elements to an array.
 *
 * @param arr The array to modify.
 * @param data The elements or arrays of elements to add to `arr`.
 */
export function extend<T = any>(arr: T[], data: T[] | T) {
    const extension = Array.isArray(data) ? data : [data];
    const length = extension.length;
    for (let i = 0; i < length; i++) {
        arr[arr.length] = extension[i];
    }
}


/**
 * Remove the first occurrence of an element from an array.
 *
 * @param arr The array to modify.
 * @param obj The element to remove.
 * @return `true` if the element was removed.
 */
export function remove<T = any>(arr: T[], obj: T): boolean {
    const i = arr.indexOf(obj);
    const found = i > -1;
    if (found) {
        arr.splice(i, 1);
    }
    return found;
}


/**
 * Compare the elements of two arrays using strict equality.
 *
 * @param arr1 The first array to compare.
 * @param arr2 The second array to compare.
 * @return Whether the two arrays are equal.
 */
export function equals<T = any>(
    arr1: T[] | Uint8ClampedArray,
    arr2: T[] | Uint8ClampedArray
): boolean {
    const len1 = arr1.length;
    if (len1 !== arr2.length) {
        return false;
    }
    for (let i = 0; i < len1; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}


/**
 * Sort the passed array in place such that the relative order of equal
 * elements is preserved.
 *
 * @param arr The array to sort (modifies original).
 * @param compareFnc Comparison function.
 * @see https://en.wikipedia.org/wiki/Sorting_algorithm#Stability for details.
 * @api
 */
export function stableSort<T = any>(
    arr: T[],
    compareFnc: Comparator<T>
) {
    const length = arr.length;
    const tmp: {
        index: number,
        value: T
    }[] = Array(arr.length) as unknown as { index: number, value: T }[];

    let i;
    for (i = 0; i < length; i++) {
        tmp[i] = { index: i, value: arr[i] };
    }
    tmp.sort(function (a, b) {
        return compareFnc(a.value, b.value) || a.index - b.index;
    });
    for (i = 0; i < arr.length; i++) {
        arr[i] = tmp[i].value;
    }
}


/**
 * Check if an array's elements are sorted.
 *
 * @param arr The array to test.
 * @param func Comparison function. Defaults to a function that uses
 *     the `<` and `>` operators.
 * @param strict Strictly sorted (default false).
 * @return Return index.
 */
export function isSorted<T = any>(
    arr: T[], func?: Comparator, strict: boolean = false
): boolean {
    const compare = func || ascending<T>;
    return arr.every(function (currentVal, index) {
        if (index === 0) {
            return true;
        }
        const res = compare(arr[index - 1], currentVal);
        return !(res > 0 || (strict && res === 0));
    });
}
