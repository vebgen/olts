/**
 * Throws an error if the assertion is falsy.
 *
 * @param assertion Assertion we expected to be truthy.
 * @param errorMessage Error message.
 */
export function assert(assertion: any, errorMessage: string | undefined) {
    if (!assertion) {
        throw new Error(errorMessage || 'Assertion failed');
    }
}
