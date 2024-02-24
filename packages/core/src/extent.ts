import { assert } from "./asserts";
import { Coordinate } from "./coordinate";
import Projection from "./proj/projection";
import { TransformFunction } from "./proj/support";
import { Size } from "./size";


/**
 * Relationship to an extent.
 */
export const Relationship = {
    UNKNOWN: 0,
    INTERSECTING: 1,
    ABOVE: 2,
    RIGHT: 4,
    BELOW: 8,
    LEFT: 16,
} as const;


/**
 * A number that has the Relationship bits set to 1 if the corresponding
 * relationship exists.
 *
 * @see coordinateRelationship
 */
export type Relationships = number;


/**
 * An array of numbers representing an extent: `[minx, miny, maxx, maxy]`.
 *
 * This is a rectangle with segments aligned with the coordinate axes.
 *
 * @api
 */
export type Extent = [number, number, number, number];


/**
 * Extent corner.
 */
export type Corner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';


/**
 * Build an extent that includes all given coordinates.
 *
 * @param coordinates The array of coordinates.
 * @return Bounding extent.
 * @api
 */
export function boundingExtent(coordinates: Coordinate[]): Extent {
    const extent = createEmpty();
    for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        extendCoordinate(extent, coordinates[i]);
    }
    return extent;
}


/**
 * Computes both minimum and maximum X and Y values.
 *
 * @param xs The array of the X component of the coordinates.
 * @param ys The array of the Y component of the coordinates.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The updated or newly created extent.
 * @private
 */
function _boundingExtentXYs(
    xs: number[], ys: number[], dest?: Extent
): Extent {
    const minX = Math.min.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxX = Math.max.apply(null, xs);
    const maxY = Math.max.apply(null, ys);
    return createOrUpdate(minX, minY, maxX, maxY, dest);
}


/**
 * Return extent increased by the provided value.
 *
 * @param extent The extent to increase.
 * @param value The amount by which the extent should be buffered.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The updated or newly created extent.
 * @api
 */
export function buffer(extent: Extent, value: number, dest?: Extent): Extent {
    if (dest) {
        dest[0] = extent[0] - value;
        dest[1] = extent[1] - value;
        dest[2] = extent[2] + value;
        dest[3] = extent[3] + value;
        return dest;
    }
    return [
        extent[0] - value,
        extent[1] - value,
        extent[2] + value,
        extent[3] + value,
    ];
}


/**
 * Creates a clone of an extent.
 *
 * @param extent Extent to clone.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The updated or newly created extent.
 */
export function clone(extent: Extent, dest?: Extent): Extent {
    if (dest) {
        dest[0] = extent[0];
        dest[1] = extent[1];
        dest[2] = extent[2];
        dest[3] = extent[3];
        return dest;
    }
    return extent.slice() as Extent;
}


/**
 * The squared distance to the closes point on the extent or 0 if the point is
 * inside the extent.
 *
 * @param extent Extent.
 * @param x The X coordinate of the point.
 * @param y The Y coordinate of the point.
 * @return Closest squared distance.
 */
export function closestSquaredDistanceXY(
    extent: Extent, x: number, y: number
): number {
    let dx: number, dy: number;
    if (x < extent[0]) {
        dx = extent[0] - x;
    } else if (extent[2] < x) {
        dx = x - extent[2];
    } else {
        dx = 0;
    }
    if (y < extent[1]) {
        dy = extent[1] - y;
    } else if (extent[3] < y) {
        dy = y - extent[3];
    } else {
        dy = 0;
    }
    return dx * dx + dy * dy;
}


/**
 * Check if the passed coordinate is contained or on the edge of the extent.
 *
 * @param extent Extent.
 * @param coordinate Coordinate.
 * @return The coordinate is contained in the extent.
 * @api
 */
export function containsCoordinate(
    extent: Extent,
    coordinate: Coordinate
): boolean {
    return containsXY(extent, coordinate[0], coordinate[1]);
}


/**
 * Check if one extent contains another.
 *
 * An extent is deemed contained if it lies completely within the other extent,
 * including if they share one or more edges.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent 2.
 * @return The second extent is contained by or on the edge of the first.
 * @api
 */
export function containsExtent(extent1: Extent, extent2: Extent): boolean {
    return (
        extent1[0] <= extent2[0] &&
        extent2[2] <= extent1[2] &&
        extent1[1] <= extent2[1] &&
        extent2[3] <= extent1[3]
    );
}


/**
 * Check if the passed coordinate is contained or on the edge of the extent.
 *
 * @param extent Extent.
 * @param x X coordinate.
 * @param y Y coordinate.
 * @return The x, y values are contained in the extent.
 * @api
 */
export function containsXY(extent: Extent, x: number, y: number): boolean {
    return extent[0] <= x && x <= extent[2] && extent[1] <= y && y <= extent[3];
}


/**
 * Get the relationship between a coordinate and extent.
 *
 * @param extent The extent.
 * @param coordinate The coordinate.
 * @return The relationships (bitwise compare with Relationship).
 */
export function coordinateRelationship(
    extent: Extent, coordinate: Coordinate
): Relationships {
    const minX = extent[0];
    const minY = extent[1];
    const maxX = extent[2];
    const maxY = extent[3];
    const x = coordinate[0];
    const y = coordinate[1];
    let relationships: Relationships = Relationship.UNKNOWN;
    if (x < minX) {
        relationships = relationships | Relationship.LEFT;
    } else if (x > maxX) {
        relationships = relationships | Relationship.RIGHT;
    }
    if (y < minY) {
        relationships = relationships | Relationship.BELOW;
    } else if (y > maxY) {
        relationships = relationships | Relationship.ABOVE;
    }
    if (relationships === Relationship.UNKNOWN) {
        relationships = Relationship.INTERSECTING;
    }
    return relationships;
}


/**
 * Create an empty extent.
 * @return Empty extent.
 * @api
 */
export function createEmpty(): Extent {
    return [Infinity, Infinity, -Infinity, -Infinity];
}


/**
 * Create a new extent or update the provided extent.
 *
 * @param minX Minimum X.
 * @param minY Minimum Y.
 * @param maxX Maximum X.
 * @param maxY Maximum Y.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The updated or newly created extent.
 */
export function createOrUpdate(
    minX: number, minY: number,
    maxX: number, maxY: number,
    dest?: Extent
): Extent {
    if (dest) {
        dest[0] = minX;
        dest[1] = minY;
        dest[2] = maxX;
        dest[3] = maxY;
        return dest;
    }
    return [minX, minY, maxX, maxY];
}


/**
 * Create a new empty extent or make the provided one empty.
 *
 * The empty extent has all values set to `Infinity`.
 *
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The new empty extent.
 */
export function createOrUpdateEmpty(dest?: Extent): Extent {
    return createOrUpdate(Infinity, Infinity, -Infinity, -Infinity, dest);
}


/**
 * Create a new extent or update the provided extent from a point.
 *
 * @param coordinate The point to build the extent from.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The extent with left==right and top==bottom.
 */
export function createOrUpdateFromCoordinate(
    coordinate: Coordinate, dest?: Extent
): Extent {
    const x = coordinate[0];
    const y = coordinate[1];
    return createOrUpdate(x, y, x, y, dest);
}


/**
 * Create a new extent or update the provided extent so that it includes the
 * given coordinates.
 *
 * @param coordinates Coordinates.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The extent.
 */
export function createOrUpdateFromCoordinates(
    coordinates: Coordinate[], dest?: Extent
): Extent {
    const extent = createOrUpdateEmpty(dest);
    return extendCoordinates(extent, coordinates);
}


/**
 * Create a new extent or update the provided extent so that it includes the
 * given coordinates.
 *
 * @param flatCoordinates Flat coordinates as an array of
 *     `[x1, y1, x2, y2, ...]`.
 * @param offset The position of the first coordinate in the
 *     `flatCoordinates` array.
 * @param end The position of the first coordinate in the
 *     `flatCoordinates` array that will not be used.
 * @param stride How many positions to advance to get to the next coordinate.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The extent.
 */
export function createOrUpdateFromFlatCoordinates(
    flatCoordinates: Array<number>,
    offset: number,
    end: number,
    stride: number,
    dest?: Extent,
): Extent {
    const extent = createOrUpdateEmpty(dest);
    return extendFlatCoordinates(extent, flatCoordinates, offset, end, stride);
}


/**
 * Create a new extent or update the provided extent so that it includes all
 * the rings of a polygon.
 *
 * @param rings The list of rings.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The extent.
 */
export function createOrUpdateFromRings(
    rings: Coordinate[][], dest?: Extent
): Extent {
    const extent = createOrUpdateEmpty(dest);
    return extendRings(extent, rings);
}


/**
 * Determine if two extents are equivalent.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent 2.
 * @return Wether the two extents are equivalent.
 * @api
 */
export function equals(extent1: Extent, extent2: Extent): boolean {
    return (
        extent1[0] == extent2[0] &&
        extent1[2] == extent2[2] &&
        extent1[1] == extent2[1] &&
        extent1[3] == extent2[3]
    );
}


/**
 * Determine if two extents are approximately equivalent.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent 2.
 * @param tolerance Tolerance in extent coordinate units.
 * @return The two extents differ by less than the tolerance.
 */
export function approximatelyEquals(
    extent1: Extent, extent2: Extent, tolerance: number
): boolean {
    return (
        Math.abs(extent1[0] - extent2[0]) < tolerance &&
        Math.abs(extent1[2] - extent2[2]) < tolerance &&
        Math.abs(extent1[1] - extent2[1]) < tolerance &&
        Math.abs(extent1[3] - extent2[3]) < tolerance
    );
}


/**
 * Modify an extent to include another extent.
 *
 * @param extent1 The extent to be modified.
 * @param extent2 The extent that will be included in the first.
 * @return A reference to the first (extended) extent.
 * @api
 */
export function extend(extent1: Extent, extent2: Extent): Extent {
    if (extent2[0] < extent1[0]) {
        extent1[0] = extent2[0];
    }
    if (extent2[2] > extent1[2]) {
        extent1[2] = extent2[2];
    }
    if (extent2[1] < extent1[1]) {
        extent1[1] = extent2[1];
    }
    if (extent2[3] > extent1[3]) {
        extent1[3] = extent2[3];
    }
    return extent1;
}


/**
 * Modify an extent to include a coordinate.
 *
 * @param extent Extent.
 * @param coordinate Coordinate.
 */
export function extendCoordinate(extent: Extent, coordinate: Coordinate) {
    if (coordinate[0] < extent[0]) {
        extent[0] = coordinate[0];
    }
    if (coordinate[0] > extent[2]) {
        extent[2] = coordinate[0];
    }
    if (coordinate[1] < extent[1]) {
        extent[1] = coordinate[1];
    }
    if (coordinate[1] > extent[3]) {
        extent[3] = coordinate[1];
    }
}


/**
 * Modify an extent to include a collection of coordinates.
 *
 * @param extent Extent.
 * @param coordinates Coordinates.
 * @return The same extent, modified to include the passed coordinates.
 */
export function extendCoordinates(
    extent: Extent, coordinates: Coordinate[]
): Extent {
    for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        extendCoordinate(extent, coordinates[i]);
    }
    return extent;
}


/**
 * Modify an extent to include points from a flat array.
 *
 * @param flatCoordinates Flat coordinates as an array of
 *     `[x1, y1, x2, y2, ...]`.
 * @param offset The position of the first coordinate in the
 *     `flatCoordinates` array.
 * @param end The position of the first coordinate in the
 *     `flatCoordinates` array that will not be used.
 * @param stride How many positions to advance to get to the next coordinate.
 * @return The same extent, modified to include the passed coordinates.
 */
export function extendFlatCoordinates(
    extent: Extent,
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
): Extent {
    for (; offset < end; offset += stride) {
        extendXY(extent, flatCoordinates[offset], flatCoordinates[offset + 1]);
    }
    return extent;
}


/**
 * Modify an extent to include a polygon.
 *
 * @param extent Extent.
 * @param rings Rings.
 * @return The same extent, modified to include the passed coordinates.
 */
export function extendRings(extent: Extent, rings: Coordinate[][]): Extent {
    for (let i = 0, ii = rings.length; i < ii; ++i) {
        extendCoordinates(extent, rings[i]);
    }
    return extent;
}


/**
 * Modify an extent to include a single point.
 *
 * @param extent Extent.
 * @param x The X coordinate of the point.
 * @param y The Y coordinate of the point.
 * @return The same extent, modified to include the passed coordinates.
 */
export function extendXY(extent: Extent, x: number, y: number) {
    extent[0] = Math.min(extent[0], x);
    extent[1] = Math.min(extent[1], y);
    extent[2] = Math.max(extent[2], x);
    extent[3] = Math.max(extent[3], y);
    return extent;
}


/**
 * Iterate over an extent's corners.
 *
 * This function calls `callback` for each corner of the extent. If the
 * callback returns a truthy value the function returns that value
 * immediately. Otherwise the function returns `false`.
 *
 * @param extent Extent.
 * @param callback Callback.
 * @return The truthy value returned by the callback or `false`.
 */
export function forEachCorner<S>(
    extent: Extent, callback: (coord: Coordinate) => S
): S | boolean {
    let val;
    val = callback(getBottomLeft(extent));
    if (val) {
        return val;
    }
    val = callback(getBottomRight(extent));
    if (val) {
        return val;
    }
    val = callback(getTopRight(extent));
    if (val) {
        return val;
    }
    val = callback(getTopLeft(extent));
    if (val) {
        return val;
    }
    return false;
}


/**
 * Get the size of an extent.
 *
 * @param extent The extent to get the size of.
 * @return The area of the extent.
 * @api
 */
export function getArea(extent: Extent): number {
    let area = 0;
    if (!isEmpty(extent)) {
        area = getWidth(extent) * getHeight(extent);
    }
    return area;
}


/**
 * Get the bottom left coordinate of an extent.
 *
 * @param extent The extent to get the bottom left coordinate of.
 * @return Bottom left coordinate.
 * @api
 */
export function getBottomLeft(extent: Extent): Coordinate {
    return [extent[0], extent[1]];
}


/**
 * Get the bottom right coordinate of an extent.
 *
 * @param extent The extent to get the bottom right coordinate of.
 * @return Bottom right coordinate.
 * @api
 */
export function getBottomRight(extent: Extent): Coordinate {
    return [extent[2], extent[1]];
}


/**
 * Get the center coordinate of an extent.
 *
 * @param extent The extent to get the center of.
 * @return The center of the extent.
 * @api
 */
export function getCenter(extent: Extent): Coordinate {
    return [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
}


/**
 * Get a corner coordinate of an extent.
 *
 * @param extent The extent to get the corner of.
 * @param corner The corner to get.
 * @return Corner coordinate.
 */
export function getCorner(extent: Extent, corner: Corner): Coordinate {
    let coordinate;
    if (corner === 'bottom-left') {
        coordinate = getBottomLeft(extent);
    } else if (corner === 'bottom-right') {
        coordinate = getBottomRight(extent);
    } else if (corner === 'top-left') {
        coordinate = getTopLeft(extent);
    } else if (corner === 'top-right') {
        coordinate = getTopRight(extent);
    } else {
        throw new Error('Invalid corner');
    }
    return coordinate;
}


/**
 * Compute the area of the extent that includes both extents.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent 2.
 * @return Enlarged area.
 */
export function getEnlargedArea(extent1: Extent, extent2: Extent): number {
    const minX = Math.min(extent1[0], extent2[0]);
    const minY = Math.min(extent1[1], extent2[1]);
    const maxX = Math.max(extent1[2], extent2[2]);
    const maxY = Math.max(extent1[3], extent2[3]);
    return (maxX - minX) * (maxY - minY);
}


/**
 * Get the extent of a rotated rectangle around a given coordinate.
 *
 * @param center Center.
 * @param resolution The scale factor.
 * @param rotation Rotation in radians.
 * @param size The width and height of the rectangle.
 * @param dest Destination extent. The result is deposited here if provided.
 * @return The result.
 */
export function getForViewAndSize(
    center: Coordinate, resolution: number, rotation: number,
    size: Size, dest?: Extent
): Extent {
    const [
        x0, y0, x1, y1, x2, y2, x3, y3
    ] = getRotatedViewport(
        center,
        resolution,
        rotation,
        size,
    );
    return createOrUpdate(
        Math.min(x0, x1, x2, x3),
        Math.min(y0, y1, y2, y3),
        Math.max(x0, x1, x2, x3),
        Math.max(y0, y1, y2, y3),
        dest,
    );
}


/**
 * Get a polygon representing a rotated rectangle centered on a
 * given coordinate.
 *
 * @param center The point around which to rotate.
 * @param resolution The scale factor.
 * @param rotation The angle in radians.
 * @param size The width and height of the rectangle.
 * @return Linear ring representing the viewport.
 */
export function getRotatedViewport(
    center: Coordinate, resolution: number, rotation: number, size: Size
): number[] {
    const dx = (resolution * size[0]) / 2;
    const dy = (resolution * size[1]) / 2;
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);
    const xCos = dx * cosRotation;
    const xSin = dx * sinRotation;
    const yCos = dy * cosRotation;
    const ySin = dy * sinRotation;
    const x = center[0];
    const y = center[1];
    return [
        x - xCos + ySin, y - xSin - yCos,
        x - xCos - ySin, y - xSin + yCos,
        x + xCos - ySin, y + xSin + yCos,
        x + xCos + ySin, y + xSin - yCos,
        // repeat the first point to close the polygon
        x - xCos + ySin, y - xSin - yCos,
    ];
}


/**
 * Get the height of an extent.
 *
 * @param extent Extent.
 * @return Height.
 * @api
 */
export function getHeight(extent: Extent): number {
    return extent[3] - extent[1];
}


/**
 * Compute the area of the intersection of two extents.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent 2.
 * @return Intersection area.
 */
export function getIntersectionArea(extent1: Extent, extent2: Extent): number {
    const intersection = getIntersection(extent1, extent2);
    return getArea(intersection);
}


/**
 * Get the intersection of two extents.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent 2.
 * @param dest Optional extent to populate with intersection.
 * @return Intersecting extent.
 * @api
 */
export function getIntersection(
    extent1: Extent, extent2: Extent, dest?: Extent
): Extent {
    const intersection = dest ? dest : createEmpty();
    if (intersects(extent1, extent2)) {
        if (extent1[0] > extent2[0]) {
            intersection[0] = extent1[0];
        } else {
            intersection[0] = extent2[0];
        }
        if (extent1[1] > extent2[1]) {
            intersection[1] = extent1[1];
        } else {
            intersection[1] = extent2[1];
        }
        if (extent1[2] < extent2[2]) {
            intersection[2] = extent1[2];
        } else {
            intersection[2] = extent2[2];
        }
        if (extent1[3] < extent2[3]) {
            intersection[3] = extent1[3];
        } else {
            intersection[3] = extent2[3];
        }
    } else {
        createOrUpdateEmpty(intersection);
    }
    return intersection;
}


/**
 * Get the length of the width and height of an extent.
 *
 * @param extent Extent.
 * @return Margin.
 */
export function getMargin(extent: Extent): number {
    return getWidth(extent) + getHeight(extent);
}


/**
 * Get the size (width, height) of an extent.
 *
 * @param extent The extent.
 * @return The extent size.
 * @api
 */
export function getSize(extent: Extent): Size {
    return [extent[2] - extent[0], extent[3] - extent[1]];
}


/**
 * Get the top left coordinate of an extent.
 *
 * @param extent Extent.
 * @return Top left coordinate.
 * @api
 */
export function getTopLeft(extent: Extent): Coordinate {
    return [extent[0], extent[3]];
}


/**
 * Get the top right coordinate of an extent.
 *
 * @param extent Extent.
 * @return Top right coordinate.
 * @api
 */
export function getTopRight(extent: Extent): Coordinate {
    return [extent[2], extent[3]];
}


/**
 * Get the width of an extent.
 *
 * @param extent Extent.
 * @return Width.
 * @api
 */
export function getWidth(extent: Extent): number {
    return extent[2] - extent[0];
}


/**
 * Determine if one extent intersects another.
 *
 * @param extent1 Extent 1.
 * @param extent2 Extent.
 * @return The two extents intersect.
 * @api
 */
export function intersects(extent1: Extent, extent2: Extent): boolean {
    return (
        extent1[0] <= extent2[2] &&
        extent1[2] >= extent2[0] &&
        extent1[1] <= extent2[3] &&
        extent1[3] >= extent2[1]
    );
}


/**
 * Determine if an extent has any width and height.
 *
 * @param extent The extent to test.
 * @return `true` if the extent is empty, `false` otherwise.
 * @api
 */
export function isEmpty(extent: Extent): boolean {
    return extent[2] < extent[0] || extent[3] < extent[1];
}


/**
 * Updates `dest` if if provided, otherwise returns the original extent.
 *
 * @param extent Extent.
 * @param dest Extent.
 * @return Extent.
 */
export function returnOrUpdate(extent: Extent, dest?: Extent): Extent {
    if (dest) {
        dest[0] = extent[0];
        dest[1] = extent[1];
        dest[2] = extent[2];
        dest[3] = extent[3];
        return dest;
    }
    return extent;
}


/**
 * Scale an extent by a given factor and deposit the result back into the same
 * extent.
 *
 * @param extent Extent.
 * @param value The scale (above 1 for scale up, below 1 for scale down).
 */
export function scaleFromCenter(extent: Extent, value: number) {
    const deltaX = ((extent[2] - extent[0]) / 2) * (value - 1);
    const deltaY = ((extent[3] - extent[1]) / 2) * (value - 1);
    extent[0] -= deltaX;
    extent[2] += deltaX;
    extent[1] -= deltaY;
    extent[3] += deltaY;
}


/**
 * Determine if the segment between two coordinates intersects (crosses,
 * touches, or is contained by) the provided extent.
 *
 * @param extent The extent.
 * @param start Segment start coordinate.
 * @param end Segment end coordinate.
 * @return The segment intersects the extent.
 */
export function intersectsSegment(
    extent: Extent, start: Coordinate, end: Coordinate
): boolean {
    let intersects = false;
    const startRel = coordinateRelationship(extent, start);
    const endRel = coordinateRelationship(extent, end);
    if (
        startRel === Relationship.INTERSECTING ||
        endRel === Relationship.INTERSECTING
    ) {
        intersects = true;
    } else {
        const minX = extent[0];
        const minY = extent[1];
        const maxX = extent[2];
        const maxY = extent[3];
        const startX = start[0];
        const startY = start[1];
        const endX = end[0];
        const endY = end[1];
        const slope = (endY - startY) / (endX - startX);
        let x, y;
        if (
            !!(endRel & Relationship.ABOVE) &&
            !(startRel & Relationship.ABOVE)
        ) {
            // potentially intersects top
            x = endX - (endY - maxY) / slope;
            intersects = x >= minX && x <= maxX;
        }
        if (
            !intersects &&
            !!(endRel & Relationship.RIGHT) &&
            !(startRel & Relationship.RIGHT)
        ) {
            // potentially intersects right
            y = endY - (endX - maxX) * slope;
            intersects = y >= minY && y <= maxY;
        }
        if (
            !intersects &&
            !!(endRel & Relationship.BELOW) &&
            !(startRel & Relationship.BELOW)
        ) {
            // potentially intersects bottom
            x = endX - (endY - minY) / slope;
            intersects = x >= minX && x <= maxX;
        }
        if (
            !intersects &&
            !!(endRel & Relationship.LEFT) &&
            !(startRel & Relationship.LEFT)
        ) {
            // potentially intersects left
            y = endY - (endX - minX) * slope;
            intersects = y >= minY && y <= maxY;
        }
    }
    return intersects;
}


/**
 * Apply a transform function to the extent.
 *
 * The function can convert only the corners or it can compute a number of
 * `stops` intermediate points. The function then computes the extent
 * of this new set of points.
 *
 * @param extent The extent to transform.
 * @param transformFn Transform function. Called with`[minX, minY, maxX, maxY]`
 *     extent coordinates.
 * @param dest Destination extent.
 * @param stops Number of stops per side used for the transform. By default
 *     only the corners are used.
 * @return The extent in the new coordinate space.
 * @api
 */
export function applyTransform(
    extent: Extent,
    transformFn: TransformFunction,
    dest?: Extent,
    stops: number = 1
): Extent {
    if (isEmpty(extent)) {
        return createOrUpdateEmpty(dest);
    }
    let coordinates = [];
    if (stops > 1) {
        const width = extent[2] - extent[0];
        const height = extent[3] - extent[1];
        for (let i = 0; i < stops; ++i) {
            coordinates.push(
                extent[0] + (width * i) / stops,
                extent[1],
                extent[2],
                extent[1] + (height * i) / stops,
                extent[2] - (width * i) / stops,
                extent[3],
                extent[0],
                extent[3] - (height * i) / stops,
            );
        }
    } else {
        coordinates = [
            extent[0], extent[1],
            extent[2], extent[1],
            extent[2], extent[3],
            extent[0], extent[3],
        ];
    }
    transformFn(coordinates, coordinates, 2);
    const xs = [];
    const ys = [];
    for (let i = 0, l = coordinates.length; i < l; i += 2) {
        xs.push(coordinates[i]);
        ys.push(coordinates[i + 1]);
    }
    return _boundingExtentXYs(xs, ys, dest);
}


/**
 * Modifies the provided extent in-place to be within the real world
 * extent.
 *
 * @param extent Extent.
 * @param projection Projection
 * @return The extent within the real world extent.
 */
export function wrapX(extent: Extent, projection: Projection): Extent {
    const projectionExtent = projection.getExtent();
    assert(projectionExtent !== undefined, "projection must have an extent");
    const center = getCenter(extent);
    if (
        projection.canWrapX() &&
        (center[0] < projectionExtent![0] || center[0] >= projectionExtent![2])
    ) {
        const worldWidth = getWidth(projectionExtent!);
        const worldsAway = Math.floor(
            (center[0] - projectionExtent![0]) / worldWidth,
        );
        const offset = worldsAway * worldWidth;
        extent[0] -= offset;
        extent[2] -= offset;
    }
    return extent;
}


/**
 * Fits the extent to the real world
 *
 * If the extent does not cross the anti meridian, this will return the extent
 * in an array If the extent crosses the anti meridian, the extent will be
 * sliced, so each part fits within the real world
 *
 * @param extent Extent.
 * @param projection Projection
 * @return The extent within the real world extent.
 */
export function wrapAndSliceX(
    extent: Extent, projection: Projection
): Extent[] {
    if (projection.canWrapX()) {
        const projectionExtent = projection.getExtent();
        assert(
            projectionExtent !== undefined,
            "projection must have an extent"
        );

        if (!isFinite(extent[0]) || !isFinite(extent[2])) {
            return [
                [projectionExtent![0], extent[1],
                projectionExtent![2], extent[3]]
            ];
        }

        wrapX(extent, projection);
        const worldWidth = getWidth(projectionExtent!);

        if (getWidth(extent) > worldWidth) {
            // the extent wraps around on itself
            return [
                [projectionExtent![0], extent[1],
                projectionExtent![2], extent[3]]
            ];
        }
        if (extent[0] < projectionExtent![0]) {
            // the extent crosses the anti meridian, so it needs to be sliced
            return [
                [
                    extent[0] + worldWidth, extent[1],
                    projectionExtent![2], extent[3]
                ],
                [projectionExtent![0], extent[1], extent[2], extent[3]],
            ];
        }
        if (extent[2] > projectionExtent![2]) {
            // the extent crosses the anti meridian, so it needs to be sliced
            return [
                [extent[0], extent[1], projectionExtent![2], extent[3]],
                [
                    projectionExtent![0], extent[1],
                    extent[2] - worldWidth, extent[3]
                ],
            ];
        }
    }

    return [extent];
}
