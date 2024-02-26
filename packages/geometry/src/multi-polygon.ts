import { extend } from '@olts/core/array';
import { Coordinate } from '@olts/core/coordinate';
import { Extent } from '@olts/core/extent';
import { closestSquaredDistanceXY } from '@olts/core/extent';

import { MultiPoint } from './multi-point';
import { Polygon } from './polygon';
import { SimpleGeometry } from './simple-geometry';
import {
    assignClosestMultiArrayPoint,
    multiArrayMaxSquaredDelta,
} from './flat/closest';
import { deflateMultiCoordinatesArray } from './flat/deflate';
import { getInteriorPointsOfMultiArray } from './flat/interior-point';
import { inflateMultiCoordinatesArray } from './flat/inflate';
import { intersectsLinearRingMultiArray } from './flat/intersects-extent';
import {
    linearRingssAreOriented,
    orientLinearRingsArray,
} from './flat/orient';
import { linearRingss as linearRingssArea } from './flat/area';
import { linearRingss as linearRingssCenter } from './flat/center';
import { linearRingssContainsXY } from './flat/contains';
import { quantizeMultiArray } from './flat/simplify';
import { GeometryLayout, Type } from './geometry';


/**
 * Multi-polygon geometry.
 *
 * @api
 */
export class MultiPolygon extends SimpleGeometry {
    /**
     *
     */
    private endss_: number[][] = [];

    /**
     *
     */
    private flatInteriorPointsRevision_: number = -1;

    /**
     *
     */
    private flatInteriorPoints_: number[] | null = null;

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
     * @param coordinates Coordinates. For internal use, flat coordinates in
     *     combination with `layout` and `endss` are also accepted.
     * @param layout Layout.
     * @param endss Array of ends for internal use with flat coordinates.
     */
    constructor(
        coordinates: Array<Array<Coordinate[]> | Polygon> | number[],
        layout?: GeometryLayout, endss?: number[][]
    ) {
        super();

        if (!endss && !Array.isArray(coordinates[0])) {
            const polygons = coordinates as Polygon[];
            const flatCoordinates: number[] = [];
            const thisEndss = [];
            for (let i = 0, ii = polygons.length; i < ii; ++i) {
                const polygon = polygons[i];
                const offset = flatCoordinates.length;
                const ends = polygon.getEnds();
                for (let j = 0, jj = ends.length; j < jj; ++j) {
                    ends[j] += offset;
                }
                extend(flatCoordinates, polygon.getFlatCoordinates());
                thisEndss.push(ends);
            }
            layout = polygons.length === 0
                ? this.getLayout()
                : polygons[0].getLayout();
            coordinates = flatCoordinates;
            endss = thisEndss;
        }
        if (layout !== undefined && endss) {
            this.setFlatCoordinates(
                layout,
                coordinates as number[],
            );
            this.endss_ = endss;
        } else {
            this.setCoordinates(
                coordinates as Coordinate[][][],
                layout,
            );
        }
    }

    /**
     * Append the passed polygon to this multi-polygon.
     *
     * @param polygon Polygon.
     * @api
     */
    appendPolygon(polygon: Polygon) {
        let ends: number[];
        if (!this.flatCoordinates) {
            this.flatCoordinates = polygon.getFlatCoordinates().slice();
            ends = polygon.getEnds().slice();
            this.endss_.push();
        } else {
            const offset = this.flatCoordinates.length;
            extend(this.flatCoordinates, polygon.getFlatCoordinates());
            ends = polygon.getEnds().slice();
            for (let i = 0, ii = ends.length; i < ii; ++i) {
                ends[i] += offset;
            }
        }
        this.endss_.push(ends);
        this.changed();
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): MultiPolygon {
        const len = this.endss_.length;
        const newEndss = new Array(len);
        for (let i = 0; i < len; ++i) {
            newEndss[i] = this.endss_[i].slice();
        }

        const multiPolygon = new MultiPolygon(
            this.flatCoordinates.slice(),
            this.layout,
            newEndss,
        );
        multiPolygon.applyProperties(this);

        return multiPolygon;
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
                multiArrayMaxSquaredDelta(
                    this.flatCoordinates,
                    0,
                    this.endss_,
                    this.stride,
                    0,
                ),
            );
            this.maxDeltaRevision_ = this.getRevision();
        }
        return assignClosestMultiArrayPoint(
            this.getOrientedFlatCoordinates(),
            0,
            this.endss_,
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
        return linearRingssContainsXY(
            this.getOrientedFlatCoordinates(),
            0,
            this.endss_,
            this.stride,
            x,
            y,
        );
    }

    /**
     * Return the area of the multi-polygon on projected plane.
     *
     * @return Area (on projected plane).
     * @api
     */
    getArea(): number {
        return linearRingssArea(
            this.getOrientedFlatCoordinates(),
            0,
            this.endss_,
            this.stride,
        );
    }

    /**
     * Get the coordinate array for this geometry.
     *
     * This array has the structure of a GeoJSON coordinate array for
     * multi-polygons.
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
    getCoordinates(right?: boolean): Array<Array<Coordinate[]>> {
        let flatCoordinates;
        if (right !== undefined) {
            flatCoordinates = this.getOrientedFlatCoordinates().slice();
            orientLinearRingsArray(
                flatCoordinates,
                0,
                this.endss_,
                this.stride,
                right,
            );
        } else {
            flatCoordinates = this.flatCoordinates;
        }

        return inflateMultiCoordinatesArray(
            flatCoordinates,
            0,
            this.endss_,
            this.stride,
        );
    }

    /**
     * @return Endss.
     */
    getEndss(): number[][] {
        return this.endss_;
    }

    /**
     * @return Flat interior points.
     */
    getFlatInteriorPoints(): number[] {
        if (this.flatInteriorPointsRevision_ != this.getRevision()) {
            const flatCenters = linearRingssCenter(
                this.flatCoordinates,
                0,
                this.endss_,
                this.stride,
            );
            this.flatInteriorPoints_ = getInteriorPointsOfMultiArray(
                this.getOrientedFlatCoordinates(),
                0,
                this.endss_,
                this.stride,
                flatCenters,
            );
            this.flatInteriorPointsRevision_ = this.getRevision();
        }
        return this.flatInteriorPoints_ as number[];
    }

    /**
     * Return the interior points as {@link MultiPoint multipoint}.
     *
     * @return Interior points as XYM coordinates, where M is the length of the
     * horizontal intersection that the point belongs to.
     * @api
     */
    getInteriorPoints(): MultiPoint {
        return new MultiPoint(this.getFlatInteriorPoints().slice(), 'XYM');
    }

    /**
     * @return Oriented flat coordinates.
     */
    getOrientedFlatCoordinates(): number[] {
        if (this.orientedRevision_ != this.getRevision()) {
            const flatCoordinates = this.flatCoordinates;
            if (linearRingssAreOriented(
                flatCoordinates, 0, this.endss_, this.stride
            )) {
                this.orientedFlatCoordinates_ = flatCoordinates;
            } else {
                this.orientedFlatCoordinates_ = flatCoordinates.slice();
                this.orientedFlatCoordinates_.length = orientLinearRingsArray(
                    this.orientedFlatCoordinates_,
                    0,
                    this.endss_,
                    this.stride,
                );
            }
            this.orientedRevision_ = this.getRevision();
        }
        return this.orientedFlatCoordinates_ as number[];
    }

    /**
     * @param squaredTolerance Squared tolerance.
     * @return Simplified MultiPolygon.
     * @protected
     */
    override getSimplifiedGeometryInternal(
        squaredTolerance: number
    ): MultiPolygon {
        const simplifiedFlatCoordinates: number[] = [];
        const simplifiedEndss: number[][] = [];
        simplifiedFlatCoordinates.length = quantizeMultiArray(
            this.flatCoordinates,
            0,
            this.endss_,
            this.stride,
            Math.sqrt(squaredTolerance),
            simplifiedFlatCoordinates,
            0,
            simplifiedEndss,
        );
        return new MultiPolygon(
            simplifiedFlatCoordinates, 'XY', simplifiedEndss
        );
    }

    /**
     * Return the polygon at the specified index.
     * @param index Index.
     * @return Polygon.
     * @api
     */
    getPolygon(index: number): Polygon | null {
        if (index < 0 || this.endss_.length <= index) {
            return null;
        }
        let offset;
        if (index === 0) {
            offset = 0;
        } else {
            const prevEnds = this.endss_[index - 1];
            offset = prevEnds[prevEnds.length - 1];
        }
        const ends = this.endss_[index].slice();
        const end = ends[ends.length - 1];
        if (offset !== 0) {
            for (let i = 0, ii = ends.length; i < ii; ++i) {
                ends[i] -= offset;
            }
        }
        return new Polygon(
            this.flatCoordinates.slice(offset, end),
            this.layout,
            ends,
        );
    }

    /**
     * Return the polygons of this multi-polygon.
     *
     * @return Polygons.
     * @api
     */
    getPolygons():Polygon[] {
        const layout = this.layout;
        const flatCoordinates = this.flatCoordinates;
        const endss = this.endss_;
        const polygons = [];
        let offset = 0;
        for (let i = 0, ii = endss.length; i < ii; ++i) {
            const ends = endss[i].slice();
            const end = ends[ends.length - 1];
            if (offset !== 0) {
                for (let j = 0, jj = ends.length; j < jj; ++j) {
                    ends[j] -= offset;
                }
            }
            const polygon = new Polygon(
                flatCoordinates.slice(offset, end),
                layout,
                ends,
            );
            polygons.push(polygon);
            offset = end;
        }
        return polygons;
    }

    /**
     * Get the type of this geometry.
     *
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'MultiPolygon';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        return intersectsLinearRingMultiArray(
            this.getOrientedFlatCoordinates(),
            0,
            this.endss_,
            this.stride,
            extent,
        );
    }

    /**
     * Set the coordinates of the multi-polygon.
     *
     * @param coordinates Coordinates.
     * @param layout Layout.
     * @api
     */
    setCoordinates(
        coordinates: Array<Array<Coordinate[]>>,
        layout?: GeometryLayout
    ) {
        this.setLayout(layout, coordinates, 3);
        if (!this.flatCoordinates) {
            this.flatCoordinates = [];
        }
        const endss = deflateMultiCoordinatesArray(
            this.flatCoordinates,
            0,
            coordinates,
            this.stride,
            this.endss_,
        );
        if (endss.length === 0) {
            this.flatCoordinates.length = 0;
        } else {
            const lastEnds = endss[endss.length - 1];
            this.flatCoordinates.length =
                lastEnds.length === 0 ? 0 : lastEnds[lastEnds.length - 1];
        }
        this.changed();
    }
}


export default MultiPolygon;
