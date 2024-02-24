import { assert } from './asserts';
import { getWidth } from './extent';
import { modulo, toFixed } from './math';
import { Projection } from './proj';
import { padNumber } from './string';


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
 *  import {add} from 'ol/coordinate';
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
 * The Circle is part of the higher level @olts/geometry module.
 */
interface Circle {
    getCenter(): Coordinate;
    getRadius(): number;
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


/**
 * Calculates the point closest to the passed coordinate on the passed segment.
 * This is the foot of the perpendicular of the coordinate to the segment when
 * the foot is on the segment, or the closest segment coordinate when the foot
 * is outside the segment.
 *
 * @param coordinate The coordinate.
 * @param segment The two coordinates of the segment.
 * @return The foot of the perpendicular of the coordinate to the segment.
 */
export function closestOnSegment(
    coordinate: Coordinate, segment: Coordinate[]
): Coordinate {
    const x0 = coordinate[0];
    const y0 = coordinate[1];
    const start = segment[0];
    const end = segment[1];
    const x1 = start[0];
    const y1 = start[1];
    const x2 = end[0];
    const y2 = end[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const along =
        dx === 0 && dy === 0
            ? 0
            : (dx * (x0 - x1) + dy * (y0 - y1)) / (dx * dx + dy * dy || 0);
    let x, y;
    if (along <= 0) {
        x = x1;
        y = y1;
    } else if (along >= 1) {
        x = x2;
        y = y2;
    } else {
        x = x1 + along * dx;
        y = y1 + along * dy;
    }
    return [x, y];
}


/**
 * Returns a {@link module:ol/coordinate~CoordinateFormat} function that can be
 * used to format
 * a to a string.
 *
 * Example without specifying the fractional digits:
 *
 *     import {createStringXY} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const stringifyFunc = createStringXY();
 *     const out = stringifyFunc(coord);
 *     // out is now '8, 48'
 *
 * Example with explicitly specifying 2 fractional digits:
 *
 *     import {createStringXY} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const stringifyFunc = createStringXY(2);
 *     const out = stringifyFunc(coord);
 *     // out is now '7.85, 47.98'
 *
 * @param fractionDigits The number of digits to include after the decimal
 *     point. Default is `0`.
 * @return Coordinate format.
 * @api
 */
export function createStringXY(fractionDigits?: number): CoordinateFormat {
    return (
        function (coordinate: Coordinate | undefined): string {
            return toStringXY(coordinate!, fractionDigits);
        }
    );
}


/**
 * @param hemispheres Hemispheres.
 * @param degrees Degrees.
 * @param fractionDigits The number of digits to include after the decimal
 *    point. Default is `0`.
 * @return String.
 */
export function degreesToStringHDMS(
    hemispheres: string, degrees: number, fractionDigits?: number
): string {
    const normalizedDegrees = modulo(degrees + 180, 360) - 180;
    const x = Math.abs(3600 * normalizedDegrees);
    const decimals = fractionDigits || 0;

    let deg = Math.floor(x / 3600);
    let min = Math.floor((x - deg * 3600) / 60);
    let sec = toFixed(x - deg * 3600 - min * 60, decimals);

    if (sec >= 60) {
        sec = 0;
        min += 1;
    }

    if (min >= 60) {
        min = 0;
        deg += 1;
    }

    let hdms = deg + '\u00b0';
    if (min !== 0 || sec !== 0) {
        hdms += ' ' + padNumber(min, 2) + '\u2032';
    }
    if (sec !== 0) {
        hdms += ' ' + padNumber(sec, 2, decimals) + '\u2033';
    }
    if (normalizedDegrees !== 0) {
        hdms += ' ' + hemispheres.charAt(normalizedDegrees < 0 ? 1 : 0);
    }

    return hdms;
}


/**
 * Transforms the given {@link Coordinate} to a string using the given string
 * template.
 *
 * The strings `{x}` and `{y}` in the template will be replaced with the first
 * and second coordinate values respectively.
 *
 * Example without specifying the fractional digits:
 *
 *     import {format} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const template = 'Coordinate is ({x}|{y}).';
 *     const out = format(coord, template);
 *     // out is now 'Coordinate is (8|48).'
 *
 * Example explicitly specifying the fractional digits:
 *
 *     import {format} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const template = 'Coordinate is ({x}|{y}).';
 *     const out = format(coord, template, 2);
 *     // out is now 'Coordinate is (7.85|47.98).'
 *
 * @param coordinate Coordinate.
 * @param template A template string with `{x}` and `{y}` placeholders
 *     that will be replaced by first and second coordinate values.
 * @param fractionDigits The number of digits to include
 *    after the decimal point. Default is `0`.
 * @return Formatted coordinate.
 * @api
 */
export function format(
    coordinate: Coordinate, template: string, fractionDigits?: number
): string {
    if (coordinate) {
        return template
            .replace('{x}', coordinate[0].toFixed(fractionDigits))
            .replace('{y}', coordinate[1].toFixed(fractionDigits));
    }
    return '';
}


/**
 * Check if two coordinates are equal.
 *
 * @param coordinate1 First coordinate.
 * @param coordinate2 Second coordinate.
 * @return The two coordinates are equal.
 */
export function equals(
    coordinate1: Coordinate, coordinate2: Coordinate
): boolean {
    let equals = true;
    for (let i = coordinate1.length - 1; i >= 0; --i) {
        if (coordinate1[i] != coordinate2[i]) {
            equals = false;
            break;
        }
    }
    return equals;
}


/**
 * Rotate `coordinate` by `angle`.
 *
 * `coordinate` is modified in place and returned by the function.
 *
 * Example:
 *
 *     import {rotate} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const rotateRadians = Math.PI / 2; // 90 degrees
 *     rotate(coord, rotateRadians);
 *     // coord is now [-47.983333, 7.85]
 *
 * @param coordinate Coordinate.
 * @param angle Angle in radian.
 * @return Coordinate.
 * @api
 */
export function rotate(coordinate: Coordinate, angle: number): Coordinate {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x = coordinate[0] * cosAngle - coordinate[1] * sinAngle;
    const y = coordinate[1] * cosAngle + coordinate[0] * sinAngle;
    coordinate[0] = x;
    coordinate[1] = y;
    return coordinate;
}


/**
 * Scale `coordinate` by `scale`. `coordinate` is modified in place and
 * returned by the function.
 *
 * Example:
 *
 *     import {scale as scaleCoordinate} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const scale = 1.2;
 *     scaleCoordinate(coord, scale);
 *     // coord is now [9.42, 57.5799996]
 *
 * @param coordinate Coordinate.
 * @param scale Scale factor.
 * @return Coordinate.
 */
export function scale(coordinate: Coordinate, scale: number): Coordinate {
    coordinate[0] *= scale;
    coordinate[1] *= scale;
    return coordinate;
}


/**
 * Compute the squared distance between coordinates.
 *
 * @param coord1 First coordinate.
 * @param coord2 Second coordinate.
 * @return Squared distance between coord1 and coord2.
 */
export function squaredDistance(
    coord1: Coordinate, coord2: Coordinate
): number {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return dx * dx + dy * dy;
}


/**
 * Compute the distance between coordinates.
 *
 * @param coord1 First coordinate.
 * @param coord2 Second coordinate.
 * @return Distance between coord1 and coord2.
 */
export function distance(
    coord1: Coordinate, coord2: Coordinate
): number {
    return Math.sqrt(squaredDistance(coord1, coord2));
}


/**
 * Calculate the squared distance from a coordinate to a line segment.
 *
 * @param coordinate Coordinate of the point.
 * @param segment Line segment (2 coordinates).
 * @return Squared distance from the point to the line segment.
 */
export function squaredDistanceToSegment(
    coordinate: Coordinate, segment: Coordinate[]
): number {
    return squaredDistance(coordinate, closestOnSegment(coordinate, segment));
}


/**
 * Format a geographic coordinate with the hemisphere, degrees, minutes, and
 * seconds.
 *
 * Example without specifying fractional digits:
 *
 *     import {toStringHDMS} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const out = toStringHDMS(coord);
 *     // out is now '47° 58′ 60″ N 7° 50′ 60″ E'
 *
 * Example explicitly specifying 1 fractional digit:
 *
 *     import {toStringHDMS} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const out = toStringHDMS(coord, 1);
 *     // out is now '47° 58′ 60.0″ N 7° 50′ 60.0″ E'
 *
 * @param coordinate Coordinate.
 * @param [fractionDigits] The number of digits to include
 *    after the decimal point. Default is `0`.
 * @return Hemisphere, degrees, minutes and seconds.
 * @api
 */
export function toStringHDMS(
    coordinate: Coordinate, fractionDigits: number
): string {
    if (coordinate) {
        return (
            degreesToStringHDMS('NS', coordinate[1], fractionDigits) +
            ' ' +
            degreesToStringHDMS('EW', coordinate[0], fractionDigits)
        );
    }
    return '';
}


/**
 * Format a coordinate as a comma delimited string.
 *
 * Example without specifying fractional digits:
 *
 *     import {toStringXY} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const out = toStringXY(coord);
 *     // out is now '8, 48'
 *
 * Example explicitly specifying 1 fractional digit:
 *
 *     import {toStringXY} from 'ol/coordinate';
 *
 *     const coord = [7.85, 47.983333];
 *     const out = toStringXY(coord, 1);
 *     // out is now '7.8, 48.0'
 *
 * @param coordinate Coordinate.
 * @param fractionDigits The number of digits to include
 *    after the decimal point. Default is `0`.
 * @return XY.
 * @api
 */
export function toStringXY(
    coordinate: Coordinate, fractionDigits?: number
): string {
    return format(coordinate, '{x}, {y}', fractionDigits);
}


/**
 * Modifies the provided coordinate in-place to be within the real world
 * extent. The lower projection extent boundary is inclusive, the upper one
 * exclusive.
 *
 * @param coordinate Coordinate.
 * @param projection Projection.
 * @return The coordinate within the real world extent.
 */
export function wrapX(
    coordinate: Coordinate, projection: Projection
): Coordinate {
    if (projection.canWrapX()) {
        const extent = projection.getExtent();
        assert(extent, "The extent is not defined");
        const worldWidth = getWidth(extent!);
        const worldsAway = getWorldsAway(coordinate, projection, worldWidth);
        if (worldsAway) {
            coordinate[0] -= worldsAway * worldWidth;
        }
    }
    return coordinate;
}


/**
 * @param coordinate Coordinate.
 * @param projection Projection.
 * @param [sourceExtentWidth] Width of the source extent.
 * @return Offset in world widths.
 */
export function getWorldsAway(
    coordinate: Coordinate, projection: Projection, sourceExtentWidth: number
): number {
    const projectionExtent = projection.getExtent();
    assert(projectionExtent, "The extent is not defined");
    let worldsAway = 0;
    if (
        projection.canWrapX() &&
        (
            coordinate[0] < projectionExtent![0] ||
            coordinate[0] > projectionExtent![2]
        )
    ) {
        sourceExtentWidth = sourceExtentWidth || getWidth(projectionExtent!);
        worldsAway = Math.floor(
            (coordinate[0] - projectionExtent![0]) / sourceExtentWidth,
        );
    }
    return worldsAway;
}
