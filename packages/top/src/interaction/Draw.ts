
import { Circle } from '@olts/geometry';
import { BaseEvent as Event, EventsKey } from '@olts/events';
import type { EventType } from '@olts/events';
import Feature from '../Feature';
import { GeometryCollection } from '@olts/geometry';
import InteractionProperty from './Property';
import { LineString } from '@olts/geometry';
import MapBrowserEvent from '../Map/browser-event';
import MapBrowserEventType from '../Map/browser-event-types';
import { MultiLineString } from '@olts/geometry';
import { MultiPoint } from '@olts/geometry';
import { MultiPolygon } from '@olts/geometry';
import { Point } from '@olts/geometry';
import PointerInteraction from './Pointer';
import Polygon, { fromCircle, makeRegular } from '@olts/geometry';
import VectorLayer from '../layer/Vector';
import VectorSource from '../source/Vector';
import { FALSE, TRUE } from '@olts/core/functions';
import {
    always,
    never,
    noModifierKeys,
    shiftKeyOnly,
} from '../events/condition';
import {
    boundingExtent,
    getBottomLeft,
    getBottomRight,
    getTopLeft,
    getTopRight,
} from '@olts/core/extent';
import { clamp, squaredDistance, toFixed } from '@olts/core/math';
import { createEditingStyle } from '../style/Style';
import {
    distance,
    squaredDistance as squaredCoordinateDistance,
} from '../coordinate';
import { fromUserCoordinate, getUserProjection } from '../proj';
import { getStrideForLayout } from '@olts/geometry';

/**
 * @typedef {Object} Options
 * @property {GeometryType} type Geometry type of
 * the geometries being drawn with this instance.
 * @property [clickTolerance=6] The maximum distance in pixels between
 * "down" and "up" for a "up" event to be considered a "click" event and
 * actually add a point/vertex to the geometry being drawn.  The default of `6`
 * was chosen for the draw interaction to behave correctly on mouse as well as
 * on touch devices.
 * @property {import("../Collection").default<Feature>} [features]
 * Destination collection for the drawn features.
 * @property {VectorSource} [source] Destination source for
 * the drawn features.
 * @property [dragVertexDelay=500] Delay in milliseconds after pointerdown
 * before the current vertex can be dragged to its exact position.
 * @property [snapTolerance=12] Pixel distance for snapping to the
 * drawing finish. Must be greater than `0`.
 * @property {boolean} [stopClick=false] Stop click, singleclick, and
 * doubleclick events from firing during drawing.
 * @property [maxPoints] The number of points that can be drawn before
 * a polygon ring or line string is finished. By default there is no
 * restriction.
 * @property [minPoints] The number of points that must be drawn
 * before a polygon ring or line string can be finished. Default is `3` for
 * polygon rings and `2` for line strings.
 * @property {import("../events/condition").Condition} [finishCondition] A function
 * that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether the drawing can be finished. Not used when drawing
 * POINT or MULTI_POINT geometries.
 * @property {import("../style/Style").StyleLike|import("../style/flat").FlatStyleLike} [style]
 * Style for sketch features. The draw interaction can have up to three sketch features, depending on the mode.
 * It will always contain a feature with a `Point` geometry that corresponds to the current cursor position.
 * If the mode is `LineString` or `Polygon`, and there is at least one drawn point, it will also contain a feature with
 * a `LineString` geometry that corresponds to the line between the already drawn points and the current cursor position.
 * If the mode is `Polygon`, and there is at least one drawn point, it will also contain a feature with a `Polygon`
 * geometry that corresponds to the polygon between the already drawn points and the current cursor position
 * (note that this polygon has only two points if only one point is drawn).
 * If the mode is `Circle`, and there is one point drawn, it will also contain a feature with a `Circle` geometry whose
 * center is the drawn point and the radius is determined by the distance between the drawn point and the cursor.
 * @property {GeometryFunction} [geometryFunction]
 * Function that is called when a geometry's coordinates are updated.
 * @property [geometryName] Geometry name to use for features created
 * by the draw interaction.
 * @property {import("../events/condition").Condition} [condition] A function that
 * takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled.
 * By default {@link module:ol/events/condition.noModifierKeys}, i.e. a click,
 * adds a vertex or deactivates freehand drawing.
 * @property {boolean} [freehand=false] Operate in freehand mode for lines,
 * polygons, and circles.  This makes the interaction always operate in freehand
 * mode and takes precedence over any `freehandCondition` option.
 * @property {import("../events/condition").Condition} [freehandCondition]
 * Condition that activates freehand drawing for lines and polygons. This
 * function takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and
 * returns a boolean to indicate whether that event should be handled. The
 * default is {@link module:ol/events/condition.shiftKeyOnly}, meaning that the
 * Shift key activates freehand drawing.
 * @property {boolean|import("../events/condition").Condition} [trace=false] Trace a portion of another geometry.
 * Ignored when in freehand mode.
 * @property {VectorSource} [traceSource] Source for features to trace.  If tracing is active and a `traceSource` is
 * not provided, the interaction's `source` will be used.  Tracing requires that the interaction is configured with
 * either a `traceSource` or a `source`.
 * @property {boolean} [wrapX=false] Wrap the world horizontally on the sketch
 * overlay.
 * @property {GeometryLayout} [geometryLayout='XY'] Layout of the
 * feature geometries created by the draw interaction.
 */

/**
 * Coordinate type when drawing points.
 * @typedef {Coordinate} PointCoordType
 */

/**
 * Coordinate type when drawing lines.
 * @typedef {Coordinate[]} LineCoordType
 */

/**
 * Coordinate type when drawing polygons.
 * @typedef {Array<Coordinate[]>} PolyCoordType
 */

/**
 * Types used for drawing coordinates.
 * @typedef {PointCoordType|LineCoordType|PolyCoordType} SketchCoordType
 */

/**
 * @typedef {Object} TraceState
 * @property {boolean} active Tracing active.
 * @property {import("../pixel").Pixel} [startPx] The initially clicked pixel location.
 * @property {TraceTarget[]} [targets] Targets available for tracing.
 * @property [targetIndex] The index of the currently traced target.  A value of -1 indicates
 * that no trace target is active.
 */

/**
 * @typedef {Object} TraceTarget
 * @property {Coordinate[]} coordinates Target coordinates.
 * @property {boolean} ring The target coordinates are a linear ring.
 * @property startIndex The index of first traced coordinate.  A fractional index represents an
 * edge intersection.  Index values for rings will wrap (may be negative or larger than coordinates length).
 * @property endIndex The index of last traced coordinate.  Details from startIndex also apply here.
 */

/**
 * Function that takes an array of coordinates and an optional existing geometry
 * and a projection as arguments, and returns a geometry. The optional existing
 * geometry is the geometry that is returned when the function is called without
 * a second argument.
 * @typedef {function(!SketchCoordType, SimpleGeometry,
 *     import("../proj/Projection").default):
 *     SimpleGeometry} GeometryFunction
 */

/**
 * @typedef {'Point' | 'LineString' | 'Polygon' | 'Circle'} Mode
 * Draw mode.  This collapses multi-part geometry types with their single-part
 * cousins.
 */

/**
 * @enum {string}
 */
const DrawEventType = {
    /**
     * Triggered upon feature draw start
     * @event DrawEvent#drawstart
     * @api
     */
    DRAWSTART: 'drawstart',
    /**
     * Triggered upon feature draw end
     * @event DrawEvent#drawend
     * @api
     */
    DRAWEND: 'drawend',
    /**
     * Triggered upon feature draw abortion
     * @event DrawEvent#drawabort
     * @api
     */
    DRAWABORT: 'drawabort',
};

/**
 * Events emitted by {@link module:ol/interaction/Draw~Draw} instances are
 * instances of this type.
 */
export class DrawEvent extends Event {
    /**
     * @param {DrawEventType} type Type.
     * @param {Feature} feature The feature drawn.
     */
    constructor(type: DrawEventType, feature: Feature) {
        super(type);

        /**
         * The feature being drawn.
         * @type {Feature}
         * @api
         */
        this.feature = feature;
    }
}

/**
 * @param {Coordinate} coordinate The coordinate.
 * @param {Feature[]} features The candidate features.
 * @return {TraceTarget[]} The trace targets.
 */
function getTraceTargets(coordinate: Coordinate, features:Feature[]):TraceTarget[] {
    /**
     * @type {TraceTarget[]}
     */
    const targets:TraceTarget[] = [];

    for (let i = 0; i < features.length; ++i) {
        const feature = features[i];
        const geometry = feature.getGeometry();
        appendGeometryTraceTargets(coordinate, geometry, targets);
    }

    return targets;
}

/**
 * @param {Coordinate} a One coordinate.
 * @param {Coordinate} b Another coordinate.
 * @return The squared distance between the two coordinates.
 */
function getSquaredDistance(a: Coordinate, b: Coordinate): number {
    return squaredDistance(a[0], a[1], b[0], b[1]);
}

/**
 * @param {LineCoordType} coordinates The ring coordinates.
 * @param index The index.  May be wrapped.
 * @return {Coordinate} The coordinate.
 */
function getCoordinate(coordinates: LineCoordType, index: number): Coordinate {
    const count = coordinates.length;
    if (index < 0) {
        return coordinates[index + count];
    }
    if (index >= count) {
        return coordinates[index - count];
    }
    return coordinates[index];
}

/**
 * Get the cumulative squared distance along a ring path.  The end index index may be "wrapped" and it may
 * be less than the start index to indicate the direction of travel.  The start and end index may have
 * a fractional part to indicate a point between two coordinates.
 * @param {LineCoordType} coordinates Ring coordinates.
 * @param startIndex The start index.
 * @param endIndex The end index.
 * @return The cumulative squared distance along the ring path.
 */
function getCumulativeSquaredDistance(coordinates: LineCoordType, startIndex: number, endIndex: number): number {
    let lowIndex, highIndex;
    if (startIndex < endIndex) {
        lowIndex = startIndex;
        highIndex = endIndex;
    } else {
        lowIndex = endIndex;
        highIndex = startIndex;
    }
    const lowWholeIndex = Math.ceil(lowIndex);
    const highWholeIndex = Math.floor(highIndex);

    if (lowWholeIndex > highWholeIndex) {
        // both start and end are on the same segment
        const start = interpolateCoordinate(coordinates, lowIndex);
        const end = interpolateCoordinate(coordinates, highIndex);
        return getSquaredDistance(start, end);
    }

    let sd = 0;

    if (lowIndex < lowWholeIndex) {
        const start = interpolateCoordinate(coordinates, lowIndex);
        const end = getCoordinate(coordinates, lowWholeIndex);
        sd += getSquaredDistance(start, end);
    }

    if (highWholeIndex < highIndex) {
        const start = getCoordinate(coordinates, highWholeIndex);
        const end = interpolateCoordinate(coordinates, highIndex);
        sd += getSquaredDistance(start, end);
    }

    for (let i = lowWholeIndex; i < highWholeIndex - 1; ++i) {
        const start = getCoordinate(coordinates, i);
        const end = getCoordinate(coordinates, i + 1);
        sd += getSquaredDistance(start, end);
    }

    return sd;
}

/**
 * @param {Coordinate} coordinate The coordinate.
 * @param {Geometry} geometry The candidate geometry.
 * @param {TraceTarget[]} targets The trace targets.
 */
function appendGeometryTraceTargets(coordinate: Coordinate, geometry: Geometry, targets:TraceTarget[]) {
    if (geometry instanceof LineString) {
        appendTraceTarget(coordinate, geometry.getCoordinates(), false, targets);
        return;
    }
    if (geometry instanceof MultiLineString) {
        const coordinates = geometry.getCoordinates();
        for (let i = 0, ii = coordinates.length; i < ii; ++i) {
            appendTraceTarget(coordinate, coordinates[i], false, targets);
        }
        return;
    }
    if (geometry instanceof Polygon) {
        const coordinates = geometry.getCoordinates();
        for (let i = 0, ii = coordinates.length; i < ii; ++i) {
            appendTraceTarget(coordinate, coordinates[i], true, targets);
        }
        return;
    }
    if (geometry instanceof MultiPolygon) {
        const polys = geometry.getCoordinates();
        for (let i = 0, ii = polys.length; i < ii; ++i) {
            const coordinates = polys[i];
            for (let j = 0, jj = coordinates.length; j < jj; ++j) {
                appendTraceTarget(coordinate, coordinates[j], true, targets);
            }
        }
        return;
    }
    if (geometry instanceof GeometryCollection) {
        const geometries = geometry.getGeometries();
        for (let i = 0; i < geometries.length; ++i) {
            appendGeometryTraceTargets(coordinate, geometries[i], targets);
        }
        return;
    }
    // other types cannot be traced
}

/**
 * @typedef {Object} TraceTargetUpdateInfo
 * @property index The new target index.
 * @property endIndex The new segment end index.
 */

/**
 * @type {TraceTargetUpdateInfo}
 */
const sharedUpdateInfo: TraceTargetUpdateInfo = { index: -1, endIndex: NaN };

/**
 * @param {Coordinate} coordinate The coordinate.
 * @param {TraceState} traceState The trace state.
 * @param {import("../Map").default} map The map.
 * @param snapTolerance The snap tolerance.
 * @return {TraceTargetUpdateInfo} Information about the new trace target.  The returned
 * object is reused between calls and must not be modified by the caller.
 */
function getTraceTargetUpdate(coordinate: Coordinate, traceState: TraceState, map: import("../Map").default, snapTolerance: number): TraceTargetUpdateInfo {
    const x = coordinate[0];
    const y = coordinate[1];

    let closestTargetDistance = Infinity;

    let newTargetIndex = -1;
    let newEndIndex = NaN;

    for (
        let targetIndex = 0;
        targetIndex < traceState.targets.length;
        ++targetIndex
    ) {
        const target = traceState.targets[targetIndex];
        const coordinates = target.coordinates;

        let minSegmentDistance = Infinity;
        let endIndex;
        for (
            let coordinateIndex = 0;
            coordinateIndex < coordinates.length - 1;
            ++coordinateIndex
        ) {
            const start = coordinates[coordinateIndex];
            const end = coordinates[coordinateIndex + 1];
            const rel = getPointSegmentRelationship(x, y, start, end);
            if (rel.squaredDistance < minSegmentDistance) {
                minSegmentDistance = rel.squaredDistance;
                endIndex = coordinateIndex + rel.along;
            }
        }

        if (minSegmentDistance < closestTargetDistance) {
            closestTargetDistance = minSegmentDistance;
            if (target.ring && traceState.targetIndex === targetIndex) {
                // same target, maintain the same trace direction
                if (target.endIndex > target.startIndex) {
                    // forward trace
                    if (endIndex < target.startIndex) {
                        endIndex += coordinates.length;
                    }
                } else if (target.endIndex < target.startIndex) {
                    // reverse trace
                    if (endIndex > target.startIndex) {
                        endIndex -= coordinates.length;
                    }
                }
            }
            newEndIndex = endIndex;
            newTargetIndex = targetIndex;
        }
    }

    const newTarget = traceState.targets[newTargetIndex];
    let considerBothDirections = newTarget.ring;
    if (traceState.targetIndex === newTargetIndex && considerBothDirections) {
        // only consider switching trace direction if close to the start
        const newCoordinate = interpolateCoordinate(
            newTarget.coordinates,
            newEndIndex,
        );
        const pixel = map.getPixelFromCoordinate(newCoordinate);
        if (distance(pixel, traceState.startPx) > snapTolerance) {
            considerBothDirections = false;
        }
    }

    if (considerBothDirections) {
        const coordinates = newTarget.coordinates;
        const count = coordinates.length;
        const startIndex = newTarget.startIndex;
        const endIndex = newEndIndex;
        if (startIndex < endIndex) {
            const forwardDistance = getCumulativeSquaredDistance(
                coordinates,
                startIndex,
                endIndex,
            );
            const reverseDistance = getCumulativeSquaredDistance(
                coordinates,
                startIndex,
                endIndex - count,
            );
            if (reverseDistance < forwardDistance) {
                newEndIndex -= count;
            }
        } else {
            const reverseDistance = getCumulativeSquaredDistance(
                coordinates,
                startIndex,
                endIndex,
            );
            const forwardDistance = getCumulativeSquaredDistance(
                coordinates,
                startIndex,
                endIndex + count,
            );
            if (forwardDistance < reverseDistance) {
                newEndIndex += count;
            }
        }
    }

    sharedUpdateInfo.index = newTargetIndex;
    sharedUpdateInfo.endIndex = newEndIndex;
    return sharedUpdateInfo;
}

/**
 * @param {Coordinate} coordinate The clicked coordinate.
 * @param {Coordinate[]} coordinates The geometry component coordinates.
 * @param {boolean} ring The coordinates represent a linear ring.
 * @param {TraceTarget[]} targets The trace targets.
 */
function appendTraceTarget(coordinate: Coordinate, coordinates:Coordinate[], ring: boolean, targets:TraceTarget[]) {
    const x = coordinate[0];
    const y = coordinate[1];
    for (let i = 0, ii = coordinates.length - 1; i < ii; ++i) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        const rel = getPointSegmentRelationship(x, y, start, end);
        if (rel.squaredDistance === 0) {
            const index = i + rel.along;
            targets.push({
                coordinates: coordinates,
                ring: ring,
                startIndex: index,
                endIndex: index,
            });
            return;
        }
    }
}

/**
 * @typedef {Object} PointSegmentRelationship
 * @property along The closest point expressed as a fraction along the segment length.
 * @property squaredDistance The squared distance of the point to the segment.
 */

/**
 * @type {PointSegmentRelationship}
 */
const sharedRel: PointSegmentRelationship = { along: 0, squaredDistance: 0 };

/**
 * @param x The point x.
 * @param y The point y.
 * @param {Coordinate} start The segment start.
 * @param {Coordinate} end The segment end.
 * @return {PointSegmentRelationship} The point segment relationship.  The returned object is
 * shared between calls and must not be modified by the caller.
 */
function getPointSegmentRelationship(x: number, y: number, start: Coordinate, end: Coordinate): PointSegmentRelationship {
    const x1 = start[0];
    const y1 = start[1];
    const x2 = end[0];
    const y2 = end[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    let along = 0;
    let px = x1;
    let py = y1;
    if (dx !== 0 || dy !== 0) {
        along = clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy), 0, 1);
        px += dx * along;
        py += dy * along;
    }

    sharedRel.along = along;
    sharedRel.squaredDistance = toFixed(squaredDistance(x, y, px, py), 10);
    return sharedRel;
}

/**
 * @param {LineCoordType} coordinates The coordinates.
 * @param index The index.  May be fractional and may wrap.
 * @return {Coordinate} The interpolated coordinate.
 */
function interpolateCoordinate(coordinates: LineCoordType, index: number): Coordinate {
    const count = coordinates.length;

    let startIndex = Math.floor(index);
    const along = index - startIndex;
    if (startIndex >= count) {
        startIndex -= count;
    } else if (startIndex < 0) {
        startIndex += count;
    }

    let endIndex = startIndex + 1;
    if (endIndex >= count) {
        endIndex -= count;
    }

    const start = coordinates[startIndex];
    const x0 = start[0];
    const y0 = start[1];
    const end = coordinates[endIndex];
    const dx = end[0] - x0;
    const dy = end[1] - y0;

    return [x0 + dx * along, y0 + dy * along];
}

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType|
 *     'change:active', import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<'drawabort'|'drawend'|'drawstart', DrawEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     'change:active'|'drawabort'|'drawend'|'drawstart', Return>} DrawOnSignature
 */

/**
 * Interaction for drawing feature geometries.
 *
 * @fires DrawEvent
 * @api
 */
export class Draw extends PointerInteraction {

    /**
     *
     */
    override on: DrawOnSignature<EventsKey>;

    /**
     *
     */
    override once: DrawOnSignature<EventsKey>;

    /**
     *
     */
    override un: DrawOnSignature<void>;

    /**
     * @param {Options} options Options.
     */
    constructor(options: Options) {
        const pointerOptions = /** @type {import("./Pointer").Options} */ (
            options
        );
        if (!pointerOptions.stopDown) {
            pointerOptions.stopDown = FALSE;
        }

        super(pointerOptions);
        this.on = this.onInternal as DrawOnSignature<EventsKey>;
        this.once = this.onceInternal as DrawOnSignature<EventsKey>;
        this.un = this.unInternal as DrawOnSignature<void>;

        /**
         * @type {boolean}
         * @private
         */
        this.shouldHandle_ = false;

        /**
         * @type {import("../pixel").Pixel}
         * @private
         */
        this.downPx_ = null;

        /**
         * @type {ReturnType<typeof setTimeout>}
         * @private
         */
        this.downTimeout_;

        /**
         * @type {number|undefined}
         * @private
         */
        this.lastDragTime_;

        /**
         * Pointer type of the last pointermove event
         * @type {string}
         * @private
         */
        this.pointerType_;

        /**
         * @type {boolean}
         * @private
         */
        this.freehand_ = false;

        /**
         * Target source for drawn features.
         * @type {VectorSource|null}
         * @private
         */
        this.source_ = options.source ? options.source : null;

        /**
         * Target collection for drawn features.
         * @type {import("../Collection").default<Feature>|null}
         * @private
         */
        this.features_ = options.features ? options.features : null;

        /**
         * Pixel distance for snapping.
         * @type {number}
         * @private
         */
        this.snapTolerance_ = options.snapTolerance ? options.snapTolerance : 12;

        /**
         * Geometry type.
         * @type {GeometryType}
         * @private
         */
        this.type_ = /** @type {GeometryType} */ (
            options.type
        );

        /**
         * Drawing mode (derived from geometry type.
         * @type {Mode}
         * @private
         */
        this.mode_ = getMode(this.type_);

        /**
         * Stop click, singleclick, and doubleclick events from firing during drawing.
         * Default is `false`.
         * @type {boolean}
         * @private
         */
        this.stopClick_ = !!options.stopClick;

        /**
         * The number of points that must be drawn before a polygon ring or line
         * string can be finished.  The default is 3 for polygon rings and 2 for
         * line strings.
         * @type {number}
         * @private
         */
        this.minPoints_ = options.minPoints
            ? options.minPoints
            : this.mode_ === 'Polygon'
                ? 3
                : 2;

        /**
         * The number of points that can be drawn before a polygon ring or line string
         * is finished. The default is no restriction.
         * @type {number}
         * @private
         */
        this.maxPoints_ =
            this.mode_ === 'Circle'
                ? 2
                : options.maxPoints
                    ? options.maxPoints
                    : Infinity;

        /**
         * A function to decide if a potential finish coordinate is permissible
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.finishCondition_ = options.finishCondition
            ? options.finishCondition
            : TRUE;

        /**
         * @private
         * @type {GeometryLayout}
         */
        this.geometryLayout_ = options.geometryLayout
            ? options.geometryLayout
            : 'XY';

        let geometryFunction = options.geometryFunction;
        if (!geometryFunction) {
            const mode = this.mode_;
            if (mode === 'Circle') {
                /**
                 * @param {!LineCoordType} coordinates The coordinates.
                 * @param {SimpleGeometry|undefined} geometry Optional geometry.
                 * @param {import("../proj/Projection").default} projection The view projection.
                 * @return {SimpleGeometry} A geometry.
                 */
                geometryFunction = function (coordinates: LineCoordType, geometry: SimpleGeometry | undefined, projection: import("../proj/Projection").default): SimpleGeometry {
                    const circle = geometry
                        ? /** @type {Circle} */ (geometry)
                        : new Circle([NaN, NaN]);
                    const center = fromUserCoordinate(coordinates[0], projection);
                    const squaredLength = squaredCoordinateDistance(
                        center,
                        fromUserCoordinate(coordinates[coordinates.length - 1], projection),
                    );
                    circle.setCenterAndRadius(
                        center,
                        Math.sqrt(squaredLength),
                        this.geometryLayout_,
                    );
                    const userProjection = getUserProjection();
                    if (userProjection) {
                        circle.transform(projection, userProjection);
                    }
                    return circle;
                };
            } else {
                let Constructor;
                if (mode === 'Point') {
                    Constructor = Point;
                } else if (mode === 'LineString') {
                    Constructor = LineString;
                } else if (mode === 'Polygon') {
                    Constructor = Polygon;
                }
                /**
                 * @param {!LineCoordType} coordinates The coordinates.
                 * @param {SimpleGeometry|undefined} geometry Optional geometry.
                 * @param {import("../proj/Projection").default} projection The view projection.
                 * @return {SimpleGeometry} A geometry.
                 */
                geometryFunction = function (coordinates: LineCoordType, geometry: SimpleGeometry | undefined, projection: import("../proj/Projection").default): SimpleGeometry {
                    if (geometry) {
                        if (mode === 'Polygon') {
                            if (coordinates[0].length) {
                                // Add a closing coordinate to match the first
                                geometry.setCoordinates(
                                    [coordinates[0].concat([coordinates[0][0]])],
                                    this.geometryLayout_,
                                );
                            } else {
                                geometry.setCoordinates([], this.geometryLayout_);
                            }
                        } else {
                            geometry.setCoordinates(coordinates, this.geometryLayout_);
                        }
                    } else {
                        geometry = new Constructor(coordinates, this.geometryLayout_);
                    }
                    return geometry;
                };
            }
        }

        /**
         * @type {GeometryFunction}
         * @private
         */
        this.geometryFunction_ = geometryFunction;

        /**
         * @type {number}
         * @private
         */
        this.dragVertexDelay_ =
            options.dragVertexDelay !== undefined ? options.dragVertexDelay : 500;

        /**
         * Finish coordinate for the feature (first point for polygons, last point for
         * linestrings).
         * @type {Coordinate}
         * @private
         */
        this.finishCoordinate_ = null;

        /**
         * Sketch feature.
         * @type {Feature<SimpleGeometry>}
         * @private
         */
        this.sketchFeature_ = null;

        /**
         * Sketch point.
         * @type {Feature<Point>}
         * @private
         */
        this.sketchPoint_ = null;

        /**
         * Sketch coordinates. Used when drawing a line or polygon.
         * @type {SketchCoordType}
         * @private
         */
        this.sketchCoords_ = null;

        /**
         * Sketch line. Used when drawing polygon.
         * @type {Feature<LineString>}
         * @private
         */
        this.sketchLine_ = null;

        /**
         * Sketch line coordinates. Used when drawing a polygon or circle.
         * @type {LineCoordType}
         * @private
         */
        this.sketchLineCoords_ = null;

        /**
         * Squared tolerance for handling up events.  If the squared distance
         * between a down and up event is greater than this tolerance, up events
         * will not be handled.
         * @type {number}
         * @private
         */
        this.squaredClickTolerance_ = options.clickTolerance
            ? options.clickTolerance * options.clickTolerance
            : 36;

        /**
         * Draw overlay where our sketch features are drawn.
         * @type {VectorLayer}
         * @private
         */
        this.overlay_ = new VectorLayer({
            source: new VectorSource({
                useSpatialIndex: false,
                wrapX: options.wrapX ? options.wrapX : false,
            }),
            style: options.style ? options.style : getDefaultStyleFunction(),
            updateWhileInteracting: true,
        });

        /**
         * Name of the geometry attribute for newly created features.
         * @type {string|undefined}
         * @private
         */
        this.geometryName_ = options.geometryName;

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.condition_ = options.condition ? options.condition : noModifierKeys;

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.freehandCondition_;
        if (options.freehand) {
            this.freehandCondition_ = always;
        } else {
            this.freehandCondition_ = options.freehandCondition
                ? options.freehandCondition
                : shiftKeyOnly;
        }

        /**
         * @type {import("../events/condition").Condition}
         * @private
         */
        this.traceCondition_;
        this.setTrace(options.trace || false);

        /**
         * @type {TraceState}
         * @private
         */
        this.traceState_ = { active: false };

        /**
         * @type {VectorSource|null}
         * @private
         */
        this.traceSource_ = options.traceSource || options.source || null;

        this.addChangeListener(InteractionProperty.ACTIVE, this.updateState_);
    }

    /**
     * Toggle tracing mode or set a tracing condition.
     *
     * @param {boolean|import("../events/condition").Condition} trace A boolean to toggle tracing mode or an event
     *     condition that will be checked when a feature is clicked to determine if tracing should be active.
     */
    setTrace(trace: boolean | import("../events/condition").Condition) {
        let condition;
        if (!trace) {
            condition = never;
        } else if (trace === true) {
            condition = always;
        } else {
            condition = trace;
        }
        this.traceCondition_ = condition;
    }

    /**
     * Remove the interaction from its current map and attach it to the new map.
     * Subclasses may set up event handlers to get notified about changes to
     * the map here.
     * @param {import("../Map").default} map Map.
     */
    setMap(map: import("../Map").default) {
        super.setMap(map);
        this.updateState_();
    }

    /**
     * Get the overlay layer that this interaction renders sketch features to.
     * @return {VectorLayer} Overlay layer.
     * @api
     */
    getOverlay(): VectorLayer {
        return this.overlay_;
    }

    /**
     * Handles the {@link module:ol/MapBrowserEvent~MapBrowserEvent map browser event} and may actually draw or finish the drawing.
     * @param {import("../MapBrowserEvent").default} event Map browser event.
     * @return {boolean} `false` to stop event propagation.
     * @api
     */
    handleEvent(event: import("../Map/browser-event").default): boolean {
        if (event.originalEvent.type === EventTypes.CONTEXTMENU) {
            // Avoid context menu for long taps when drawing on mobile
            event.originalEvent.preventDefault();
        }
        this.freehand_ = this.mode_ !== 'Point' && this.freehandCondition_(event);
        let move = event.type === MapBrowserEventType.POINTERMOVE;
        let pass = true;
        if (
            !this.freehand_ &&
            this.lastDragTime_ &&
            event.type === MapBrowserEventType.POINTERDRAG
        ) {
            const now = Date.now();
            if (now - this.lastDragTime_ >= this.dragVertexDelay_) {
                this.downPx_ = event.pixel;
                this.shouldHandle_ = !this.freehand_;
                move = true;
            } else {
                this.lastDragTime_ = undefined;
            }
            if (this.shouldHandle_ && this.downTimeout_ !== undefined) {
                clearTimeout(this.downTimeout_);
                this.downTimeout_ = undefined;
            }
        }
        if (
            this.freehand_ &&
            event.type === MapBrowserEventType.POINTERDRAG &&
            this.sketchFeature_ !== null
        ) {
            this.addToDrawing_(event.coordinate);
            pass = false;
        } else if (
            this.freehand_ &&
            event.type === MapBrowserEventType.POINTERDOWN
        ) {
            pass = false;
        } else if (move && this.getPointerCount() < 2) {
            pass = event.type === MapBrowserEventType.POINTERMOVE;
            if (pass && this.freehand_) {
                this.handlePointerMove_(event);
                if (this.shouldHandle_) {
                    // Avoid page scrolling when freehand drawing on mobile
                    event.originalEvent.preventDefault();
                }
            } else if (
                event.originalEvent.pointerType === 'mouse' ||
                (event.type === MapBrowserEventType.POINTERDRAG &&
                    this.downTimeout_ === undefined)
            ) {
                this.handlePointerMove_(event);
            }
        } else if (event.type === MapBrowserEventType.DBLCLICK) {
            pass = false;
        }

        return super.handleEvent(event) && pass;
    }

    /**
     * Handle pointer down events.
     * @param {import("../MapBrowserEvent").default} event Event.
     * @return {boolean} If the event was consumed.
     */
    handleDownEvent(event: import("../Map/browser-event").default): boolean {
        this.shouldHandle_ = !this.freehand_;

        if (this.freehand_) {
            this.downPx_ = event.pixel;
            if (!this.finishCoordinate_) {
                this.startDrawing_(event.coordinate);
            }
            return true;
        }

        if (!this.condition_(event)) {
            this.lastDragTime_ = undefined;
            return false;
        }

        this.lastDragTime_ = Date.now();
        this.downTimeout_ = setTimeout(() => {
            this.handlePointerMove_(
                new MapBrowserEvent(
                    MapBrowserEventType.POINTERMOVE,
                    event.map,
                    event.originalEvent,
                    false,
                    event.frameState,
                ),
            );
        }, this.dragVertexDelay_);
        this.downPx_ = event.pixel;
        return true;
    }

    /**
     * @private
     */
    deactivateTrace_() {
        this.traceState_ = { active: false };
    }

    /**
     * Activate or deactivate trace state based on a browser event.
     * @param {import("../MapBrowserEvent").default} event Event.
     * @private
     */
    toggleTraceState_(event: import("../Map/browser-event").default) {
        if (!this.traceSource_ || !this.traceCondition_(event)) {
            return;
        }

        if (this.traceState_.active) {
            this.deactivateTrace_();
            return;
        }

        const map = this.getMap();
        const lowerLeft = map.getCoordinateFromPixel([
            event.pixel[0] - this.snapTolerance_,
            event.pixel[1] + this.snapTolerance_,
        ]);
        const upperRight = map.getCoordinateFromPixel([
            event.pixel[0] + this.snapTolerance_,
            event.pixel[1] - this.snapTolerance_,
        ]);
        const extent = boundingExtent([lowerLeft, upperRight]);
        const features = this.traceSource_.getFeaturesInExtent(extent);
        if (features.length === 0) {
            return;
        }

        const targets = getTraceTargets(event.coordinate, features);
        if (targets.length) {
            this.traceState_ = {
                active: true,
                startPx: event.pixel.slice(),
                targets: targets,
                targetIndex: -1,
            };
        }
    }

    /**
     * @param {TraceTarget} target The trace target.
     * @param endIndex The new end index of the trace.
     * @private
     */
    addOrRemoveTracedCoordinates_(target: TraceTarget, endIndex: number) {
        // three cases to handle:
        //  1. traced in the same direction and points need adding
        //  2. traced in the same direction and points need removing
        //  3. traced in a new direction
        const previouslyForward = target.startIndex <= target.endIndex;
        const currentlyForward = target.startIndex <= endIndex;
        if (previouslyForward === currentlyForward) {
            // same direction
            if (
                (previouslyForward && endIndex > target.endIndex) ||
                (!previouslyForward && endIndex < target.endIndex)
            ) {
                // case 1 - add new points
                this.addTracedCoordinates_(target, target.endIndex, endIndex);
            } else if (
                (previouslyForward && endIndex < target.endIndex) ||
                (!previouslyForward && endIndex > target.endIndex)
            ) {
                // case 2 - remove old points
                this.removeTracedCoordinates_(endIndex, target.endIndex);
            }
        } else {
            // case 3 - remove old points, add new points
            this.removeTracedCoordinates_(target.startIndex, target.endIndex);
            this.addTracedCoordinates_(target, target.startIndex, endIndex);
        }
    }

    /**
     * @param fromIndex The start index.
     * @param toIndex The end index.
     * @private
     */
    removeTracedCoordinates_(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) {
            return;
        }

        let remove = 0;
        if (fromIndex < toIndex) {
            const start = Math.ceil(fromIndex);
            let end = Math.floor(toIndex);
            if (end === toIndex) {
                end -= 1;
            }
            remove = end - start + 1;
        } else {
            const start = Math.floor(fromIndex);
            let end = Math.ceil(toIndex);
            if (end === toIndex) {
                end += 1;
            }
            remove = start - end + 1;
        }

        if (remove > 0) {
            this.removeLastPoints_(remove);
        }
    }

    /**
     * @param {TraceTarget} target The trace target.
     * @param fromIndex The start index.
     * @param toIndex The end index.
     * @private
     */
    addTracedCoordinates_(target: TraceTarget, fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) {
            return;
        }

        const coordinates = [];
        if (fromIndex < toIndex) {
            // forward trace
            const start = Math.ceil(fromIndex);
            let end = Math.floor(toIndex);
            if (end === toIndex) {
                // if end is snapped to a vertex, it will be added later
                end -= 1;
            }
            for (let i = start; i <= end; ++i) {
                coordinates.push(getCoordinate(target.coordinates, i));
            }
        } else {
            // reverse trace
            const start = Math.floor(fromIndex);
            let end = Math.ceil(toIndex);
            if (end === toIndex) {
                end += 1;
            }
            for (let i = start; i >= end; --i) {
                coordinates.push(getCoordinate(target.coordinates, i));
            }
        }
        if (coordinates.length) {
            this.appendCoordinates(coordinates);
        }
    }

    /**
     * Update the trace.
     * @param {import("../MapBrowserEvent").default} event Event.
     * @private
     */
    updateTrace_(event: import("../Map/browser-event").default) {
        const traceState = this.traceState_;
        if (!traceState.active) {
            return;
        }

        if (traceState.targetIndex === -1) {
            // check if we are ready to pick a target
            if (distance(traceState.startPx, event.pixel) < this.snapTolerance_) {
                return;
            }
        }

        const updatedTraceTarget = getTraceTargetUpdate(
            event.coordinate,
            traceState,
            this.getMap(),
            this.snapTolerance_,
        );

        if (traceState.targetIndex !== updatedTraceTarget.index) {
            // target changed
            if (traceState.targetIndex !== -1) {
                // remove points added during previous trace
                const oldTarget = traceState.targets[traceState.targetIndex];
                this.removeTracedCoordinates_(oldTarget.startIndex, oldTarget.endIndex);
            }
            // add points for the new target
            const newTarget = traceState.targets[updatedTraceTarget.index];
            this.addTracedCoordinates_(
                newTarget,
                newTarget.startIndex,
                updatedTraceTarget.endIndex,
            );
        } else {
            // target stayed the same
            const target = traceState.targets[traceState.targetIndex];
            this.addOrRemoveTracedCoordinates_(target, updatedTraceTarget.endIndex);
        }

        // modify the state with updated info
        traceState.targetIndex = updatedTraceTarget.index;
        const target = traceState.targets[traceState.targetIndex];
        target.endIndex = updatedTraceTarget.endIndex;

        // update event coordinate and pixel to match end point of final segment
        const coordinate = interpolateCoordinate(
            target.coordinates,
            target.endIndex,
        );
        const pixel = this.getMap().getPixelFromCoordinate(coordinate);
        event.coordinate = coordinate;
        event.pixel = [Math.round(pixel[0]), Math.round(pixel[1])];
    }

    /**
     * Handle pointer up events.
     * @param {import("../MapBrowserEvent").default} event Event.
     * @return {boolean} If the event was consumed.
     */
    handleUpEvent(event: import("../Map/browser-event").default): boolean {
        let pass = true;

        if (this.getPointerCount() === 0) {
            if (this.downTimeout_) {
                clearTimeout(this.downTimeout_);
                this.downTimeout_ = undefined;
            }

            this.handlePointerMove_(event);
            const tracing = this.traceState_.active;
            this.toggleTraceState_(event);

            if (this.shouldHandle_) {
                const startingToDraw = !this.finishCoordinate_;
                if (startingToDraw) {
                    this.startDrawing_(event.coordinate);
                }
                if (!startingToDraw && this.freehand_) {
                    this.finishDrawing();
                } else if (
                    !this.freehand_ &&
                    (!startingToDraw || this.mode_ === 'Point')
                ) {
                    if (this.atFinish_(event.pixel, tracing)) {
                        if (this.finishCondition_(event)) {
                            this.finishDrawing();
                        }
                    } else {
                        this.addToDrawing_(event.coordinate);
                    }
                }
                pass = false;
            } else if (this.freehand_) {
                this.abortDrawing();
            }
        }

        if (!pass && this.stopClick_) {
            event.preventDefault();
        }
        return pass;
    }

    /**
     * Handle move events.
     * @param {import("../MapBrowserEvent").default} event A move event.
     * @private
     */
    handlePointerMove_(event: import("../Map/browser-event").default) {
        this.pointerType_ = event.originalEvent.pointerType;
        if (
            this.downPx_ &&
            ((!this.freehand_ && this.shouldHandle_) ||
                (this.freehand_ && !this.shouldHandle_))
        ) {
            const downPx = this.downPx_;
            const clickPx = event.pixel;
            const dx = downPx[0] - clickPx[0];
            const dy = downPx[1] - clickPx[1];
            const squaredDistance = dx * dx + dy * dy;
            this.shouldHandle_ = this.freehand_
                ? squaredDistance > this.squaredClickTolerance_
                : squaredDistance <= this.squaredClickTolerance_;
            if (!this.shouldHandle_) {
                return;
            }
        }

        if (!this.finishCoordinate_) {
            this.createOrUpdateSketchPoint_(event.coordinate.slice());
            return;
        }

        this.updateTrace_(event);
        this.modifyDrawing_(event.coordinate);
    }

    /**
     * Determine if an event is within the snapping tolerance of the start coord.
     * @param {import("../pixel").Pixel} pixel Pixel.
     * @param {boolean} [tracing] Drawing in trace mode (only stop if at the starting point).
     * @return {boolean} The event is within the snapping tolerance of the start.
     * @private
     */
    atFinish_(pixel: import("../pixel").Pixel, tracing: boolean): boolean {
        let at = false;
        if (this.sketchFeature_) {
            let potentiallyDone = false;
            let potentiallyFinishCoordinates = [this.finishCoordinate_];
            const mode = this.mode_;
            if (mode === 'Point') {
                at = true;
            } else if (mode === 'Circle') {
                at = this.sketchCoords_.length === 2;
            } else if (mode === 'LineString') {
                potentiallyDone =
                    !tracing && this.sketchCoords_.length > this.minPoints_;
            } else if (mode === 'Polygon') {
                const sketchCoords = /** @type {PolyCoordType} */ (this.sketchCoords_);
                potentiallyDone = sketchCoords[0].length > this.minPoints_;
                potentiallyFinishCoordinates = [
                    sketchCoords[0][0],
                    sketchCoords[0][sketchCoords[0].length - 2],
                ];
                if (tracing) {
                    potentiallyFinishCoordinates = [sketchCoords[0][0]];
                } else {
                    potentiallyFinishCoordinates = [
                        sketchCoords[0][0],
                        sketchCoords[0][sketchCoords[0].length - 2],
                    ];
                }
            }
            if (potentiallyDone) {
                const map = this.getMap();
                for (let i = 0, ii = potentiallyFinishCoordinates.length; i < ii; i++) {
                    const finishCoordinate = potentiallyFinishCoordinates[i];
                    const finishPixel = map.getPixelFromCoordinate(finishCoordinate);
                    const dx = pixel[0] - finishPixel[0];
                    const dy = pixel[1] - finishPixel[1];
                    const snapTolerance = this.freehand_ ? 1 : this.snapTolerance_;
                    at = Math.sqrt(dx * dx + dy * dy) <= snapTolerance;
                    if (at) {
                        this.finishCoordinate_ = finishCoordinate;
                        break;
                    }
                }
            }
        }
        return at;
    }

    /**
     * @param {import("../coordinate").Coordinate} coordinates Coordinate.
     * @private
     */
    createOrUpdateSketchPoint_(coordinates: import("../coordinate").Coordinate) {
        if (!this.sketchPoint_) {
            this.sketchPoint_ = new Feature(new Point(coordinates));
            this.updateSketchFeatures_();
        } else {
            const sketchPointGeom = this.sketchPoint_.getGeometry();
            sketchPointGeom.setCoordinates(coordinates);
        }
    }

    /**
     * @param {Polygon} geometry Polygon geometry.
     * @private
     */
    createOrUpdateCustomSketchLine_(geometry: Polygon) {
        if (!this.sketchLine_) {
            this.sketchLine_ = new Feature();
        }
        const ring = geometry.getLinearRing(0);
        let sketchLineGeom = this.sketchLine_.getGeometry();
        if (!sketchLineGeom) {
            sketchLineGeom = new LineString(
                ring.getFlatCoordinates(),
                ring.getLayout(),
            );
            this.sketchLine_.setGeometry(sketchLineGeom);
        } else {
            sketchLineGeom.setFlatCoordinates(
                ring.getLayout(),
                ring.getFlatCoordinates(),
            );
            sketchLineGeom.changed();
        }
    }

    /**
     * Start the drawing.
     * @param {Coordinate} start Start coordinate.
     * @private
     */
    startDrawing_(start: Coordinate) {
        const projection = this.getMap().getView().getProjection();
        const stride = getStrideForLayout(this.geometryLayout_);
        while (start.length < stride) {
            start.push(0);
        }
        this.finishCoordinate_ = start;
        if (this.mode_ === 'Point') {
            this.sketchCoords_ = start.slice();
        } else if (this.mode_ === 'Polygon') {
            this.sketchCoords_ = [[start.slice(), start.slice()]];
            this.sketchLineCoords_ = this.sketchCoords_[0];
        } else {
            this.sketchCoords_ = [start.slice(), start.slice()];
        }
        if (this.sketchLineCoords_) {
            this.sketchLine_ = new Feature(new LineString(this.sketchLineCoords_));
        }
        const geometry = this.geometryFunction_(
            this.sketchCoords_,
            undefined,
            projection,
        );
        this.sketchFeature_ = new Feature();
        if (this.geometryName_) {
            this.sketchFeature_.setGeometryName(this.geometryName_);
        }
        this.sketchFeature_.setGeometry(geometry);
        this.updateSketchFeatures_();
        this.dispatchEvent(
            new DrawEvent(DrawEventType.DRAWSTART, this.sketchFeature_),
        );
    }

    /**
     * Modify the drawing.
     * @param {Coordinate} coordinate Coordinate.
     * @private
     */
    modifyDrawing_(coordinate: Coordinate) {
        const map = this.getMap();
        const geometry = this.sketchFeature_.getGeometry();
        const projection = map.getView().getProjection();
        const stride = getStrideForLayout(this.geometryLayout_);
        let coordinates, last;
        while (coordinate.length < stride) {
            coordinate.push(0);
        }
        if (this.mode_ === 'Point') {
            last = this.sketchCoords_;
        } else if (this.mode_ === 'Polygon') {
            coordinates = /** @type {PolyCoordType} */ (this.sketchCoords_)[0];
            last = coordinates[coordinates.length - 1];
            if (this.atFinish_(map.getPixelFromCoordinate(coordinate))) {
                // snap to finish
                coordinate = this.finishCoordinate_.slice();
            }
        } else {
            coordinates = this.sketchCoords_;
            last = coordinates[coordinates.length - 1];
        }
        last[0] = coordinate[0];
        last[1] = coordinate[1];
        this.geometryFunction_(
      /** @type {!LineCoordType} */(this.sketchCoords_),
            geometry,
            projection,
        );
        if (this.sketchPoint_) {
            const sketchPointGeom = this.sketchPoint_.getGeometry();
            sketchPointGeom.setCoordinates(coordinate);
        }
        if (geometry.getType() === 'Polygon' && this.mode_ !== 'Polygon') {
            this.createOrUpdateCustomSketchLine_(/** @type {Polygon} */(geometry));
        } else if (this.sketchLineCoords_) {
            const sketchLineGeom = this.sketchLine_.getGeometry();
            sketchLineGeom.setCoordinates(this.sketchLineCoords_);
        }
        this.updateSketchFeatures_();
    }

    /**
     * Add a new coordinate to the drawing.
     * @param {!PointCoordType} coordinate Coordinate
     * @return {Feature<SimpleGeometry>} The sketch feature.
     * @private
     */
    addToDrawing_(coordinate: PointCoordType): Feature<SimpleGeometry> {
        const geometry = this.sketchFeature_.getGeometry();
        const projection = this.getMap().getView().getProjection();
        let done;
        let coordinates;
        const mode = this.mode_;
        if (mode === 'LineString' || mode === 'Circle') {
            this.finishCoordinate_ = coordinate.slice();
            coordinates = /** @type {LineCoordType} */ (this.sketchCoords_);
            if (coordinates.length >= this.maxPoints_) {
                if (this.freehand_) {
                    coordinates.pop();
                } else {
                    done = true;
                }
            }
            coordinates.push(coordinate.slice());
            this.geometryFunction_(coordinates, geometry, projection);
        } else if (mode === 'Polygon') {
            coordinates = /** @type {PolyCoordType} */ (this.sketchCoords_)[0];
            if (coordinates.length >= this.maxPoints_) {
                if (this.freehand_) {
                    coordinates.pop();
                } else {
                    done = true;
                }
            }
            coordinates.push(coordinate.slice());
            if (done) {
                this.finishCoordinate_ = coordinates[0];
            }
            this.geometryFunction_(this.sketchCoords_, geometry, projection);
        }
        this.createOrUpdateSketchPoint_(coordinate.slice());
        this.updateSketchFeatures_();
        if (done) {
            return this.finishDrawing();
        }
        return this.sketchFeature_;
    }

    /**
     * @param n The number of points to remove.
     */
    removeLastPoints_(n: number) {
        if (!this.sketchFeature_) {
            return;
        }
        const geometry = this.sketchFeature_.getGeometry();
        const projection = this.getMap().getView().getProjection();
        const mode = this.mode_;
        for (let i = 0; i < n; ++i) {
            let coordinates;
            if (mode === 'LineString' || mode === 'Circle') {
                coordinates = /** @type {LineCoordType} */ (this.sketchCoords_);
                coordinates.splice(-2, 1);
                if (coordinates.length >= 2) {
                    this.finishCoordinate_ = coordinates[coordinates.length - 2].slice();
                    const finishCoordinate = this.finishCoordinate_.slice();
                    coordinates[coordinates.length - 1] = finishCoordinate;
                    this.createOrUpdateSketchPoint_(finishCoordinate);
                }
                this.geometryFunction_(coordinates, geometry, projection);
                if (geometry.getType() === 'Polygon' && this.sketchLine_) {
                    this.createOrUpdateCustomSketchLine_(
            /** @type {Polygon} */(geometry),
                    );
                }
            } else if (mode === 'Polygon') {
                coordinates = /** @type {PolyCoordType} */ (this.sketchCoords_)[0];
                coordinates.splice(-2, 1);
                const sketchLineGeom = this.sketchLine_.getGeometry();
                if (coordinates.length >= 2) {
                    const finishCoordinate = coordinates[coordinates.length - 2].slice();
                    coordinates[coordinates.length - 1] = finishCoordinate;
                    this.createOrUpdateSketchPoint_(finishCoordinate);
                }
                sketchLineGeom.setCoordinates(coordinates);
                this.geometryFunction_(this.sketchCoords_, geometry, projection);
            }

            if (coordinates.length === 1) {
                this.abortDrawing();
                break;
            }
        }

        this.updateSketchFeatures_();
    }

    /**
     * Remove last point of the feature currently being drawn. Does not do anything when
     * drawing POINT or MULTI_POINT geometries.
     * @api
     */
    removeLastPoint() {
        this.removeLastPoints_(1);
    }

    /**
     * Stop drawing and add the sketch feature to the target layer.
     * The {@link module:ol/interaction/Draw~DrawEventType.DRAWEND} event is
     * dispatched before inserting the feature.
     * @return {Feature<SimpleGeometry>|null} The drawn feature.
     * @api
     */
    finishDrawing(): Feature<SimpleGeometry> | null {
        const sketchFeature = this.abortDrawing_();
        if (!sketchFeature) {
            return null;
        }
        let coordinates = this.sketchCoords_;
        const geometry = sketchFeature.getGeometry();
        const projection = this.getMap().getView().getProjection();
        if (this.mode_ === 'LineString') {
            // remove the redundant last point
            coordinates.pop();
            this.geometryFunction_(coordinates, geometry, projection);
        } else if (this.mode_ === 'Polygon') {
      // remove the redundant last point in ring
      /** @type {PolyCoordType} */ (coordinates)[0].pop();
            this.geometryFunction_(coordinates, geometry, projection);
            coordinates = geometry.getCoordinates();
        }

        // cast multi-part geometries
        if (this.type_ === 'MultiPoint') {
            sketchFeature.setGeometry(
                new MultiPoint([/** @type {PointCoordType} */ (coordinates)]),
            );
        } else if (this.type_ === 'MultiLineString') {
            sketchFeature.setGeometry(
                new MultiLineString([/** @type {LineCoordType} */ (coordinates)]),
            );
        } else if (this.type_ === 'MultiPolygon') {
            sketchFeature.setGeometry(
                new MultiPolygon([/** @type {PolyCoordType} */ (coordinates)]),
            );
        }

        // First dispatch event to allow full set up of feature
        this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));

        // Then insert feature
        if (this.features_) {
            this.features_.push(sketchFeature);
        }
        if (this.source_) {
            this.source_.addFeature(sketchFeature);
        }
        return sketchFeature;
    }

    /**
     * Stop drawing without adding the sketch feature to the target layer.
     * @return {Feature<SimpleGeometry>|null} The sketch feature (or null if none).
     * @private
     */
    abortDrawing_(): Feature<SimpleGeometry> | null {
        this.finishCoordinate_ = null;
        const sketchFeature = this.sketchFeature_;
        this.sketchFeature_ = null;
        this.sketchPoint_ = null;
        this.sketchLine_ = null;
        this.overlay_.getSource().clear(true);
        this.deactivateTrace_();
        return sketchFeature;
    }

    /**
     * Stop drawing without adding the sketch feature to the target layer.
     * @api
     */
    abortDrawing() {
        const sketchFeature = this.abortDrawing_();
        if (sketchFeature) {
            this.dispatchEvent(new DrawEvent(DrawEventType.DRAWABORT, sketchFeature));
        }
    }

    /**
     * Append coordinates to the end of the geometry that is currently being drawn.
     * This can be used when drawing LineStrings or Polygons. Coordinates will
     * either be appended to the current LineString or the outer ring of the current
     * Polygon. If no geometry is being drawn, a new one will be created.
     * @param {!LineCoordType} coordinates Linear coordinates to be appended to
     * the coordinate array.
     * @api
     */
    appendCoordinates(coordinates: LineCoordType) {
        const mode = this.mode_;
        const newDrawing = !this.sketchFeature_;
        if (newDrawing) {
            this.startDrawing_(coordinates[0]);
        }
        /** @type {LineCoordType} */
        let sketchCoords: LineCoordType;
        if (mode === 'LineString' || mode === 'Circle') {
            sketchCoords = /** @type {LineCoordType} */ (this.sketchCoords_);
        } else if (mode === 'Polygon') {
            sketchCoords =
                this.sketchCoords_ && this.sketchCoords_.length
                    ? /** @type {PolyCoordType} */ (this.sketchCoords_)[0]
                    : [];
        } else {
            return;
        }

        if (newDrawing) {
            sketchCoords.shift();
        }

        // Remove last coordinate from sketch drawing (this coordinate follows cursor position)
        sketchCoords.pop();

        // Append coordinate list
        for (let i = 0; i < coordinates.length; i++) {
            this.addToDrawing_(coordinates[i]);
        }

        const ending = coordinates[coordinates.length - 1];
        // Duplicate last coordinate for sketch drawing (cursor position)
        this.sketchFeature_ = this.addToDrawing_(ending);
        this.modifyDrawing_(ending);
    }

    /**
     * Initiate draw mode by starting from an existing geometry which will
     * receive new additional points. This only works on features with
     * `LineString` geometries, where the interaction will extend lines by adding
     * points to the end of the coordinates array.
     * This will change the original feature, instead of drawing a copy.
     *
     * The function will dispatch a `drawstart` event.
     *
     * @param {!Feature<LineString>} feature Feature to be extended.
     * @api
     */
    extend(feature: Feature<LineString>) {
        const geometry = feature.getGeometry();
        const lineString = geometry;
        this.sketchFeature_ = feature;
        this.sketchCoords_ = lineString.getCoordinates();
        const last = this.sketchCoords_[this.sketchCoords_.length - 1];
        this.finishCoordinate_ = last.slice();
        this.sketchCoords_.push(last.slice());
        this.sketchPoint_ = new Feature(new Point(last));
        this.updateSketchFeatures_();
        this.dispatchEvent(
            new DrawEvent(DrawEventType.DRAWSTART, this.sketchFeature_),
        );
    }

    /**
     * Redraw the sketch features.
     * @private
     */
    updateSketchFeatures_() {
        const sketchFeatures = [];
        if (this.sketchFeature_) {
            sketchFeatures.push(this.sketchFeature_);
        }
        if (this.sketchLine_) {
            sketchFeatures.push(this.sketchLine_);
        }
        if (this.sketchPoint_) {
            sketchFeatures.push(this.sketchPoint_);
        }
        const overlaySource = this.overlay_.getSource();
        overlaySource.clear(true);
        overlaySource.addFeatures(sketchFeatures);
    }

    /**
     * @private
     */
    updateState_() {
        const map = this.getMap();
        const active = this.getActive();
        if (!map || !active) {
            this.abortDrawing();
        }
        this.overlay_.setMap(active ? map : null);
    }
}

/**
 * @return {import("../style/Style").StyleFunction} Styles.
 */
function getDefaultStyleFunction(): import("../style/Style").StyleFunction {
    const styles = createEditingStyle();
    return function (feature, resolution) {
        return styles[feature.getGeometry().getType()];
    };
}

/**
 * Create a `geometryFunction` for `type: 'Circle'` that will create a regular
 * polygon with a user specified number of sides and start angle instead of a
 * {@link import("@olts/geometry").Circle} geometry.
 * @param [sides] Number of sides of the regular polygon.
 *     Default is 32.
 * @param [angle] Angle of the first point in counter-clockwise
 *     radians. 0 means East.
 *     Default is the angle defined by the heading from the center of the
 *     regular polygon to the current pointer position.
 * @return {GeometryFunction} Function that draws a polygon.
 * @api
 */
export function createRegularPolygon(sides: number, angle: number): GeometryFunction {
    return function (coordinates, geometry, projection) {
        const center = fromUserCoordinate(
      /** @type {LineCoordType} */(coordinates)[0],
            projection,
        );
        const end = fromUserCoordinate(
      /** @type {LineCoordType} */(coordinates)[coordinates.length - 1],
            projection,
        );
        const radius = Math.sqrt(squaredCoordinateDistance(center, end));
        geometry = geometry || fromCircle(new Circle(center), sides);

        let internalAngle = angle;
        if (!angle && angle !== 0) {
            const x = end[0] - center[0];
            const y = end[1] - center[1];
            internalAngle = Math.atan2(y, x);
        }
        makeRegular(
      /** @type {Polygon} */(geometry),
            center,
            radius,
            internalAngle,
        );

        const userProjection = getUserProjection();
        if (userProjection) {
            geometry.transform(projection, userProjection);
        }
        return geometry;
    };
}

/**
 * Create a `geometryFunction` that will create a box-shaped polygon (aligned
 * with the coordinate system axes).  Use this with the draw interaction and
 * `type: 'Circle'` to return a box instead of a circle geometry.
 * @return {GeometryFunction} Function that draws a box-shaped polygon.
 * @api
 */
export function createBox(): GeometryFunction {
    return function (coordinates, geometry, projection) {
        const extent = boundingExtent(
      /** @type {LineCoordType} */([
                coordinates[0],
                coordinates[coordinates.length - 1],
            ]).map(function (coordinate) {
                return fromUserCoordinate(coordinate, projection);
            }),
        );
        const boxCoordinates = [
            [
                getBottomLeft(extent),
                getBottomRight(extent),
                getTopRight(extent),
                getTopLeft(extent),
                getBottomLeft(extent),
            ],
        ];
        if (geometry) {
            geometry.setCoordinates(boxCoordinates);
        } else {
            geometry = new Polygon(boxCoordinates);
        }
        const userProjection = getUserProjection();
        if (userProjection) {
            geometry.transform(projection, userProjection);
        }
        return geometry;
    };
}

/**
 * Get the drawing mode.  The mode for multi-part geometries is the same as for
 * their single-part cousins.
 * @param {GeometryType} type Geometry type.
 * @return {Mode} Drawing mode.
 */
function getMode(type: GeometryType): Mode {
    switch (type) {
        case 'Point':
        case 'MultiPoint':
            return 'Point';
        case 'LineString':
        case 'MultiLineString':
            return 'LineString';
        case 'Polygon':
        case 'MultiPolygon':
            return 'Polygon';
        case 'Circle':
            return 'Circle';
        default:
            throw new Error('Invalid type: ' + type);
    }
}

export default Draw;
