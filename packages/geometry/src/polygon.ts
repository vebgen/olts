import { Coordinate } from '@olts/core/coordinate';
import { Extent, closestSquaredDistanceXY, getCenter, isEmpty } from '@olts/core/extent';
import { extend } from '@olts/core/array';

import { LinearRing } from './linear-ring';
import { Point } from './point';
import { SimpleGeometry } from './simple-geometry';
import { arrayMaxSquaredDelta, assignClosestArrayPoint } from './flat/closest';
import { deflateCoordinatesArray } from './flat/deflate';
import { getInteriorPointOfArray } from './flat/interior-point';
import { inflateCoordinatesArray } from './flat/inflate';
import { intersectsLinearRingArray } from './flat/intersects-extent';
import { linearRingsAreOriented, orientLinearRings } from './flat/orient';
import { linearRings as linearRingsArea } from './flat/area';
import { linearRingsContainsXY } from './flat/contains';
import { modulo } from '@olts/core/math';
import { quantizeArray } from './flat/simplify';
import { offset as sphereOffset } from './sphere';
import { GeometryLayout, Type } from './geometry';
import Circle from './circle';


/**
 * Polygon geometry.
 *
 * @api
 */
export class Polygon extends SimpleGeometry {
    /**
     *
     */
    private ends_: number[] = [];

    /**
     *
     */
    private flatInteriorPointRevision_: number = -1;

    /**
     *
     */
    private flatInteriorPoint_: Coordinate | null = null;

    /**
     *
     */
    private maxDelta_: number = -1;

    /**
     *
     */
    private maxDeltaRevision_: number = -1;

    /**
     *
     */
    private orientedRevision_: number = -1;

    /**
     *
     */
    private orientedFlatCoordinates_: number[] | null = null;

    /**
     * @param coordinates Array of linear rings that define the polygon. The
     *     first linear ring of the array defines the outer-boundary or surface
     *     of the polygon. Each subsequent linear ring defines a hole in the
     *     surface of the polygon. A linear ring is an array of vertices'
     *     coordinates where the first coordinate and the last are equivalent.
     *     (For internal use, flat coordinates in combination with `layout` and
     *     `ends` are also accepted.)
     * @param layout Layout.
     * @param ends Ends (for internal use with flat coordinates).
     */
    constructor(
        coordinates: Array<Coordinate[]> | number[],
        layout?: GeometryLayout, ends?: number[]
    ) {
        super();

        if (layout !== undefined && ends) {
            this.setFlatCoordinates(
                layout,
                coordinates as number[],
            );
            this.ends_ = ends;
        } else {
            this.setCoordinates(
                coordinates as Coordinate[][],
                layout,
            );
        }
    }

    /**
     * Append the passed linear ring to this polygon.
     *
     * @param linearRing Linear ring.
     * @api
     */
    appendLinearRing(linearRing: LinearRing) {
        if (!this.flatCoordinates) {
            this.flatCoordinates = linearRing.getFlatCoordinates().slice();
        } else {
            extend(this.flatCoordinates, linearRing.getFlatCoordinates());
        }
        this.ends_.push(this.flatCoordinates.length);
        this.changed();
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): Polygon {
        const polygon = new Polygon(
            this.flatCoordinates.slice(),
            this.layout,
            this.ends_.slice(),
        );
        polygon.applyProperties(this);
        return polygon;
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
                arrayMaxSquaredDelta(
                    this.flatCoordinates,
                    0,
                    this.ends_,
                    this.stride,
                    0,
                ),
            );
            this.maxDeltaRevision_ = this.getRevision();
        }
        return assignClosestArrayPoint(
            this.flatCoordinates,
            0,
            this.ends_,
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
     * @param x X.
     * @param y Y.
     * @return Contains (x, y).
     */
    override containsXY(x: number, y: number): boolean {
        return linearRingsContainsXY(
            this.getOrientedFlatCoordinates(),
            0,
            this.ends_,
            this.stride,
            x,
            y,
        );
    }

    /**
     * Return the area of the polygon on projected plane.
     *
     * @return Area (on projected plane).
     * @api
     */
    getArea(): number {
        return linearRingsArea(
            this.getOrientedFlatCoordinates(),
            0,
            this.ends_,
            this.stride,
        );
    }

    /**
     * Get the coordinate array for this geometry.
     *
     * This array has the structure of a GeoJSON coordinate array for polygons.
     *
     * @param right Orient coordinates according to the right-hand rule
     *     (counter-clockwise for exterior and clockwise for interior rings).
     *     If `false`, coordinates will be oriented according to the left-hand
     *     rule (clockwise for exterior and counter-clockwise for interior
     *     rings). By default, coordinate orientation will depend on how the
     *     geometry was constructed.
     * @return Coordinates.
     * @api
     */
    getCoordinates(right?: boolean): Array<Coordinate[]> {
        let flatCoordinates;
        if (right !== undefined) {
            flatCoordinates = this.getOrientedFlatCoordinates().slice();
            orientLinearRings(
                flatCoordinates, 0, this.ends_, this.stride, right
            );
        } else {
            flatCoordinates = this.flatCoordinates;
        }

        return inflateCoordinatesArray(
            flatCoordinates, 0, this.ends_, this.stride
        );
    }

    /**
     * @return Ends.
     */
    getEnds(): number[] {
        return this.ends_;
    }

    /**
     * @return Interior point.
     */
    getFlatInteriorPoint(): number[] {
        if (this.flatInteriorPointRevision_ != this.getRevision()) {
            const flatCenter = getCenter(this.getExtent());
            this.flatInteriorPoint_ = getInteriorPointOfArray(
                this.getOrientedFlatCoordinates(),
                0,
                this.ends_,
                this.stride,
                flatCenter,
                0,
            );
            this.flatInteriorPointRevision_ = this.getRevision();
        }
        return this.flatInteriorPoint_ as number[];
    }

    /**
     * Return an interior point of the polygon.
     *
     * @return Interior point as XYM coordinate, where M is the length of the
     *     horizontal intersection that the point belongs to.
     * @api
     */
    getInteriorPoint(): Point {
        return new Point(this.getFlatInteriorPoint(), 'XYM');
    }

    /**
     * Return the number of rings of the polygon; this includes the exterior
     * ring and any interior rings.
     *
     * @return Number of rings.
     * @api
     */
    getLinearRingCount(): number {
        return this.ends_.length;
    }

    /**
     * Return the Nth linear ring of the polygon geometry.
     *
     * @param index Index. The exterior linear ring is available at index `0`
     *     and the interior rings at index `1` and beyond.
     * @return Linear ring or `null` if the index is out of range.
     * @api
     */
    getLinearRing(index: number): LinearRing | null {
        if (index < 0 || this.ends_.length <= index) {
            return null;
        }
        return new LinearRing(
            this.flatCoordinates.slice(
                index === 0 ? 0 : this.ends_[index - 1],
                this.ends_[index],
            ),
            this.layout,
        );
    }

    /**
     * Return the linear rings of the polygon.
     *
     * @return Linear rings.
     * @api
     */
    getLinearRings():LinearRing[] {
        const layout = this.layout;
        const flatCoordinates = this.flatCoordinates;
        const ends = this.ends_;
        const linearRings = [];
        let offset = 0;
        for (let i = 0, ii = ends.length; i < ii; ++i) {
            const end = ends[i];
            const linearRing = new LinearRing(
                flatCoordinates.slice(offset, end),
                layout,
            );
            linearRings.push(linearRing);
            offset = end;
        }
        return linearRings;
    }

    /**
     * @return Oriented flat coordinates.
     */
    getOrientedFlatCoordinates(): number[] {
        if (this.orientedRevision_ != this.getRevision()) {
            const flatCoordinates = this.flatCoordinates;
            if (linearRingsAreOriented(
                flatCoordinates, 0, this.ends_, this.stride
            )) {
                this.orientedFlatCoordinates_ = flatCoordinates;
            } else {
                this.orientedFlatCoordinates_ = flatCoordinates.slice();
                this.orientedFlatCoordinates_.length = orientLinearRings(
                    this.orientedFlatCoordinates_,
                    0,
                    this.ends_,
                    this.stride,
                );
            }
            this.orientedRevision_ = this.getRevision();
        }
        return this.orientedFlatCoordinates_ as number[];
    }

    /**
     * @param squaredTolerance Squared tolerance.
     * @return Simplified Polygon.
     * @protected
     */
    override getSimplifiedGeometryInternal(squaredTolerance: number): Polygon {
        /** @type */
        const simplifiedFlatCoordinates: number[] = [];
        /** @type */
        const simplifiedEnds: number[] = [];
        simplifiedFlatCoordinates.length = quantizeArray(
            this.flatCoordinates,
            0,
            this.ends_,
            this.stride,
            Math.sqrt(squaredTolerance),
            simplifiedFlatCoordinates,
            0,
            simplifiedEnds,
        );
        return new Polygon(simplifiedFlatCoordinates, 'XY', simplifiedEnds);
    }

    /**
     * Get the type of this geometry.
     *
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'Polygon';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        return intersectsLinearRingArray(
            this.getOrientedFlatCoordinates(),
            0,
            this.ends_,
            this.stride,
            extent,
        );
    }

    /**
     * Set the coordinates of the polygon.
     * @param coordinates Coordinates.
     * @param layout Layout.
     * @api
     */
    setCoordinates(coordinates: Array<Coordinate[]>, layout?: GeometryLayout) {
        this.setLayout(layout, coordinates, 2);
        if (!this.flatCoordinates) {
            this.flatCoordinates = [];
        }
        const ends = deflateCoordinatesArray(
            this.flatCoordinates,
            0,
            coordinates,
            this.stride,
            this.ends_,
        );
        this.flatCoordinates.length = ends.length === 0
            ? 0
            : ends[ends.length - 1];
        this.changed();
    }
}

export default Polygon;


/**
 * Create an approximation of a circle on the surface of a sphere.
 *
 * @param center Center (`[lon, lat]` in degrees).
 * @param radius The great-circle distance from the center to
 *     the polygon vertices in meters.
 * @param n Optional number of vertices for the resulting
 *     polygon. Default is `32`.
 * @param sphereRadius Optional radius for the sphere (defaults to
 *     the Earth's mean radius using the WGS84 ellipsoid).
 * @return The "circular" polygon.
 * @api
 */
export function circular(
    center: Coordinate, radius: number, n?: number, sphereRadius?: number
): Polygon {
    n = n ? n : 32;
    /** @type */
    const flatCoordinates: number[] = [];
    for (let i = 0; i < n; ++i) {
        extend(
            flatCoordinates,
            sphereOffset(center, radius, (2 * Math.PI * i) / n, sphereRadius),
        );
    }
    flatCoordinates.push(flatCoordinates[0], flatCoordinates[1]);
    return new Polygon(flatCoordinates, 'XY', [flatCoordinates.length]);
}


/**
 * Create a polygon from an extent.
 *
 * The layout used is `XY`.
 *
 * @param extent The extent.
 * @return The polygon.
 * @api
 */
export function fromExtent(extent: Extent): Polygon {
    if (isEmpty(extent)) {
        throw new Error('Cannot create polygon from empty extent');
    }
    const minX = extent[0];
    const minY = extent[1];
    const maxX = extent[2];
    const maxY = extent[3];
    const flatCoordinates = [
        minX,
        minY,
        minX,
        maxY,
        maxX,
        maxY,
        maxX,
        minY,
        minX,
        minY,
    ];
    return new Polygon(flatCoordinates, 'XY', [flatCoordinates.length]);
}


/**
 * Create a regular polygon from a circle.
 *
 * @param circle Circle geometry.
 * @param sides Number of sides of the polygon. Default is 32.
 * @param angle Start angle for the first vertex of the polygon in
 *     counter-clockwise radians. 0 means East. Default is 0.
 * @return Polygon geometry.
 * @api
 */
export function fromCircle(
    circle: Circle, sides?: number, angle?: number
): Polygon {
    sides = sides ? sides : 32;
    const stride = circle.getStride();
    const layout = circle.getLayout();
    const center = circle.getCenter();
    const arrayLength = stride * (sides + 1);
    const flatCoordinates = new Array(arrayLength);
    for (let i = 0; i < arrayLength; i += stride) {
        flatCoordinates[i] = 0;
        flatCoordinates[i + 1] = 0;
        for (let j = 2; j < stride; j++) {
            flatCoordinates[i + j] = center[j];
        }
    }
    const ends = [flatCoordinates.length];
    const polygon = new Polygon(flatCoordinates, layout, ends);
    makeRegular(polygon, center, circle.getRadius(), angle);
    return polygon;
}


/**
 * Modify the coordinates of a polygon to make it a regular polygon.
 *
 * @param polygon Polygon geometry.
 * @param center Center of the regular polygon.
 * @param radius Radius of the regular polygon.
 * @param angle Start angle for the first vertex of the polygon in
 *     counter-clockwise radians. 0 means East. Default is 0.
 */
export function makeRegular(
    polygon: Polygon, center: Coordinate, radius: number, angle?: number
) {
    const flatCoordinates = polygon.getFlatCoordinates();
    const stride = polygon.getStride();
    const sides = flatCoordinates.length / stride - 1;
    const startAngle = angle ? angle : 0;
    for (let i = 0; i <= sides; ++i) {
        const offset = i * stride;
        const angle = startAngle + (modulo(i, sides) * 2 * Math.PI) / sides;
        flatCoordinates[offset] = center[0] + radius * Math.cos(angle);
        flatCoordinates[offset + 1] = center[1] + radius * Math.sin(angle);
    }
    polygon.changed();
}
