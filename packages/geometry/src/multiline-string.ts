import { extend } from '@olts/core/array';
import { Coordinate } from '@olts/core/coordinate';
import { Extent, closestSquaredDistanceXY } from '@olts/core/extent';

import { LineString } from './line-string';
import { SimpleGeometry } from './simple-geometry';
import { arrayMaxSquaredDelta, assignClosestArrayPoint } from './flat/closest';
import { deflateCoordinatesArray } from './flat/deflate';
import { douglasPeuckerArray } from './flat/simplify';
import { inflateCoordinatesArray } from './flat/inflate';
import {
    interpolatePoint,
    lineStringsCoordinateAtM,
} from './flat/interpolate';
import { intersectsLineStringArray } from './flat/intersects-extent';
import { GeometryLayout, Type } from './geometry';


/**
 * Multi-line-string geometry.
 *
 * @api
 */
export class MultiLineString extends SimpleGeometry {
    /**
     *
     */
    private ends_: number[] = [];

    /**
     *
     */
    private maxDelta_: number = -1;

    /**
     *
     */
    private maxDeltaRevision_: number = -1;


    /**
     * @param coordinates Coordinates or LineString geometries. (For internal
     *     use, flat coordinates in combination with `layout` and `ends` are
     *     also accepted.)
     * @param layout Layout.
     * @param ends Flat coordinate ends for internal use.
     */
    constructor(
        coordinates: Array<Coordinate[] | LineString> | number[],
        layout?: GeometryLayout,
        ends?: number[]
    ) {
        super();


        if (Array.isArray(coordinates[0])) {
            this.setCoordinates(
                coordinates as Coordinate[][],
                layout,
            );
        } else if (layout !== undefined && ends) {
            this.setFlatCoordinates(
                layout,
                coordinates as number[],
            );
            this.ends_ = ends;
        } else {
            const lineStrings = coordinates as LineString[];
            const flatCoordinates: number[] = [];
            const ends = [];
            for (let i = 0, ii = lineStrings.length; i < ii; ++i) {
                const lineString = lineStrings[i];
                extend(flatCoordinates, lineString.getFlatCoordinates());
                ends.push(flatCoordinates.length);
            }
            const layout =
                lineStrings.length === 0
                    ? this.getLayout()
                    : lineStrings[0].getLayout();
            this.setFlatCoordinates(layout, flatCoordinates);
            this.ends_ = ends;
        }
    }

    /**
     * Append the passed line-string to the multiline-string.
     *
     * @param lineString LineString.
     * @api
     */
    appendLineString(lineString: LineString) {
        extend(this.flatCoordinates, lineString.getFlatCoordinates().slice());
        this.ends_.push(this.flatCoordinates.length);
        this.changed();
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): MultiLineString {
        const multiLineString = new MultiLineString(
            this.flatCoordinates.slice(),
            this.layout,
            this.ends_.slice(),
        );
        multiLineString.applyProperties(this);
        return multiLineString;
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
            false,
            x,
            y,
            closestPoint,
            minSquaredDistance,
        );
    }

    /**
     * Returns the coordinate at `m` using linear interpolation, or `null` if
     * no such coordinate exists.
     *
     * `extrapolate` controls extrapolation beyond the range of Ms in the
     * MultiLineString. If `extrapolate` is `true` then Ms less than the first
     * M will return the first coordinate and Ms greater than the last M will
     * return the last coordinate.
     *
     * `interpolate` controls interpolation between consecutive LineStrings
     * within the MultiLineString. If `interpolate` is `true` the coordinates
     * will be linearly interpolated between the last coordinate of one
     * LineString and the first coordinate of the next LineString.  If
     * `interpolate` is `false` then the function will return `null` for Ms
     * falling between LineStrings.
     *
     * @param m M.
     * @param extrapolate Extrapolate. Default is `false`.
     * @param interpolate Interpolate. Default is `false`.
     * @return Coordinate.
     * @api
     */
    getCoordinateAtM(
        m: number, extrapolate?: boolean, interpolate?: boolean
    ): Coordinate | null {
        if (
            (this.layout != 'XYM' && this.layout != 'XYZM') ||
            this.flatCoordinates.length === 0
        ) {
            return null;
        }
        extrapolate = extrapolate !== undefined ? extrapolate : false;
        interpolate = interpolate !== undefined ? interpolate : false;
        return lineStringsCoordinateAtM(
            this.flatCoordinates,
            0,
            this.ends_,
            this.stride,
            m,
            extrapolate,
            interpolate,
        );
    }

    /**
     * Return the coordinates of the multiline-string.
     *
     * @return Coordinates.
     * @api
     */
    getCoordinates(): Array<Coordinate[]> {
        return inflateCoordinatesArray(
            this.flatCoordinates,
            0,
            this.ends_,
            this.stride,
        );
    }

    /**
     * @return Ends.
     */
    getEnds(): number[] {
        return this.ends_;
    }

    /**
     * Return the line-string at the specified index.
     *
     * @param index Index.
     * @return LineString.
     * @api
     */
    getLineString(index: number): LineString | null {
        if (index < 0 || this.ends_.length <= index) {
            return null;
        }
        return new LineString(
            this.flatCoordinates.slice(
                index === 0 ? 0 : this.ends_[index - 1],
                this.ends_[index],
            ),
            this.layout,
        );
    }

    /**
     * Return the line-strings of this multiline-string.
     *
     * @return LineStrings.
     * @api
     */
    getLineStrings(): Array<LineString> {
        const flatCoordinates = this.flatCoordinates;
        const ends = this.ends_;
        const layout = this.layout;

        const lineStrings: LineString[] = [];
        let offset = 0;
        for (let i = 0, ii = ends.length; i < ii; ++i) {
            const end = ends[i];
            const lineString = new LineString(
                flatCoordinates.slice(offset, end),
                layout,
            );
            lineStrings.push(lineString);
            offset = end;
        }
        return lineStrings;
    }

    /**
     * @return Flat midpoints.
     */
    getFlatMidpoints(): number[] {
        const midpoints: number[] = [];
        const flatCoordinates = this.flatCoordinates;
        let offset = 0;
        const ends = this.ends_;
        const stride = this.stride;
        for (let i = 0, ii = ends.length; i < ii; ++i) {
            const end = ends[i];
            const midpoint = interpolatePoint(
                flatCoordinates,
                offset,
                end,
                stride,
                0.5,
            );
            extend(midpoints, midpoint);
            offset = end;
        }
        return midpoints;
    }

    /**
     * @param squaredTolerance Squared tolerance.
     * @return Simplified MultiLineString.
     * @protected
     */
    override getSimplifiedGeometryInternal(
        squaredTolerance: number
    ): MultiLineString {
        const simplifiedFlatCoordinates: number[] = [];
        const simplifiedEnds: number[] = [];
        simplifiedFlatCoordinates.length = douglasPeuckerArray(
            this.flatCoordinates,
            0,
            this.ends_,
            this.stride,
            squaredTolerance,
            simplifiedFlatCoordinates,
            0,
            simplifiedEnds,
        );
        return new MultiLineString(
            simplifiedFlatCoordinates, 'XY', simplifiedEnds
        );
    }

    /**
     * Get the type of this geometry.
     *
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'MultiLineString';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        return intersectsLineStringArray(
            this.flatCoordinates,
            0,
            this.ends_,
            this.stride,
            extent,
        );
    }

    /**
     * Set the coordinates of the multiline-string.
     *
     * @param coordinates Coordinates.
     * @param layout Layout.
     * @api
     */
    setCoordinates(
        coordinates: Coordinate[][], layout?: GeometryLayout
    ) {
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


export default MultiLineString;
