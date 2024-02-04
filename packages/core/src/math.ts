/**
 * Takes a number and clamps it to within the provided bounds.
 *
 * @param value The input number.
 * @param min The minimum value to return.
 * @param max The maximum value to return.
 * @return The input number if it is within bounds, or the nearest
 *     number within the bounds.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}


/**
 * Returns the square of the closest distance between the point (x, y) and the
 * line segment (x1, y1) to (x2, y2).
 *
 * @param x X of the point.
 * @param y Y of the point.
 * @param x1 X1 of the line segment.
 * @param y1 Y1 of the line segment.
 * @param x2 X2 of the line segment.
 * @param y2 Y2 of the line segment.
 * @return Squared distance.
 */
export function squaredSegmentDistance(
    x: number, y: number,
    x1: number, y1: number,
    x2: number, y2: number
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx !== 0 || dy !== 0) {
        const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x1 = x2;
            y1 = y2;
        } else if (t > 0) {
            x1 += dx * t;
            y1 += dy * t;
        }
    }
    return squaredDistance(x, y, x1, y1);
}


/**
 * Returns the square of the distance between the points (x1, y1) and (x2, y2).
 *
 * @param x1 X1 of the first point.
 * @param y1 Y1 of the first point.
 * @param x2 X2 of the second point.
 * @param y2 Y2 of the second point.
 * @return Squared distance.
 */
export function squaredDistance(
    x1: number, y1: number,
    x2: number, y2: number
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}


/**
 * Solves system of linear equations using Gaussian elimination method.
 *
 * @param mat Augmented matrix (n x n + 1 column) in row-major order.
 * @return The resulting vector.
 * @see https://en.wikipedia.org/wiki/Gaussian_elimination
 */
export function solveLinearSystem(mat: number[][]): number[] | null {
    const n = mat.length;

    for (let i = 0; i < n; i++) {
        // Find max in the i-th column (ignoring i - 1 first rows)
        let maxRow = i;
        let maxEl = Math.abs(mat[i][i]);
        for (let r = i + 1; r < n; r++) {
            const absValue = Math.abs(mat[r][i]);
            if (absValue > maxEl) {
                maxEl = absValue;
                maxRow = r;
            }
        }

        if (maxEl === 0) {
            return null; // matrix is singular
        }

        // Swap max row with i-th (current) row
        const tmp = mat[maxRow];
        mat[maxRow] = mat[i];
        mat[i] = tmp;

        // Subtract the i-th row to make all the remaining rows 0 in
        // the i-th column
        for (let j = i + 1; j < n; j++) {
            const coef = -mat[j][i] / mat[i][i];
            for (let k = i; k < n + 1; k++) {
                if (i == k) {
                    mat[j][k] = 0;
                } else {
                    mat[j][k] += coef * mat[i][k];
                }
            }
        }
    }

    // Solve Ax=b for upper triangular matrix A (mat)
    const x = new Array(n);
    for (let l = n - 1; l >= 0; l--) {
        x[l] = mat[l][n] / mat[l][l];
        for (let m = l - 1; m >= 0; m--) {
            mat[m][n] -= mat[m][l] * x[l];
        }
    }
    return x;
}


/**
 * Converts radians to to degrees.
 *
 * @param angleInRadians Angle in radians.
 * @return Angle in degrees.
 */
export function toDegrees(angleInRadians: number): number {
    return (angleInRadians * 180) / Math.PI;
}


/**
 * Converts degrees to radians.
 *
 * @param angleInDegrees Angle in degrees.
 * @return Angle in radians.
 */
export function toRadians(angleInDegrees: number): number {
    return (angleInDegrees * Math.PI) / 180;
}


/**
 * Returns the modulo of a / b, depending on the sign of b.
 *
 * @param a Dividend.
 * @param b Divisor.
 * @return Modulo.
 */
export function modulo(a: number, b: number): number {
    const r = a % b;
    return r * b < 0 ? r + b : r;
}


/**
 * Calculates the linearly interpolated value of x between a and b.
 *
 * @param a Value if x = 0 (start of the interval).
 * @param b Value if x = 1 (end of the interval).
 * @param x Value to be interpolated.
 * @return Interpolated value.
 */
export function lerp(a: number, b: number, x: number): number {
    return a + x * (b - a);
}


/**
 * Returns a number with a limited number of decimal digits.
 *
 * @param n The input number.
 * @param decimals The maximum number of decimal digits.
 * @return The input number with a limited number of decimal digits.
 */
export function toFixed(n: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
}


/**
 * Rounds a number to the nearest integer value considering only the given
 * number of decimal digits (with rounding on the final digit).
 *
 * @param n The input number.
 * @param decimals The maximum number of decimal digits.
 * @return The nearest integer.
 */
export function round(n: number, decimals: number): number {
    return Math.round(toFixed(n, decimals));
}


/**
 * Rounds a number to the next smaller integer considering only the given number
 * of decimal digits (with rounding on the final digit).
 *
 * @param n The input number.
 * @param decimals The maximum number of decimal digits.
 * @return The next smaller integer.
 */
export function floor(n: number, decimals: number): number {
    return Math.floor(toFixed(n, decimals));
}


/**
 * Rounds a number to the next bigger integer considering only the given number
 * of decimal digits (with rounding on the final digit).
 *
 * @param n The input number.
 * @param decimals The maximum number of decimal digits.
 * @return The next bigger integer.
 */
export function ceil(n: number, decimals: number): number {
    return Math.ceil(toFixed(n, decimals));
}
