import { memoizeOne } from '@olts/core/functions';
import { transform2D } from './flat/transform';
import { Coordinate } from '@olts/core/coordinate';
import { Extent } from '@olts/core/extent';
import { Projection } from '@olts/core/proj';
import { Transform } from '@olts/core/transform';
import { assert } from '@olts/core/asserts';
import {
    createEmpty,
    createOrUpdateEmpty,
    getHeight,
    returnOrUpdate,
} from '@olts/core/extent';
import {
    ProjectionLike, TransformFunction, getProjection, getTransform
} from '@olts/core/proj';

import BaseObject from '../Object';
import {
    compose as composeTransform,
    create as createTransform,
} from '../transform';


/**
 * The coordinate layout for geometries, indicating whether a 3rd or 4th z ('Z')
 * or measure ('M') coordinate is available.
 */
export type GeometryLayout = 'XY' | 'XYZ' | 'XYM' | 'XYZM';


/**
 * The geometry type.
 */
export type Type =
    | 'Point'
    | 'LineString'
    | 'LinearRing'
    | 'Polygon'
    | 'MultiPoint'
    | 'MultiLineString'
    | 'MultiPolygon'
    | 'GeometryCollection'
    | 'Circle';


const tmpTransform: Transform = createTransform();

/**
 * Get a transformed and simplified version of the geometry.
 * @abstract
 * @param revision The geometry revision.
 * @param squaredTolerance Squared tolerance.
 * @param transform Optional transform function.
 * @return Simplified geometry.
 */
export type SimplifyTransformedInternal = (
    revision: number,
    squaredTolerance: number,
    transform?: TransformFunction
) => Geometry;


/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for vector geometries.
 *
 * To get notified of changes to the geometry, register a listener for the
 * generic `change` event on your geometry instance.
 *
 * @abstract
 * @api
 */
abstract class Geometry extends BaseObject {

    private extent_: Extent;
    private extentRevision_: number;
    private simplifiedGeometryMaxMinSquaredTolerance: number;
    private simplifiedGeometryRevision: number;
    private simplifyTransformedInternal: SimplifyTransformedInternal;

    constructor() {
        super();
        this.extent_ = createEmpty();
        this.extentRevision_ = -1;
        this.simplifiedGeometryMaxMinSquaredTolerance = 0;
        this.simplifiedGeometryRevision = 0;

        /**
         * Get a transformed and simplified version of the geometry.
         * @abstract
         * @param revision The geometry revision.
         * @param squaredTolerance Squared tolerance.
         * @param transform Optional transform function.
         * @return Simplified geometry.
         */
        this.simplifyTransformedInternal = memoizeOne((
            revision: number,
            squaredTolerance: number,
            transform?: TransformFunction
        ) => {
            if (!transform) {
                return this.getSimplifiedGeometry(squaredTolerance);
            }
            const clone = this.clone();
            clone.applyTransform(transform);
            return clone.getSimplifiedGeometry(squaredTolerance);
        });
    }

    /**
     * Get a transformed and simplified version of the geometry.
     *
     * @param squaredTolerance Squared tolerance.
     * @param transform Optional transform function.
     * @return Simplified geometry.
     */
    simplifyTransformed(
        squaredTolerance: number, transform?: TransformFunction
    ): Geometry {
        return this.simplifyTransformedInternal(
            this.getRevision(),
            squaredTolerance,
            transform,
        );
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     */
    abstract clone(): Geometry;

    /**
     * @abstract
     * @param x X.
     * @param y Y.
     * @param closestPoint Closest point.
     * @param minSquaredDistance Minimum squared distance.
     * @return Minimum squared distance.
     */
    abstract closestPointXY(
        x: number, y: number,
        closestPoint: Coordinate,
        minSquaredDistance: number
    ): number;

    /**
     * Check if the passed coordinate is contained or on the edge of the
     * geometry.
     *
     * @param x X.
     * @param y Y.
     * @return Contains (x, y).
     */
    containsXY(x: number, y: number): boolean {
        const coord = this.getClosestPoint([x, y]);
        return coord[0] === x && coord[1] === y;
    }

    /**
     * Return the closest point of the geometry to the passed point as
     * {@link Coordinate coordinate}.
     *
     * @param point Point.
     * @param closestPoint Closest point.
     * @return Closest point.
     * @api
     */
    getClosestPoint(point: Coordinate, closestPoint?: Coordinate): Coordinate {
        closestPoint = closestPoint ? closestPoint : [NaN, NaN];
        this.closestPointXY(point[0], point[1], closestPoint, Infinity);
        return closestPoint;
    }

    /**
     * Returns true if this geometry includes the specified coordinate. If the
     * coordinate is on the boundary of the geometry, returns false.
     * @param coordinate Coordinate.
     * @return Contains coordinate.
     * @api
     */
    intersectsCoordinate(coordinate: Coordinate): boolean {
        return this.containsXY(coordinate[0], coordinate[1]);
    }

    /**
     * @param extent Extent.
     * @return extent Extent.
     */
    protected abstract computeExtent(extent: Extent): Extent;

    /**
     * Get the extent of the geometry.
     * @param extent Extent.
     * @return extent Extent.
     * @api
     */
    getExtent(extent?: Extent): Extent {
        if (this.extentRevision_ != this.getRevision()) {
            const extent = this.computeExtent(this.extent_);
            if (isNaN(extent[0]) || isNaN(extent[1])) {
                createOrUpdateEmpty(extent);
            }
            this.extentRevision_ = this.getRevision();
        }
        return returnOrUpdate(this.extent_, extent);
    }

    /**
     * Rotate the geometry around a given coordinate. This modifies the geometry
     * coordinates in place.
     *
     * @param angle Rotation angle in radians.
     * @param anchor The rotation center.
     * @api
     */
    abstract rotate(angle: number, anchor: Coordinate): void;

    /**
     * Scale the geometry (with an optional origin).  This modifies the geometry
     * coordinates in place.
     *
     * @param sx The scaling factor in the x-direction.
     * @param sy The scaling factor in the y-direction (defaults to sx).
     * @param anchor The scale origin (defaults to the center of the geometry
     *     extent).
     * @api
     */
    abstract scale(sx: number, sy?: number, anchor?: Coordinate): void;

    /**
     * Create a simplified version of this geometry.
     *
     * For line-strings, this uses the [Douglas
     * Peucker](https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm)
     * algorithm.
     *
     * For polygons, a quantization-based simplification is used to preserve
     * topology.
     *
     * @param tolerance The tolerance distance for simplification.
     * @return A new, simplified version of the original geometry.
     * @api
     */
    simplify(tolerance: number): Geometry {
        return this.getSimplifiedGeometry(tolerance * tolerance);
    }

    /**
     * Create a simplified version of this geometry using the Douglas Peucker
     * algorithm.
     *
     * @ee https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm.
     *
     * @param squaredTolerance Squared tolerance.
     * @return Simplified geometry.
     */
    abstract getSimplifiedGeometry(squaredTolerance: number): Geometry;

    /**
     * Get the type of this geometry.
     *
     * @return Geometry type.
     */
    abstract getType(): Type;

    /**
     * Apply a transform function to the coordinates of the geometry.
     * The geometry is modified in place.
     * If you do not want the geometry modified in place, first `clone()` it and
     * then use this function on the clone.
     *
     * @param transformFn Transform function. Called with a flat array of
     *   geometry coordinates.
     */
    abstract applyTransform(transformFn: TransformFunction): void;

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     */
    abstract intersectsExtent(extent: Extent): boolean;

    /**
     * Translate the geometry.  This modifies the geometry coordinates in place.
     *
     * If instead you want a new geometry, first `clone()` this geometry.
     *
     * @param deltaX Delta X.
     * @param deltaY Delta Y.
     * @api
     */
    abstract translate(deltaX: number, deltaY: number): void;

    /**
     * Transform each coordinate of the geometry from one coordinate reference
     * system to another. The geometry is modified in place.
     * For example, a line will be transformed to a line and a circle to a circle.
     * If you do not want the geometry modified in place, first `clone()` it and
     * then use this function on the clone.
     *
     * @param source The current projection.  Can be a string identifier or a
     *     {@link Projection} object.
     * @param destination The desired projection.  Can be a string identifier or
     *     a {@link Projection} object.
     * @return This geometry. Note that original geometry is modified in place.
     * @api
     */
    transform(source: ProjectionLike, destination: ProjectionLike): this {
        const sourceProj: Projection = getProjection(source)!;
        assert(sourceProj, "sourceProj must be a valid Projection");
        const transformFn =
            sourceProj.getUnits() == 'tile-pixels'
                ? function (
                    inCoordinates: number[], outCoordinates: number[], stride: number
                ) {
                    const pixelExtent = sourceProj.getExtent()!;
                    assert(pixelExtent, "pixelExtent must be a valid");

                    const projectedExtent = sourceProj.getWorldExtent()!;
                    assert(projectedExtent, "projectedExtent must be a valid");

                    const scale = getHeight(projectedExtent) / getHeight(pixelExtent);
                    composeTransform(
                        tmpTransform,
                        projectedExtent[0],
                        projectedExtent[3],
                        scale,
                        -scale,
                        0,
                        0,
                        0,
                    );
                    transform2D(
                        inCoordinates,
                        0,
                        inCoordinates.length,
                        stride,
                        tmpTransform,
                        outCoordinates,
                    );
                    return getTransform(sourceProj, destination)(
                        inCoordinates,
                        outCoordinates,
                        stride,
                    );
                }
                : getTransform(sourceProj, destination);
        this.applyTransform(transformFn);
        return this;
    }
}

export default Geometry;
