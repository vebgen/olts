import { Coordinate } from "@olts/core/coordinate";
import {
    Extent, createOrUpdate, forEachCorner, intersects
} from '@olts/core/extent';

import SimpleGeometry from './simple-geometry';
import { deflateCoordinate } from './flat/deflate';
import { rotate } from './flat/transform';

/**
 * Circle geometry.
 *
 * @api
 */
class Circle extends SimpleGeometry {
    /**
     * @param center Center. For internal use, flat coordinates in combination
     *     with `layout` and no `radius` are also accepted.
     * @param radius Radius in units of the projection.
     * @param layout Layout.
     */
    constructor(center: Coordinate, radius?: number, layout?: GeometryLayout) {
        super();
        if (layout !== undefined && radius === undefined) {
            this.setFlatCoordinates(layout, center);
        } else {
            radius = radius ? radius : 0;
            this.setCenterAndRadius(center, radius, layout);
        }
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): Circle {
        const circle = new Circle(
            this.flatCoordinates.slice(),
            undefined,
            this.layout,
        );
        circle.applyProperties(this);
        return circle;
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
        const dx = x - flatCoordinates[0];
        const dy = y - flatCoordinates[1];
        const squaredDistance = dx * dx + dy * dy;
        if (squaredDistance < minSquaredDistance) {
            if (squaredDistance === 0) {
                for (let i = 0; i < this.stride; ++i) {
                    closestPoint[i] = flatCoordinates[i];
                }
            } else {
                const delta = this.getRadius() / Math.sqrt(squaredDistance);
                closestPoint[0] = flatCoordinates[0] + delta * dx;
                closestPoint[1] = flatCoordinates[1] + delta * dy;
                for (let i = 2; i < this.stride; ++i) {
                    closestPoint[i] = flatCoordinates[i];
                }
            }
            closestPoint.length = this.stride;
            return squaredDistance;
        }
        return minSquaredDistance;
    }

    /**
     * @param x X.
     * @param y Y.
     * @return Contains (x, y).
     */
    containsXY(x: number, y: number): boolean {
        const flatCoordinates = this.flatCoordinates;
        const dx = x - flatCoordinates[0];
        const dy = y - flatCoordinates[1];
        return dx * dx + dy * dy <= this.getRadiusSquared_();
    }

    /**
     * Return the center of the circle as {@link module:ol/coordinate~Coordinate coordinate}.
     * @return Center.
     * @api
     */
    getCenter(): Coordinate {
        return this.flatCoordinates.slice(0, this.stride);
    }

    /**
     * @param extent Extent.
     * @protected
     * @return extent Extent.
     */
    computeExtent(extent: Extent): Extent {
        const flatCoordinates = this.flatCoordinates;
        const radius = flatCoordinates[this.stride] - flatCoordinates[0];
        return createOrUpdate(
            flatCoordinates[0] - radius,
            flatCoordinates[1] - radius,
            flatCoordinates[0] + radius,
            flatCoordinates[1] + radius,
            extent,
        );
    }

    /**
     * Return the radius of the circle.
     * @return Radius.
     * @api
     */
    getRadius(): number {
        return Math.sqrt(this.getRadiusSquared_());
    }

    /**
     * @private
     * @return Radius squared.
     */
    getRadiusSquared_(): number {
        const dx = this.flatCoordinates[this.stride] - this.flatCoordinates[0];
        const dy = this.flatCoordinates[this.stride + 1] - this.flatCoordinates[1];
        return dx * dx + dy * dy;
    }

    /**
     * Get the type of this geometry.
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'Circle';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        const circleExtent = this.getExtent();
        if (intersects(extent, circleExtent)) {
            const center = this.getCenter();

            if (extent[0] <= center[0] && extent[2] >= center[0]) {
                return true;
            }
            if (extent[1] <= center[1] && extent[3] >= center[1]) {
                return true;
            }

            return forEachCorner(extent, this.intersectsCoordinate.bind(this));
        }
        return false;
    }

    /**
     * Set the center of the circle as {@link Coordinate coordinate}.
     *
     * @param center Center.
     * @api
     */
    setCenter(center: Coordinate) {
        const stride = this.stride;
        const radius = this.flatCoordinates[stride] - this.flatCoordinates[0];
        const flatCoordinates = center.slice();
        flatCoordinates[stride] = flatCoordinates[0] + radius;
        for (let i = 1; i < stride; ++i) {
            flatCoordinates[stride + i] = center[i];
        }
        this.setFlatCoordinates(this.layout, flatCoordinates);
        this.changed();
    }

    /**
     * Set the center (as {@link Coordinate coordinate}) and the radius (as
     * number) of the circle.
     *
     * @param center Center.
     * @param radius Radius.
     * @param layout Layout.
     * @api
     */
    setCenterAndRadius(
        center: Coordinate, radius: number, layout?: GeometryLayout
    ) {
        this.setLayout(layout, center, 0);
        if (!this.flatCoordinates) {
            this.flatCoordinates = [];
        }
        /** @type */
        const flatCoordinates: number[] = this.flatCoordinates;
        let offset = deflateCoordinate(flatCoordinates, 0, center, this.stride);
        flatCoordinates[offset++] = flatCoordinates[0] + radius;
        for (let i = 1, ii = this.stride; i < ii; ++i) {
            flatCoordinates[offset++] = flatCoordinates[i];
        }
        flatCoordinates.length = offset;
        this.changed();
    }

    getCoordinates() {
        return null;
    }

    setCoordinates(coordinates, layout) { }

    /**
     * Set the radius of the circle. The radius is in the units of the projection.
     * @param radius Radius.
     * @api
     */
    setRadius(radius: number) {
        this.flatCoordinates[this.stride] = this.flatCoordinates[0] + radius;
        this.changed();
    }

    /**
     * Rotate the geometry around a given coordinate. This modifies the geometry
     * coordinates in place.
     * @param angle Rotation angle in counter-clockwise radians.
     * @param anchor The rotation center.
     * @api
     */
    rotate(angle: number, anchor: Coordinate) {
        const center = this.getCenter();
        const stride = this.getStride();
        this.setCenter(
            rotate(center, 0, center.length, stride, angle, anchor, center),
        );
        this.changed();
    }
}

/**
 * Transform each coordinate of the circle from one coordinate reference system
 * to another. The geometry is modified in place.
 * If you do not want the geometry modified in place, first clone() it and
 * then use this function on the clone.
 *
 * Internally a circle is currently represented by two points: the center of
 * the circle `[cx, cy]`, and the point to the right of the circle
 * `[cx + r, cy]`. This `transform` function just transforms these two points.
 * So the resulting geometry is also a circle, and that circle does not
 * correspond to the shape that would be obtained by transforming every point
 * of the original circle.
 *
 * @param source The current projection.  Can be a
 *     string identifier or a {@link module:ol/proj/Projection~Projection} object.
 * @param destination The desired projection.  Can be a
 *     string identifier or a {@link module:ol/proj/Projection~Projection} object.
 * @return {Circle} This geometry.  Note that original geometry is
 *     modified in place.
 * @function
 * @api
 */
Circle.prototype.transform;
export default Circle;


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
