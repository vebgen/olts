
import { Coordinate } from '@olts/core/coordinate';
import { EventType, EventsKey, listen, unlistenByKey } from '@olts/events';
import {
    closestSquaredDistanceXY,
    createOrUpdateEmpty,
    extend,
    getCenter,
    Extent,
} from '@olts/core/extent';
import { TransformFunction } from '@olts/core/proj';

import Geometry, { Type } from './geometry';


/**
 * An array of {@link Geometry} objects.
 *
 * @api
 */
export class GeometryCollection extends Geometry {
    /**
     *
     */
    private geometries_: Geometry[];

    /**
     *
     */
    private changeEventsKeys_: EventsKey[] = [];


    /**
     * @param geometries Geometries.
     */
    constructor(geometries: Geometry[]) {
        super();
        this.geometries_ = geometries;
        this.listenGeometriesChange_();
    }

    /**
     *
     */
    private unlistenGeometriesChange_() {
        this.changeEventsKeys_.forEach(unlistenByKey);
        this.changeEventsKeys_.length = 0;
    }

    /**
     *
     */
    private listenGeometriesChange_() {
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            this.changeEventsKeys_.push(
                listen(geometries[i], EventTypes.CHANGE, this.changed, this),
            );
        }
    }

    /**
     * Make a complete copy of the geometry.
     *
     * @return Clone.
     * @api
     */
    clone(): GeometryCollection {
        const geometryCollection = new GeometryCollection(
            cloneGeometries(this.geometries_),
        );
        geometryCollection.applyProperties(this);
        return geometryCollection;
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
    ) {
        if (
            minSquaredDistance <
            closestSquaredDistanceXY(this.getExtent(), x, y)
        ) {
            return minSquaredDistance;
        }
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            minSquaredDistance = geometries[i].closestPointXY(
                x,
                y,
                closestPoint,
                minSquaredDistance,
            );
        }
        return minSquaredDistance;
    }

    /**
     * @param x X.
     * @param y Y.
     * @return Contains (x, y).
     */
    override containsXY(x: number, y: number) {
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            if (geometries[i].containsXY(x, y)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param extent Extent.
     * @protected
     * @return extent Extent.
     */
    computeExtent(extent: Extent): Extent {
        createOrUpdateEmpty(extent);
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            extend(extent, geometries[i].getExtent());
        }
        return extent;
    }

    /**
     * Return the geometries that make up this geometry collection.
     *
     * @return Geometries.
     * @api
     */
    getGeometries(): Geometry[] {
        return cloneGeometries(this.geometries_);
    }

    /**
     * @return Geometries.
     */
    getGeometriesArray(): Geometry[] {
        return this.geometries_;
    }

    /**
     * @return Geometries.
     */
    getGeometriesArrayRecursive(): Geometry[] {
        let geometriesArray: Geometry[] = [];
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            if (geometries[i].getType() === this.getType()) {
                geometriesArray = geometriesArray.concat(
                    (
                        geometries[i] as GeometryCollection
                    ).getGeometriesArrayRecursive(),
                );
            } else {
                geometriesArray.push(geometries[i]);
            }
        }
        return geometriesArray;
    }

    /**
     * Create a simplified version of this geometry using the Douglas Peucker
     * algorithm.
     *
     * @param squaredTolerance Squared tolerance.
     * @return Simplified GeometryCollection.
     */
    getSimplifiedGeometry(squaredTolerance: number): GeometryCollection {
        if (this.simplifiedGeometryRevision !== this.getRevision()) {
            this.simplifiedGeometryMaxMinSquaredTolerance = 0;
            this.simplifiedGeometryRevision = this.getRevision();
        }
        if (
            squaredTolerance < 0 ||
            (
                this.simplifiedGeometryMaxMinSquaredTolerance !== 0 &&
                squaredTolerance < this.simplifiedGeometryMaxMinSquaredTolerance
            )
        ) {
            return this;
        }

        const simplifiedGeometries = [];
        const geometries = this.geometries_;
        let simplified = false;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            const geometry = geometries[i];
            const simplifiedGeometry =
                geometry.getSimplifiedGeometry(squaredTolerance);
            simplifiedGeometries.push(simplifiedGeometry);
            if (simplifiedGeometry !== geometry) {
                simplified = true;
            }
        }
        if (simplified) {
            const simplifiedGeometryCollection = new GeometryCollection(
                simplifiedGeometries,
            );
            return simplifiedGeometryCollection;
        }
        this.simplifiedGeometryMaxMinSquaredTolerance = squaredTolerance;
        return this;
    }

    /**
     * Get the type of this geometry.
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return 'GeometryCollection';
    }

    /**
     * Test if the geometry and the passed extent intersect.
     *
     * @param extent Extent.
     * @return `true` if the geometry and the extent intersect.
     * @api
     */
    intersectsExtent(extent: Extent): boolean {
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            if (geometries[i].intersectsExtent(extent)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @return Is empty.
     */
    isEmpty() {
        return this.geometries_.length === 0;
    }

    /**
     * Rotate the geometry around a given coordinate. This modifies the geometry
     * coordinates in place.
     * @param angle Rotation angle in radians.
     * @param anchor The rotation center.
     * @api
     */
    rotate(angle: number, anchor: Coordinate) {
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            geometries[i].rotate(angle, anchor);
        }
        this.changed();
    }

    /**
     * Scale the geometry (with an optional origin).
     *
     * This modifies the geometry coordinates in place.
     *
     * @abstract
     * @param sx The scaling factor in the x-direction.
     * @param sy The scaling factor in the y-direction (defaults to sx).
     * @param anchor The scale origin (defaults to the center of the geometry
     *     extent).
     * @api
     */
    scale(sx: number, sy?: number, anchor?: Coordinate) {
        if (!anchor) {
            anchor = getCenter(this.getExtent());
        }
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            geometries[i].scale(sx, sy, anchor);
        }
        this.changed();
    }

    /**
     * Set the geometries that make up this geometry collection.
     *
     * @param geometries Geometries.
     * @api
     */
    setGeometries(geometries: Geometry[]) {
        this.setGeometriesArray(cloneGeometries(geometries));
    }

    /**
     * @param geometries Geometries.
     */
    setGeometriesArray(geometries: Geometry[]) {
        this.unlistenGeometriesChange_();
        this.geometries_ = geometries;
        this.listenGeometriesChange_();
        this.changed();
    }

    /**
     * Apply a transform function to the coordinates of the geometry.
     *
     * The geometry is modified in place. If you do not want the geometry
     * modified in place, first `clone()` it and then use this function on the
     * clone.
     *
     * @param transformFn Transform function. Called with a flat array of
     *    geometry coordinates.
     * @api
     */
    applyTransform(transformFn: TransformFunction) {
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            geometries[i].applyTransform(transformFn);
        }
        this.changed();
    }

    /**
     * Translate the geometry.
     *
     * This modifies the geometry coordinates in place.  If instead you want a
     * new geometry, first `clone()` this geometry.
     *
     * @param deltaX Delta X.
     * @param deltaY Delta Y.
     * @api
     */
    translate(deltaX: number, deltaY: number) {
        const geometries = this.geometries_;
        for (let i = 0, ii = geometries.length; i < ii; ++i) {
            geometries[i].translate(deltaX, deltaY);
        }
        this.changed();
    }

    /**
     * Clean up.
     */
    override disposeInternal() {
        this.unlistenGeometriesChange_();
        super.disposeInternal();
    }
}


/**
 * @param geometries Geometries.
 * @return Cloned geometries.
 */
function cloneGeometries(geometries: Geometry[]): Geometry[] {
    return geometries.map((geometry) => geometry.clone());
}

export default GeometryCollection;
