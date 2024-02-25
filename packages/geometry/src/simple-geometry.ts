import { Transform } from '@olts/core/transform';
import { Coordinate } from '@olts/core/coordinate';
import {
    createOrUpdateFromFlatCoordinates, getCenter, Extent
} from '@olts/core/extent';

import { Geometry, GeometryLayout } from './geometry';
import { rotate, scale, transform2D, translate } from './flat/transform';
import { TransformFunction } from '@olts/core/proj';


/**
 * Abstract base class; only used for creating subclasses; do not instantiate
 * in apps, as cannot be rendered.
 *
 * @api
 */
export abstract class SimpleGeometry extends Geometry {

    /**
     *
     */
    protected layout: GeometryLayout = 'XY';

    /**
     *
     */
    protected stride: number = 2;

    /**
     *
     */
    protected flatCoordinates: number[] = [];

    /**
     * @param extent Extent.
     * @return extent Extent.
     */
    protected computeExtent(extent: Extent): Extent {
        return createOrUpdateFromFlatCoordinates(
            this.flatCoordinates,
            0,
            this.flatCoordinates.length,
            this.stride,
            extent,
        );
    }

    /**
     *
     * @return Coordinates.
     */
    abstract getCoordinates(): any[] | null;

    /**
     * Return the first coordinate of the geometry.
     *
     * @return First coordinate.
     * @api
     */
    getFirstCoordinate(): Coordinate {
        return this.flatCoordinates.slice(0, this.stride);
    }

    /**
     * @return Flat coordinates.
     */
    getFlatCoordinates(): number[] {
        return this.flatCoordinates;
    }

    /**
     * Return the last coordinate of the geometry.
     *
     * @return Last point.
     * @api
     */
    getLastCoordinate(): Coordinate {
        return this.flatCoordinates.slice(
            this.flatCoordinates.length - this.stride,
        );
    }

    /**
     * Return the {@link GeometryLayout layout} of the geometry.
     *
     * @return Layout.
     * @api
     */
    getLayout(): GeometryLayout {
        return this.layout;
    }

    /**
     * Create a simplified version of this geometry using the Douglas Peucker
     * algorithm.
     *
     * @param squaredTolerance Squared tolerance.
     * @return Simplified geometry.
     */
    getSimplifiedGeometry(squaredTolerance: number): SimpleGeometry {
        if (this.simplifiedGeometryRevision !== this.getRevision()) {
            this.simplifiedGeometryMaxMinSquaredTolerance = 0;
            this.simplifiedGeometryRevision = this.getRevision();
        }
        // If squaredTolerance is negative or if we know that simplification
        // will not have any effect then just return this.
        if (
            squaredTolerance < 0 ||
            (
                this.simplifiedGeometryMaxMinSquaredTolerance !== 0 &&
                squaredTolerance <= this.simplifiedGeometryMaxMinSquaredTolerance
            )
        ) {
            return this;
        }

        const simplifiedGeometry =
            this.getSimplifiedGeometryInternal(squaredTolerance);
        const simplifiedFlatCoordinates =
            simplifiedGeometry.getFlatCoordinates();
        if (simplifiedFlatCoordinates.length < this.flatCoordinates.length) {
            return simplifiedGeometry;
        }
        // Simplification did not actually remove any coordinates.  We now know
        // that any calls to getSimplifiedGeometry with a squaredTolerance less
        // than or equal to the current squaredTolerance will also not have any
        // effect.  This allows us to short circuit simplification (saving CPU
        // cycles) and prevents the cache of simplified geometries from filling
        // up with useless identical copies of this geometry (saving memory).
        this.simplifiedGeometryMaxMinSquaredTolerance = squaredTolerance;
        return this;
    }

    /**
     * @param squaredTolerance Squared tolerance.
     * @return Simplified geometry.
     */
    protected getSimplifiedGeometryInternal(
        squaredTolerance: number
    ): SimpleGeometry {
        return this;
    }

    /**
     * @return Stride.
     */
    getStride(): number {
        return this.stride;
    }

    /**
     * @param layout Layout.
     * @param flatCoordinates Flat coordinates.
     */
    setFlatCoordinates(layout: GeometryLayout, flatCoordinates: number[]) {
        this.stride = getStrideForLayout(layout);
        this.layout = layout;
        this.flatCoordinates = flatCoordinates;
    }

    /**
     *
     * @param coordinates Coordinates.
     * @param layout Layout.
     */
    abstract setCoordinates(coordinates: any[], layout?: GeometryLayout): void;

    /**
     * @param layout Layout.
     * @param coordinates Coordinates.
     * @param nesting Nesting.
     */
    protected setLayout(
        layout: GeometryLayout | undefined,
        coordinates: any[],
        nesting: number
    ) {
        let stride;
        if (layout) {
            stride = getStrideForLayout(layout);
        } else {
            for (let i = 0; i < nesting; ++i) {
                if (coordinates.length === 0) {
                    this.layout = 'XY';
                    this.stride = 2;
                    return;
                }
                coordinates = /** @type {Array<unknown>} */ (coordinates[0]);
            }
            stride = coordinates.length;
            layout = getLayoutForStride(stride);
        }
        this.layout = layout;
        this.stride = stride;
    }

    /**
     * Apply a transform function to the coordinates of the geometry.
     *
     * The geometry is modified in place. If you do not want the geometry
     * modified in place, first `clone()` it and then use this function on the
     * clone.
     *
     * @param transformFn Transform function. Called with a flat array of
     * geometry coordinates.
     * @api
     */
    applyTransform(transformFn: TransformFunction) {
        if (this.flatCoordinates) {
            transformFn(
                this.flatCoordinates, this.flatCoordinates, this.stride
            );
            this.changed();
        }
    }

    /**
     * Rotate the geometry around a given coordinate.
     *
     * This modifies the geometry coordinates in place.
     *
     * @param angle Rotation angle in counter-clockwise radians.
     * @param anchor The rotation center.
     * @api
     */
    rotate(angle: number, anchor: Coordinate) {
        const flatCoordinates = this.getFlatCoordinates();
        if (flatCoordinates) {
            const stride = this.getStride();
            rotate(
                flatCoordinates,
                0,
                flatCoordinates.length,
                stride,
                angle,
                anchor,
                flatCoordinates,
            );
            this.changed();
        }
    }

    /**
     * Scale the geometry (with an optional origin).
     *
     * This modifies the geometry coordinates in place.
     *
     * @param sx The scaling factor in the x-direction.
     * @param sy The scaling factor in the y-direction (defaults to sx).
     * @param anchor The scale origin (defaults to the center of the geometry
     *     extent).
     * @api
     */
    scale(sx: number, sy?: number, anchor?: Coordinate) {
        if (sy === undefined) {
            sy = sx;
        }
        if (!anchor) {
            anchor = getCenter(this.getExtent());
        }
        const flatCoordinates = this.getFlatCoordinates();
        if (flatCoordinates) {
            const stride = this.getStride();
            scale(
                flatCoordinates,
                0,
                flatCoordinates.length,
                stride,
                sx,
                sy,
                anchor,
                flatCoordinates,
            );
            this.changed();
        }
    }

    /**
     * Translate the geometry.
     *
     * This modifies the geometry coordinates in place. If instead you want a
     * new geometry, first `clone()` this geometry.
     *
     * @param deltaX Delta X.
     * @param deltaY Delta Y.
     * @api
     */
    translate(deltaX: number, deltaY: number) {
        const flatCoordinates = this.getFlatCoordinates();
        if (flatCoordinates) {
            const stride = this.getStride();
            translate(
                flatCoordinates,
                0,
                flatCoordinates.length,
                stride,
                deltaX,
                deltaY,
                flatCoordinates,
            );
            this.changed();
        }
    }
}


/**
 * @param stride Stride.
 * @return layout Layout.
 */
export function getLayoutForStride(stride: number): GeometryLayout {
    let layout: GeometryLayout;
    if (stride == 2) {
        layout = 'XY';
    } else if (stride == 3) {
        layout = 'XYZ';
    } else if (stride == 4) {
        layout = 'XYZM';
    } else {
        throw new Error('unsupported stride: ' + stride);
    }
    return layout;
}


/**
 * @param layout Layout.
 * @return Stride.
 */
export function getStrideForLayout(layout: GeometryLayout): number {
    let stride;
    if (layout == 'XY') {
        stride = 2;
    } else if (layout == 'XYZ' || layout == 'XYM') {
        stride = 3;
    } else if (layout == 'XYZM') {
        stride = 4;
    } else {
        throw new Error('unsupported layout: ' + layout);
    }
    return stride;
}


/**
 * @param simpleGeometry Simple geometry.
 * @param transform Transform.
 * @param dest Destination.
 * @return Transformed flat coordinates.
 */
export function transformGeom2D(
    simpleGeometry: SimpleGeometry, transform: Transform, dest?: number[]
): null | number[] {
    const flatCoordinates = simpleGeometry.getFlatCoordinates();
    if (!flatCoordinates) {
        return null;
    }
    const stride = simpleGeometry.getStride();
    return transform2D(
        flatCoordinates,
        0,
        flatCoordinates.length,
        stride,
        transform,
        dest,
    );
}

export default SimpleGeometry;
