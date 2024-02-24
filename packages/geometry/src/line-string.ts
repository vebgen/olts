
import SimpleGeometry from './simple-geometry';
import { assignClosestPoint, maxSquaredDelta } from './flat/closest';
import { closestSquaredDistanceXY } from '../extent';
import { deflateCoordinates } from './flat/deflate';
import { douglasPeucker } from './flat/simplify';
import { extend } from '../array';
import { forEach as forEachSegment } from './flat/segments';
import { inflateCoordinates } from './flat/inflate';
import { interpolatePoint, lineStringCoordinateAtM } from './flat/interpolate';
import { intersectsLineString } from './flat/intersects-extent';
import { lineStringLength } from './flat/length';
import { Coordinate } from '@olts/core/coordinate';
import { Extent } from '@olts/core/extent';

/**
 * Line-string geometry.
 *
 * @api
 */
class LineString extends SimpleGeometry {
    /**
     * @param coordinates Coordinates. For internal use, flat coordinates
     *   in combination with `layout` are also accepted.
     * @param layout Layout.
     */
    constructor(coordinates: Coordinate[] | number[], layout?: GeometryLayout) {
        super();

        /**
         * @private
         * @type {Coordinate|null}
         */
        this.flatMidpoint_ = null;

        /**
         * @private
         * @type {number}
         */
        this.flatMidpointRevision_ = -1;

        /**
         * @private
         * @type {number}
         */
        this.maxDelta_ = -1;

        /**
         * @private
         * @type {number}
         */
        this.maxDeltaRevision_ = -1;

        if (layout !== undefined && !Array.isArray(coordinates[0])) {
            this.setFlatCoordinates(layout, coordinates);
        } else {
            this.setCoordinates(coordinates, layout,);
        }
    }

    /**
     * Append the passed coordinate to the coordinates of the line-string.
     *
     * @param coordinate Coordinate.
     * @api
     */
    appendCoordinate(coordinate: Coordinate) {
        extend(this.flatCoordinates, coordinate);
        this.changed();
    }

    /**
     * Make a complete copy of the geometry.
     * @return Clone.
     * @api
     */
    clone(): LineString {
        const lineString = new LineString(
            this.flatCoordinates.slice(),
            this.layout,
        );
        lineString.applyProperties(this);
        return lineString;
    }

    /**
     * @param x X.
     * @param y Y.
     * @param closestPoint Closest point.
     * @param minSquaredDistance Minimum squared distance.
     * @return Minimum squared distance.
     */
    closestPointXY(
        x: number, y: number, closestPoint: Coordinate,
        minSquaredDistance: number
    ): number {
        if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
            return minSquaredDistance;
        }
        if (this.maxDeltaRevision_ != this.getRevision()) {
            this.maxDelta_ = Math.sqrt(
                maxSquaredDelta(
                    this.flatCoordinates,
                    0,
                    this.flatCoordinates.length,
                    this.stride,
                    0,
                ),
            );
            this.maxDeltaRevision_ = this.getRevision();
        }
        return assignClosestPoint(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            this.maxDelta_,
            false,
            x,
            y,
            closestPoint,
            minSquaredDistance,
        );
    }

    /**
     * Iterate over each segment, calling the provided callback.
     * If the callback returns a truthy value the function returns that
     * value immediately. Otherwise the function returns `false`.
     *
     * @param callback Function called for each segment. The function will
     *     receive two arguments, the start and end coordinates of the segment.
     * @return Value.
     * @api
     */
    forEachSegment<T, S>(
        callback: (this: S, arg1: Coordinate, arg2: Coordinate) => T
    ): T | boolean {
        return forEachSegment(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            callback,
        );
    }

    /**
     * Returns the coordinate at `m` using linear interpolation, or `null` if no
     * such coordinate exists.
     *
     * `extrapolate` controls extrapolation beyond the range of Ms in the
     * MultiLineString. If `extrapolate` is `true` then Ms less than the first
     * M will return the first coordinate and Ms greater than the last M will
     * return the last coordinate.
     *
     * @param m M.
     * @param extrapolate Extrapolate. Default is `false`.
     * @return Coordinate.
     * @api
     */
    getCoordinateAtM(m: number, extrapolate?: boolean): Coordinate | null {
        if (this.layout != 'XYM' && this.layout != 'XYZM') {
            return null;
        }
        extrapolate = extrapolate !== undefined ? extrapolate : false;
        return lineStringCoordinateAtM(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            m,
            extrapolate,
        );
    }

    /**
     * Return the coordinates of the linestring.
     * @return Coordinates.
     * @api
     */
    getCoordinates(): Coordinate[] {
        return inflateCoordinates(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
        );
    }

    /**
     * Return the coordinate at the provided fraction along the linestring.
     * The `fraction` is a number between 0 and 1, where 0 is the start of the
     * linestring and 1 is the end.
     * @param fraction Fraction.
     * @param dest Optional coordinate whose values will
     *     be modified. If not provided, a new coordinate will be returned.
     * @return Coordinate of the interpolated point.
     * @api
     */
    getCoordinateAt(fraction: number, dest?: Coordinate): Coordinate {
        return interpolatePoint(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            fraction,
            dest,
            this.stride,
        );
    }

    /**
     * Return the length of the linestring on projected plane.
     * @return Length (on projected plane).
     * @api
     */
    getLength(): number {
        return lineStringLength(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
        );
    }

    /**
     * @return Flat midpoint.
     */
    getFlatMidpoint(): number[] {
        if (this.flatMidpointRevision_ != this.getRevision()) {
            this.flatMidpoint_ = this.getCoordinateAt(
                0.5,
                this.flatMidpoint_ ?? undefined,
            );
            this.flatMidpointRevision_ = this.getRevision();
        }
        return /** @type */ (this.flatMidpoint_);
    }

    /**
     * @param squaredTolerance Squared tolerance.
     * @return Simplified LineString.
     * @protected
     */
    getSimplifiedGeometryInternal(squaredTolerance: number): LineString {
        /** @type */
        const simplifiedFlatCoordinates: number[] = [];
        simplifiedFlatCoordinates.length = douglasPeucker(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            squaredTolerance,
            simplifiedFlatCoordinates,
            0,
        );
        return new LineString(simplifiedFlatCoordinates, 'XY');
    }

    /**
     * Get the type of this geometry.
     * @return Geometry type.
     * @api
     */
    getType(): import("./Geometry").Type {
        return 'LineString';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        return intersectsLineString(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            extent,
        );
    }

    /**
     * Set the coordinates of the linestring.
     * @param coordinates Coordinates.
     * @param layout Layout.
     * @api
     */
    setCoordinates(coordinates: Coordinate[], layout?: GeometryLayout) {
        this.setLayout(layout, coordinates, 1);
        if (!this.flatCoordinates) {
            this.flatCoordinates = [];
        }
        this.flatCoordinates.length = deflateCoordinates(
            this.flatCoordinates,
            0,
            coordinates,
            this.stride,
        );
        this.changed();
    }
}

export default LineString;
