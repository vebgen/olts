
import { squaredDistance as squaredDx } from '@olts/core/math';
import { closestSquaredDistanceXY, containsXY } from '@olts/core/extent';
import { Coordinate } from '@olts/core/coordinate';
import { Extent } from '@olts/core/extent';
import { extend } from '@olts/core/array';

import { Point } from './point';
import { SimpleGeometry } from './simple-geometry';
import { deflateCoordinates } from './flat/deflate';
import { inflateCoordinates } from './flat/inflate';
import { GeometryLayout, Type } from './geometry';


/**
 * Multi-point geometry.
 *
 * @api
 */
export class MultiPoint extends SimpleGeometry {
    /**
     * @param coordinates Coordinates. For internal use, flat coordinates in
     *     combination with `layout` are also accepted.
     * @param layout Layout.
     */
    constructor(coordinates: Coordinate[] | number[], layout?: GeometryLayout) {
        super();
        if (layout && !Array.isArray(coordinates[0])) {
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
     * Append the passed point to this multi-point.
     *
     * @param point Point.
     * @api
     */
    appendPoint(point: Point) {
        extend(this.flatCoordinates, point.getFlatCoordinates());
        this.changed();
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): MultiPoint {
        const multiPoint = new MultiPoint(
            this.flatCoordinates.slice(),
            this.layout,
        );
        multiPoint.applyProperties(this);
        return multiPoint;
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
        const flatCoordinates = this.flatCoordinates;
        const stride = this.stride;
        for (let i = 0, ii = flatCoordinates.length; i < ii; i += stride) {
            const squaredDistance = squaredDx(
                x,
                y,
                flatCoordinates[i],
                flatCoordinates[i + 1],
            );
            if (squaredDistance < minSquaredDistance) {
                minSquaredDistance = squaredDistance;
                for (let j = 0; j < stride; ++j) {
                    closestPoint[j] = flatCoordinates[i + j];
                }
                closestPoint.length = stride;
            }
        }
        return minSquaredDistance;
    }

    /**
     * Return the coordinates of the multipoint.
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
     * Return the point at the specified index.
     *
     * @param index Index.
     * @return Point.
     * @api
     */
    getPoint(index: number): Point | null {
        const n = this.flatCoordinates.length / this.stride;
        if (index < 0 || n <= index) {
            return null;
        }
        return new Point(
            this.flatCoordinates.slice(
                index * this.stride,
                (index + 1) * this.stride,
            ),
            this.layout,
        );
    }

    /**
     * Return the points of this multipoint.
     *
     * @return Points.
     * @api
     */
    getPoints(): Array<Point> {
        const flatCoordinates = this.flatCoordinates;
        const layout = this.layout;
        const stride = this.stride;
        const points: Point[] = [];
        for (let i = 0, ii = flatCoordinates.length; i < ii; i += stride) {
            const point = new Point(
                flatCoordinates.slice(i, i + stride), layout
            );
            points.push(point);
        }
        return points;
    }

    /**
     * Get the type of this geometry.
     *
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'MultiPoint';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        const flatCoordinates = this.flatCoordinates;
        const stride = this.stride;
        for (let i = 0, ii = flatCoordinates.length; i < ii; i += stride) {
            const x = flatCoordinates[i];
            const y = flatCoordinates[i + 1];
            if (containsXY(extent, x, y)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Set the coordinates of the multi-point.
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

export default MultiPoint;
