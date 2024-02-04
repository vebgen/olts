
/**
 * An array with two elements, representing a pixel. The first element is the
 * x-coordinate, the second the y-coordinate of the pixel.
 *
 * @example `[16, 48]`.
 * @api
 */
export type Pixel = [number, number];


/**
 * An array of numbers representing an `xy`, `xyz` or `xyzm` coordinate.
 *
 * @example `[16, 48]`, `[16, 48, 12]`, `[16, 48, 17, 18]`.
 * @api
 */
export type Coordinate = number[];


/**
 * A function that takes a {@link Coordinate} and transforms it into
 * a `{string}`.
 *
 * @param coord The coordinate to format.
 * @returns Formatted string.
 * @api
 */
export type CoordinateFormat = (coord: Coordinate | undefined) => string;


/**
 * Add `delta` to `coordinate`.
 *
 * `coordinate` is modified in place and returned by the function.
 *
 * @param coordinate The coordinate to modify.
 * @param delta The delta to add.
 * @returns The input coordinate adjusted by the given delta.
 * @example
 * ```ts
 *  import {add} from 'ol/coordinate.js';
 *
 *  const coord = [7.85, 47.983333];
 *  add(coord, [-2, 4]);
 *  // coord is now [5.85, 51.983333]
 * ```
 * @api
 */
export function add(coordinate: Coordinate, delta: Coordinate): Coordinate {
    coordinate[0] += +delta[0];
    coordinate[1] += +delta[1];
    return coordinate;
}


/**
 * Calculates the point closest to the passed coordinate on the passed circle.
 *
 * @param coordinate The coordinate.
 * @param circle The circle.
 * @return Closest point on the circumference.
 */
export function closestOnCircle(
    coordinate: Coordinate, circle: Circle
): Coordinate {
    const r = circle.getRadius();
    const center = circle.getCenter();
    const x0 = center[0];
    const y0 = center[1];
    const x1 = coordinate[0];
    const y1 = coordinate[1];

    let dx = x1 - x0;
    const dy = y1 - y0;
    if (dx === 0 && dy === 0) {
        dx = 1;
    }
    const d = Math.sqrt(dx * dx + dy * dy);

    const x = x0 + (r * dx) / d;
    const y = y0 + (r * dy) / d;

    return [x, y];
}
