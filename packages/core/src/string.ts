/**
 * Convert a string to a number and prefix the result with zeros if the integer
 * part's width is less than `width`.
 *
 * @param number Number to be formatted.
 * @param width The desired width of the integer part.
 * @param precision Precision of the output string (i.e. number of decimal
 *                  places).
 * @return Formatted string.
 */
export function padNumber(
    number: number, width: number, precision?: number
): string {
    const numberString = precision !== undefined
        ? number.toFixed(precision)
        : '' + number;
    let decimal = numberString.indexOf('.');
    decimal = decimal === -1 ? numberString.length : decimal;
    return decimal > width
        ? numberString
        : new Array(1 + width - decimal).join('0') + numberString;
}


/**
 * Compare two versions represented as either numbers or `a.b.c` strings.
 *
 * Adapted from https://github.com/omichelsen/compare-versions
 *
 * Note that, if a string is used in any of the parameters, the function
 * works correctly only with numeric characters in that string.
 * For example, the following are valid version strings: `1`, `1.2`, `1.2.3`.
 * Comparing `1.a` and `1.1` will return 0 (i.e. equal), which may
 * be unexpected.
 *
 * @param v1 First version.
 * @param v2 Second version.
 * @return 0 if the versions are equal, 1 if v1 is greater, -1 if v2 is greater.
 */
export function compareVersions(v1: string|number, v2: string|number): number {
    const s1 = ('' + v1).split('.');
    const s2 = ('' + v2).split('.');

    for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
        const n1 = parseInt(s1[i] || '0', 10);
        const n2 = parseInt(s2[i] || '0', 10);

        // If a non-number character was encountered parseInt returns NaN.
        // NaN compared to anything returns false, so `1.a` and `1.1` will
        // be treated as equal.
        if (n1 > n2) {
            return 1;
        }
        if (n2 > n1) {
            return -1;
        }
    }

    return 0;
}
