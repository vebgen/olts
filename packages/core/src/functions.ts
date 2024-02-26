import { equals as arrayEquals } from '@olts/core/array';


/**
 * Always returns true.
 *
 * @return true.
 */
export function TRUE(): boolean {
    return true;
}


/**
 * Always returns false.
 *
 * @return false.
 */
export function FALSE(): boolean {
    return false;
}


/**
 * A function that returns nothing, used e.g. as a default for callbacks.
 *
 * @return Nothing.
 */
export function VOID(): void { }


/**
 * Wrap a function in another function that remembers the last return.
 *
 * If the returned function is called twice in a row with the same arguments and
 * the same this object, it will return the value from the first call in the
 * second call.
 *
 * @param fn The function to memoize.
 * @return The memoized function.
 */
export function memoizeOne<ReturnType>(
    fn: ((...args: any[]) => ReturnType)
): ((...args: any[]) => ReturnType) {

    let called = false;
    let lastResult: ReturnType;
    let lastArgs: any[];
    let lastThis: any;

    return function (this: any) {
        const nextArgs = Array.prototype.slice.call(arguments);
        if (!called || this !== lastThis || !arrayEquals(nextArgs, lastArgs)) {
            called = true;
            lastThis = this;
            lastArgs = nextArgs;
            lastResult = fn.apply(this, arguments as any);
        }
        return lastResult;
    };
}


/**
 * Wrap the function so that it returns a promise that resolves to the value
 * that the function returns.
 *
 * @param getter A function that returns a value or a promise for a value.
 * @return A promise for the value.
 */
export function toPromise<T>(
    getter: () => (T | Promise<T>)
): Promise<T> {
    function promiseGetter() {
        let value;
        try {
            value = getter();
        } catch (err) {
            return Promise.reject(err);
        }
        if (value instanceof Promise) {
            return value;
        }
        return Promise.resolve(value);
    }
    return promiseGetter();
}
