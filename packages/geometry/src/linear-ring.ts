import { Coordinate } from '@olts/core/coordinate';
import { Extent, closestSquaredDistanceXY } from '@olts/core/extent';

import SimpleGeometry from './simple-geometry';
import { assignClosestPoint, maxSquaredDelta } from './flat/closest';
import { deflateCoordinates } from './flat/deflate';
import { douglasPeucker } from './flat/simplify';
import { inflateCoordinates } from './flat/inflate';
import { linearRing as linearRingArea } from './flat/area';
import { GeometryLayout, Type } from './geometry';


/**
 * Linear ring geometry.
 *
 * Only used as part of polygon; cannot be rendered on its own.
 *
 * @api
 */
export class LinearRing extends SimpleGeometry {

    /**
     *
     */
    private maxDelta_: number = -1;

    /**
     *
     */
    private maxDeltaRevision_: number = -1;

    /**
     * @param coordinates Coordinates. For internal use, flat coordinates
     *     in combination with `layout` are also accepted.
     * @param layout Layout.
     */
    constructor(
        coordinates: Coordinate[] | number[],
        layout?: GeometryLayout
    ) {
        super();

        if (layout !== undefined && !Array.isArray(coordinates[0])) {
            this.setFlatCoordinates(
                layout,
                coordinates as number[],
            );
        } else {
            this.setCoordinates(
                coordinates as Coordinate[],
                layout,
            );
        }
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): LinearRing {
        return new LinearRing(this.flatCoordinates.slice(), this.layout);
    }

    /**
     * @param x X.
     * @param y Y.
     * @param closestPoint Closest point.
     * @param minSquaredDistance Minimum squared distance.
     * @return Minimum squared distance.
     */
    closestPointXY(
        x: number,
        y: number,
        closestPoint: Coordinate,
        minSquaredDistance: number
    ): number {
        if (
            minSquaredDistance <
            closestSquaredDistanceXY(this.getExtent(), x, y)
        ) {
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
            true,
            x,
            y,
            closestPoint,
            minSquaredDistance,
        );
    }

    /**
     * Return the area of the linear ring on projected plane.
     *
     * @return Area (on projected plane).
     * @api
     */
    getArea(): number {
        return linearRingArea(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
        );
    }

    /**
     * Return the coordinates of the linear ring.
     *
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
     * @param squaredTolerance Squared tolerance.
     * @return Simplified LinearRing.
     * @protected
     */
    override getSimplifiedGeometryInternal(
        squaredTolerance: number
    ): LinearRing {
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
        return new LinearRing(simplifiedFlatCoordinates, 'XY');
    }

    /**
     * Get the type of this geometry.
     *
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'LinearRing';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        return false;
    }

    /**
     * Set the coordinates of the linear ring.
     *
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

export default LinearRing;
