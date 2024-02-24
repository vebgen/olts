/**
 * Collection of affine 2d transformation functions. The functions work on an
 * array of 6 elements.
 */
import { assert } from './asserts';
import { Pixel } from './coordinate';


/**
 * An array representing an affine 2d transformation for use with
 * `transform` functions. The array has 6 elements.
 *
 * The element order is compatible with the [SVGMatrix
 * interface](https://developer.mozilla.org/en-US/docs/Web/API/SVGMatrix) and is
 * a subset (elements a to f) of a 3×3 matrix:
 * ```
 * [ a c e ]
 * [ b d f ]
 * [ 0 0 1 ]
 * ```
 * @api
 */
export type Transform = [number, number, number, number, number, number];


/**
 * Used as an optimization for some of the methods below.
 * @private
 * @type {Transform}
 */
const tmp_: Transform = new Array(6) as Transform;


/**
 * Create an identity transform.
 *
 * @return Identity transform.
 */
export function create(): Transform {
    return [1, 0, 0, 1, 0, 0];
}


/**
 * Resets the given transform to an identity transform.
 *
 * @param transform Transform.
 * @return Transform.
 */
export function reset(transform: Transform): Transform {
    return set(transform, 1, 0, 0, 1, 0, 0);
}


/**
 * Multiply the underlying matrices of two transforms and return the result in
 * the first transform.
 *
 * @param transform1 Transform parameters of matrix 1.
 * @param transform2 Transform parameters of matrix 2.
 * @return transform1 multiplied with transform2.
 */
export function multiply(
    transform1: Transform, transform2: Transform
): Transform {
    const a1 = transform1[0];
    const b1 = transform1[1];
    const c1 = transform1[2];
    const d1 = transform1[3];
    const e1 = transform1[4];
    const f1 = transform1[5];
    const a2 = transform2[0];
    const b2 = transform2[1];
    const c2 = transform2[2];
    const d2 = transform2[3];
    const e2 = transform2[4];
    const f2 = transform2[5];

    transform1[0] = a1 * a2 + c1 * b2;
    transform1[1] = b1 * a2 + d1 * b2;
    transform1[2] = a1 * c2 + c1 * d2;
    transform1[3] = b1 * c2 + d1 * d2;
    transform1[4] = a1 * e2 + c1 * f2 + e1;
    transform1[5] = b1 * e2 + d1 * f2 + f1;

    return transform1;
}


/**
 * Set the transform components a-f on a given transform.
 *
 * @param transform Transform.
 * @param a The a component of the transform.
 * @param b The b component of the transform.
 * @param c The c component of the transform.
 * @param d The d component of the transform.
 * @param e The e component of the transform.
 * @param f The f component of the transform.
 * @return Matrix with transform applied.
 */
export function set(
    transform: Transform,
    a: number, b: number, c: number,
    d: number, e: number, f: number
): Transform {
    transform[0] = a;
    transform[1] = b;
    transform[2] = c;
    transform[3] = d;
    transform[4] = e;
    transform[5] = f;
    return transform;
}


/**
 * Set transform on one matrix from another matrix.
 *
 * @param transform1 Matrix to set transform to.
 * @param transform2 Matrix to set transform from.
 * @return transform1 with transform from transform2 applied.
 */
export function setFromArray(
    transform1: Transform, transform2: Transform
): Transform {
    transform1[0] = transform2[0];
    transform1[1] = transform2[1];
    transform1[2] = transform2[2];
    transform1[3] = transform2[3];
    transform1[4] = transform2[4];
    transform1[5] = transform2[5];
    return transform1;
}


/**
 * Transforms the given coordinate with the given transform returning the
 * resulting, transformed coordinate.
 *
 * The coordinate will be modified in-place.
 *
 * @param transform The transformation.
 * @param coordinate The coordinate to transform.
 * @return return coordinate so that operations can be
 *     chained together.
 */
export function apply(transform: Transform, coordinate: Pixel) {
    const x = coordinate[0];
    const y = coordinate[1];
    coordinate[0] = transform[0] * x + transform[2] * y + transform[4];
    coordinate[1] = transform[1] * x + transform[3] * y + transform[5];
    return coordinate;
}


/**
 * Applies rotation to the given transform.
 *
 * @param transform Transform.
 * @param angle Angle in radians.
 * @return The rotated transform.
 */
export function rotate(transform: Transform, angle: number): Transform {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return multiply(transform, set(tmp_, cos, sin, -sin, cos, 0, 0));
}


/**
 * Applies scale to a given transform.
 *
 * @param transform Transform.
 * @param x Scale factor x.
 * @param y Scale factor y.
 * @return The scaled transform.
 */
export function scale(transform: Transform, x: number, y: number): Transform {
    return multiply(transform, set(tmp_, x, 0, 0, y, 0, 0));
}


/**
 * Creates a scale transform.
 *
 * @param target Transform to overwrite.
 * @param x Scale factor x.
 * @param y Scale factor y.
 * @return The scale transform.
 */
export function makeScale(
    target: Transform, x: number, y: number
): Transform {
    return set(target, x, 0, 0, y, 0, 0);
}


/**
 * Applies translation to the given transform.
 *
 * @param transform Transform.
 * @param dx Translation x.
 * @param dy Translation y.
 * @return The translated transform.
 */
export function translate(
    transform: Transform, dx: number, dy: number
): Transform {
    return multiply(transform, set(tmp_, 1, 0, 0, 1, dx, dy));
}


/**
 * Creates a composite transform given an initial translation, scale, rotation,
 * and final translation (in that order only, not commutative).
 *
 * @param transform The transform (will be modified in place).
 * @param dx1 Initial translation x.
 * @param dy1 Initial translation y.
 * @param sx Scale factor x.
 * @param sy Scale factor y.
 * @param angle Rotation (in counter-clockwise radians).
 * @param dx2 Final translation x.
 * @param dy2 Final translation y.
 * @return The composite transform.
 */
export function compose(
    transform: Transform,
    dx1: number, dy1: number,
    sx: number, sy: number,
    angle: number,
    dx2: number, dy2: number
): Transform {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    transform[0] = sx * cos;
    transform[1] = sy * sin;
    transform[2] = -sx * sin;
    transform[3] = sy * cos;
    transform[4] = dx2 * sx * cos - dy2 * sx * sin + dx1;
    transform[5] = dx2 * sy * sin + dy2 * sy * cos + dy1;
    return transform;
}


/**
 * Creates a composite transform given an initial translation, scale, rotation,
 * and final translation (in that order only, not commutative).
 *
 * The resulting transform string can be applied as `transform` property of an
 * HTMLElement's style.
 *
 * @param dx1 Initial translation x.
 * @param dy1 Initial translation y.
 * @param sx Scale factor x.
 * @param sy Scale factor y.
 * @param angle Rotation (in counter-clockwise radians).
 * @param dx2 Final translation x.
 * @param dy2 Final translation y.
 * @return The composite css transform.
 * @api
 */
export function composeCssTransform(
    dx1: number, dy1: number,
    sx: number, sy: number,
    angle: number,
    dx2: number, dy2: number
): string {
    return toString(compose(create(), dx1, dy1, sx, sy, angle, dx2, dy2));
}


/**
 * Invert the given transform.
 *
 * @param source The source transform to invert.
 * @return The inverted (source) transform.
 */
export function invert(source: Transform): Transform {
    return makeInverse(source, source);
}


/**
 * Invert the given transform.
 *
 * @param target Transform to be set as the inverse of the source transform.
 * @param source The source transform to invert.
 * @return The inverted (target) transform.
 */
export function makeInverse(target: Transform, source: Transform): Transform {
    const det = determinant(source);
    assert(det !== 0, 'Transformation matrix cannot be inverted');

    const a = source[0];
    const b = source[1];
    const c = source[2];
    const d = source[3];
    const e = source[4];
    const f = source[5];

    target[0] = d / det;
    target[1] = -b / det;
    target[2] = -c / det;
    target[3] = a / det;
    target[4] = (c * f - d * e) / det;
    target[5] = -(a * f - b * e) / det;

    return target;
}


/**
 * Returns the determinant of the given matrix.
 *
 * @param mat Matrix.
 * @return Determinant.
 */
export function determinant(mat: Transform): number {
    return mat[0] * mat[3] - mat[1] * mat[2];
}


/**
 * @type {Array}
 */
const matrixPrecision: number[] = [1e6, 1e6, 1e6, 1e6, 2, 2] as const;


/**
 * A rounded string version of the transform that can be used for CSS
 * transforms.
 *
 * @param mat Matrix.
 * @return The transform as a string.
 */
export function toString(mat: Transform): string {
    const transformString =
        'matrix(' + mat.map(
            (value, i) => (
                Math.round(value * matrixPrecision[i]) /
                matrixPrecision[i]
            )
        ).join(', ') + ')';
    return transformString;
}
