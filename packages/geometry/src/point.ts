
import SimpleGeometry from './simple-geometry';
import { containsXY, createOrUpdateFromCoordinate } from '../extent';
import { deflateCoordinate } from './flat/deflate';
import { squaredDistance as squaredDx } from '../math';
import { Coordinate } from '@olts/core/coordinate';
import { Extent } from '@olts/core/extent';

/**
 * Point geometry.
 *
 * @api
 */
class Point extends SimpleGeometry {
    /**
     * @param coordinates Coordinates.
     * @param layout Layout.
     */
    constructor(coordinates: Coordinate, layout?: GeometryLayout) {
        super();
        this.setCoordinates(coordinates, layout);
    }

    /**
     * Make a complete copy of the geometry.
     * @return Clone.
     * @api
     */
    clone(): Point {
        const point = new Point(this.flatCoordinates.slice(), this.layout);
        point.applyProperties(this);
        return point;
    }

    /**
     * @param x X.
     * @param y Y.
     * @param closestPoint Closest point.
     * @param minSquaredDistance Minimum squared distance.
     * @return Minimum squared distance.
     */
    closestPointXY(x: number, y: number, closestPoint: Coordinate, minSquaredDistance: number): number {
        const flatCoordinates = this.flatCoordinates;
        const squaredDistance = squaredDx(
            x,
            y,
            flatCoordinates[0],
            flatCoordinates[1],
        );
        if (squaredDistance < minSquaredDistance) {
            const stride = this.stride;
            for (let i = 0; i < stride; ++i) {
                closestPoint[i] = flatCoordinates[i];
            }
            closestPoint.length = stride;
            return squaredDistance;
        }
        return minSquaredDistance;
    }

    /**
     * Return the coordinate of the point.
     * @return Coordinates.
     * @api
     */
    getCoordinates(): Coordinate {
        return this.flatCoordinates.slice();
    }

    /**
     * @param extent Extent.
     * @protected
     * @return extent Extent.
     */
    computeExtent(extent: Extent): Extent {
        return createOrUpdateFromCoordinate(this.flatCoordinates, extent);
    }

    /**
     * Get the type of this geometry.
     * @return Geometry type.
     * @api
     */
    getType(): import("./Geometry").Type {
        return 'Point';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        return containsXY(extent, this.flatCoordinates[0], this.flatCoordinates[1]);
    }

    /**
     * @param coordinates Coordinates.
     * @param layout Layout.
     * @api
     */
    setCoordinates(coordinates: any[], layout?: GeometryLayout) {
        this.setLayout(layout, coordinates, 0);
        if (!this.flatCoordinates) {
            this.flatCoordinates = [];
        }
        this.flatCoordinates.length = deflateCoordinate(
            this.flatCoordinates,
            0,
            coordinates,
            this.stride,
        );
        this.changed();
    }
}

export default Point;
