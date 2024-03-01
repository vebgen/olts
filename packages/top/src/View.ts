
import { 
    BaseEvent, BaseObject, CombinedOnSignature, 
    EventType, EventsKey, ObjectEvent, ObjectEventType, OnSignature 
} from '@olts/events';
import { easeOut, inAndOut } from '@olts/core/easing';
import {
    Extent,
    getCenter,
    getForViewAndSize,
    getHeight,
    getWidth,
    isEmpty,
} from '@olts/core/extent';
import { VOID } from '@olts/core/functions';
import {
    Coordinate,
    Pixel,
    add as addCoordinate,
    equals as coordinatesEqual,
    equals,
    rotate as rotateCoordinate,
} from '@olts/core/coordinate';
import { assert } from '@olts/core/asserts';
import { clamp, modulo } from '@olts/core/math';
import { linearFindNearest } from '@olts/core/array';
import { SimpleGeometry, polygonFromExtent } from '@olts/geometry';
import type { ValueOf } from '@olts/core';
import { Size } from '@olts/core/size';
import {
    METERS_PER_UNIT,
    Projection,
    ProjectionLike,
    createProjection,
    disableCoordinateWarning,
    fromUserCoordinate,
    fromUserExtent,
    getUserProjection,
    toUserCoordinate,
    toUserExtent,
} from '@olts/core/proj';

import { DEFAULT_TILE_SIZE } from './tile-grid/common';
import { none as centerNone, createExtent } from './center-constraint';
import {
    createMinMaxResolution,
    createSnapToPower,
    createSnapToResolutions,
} from './resolution-constraint';
import {
    createSnapToN,
    createSnapToZero,
    disable,
    none as rotationNone,
} from './rotation-constraint';
import type { Type as CenterConstraintType } from './center-constraint';
import type { Type as ResolutionConstraintType } from './resolution-constraint';
import type { Type as RotationConstraintType } from './rotation-constraint';
import { State as LayerState } from './layer/Layer';

/**
 * 
 */
export const ViewHints = {
    ANIMATING: 0,
    INTERACTING: 1,
} as const;

export type ViewHint = ValueOf<typeof ViewHints>;


/**
 * 
 */
export const ViewProperties = {
    CENTER: 'center',
    RESOLUTION: 'resolution',
    ROTATION: 'rotation',
} as const;

export type ViewProperty = ValueOf<typeof ViewProperties>;


/**
 * An animation configuration
 */
export interface Animation {
    /**
     * Source center.
     */
    sourceCenter?: Coordinate;

    /**
     * Target center.
     */
    targetCenter?: Coordinate;

    /**
     * Source resolution.
     */
    sourceResolution?: number;

    /**
     * Target resolution.
     */
    targetResolution?: number;

    /**
     * Source rotation.
     */
    sourceRotation?: number;

    /**
     * Target rotation.
     */
    targetRotation?: number;

    /**
     * Anchor.
     */
    anchor?: Coordinate;

    /**
     * Start.
     */
    start: number;

    /**
     * Duration.
     */
    duration: number;

    /**
     * Complete.
     */
    complete: boolean;

    /**
     * Easing.
     */
    easing: (arg0: number) => number;

    /**
     * Callback.
     */
    callback: (arg0: boolean) => void;
}


/**
 * 
 */
export interface Constraints {
    /**
     * Center.
     */
    center: CenterConstraintType;

    /**
     * Resolution.
     */
    resolution: ResolutionConstraintType;

    /**
     * Rotation.
     */
    rotation: RotationConstraintType;
}


/**
 *
 * @property {function(number):number} [easing] The easing function used during
 * the animation (defaults to {@link easing.inAndOut}).
 * The function will be called for each frame with a number representing a
 * fraction of the animation's duration.  The function should return a number
 * between 0 and 1 representing the progress toward the destination state.
 * @property {function(boolean):void} [callback] Function called when the view is in
 * its final position. The callback will be called with `true` if the animation
 * series completed on its own or `false` if it was cancelled.
 */
export interface FitOptions {
    /**
     * The size in pixels of the box to fit the extent into. 
     *
     * Defaults to the size of the map the view is associated with. If no map
     * or multiple maps are connected to the view, provide the desired box size
     * (e.g. `map.getSize()`).
     */
    size?: Size;

    /**
     * Padding (in pixels) to be cleared inside the view.
     *
     * Values in the array are top, right, bottom and left padding.
     */
    padding?: [number, number, number, number];

    /**
     * If the view `constrainResolution` option is `true`, get the nearest
     * extent instead of the closest that actually fits the view.
     */
    nearest?: boolean;

    /**
     * Minimum resolution that we zoom to.
     */
    minResolution?: number;

    /**
     * Maximum zoom level that we zoom to.
     *
     * If `minResolution` is given, this property is ignored.
     */
    maxZoom?: number;

    /**
     * The duration of the animation in milliseconds.
     *
     * By default, there is no animation to the target extent.
     */
    duration?: number;

    /**
     * The easing function used during the animation (defaults to
     * {@link easing.inAndOut}).
     *
     * The function will be called for each frame with a number representing a
     * fraction of the animation's duration.
     *
     * The function should return a number between 0 and 1 representing the
     * progress toward the destination state.
     */
    easing?: (fraction: number) => number;

    /**
     * Function called when the view is in its final position.
     *
     * The callback will be called with `true` if the animation series
     * completed on its own or `false` if it was cancelled.
     */
    callback?: (completed: boolean) => void;
}


/**
 *
 */
export interface ViewOptions {
    /**
     * The initial center for the view.
     *
     * If a user projection is not set, the coordinate system for the center is
     * specified with the `projection` option. Layer sources will not be
     * fetched if this is not set, but the center can be set later with
     * {@link #setCenter}.
     */
    center?: Coordinate;

    /**
     * Rotation constraint.
     *
     * `false` means no constraint. `true` means no constraint, but snap to
     * zero near zero. A number constrains the rotation to that number of
     * values. For example, `4` will constrain the rotation to 0, 90, 180, and
     * 270 degrees.
     */
    constrainRotation?: boolean | number;

    /**
     * Enable rotation.
     *
     * If `false`, a rotation constraint that always sets the rotation to zero
     * is used. The `constrainRotation` option has no effect if `enableRotation`
     * is `false`.
     */
    enableRotation?: boolean;

    /**
     * The extent that constrains the view.
     *
     * In other words, nothing outside of this extent can be visible on the
     * map.
     */
    extent?: Extent;

    /**
     * If true, the extent constraint will only apply to the view center and
     * not the whole extent.
     */
    constrainOnlyCenter?: boolean;

    /**
     * If true, the extent constraint will be applied smoothly, i.e. allow the
     * view to go slightly outside of the given `extent`.
     */
    smoothExtentConstraint?: boolean;

    /**
     * The maximum resolution used to determine the resolution constraint.
     *
     * It is used together with `minResolution` (or `maxZoom`) and
     * `zoomFactor`.
     *
     * If unspecified it is calculated in such a way that the projection's
     * validity extent fits in a 256x256 px tile.
     *
     * If the projection is Spherical Mercator (the default) then
     * `maxResolution` defaults to `40075016.68557849 / 256 =
     * 156543.03392804097`.
     */
    maxResolution?: number;

    /**
     * The minimum resolution used to determine the resolution constraint.
     *
     * It is used together with `maxResolution` (or `minZoom`) and
     * `zoomFactor`.
     *
     * If unspecified it is calculated assuming 29 zoom levels (with a factor
     * of 2).
     *
     * If the projection is Spherical Mercator (the default) then
     * `minResolution` defaults to `40075016.68557849 / 256 / Math.pow(2, 28) =
     * 0.0005831682455839253`.
     */
    minResolution?: number;

    /**
     * The maximum zoom level used to determine the resolution constraint.
     *
     * It is used together with `minZoom` (or `maxResolution`) and
     * `zoomFactor`.  Note that if `minResolution` is also provided, it is
     * given precedence over `maxZoom`.
     * 
     * @default 28
     */
    maxZoom?: number;

    /**
     * The minimum zoom level used to determine the resolution constraint.
     *
     * It is used together with `maxZoom` (or `minResolution`) and
     * `zoomFactor`. Note that if `maxResolution` is also provided, it is given
     * precedence over `minZoom`.
     * 
     * @default 0
     */
    minZoom?: number;

    /**
     * If `false` the view is constrained so only one world is visible, and you
     * cannot pan off the edge. 
     *
     * If `true` the map may show multiple worlds at low zoom levels.  Only
     * used if the `projection` is global.
     *
     * Note that if `extent` is also provided it is given precedence.
     * 
     * @default false
     */
    multiWorld?: boolean;

    /**
     * If true, the view will always animate to the closest zoom level after an
     * interaction; false means intermediary zoom levels are allowed.
     * 
     * @default false
     */
    constrainResolution?: boolean;

    /**
     * If true, the resolution min/max values will be applied smoothly, i. e.
     * allow the view to exceed slightly the given resolution or zoom bounds.
     */
    smoothResolutionConstraint?: boolean;

    /**
     * Allow the view to be zoomed out to show the full configured extent.
     *
     * By default, when a view is configured with an extent, users will not be
     * able to zoom out so the viewport exceeds the extent in either dimension.
     * This means the full extent may not be visible if the viewport is taller
     * or wider than the aspect ratio of the configured extent.
     *
     * If showFullExtent is true, the user will be able to zoom out so that the
     * viewport exceeds the height or width of the configured extent, but not
     * both, allowing the full extent to be shown.
     * 
     * @default false
     */
    showFullExtent?: boolean;

    /**
     * The projection. The default is Spherical Mercator.
     * 
     * @default 'EPSG:3857'
     */
    projection?: string | ProjectionLike;

    /**
     * The initial resolution for the view.
     *
     * The units are `projection` units per pixel (e.g. meters per pixel).
     *
     * An alternative to setting this is to set `zoom`. Layer sources will not
     * be fetched if neither this nor `zoom` are defined, but they can be set
     * later with {@link #setZoom} or {@link #setResolution}.
     */
    resolution?: number;

    /**
     * Resolutions that determine the zoom levels if specified.
     *
     * The index in the array corresponds to the zoom level, therefore the
     * resolution values have to be in descending order. It also constrains the
     * resolution by the minimum and maximum value.
     *
     * If set the `maxResolution`, `minResolution`, `minZoom`, `maxZoom`, and
     * `zoomFactor` options are ignored.
     */
    resolutions?: number[];

    /**
     * The initial rotation for the view in radians.
     * 
     * The positive rotation is clockwise, 0 means North.
     *
     * @default 0
     */
    rotation?: number;

    /**
     * Zoom level used to calculate the initial resolution for the view.
     *
     * Only used if `resolution` is not defined. 
     */
    zoom?: number;

    /**
     * The zoom factor used to compute the corresponding resolution.
     * 
     * @default 2
     */
    zoomFactor?: number;

    /**
     * Padding (in css pixels).
     *
     * If the map viewport is partially covered with other content (overlays)
     * along its edges, this setting allows to shift the center of the viewport
     * away from that content. The order of the values is top, right, bottom,
     * left.
     * 
     * @default [0, 0, 0, 0]
     */
    padding?: [number, number, number, number];
}


/**
 * 
 */
export interface AnimationOptions {
    /**
     * The center of the view at the end of the animation.
     */
    center?: Coordinate;

    /**
     * The zoom level of the view at the end of the animation.
     *
     * This takes precedence over `resolution`.
     */
    zoom?: number;

    /**
     * The resolution of the view at the end of the animation.
     *
     * If `zoom` is also provided, this option will be ignored.
     */
    resolution?: number;

    /**
     * The rotation of the view at the end of the animation.
     */
    rotation?: number;

    /**
     * Optional anchor to remain fixed during a rotation or resolution
     * animation.
     */
    anchor?: Coordinate;

    /**
     * The duration of the animation in milliseconds.
     *
     * @default 1000
     */
    duration?: number;

    /**
     * The easing function used during the animation (defaults to
     * {@link easing.inAndOut}).
     *
     * The function will be called for each frame with a number representing a
     * fraction of the animation's duration. The function should return a number
     * between 0 and 1 representing the progress toward the destination state.
     */
    easing?: (fraction: number) => number;
}


/**
 * 
 */
export interface State {
    /**
     * Center (in view projection coordinates).
     */
    center: Coordinate;

    /**
     * Projection.
     */
    projection: string | ProjectionLike;

    /**
     * Resolution.
     */
    resolution: number;

    /**
     * The next center during an animation series.
     */
    nextCenter?: Coordinate;

    /**
     * The next resolution during an animation series.
     */
    nextResolution?: number;

    /**
     * The next rotation during an animation series.
     */
    nextRotation?: number;

    /**
     * Rotation.
     */
    rotation: number;

    /**
     * Zoom.
     */
    zoom: number;
}


/**
 * Like {@link FrameState}, but just `viewState` and `extent`.
 */
export interface ViewStateLayerStateExtent {
    /**
     * View state.
     */
    viewState: State;

    /**
     * Extent (in user projection coordinates).
     */
    extent: Extent;

    /**
     * Layer states.
     */
    layerStatesArray?: LayerState[];
}



/**
 * Default min zoom level for the map view.
 */
const DEFAULT_MIN_ZOOM: number = 0;


export type ViewObjectEventTypes =
    | ObjectEventType
    | 'change:center'
    | 'change:resolution'
    | 'change:rotation';


/***
 * 
 */
export type ViewOnSignature<Return> =
    & OnSignature<EventType, BaseEvent, Return>
    & OnSignature<ViewObjectEventTypes, ObjectEvent, Return>
    & CombinedOnSignature<EventType | ViewObjectEventTypes, Return>;



/**
 * A View object represents a simple 2D view of the map.
 *
 * This is the object to act upon to change the center, resolution, and
 * rotation of the map.
 *
 * A View has a `projection`. The projection determines the coordinate system
 * of the center, and its units determine the units of the resolution
 * (projection units per pixel). The default projection is Web Mercator
 * (EPSG:3857).
 *
 * ### The view states
 *
 * A View is determined by three states: `center`, `resolution`, and
 * `rotation`. Each state has a corresponding getter and setter, e.g.
 * `getCenter` and `setCenter` for the `center` state.
 *
 * The `zoom` state is actually not saved on the view: all computations
 * internally use the `resolution` state. Still, the `setZoom` and `getZoom`
 * methods are available, as well as `getResolutionForZoom` and
 * `getZoomForResolution` to switch from one system to the other.
 *
 * ### The constraints
 *
 * `setCenter`, `setResolution` and `setRotation` can be used to change the
 * states of the view, but any constraint defined in the constructor will be
 * applied along the way.
 *
 * A View object can have a *resolution constraint*, a *rotation constraint*
 * and a *center constraint*.
 *
 * The *resolution constraint* typically restricts min/max values and snaps to
 * specific resolutions. It is determined by the following options:
 * `resolutions`, `maxResolution`, `maxZoom` and `zoomFactor`. If `resolutions`
 * is set, the other three options are ignored. See documentation for each
 * option for more information. By default, the view only has a min/max
 * restriction and allow intermediary zoom levels when pinch-zooming for
 * example.
 *
 * The *rotation constraint* snaps to specific angles. It is determined by the
 * following options: `enableRotation` and `constrainRotation`. By default
 * rotation is allowed and its value is snapped to zero when approaching the
 * horizontal.
 *
 * The *center constraint* is determined by the `extent` option. By default the
 * view center is not constrained at all.
 *
 * ### Changing the view state
 *
 * It is important to note that `setZoom`, `setResolution`, `setCenter` and
 * `setRotation` are subject to the above mentioned constraints. As such, it
 * may sometimes not be possible to know in advance the resulting state of the
 * View. For example, calling `setResolution(10)` does not guarantee that
 * `getResolution()` will return `10`.
 *
 * A consequence of this is that, when applying a delta on the view state, one
 * should use `adjustCenter`, `adjustRotation`, `adjustZoom` and
 * `adjustResolution` rather than the corresponding setters. This will let view
 * do its internal computations. Besides, the `adjust*` methods also take an
 * `anchor` argument which allows specifying an origin for the transformation.
 *
 * ### Interacting with the view
 *
 * View constraints are usually only applied when the view is *at rest*,
 * meaning that no interaction or animation is ongoing. As such, if the user
 * puts the view in a state that is not equivalent to a constrained one (e.g.
 * rotating the view when the snap angle is 0), an animation will be triggered
 * at the interaction end to put back the view to a stable state;
 *
 * @api
 */
export class View extends BaseObject {
    /**
     * 
     */
    override on: ViewOnSignature<EventsKey>;

    /**
     * 
     */
    override once: ViewOnSignature<EventsKey>;

    /**
     * 
     */
    override un: ViewOnSignature<void>;

    /**
     * 
     */
    private hints_: [ViewHint, ViewHint] = [0, 0];

    /**
     * 
     */
    private animations_: Animation[][] = [];

    /**
     * 
     */
    private updateAnimationKey_: number | undefined;

    /**
     * 
     */
    private projection_: Projection;

    /**
     * 
     */
    private viewportSize_: Size = [100, 100];

    /**
     * 
     */
    private targetCenter_: Coordinate | undefined = undefined;

    /**
     * 
     */
    private targetResolution_: number | undefined;

    /**
     * 
     */
    private targetRotation_: number | undefined;

    /**
     * 
     */
    private nextCenter_: Coordinate | null = null;

    /**
     * 
     */
    private nextResolution_: number | undefined;

    /**
     * 
     */
    private nextRotation_: number | undefined;

    /**
     * 
     */
    private cancelAnchor_: Coordinate | undefined = undefined;

    /**
     * 
     */
    private maxResolution_: number = undefined as unknown as number;

    /**
     * 
     */
    private minResolution_: number = undefined as unknown as number;

    /**
     * 
     */
    private zoomFactor_: number = undefined as unknown as number;

    /**
     * 
     */
    private resolutions_: number[] | undefined = undefined;

    /**
     * 
     */
    private padding_: [number, number, number, number] | undefined = undefined;

    /**
     * 
     */
    private minZoom_: number = undefined as unknown as number;

    /**
     * 
     */
    private constraints_: Constraints = undefined as unknown as Constraints;

    /**
     * @param options View options.
     */
    constructor(options?: ViewOptions) {
        super();
        this.on = this.onInternal as ViewOnSignature<EventsKey>;
        this.once = this.onceInternal as ViewOnSignature<EventsKey>;
        this.un = this.unInternal as ViewOnSignature<void>;

        options = Object.assign({}, options);
        this.projection_ = createProjection(options.projection, 'EPSG:3857')!;

        if (options.projection) {
            disableCoordinateWarning();
        }
        if (options.center) {
            options.center = fromUserCoordinate(
                options.center, this.projection_
            );
        }
        if (options.extent) {
            options.extent = fromUserExtent(options.extent, this.projection_);
        }

        this.applyOptions_(options);
    }

    /**
     * Set up the view with the given options.
     * 
     * @param options View options.
     */
    applyOptions_(options: ViewOptions) {
        const properties = Object.assign({}, options);
        for (const key in ViewProperties) {
            delete properties[key as ViewProperty];
        }
        this.setProperties(properties, true);

        const resolutionConstraintInfo = createResolutionConstraint(options);
        this.maxResolution_ = resolutionConstraintInfo.maxResolution;
        this.minResolution_ = resolutionConstraintInfo.minResolution;
        this.zoomFactor_ = resolutionConstraintInfo.zoomFactor;
        this.resolutions_ = options.resolutions;
        this.padding_ = options.padding;
        this.minZoom_ = resolutionConstraintInfo.minZoom;

        const centerConstraint = createCenterConstraint(options);
        const resolutionConstraint = resolutionConstraintInfo.constraint;
        const rotationConstraint = createRotationConstraint(options);

        /**
         * @private
         * @type {Constraints}
         */
        this.constraints_ = {
            center: centerConstraint,
            resolution: resolutionConstraint,
            rotation: rotationConstraint,
        };

        this.setRotation(options.rotation !== undefined ? options.rotation : 0);
        this.setCenterInternal(
            options.center !== undefined ? options.center : null,
        );
        if (options.resolution !== undefined) {
            this.setResolution(options.resolution);
        } else if (options.zoom !== undefined) {
            this.setZoom(options.zoom);
        }
    }

    /**
     * Padding (in css pixels).
     *
     * If the map viewport is partially covered with other content (overlays)
     * along its edges, this setting allows to shift the center of the viewport
     * away from that content. The order of the values in the array is top,
     * right, bottom, left. The default is no padding, which is equivalent to
     * `[0, 0, 0, 0]`.
     * @api
     */
    get padding(): [number, number, number, number] | undefined {
        return this.padding_;
    }
    set padding(padding) {
        let oldPadding = this.padding_;
        this.padding_ = padding;
        const center = this.getCenterInternal();
        if (center) {
            const newPadding = padding || [0, 0, 0, 0];
            oldPadding = oldPadding || [0, 0, 0, 0];
            const resolution = this.getResolution();
            if (resolution === undefined) {
                throw new Error('Resolution is not defined');
            }
            const offsetX =
                (resolution / 2) *
                (newPadding[3] - oldPadding[3] + oldPadding[1] - newPadding[1]);
            const offsetY =
                (resolution / 2) *
                (newPadding[0] - oldPadding[0] + oldPadding[2] - newPadding[2]);
            this.setCenterInternal([center[0] + offsetX, center[1] - offsetY]);
        }
    }

    /**
     * Get an updated version of the view options used to construct the view.
     *
     * The current resolution (or zoom), center, and rotation are applied to
     * any stored options.
     *
     * The provided options can be used to apply new min/max zoom or resolution
     * limits.
     * 
     * @param newOptions New options to be applied.
     * @return New options updated with the current view state.
     */
    getUpdatedOptions_(newOptions: ViewOptions): ViewOptions {
        const options = this.getProperties<ViewOptions>();

        // preserve resolution (or zoom)
        if (options.resolution !== undefined) {
            options.resolution = this.getResolution();
        } else {
            options.zoom = this.getZoom();
        }

        // preserve center
        options.center = this.getCenterInternal();

        // preserve rotation
        options.rotation = this.getRotation();

        return Object.assign({}, options, newOptions);
    }

    /**
     * Animate the view.  The view's center, zoom (or resolution), and rotation
     * can be animated for smooth transitions between view states.  For
     * example, to animate the view to a new zoom level:
     *
     *     view.animate({zoom: view.getZoom() + 1});
     *
     * By default, the animation lasts one second and uses in-and-out easing.
     * You can customize this behavior by including `duration` (in
     * milliseconds) and `easing` options (see {@link easing}).
     *
     * To chain together multiple animations, call the method with multiple
     * animation objects.  For example, to first zoom and then pan:
     *
     *     view.animate({zoom: 10}, {center: [0, 0]});
     *
     * If you provide a function as the last argument to the animate method, it
     * will get called at the end of an animation series.  The callback will be
     * called with `true` if the animation series completed on its own or
     * `false` if it was cancelled.
     *
     * Animations are cancelled by user interactions (e.g. dragging the map) or
     * by calling `view.setCenter()`, `view.setResolution()`, or
     * `view.setRotation()` (or another method that calls one of these).
     *
     * @param var_args Animation options.  Multiple animations can be run in
     *     series by passing multiple options objects.  To run multiple
     *     animations in parallel, call the method multiple times.  An optional
     *     callback can be provided as a final argument.  The callback will be
     *     called with a boolean indicating whether the animation completed
     *     without being cancelled.
     * @api
     */
    animate(var_args: (AnimationOptions | ((arg0: boolean) => void))[]) {
        if (this.isDef() && !this.getAnimating()) {
            this.resolveConstraints(0);
        }
        const args = new Array(arguments.length);
        for (let i = 0; i < args.length; ++i) {
            let options = arguments[i];
            if (options.center) {
                options = Object.assign({}, options);
                options.center = fromUserCoordinate(
                    options.center,
                    this.getProjection(),
                );
            }
            if (options.anchor) {
                options = Object.assign({}, options);
                options.anchor = fromUserCoordinate(
                    options.anchor,
                    this.getProjection(),
                );
            }
            args[i] = options;
        }
        this.animateInternal.apply(this, args);
    }

    /**
     * @param var_args Animation options.
     */
    animateInternal(
        var_args: (AnimationOptions | ((arg0: boolean) => void))[]
    ) {
        let animationCount = arguments.length;
        let callback;
        if (
            animationCount > 1 &&
            typeof arguments[animationCount - 1] === 'function'
        ) {
            callback = arguments[animationCount - 1];
            --animationCount;
        }

        let i = 0;
        for (; i < animationCount && !this.isDef(); ++i) {
            // if view properties are not yet set, shortcut to the final state
            const state = arguments[i];
            if (state.center) {
                this.setCenterInternal(state.center);
            }
            if (state.zoom !== undefined) {
                this.setZoom(state.zoom);
            } else if (state.resolution) {
                this.setResolution(state.resolution);
            }
            if (state.rotation !== undefined) {
                this.setRotation(state.rotation);
            }
        }
        if (i === animationCount) {
            if (callback) {
                animationCallback(callback, true);
            }
            return;
        }

        let start = Date.now();
        assert(this.targetCenter_, "targetCenter_ must be defined");
        let center = this.targetCenter_!.slice();
        let resolution = this.targetResolution_;
        let rotation = this.targetRotation_;
        const series = [];
        for (; i < animationCount; ++i) {
            const options = arguments[i] as AnimationOptions;

            const animation: Animation = {
                start: start,
                complete: false,
                anchor: options.anchor,
                duration: options.duration !== undefined
                    ? options.duration
                    : 1000,
                easing: options.easing || inAndOut,
                callback: callback,
            };

            if (options.center) {
                animation.sourceCenter = center;
                animation.targetCenter = options.center.slice();
                center = animation.targetCenter;
            }

            if (options.zoom !== undefined) {
                animation.sourceResolution = resolution;
                animation.targetResolution = this.getResolutionForZoom(
                    options.zoom
                );
                resolution = animation.targetResolution;
            } else if (options.resolution) {
                animation.sourceResolution = resolution;
                animation.targetResolution = options.resolution;
                resolution = animation.targetResolution;
            }

            if (options.rotation !== undefined) {
                assert(rotation !== undefined, "rotation must be defined");
                animation.sourceRotation = rotation;
                const delta = modulo(
                    options.rotation - rotation! + Math.PI, 2 * Math.PI
                ) - Math.PI;
                animation.targetRotation = rotation! + delta;
                rotation = animation.targetRotation;
            }

            // check if animation is a no-op
            if (isNoopAnimation(animation)) {
                animation.complete = true;
                // we still push it onto the series for callback handling
            } else {
                start += animation.duration;
            }
            series.push(animation);
        }
        this.animations_.push(series);
        this.setHint(ViewHints.ANIMATING, 1);
        this.updateAnimations_();
    }

    /**
     * Determine if the view is being animated.
     * @return The view is being animated.
     * @api
     */
    getAnimating(): boolean {
        return this.hints_[ViewHints.ANIMATING] > 0;
    }

    /**
     * Determine if the user is interacting with the view, such as panning or
     * zooming.
     * 
     * @return The view is being interacted with.
     * @api
     */
    getInteracting(): boolean {
        return this.hints_[ViewHints.INTERACTING] > 0;
    }

    /**
     * Cancel any ongoing animations.
     * @api
     */
    cancelAnimations() {
        this.setHint(ViewHints.ANIMATING, -this.hints_[ViewHints.ANIMATING]);
        let anchor;
        for (let i = 0, ii = this.animations_.length; i < ii; ++i) {
            const series = this.animations_[i];
            if (series[0].callback as any) {
                animationCallback(series[0].callback, false);
            }
            if (!anchor) {
                for (let j = 0, jj = series.length; j < jj; ++j) {
                    const animation = series[j];
                    if (!animation.complete) {
                        anchor = animation.anchor;
                        break;
                    }
                }
            }
        }
        this.animations_.length = 0;
        this.cancelAnchor_ = anchor;
        this.nextCenter_ = null;
        this.nextResolution_ = NaN;
        this.nextRotation_ = NaN;
    }

    /**
     * Update all animations.
     */
    updateAnimations_() {
        if (this.updateAnimationKey_ !== undefined) {
            cancelAnimationFrame(this.updateAnimationKey_);
            this.updateAnimationKey_ = undefined;
        }
        if (!this.getAnimating()) {
            return;
        }
        const now = Date.now();
        let more = false;
        for (let i = this.animations_.length - 1; i >= 0; --i) {
            const series = this.animations_[i];
            let seriesComplete = true;
            for (let j = 0, jj = series.length; j < jj; ++j) {
                const animation = series[j];
                if (animation.complete) {
                    continue;
                }
                const elapsed = now - animation.start;
                let fraction =
                    animation.duration > 0 ? elapsed / animation.duration : 1;
                if (fraction >= 1) {
                    animation.complete = true;
                    fraction = 1;
                } else {
                    seriesComplete = false;
                }
                const progress = animation.easing(fraction);
                if (animation.sourceCenter) {
                    const x0 = animation.sourceCenter[0];
                    const y0 = animation.sourceCenter[1];
                    const x1 = animation.targetCenter[0];
                    const y1 = animation.targetCenter[1];
                    this.nextCenter_ = animation.targetCenter;
                    const x = x0 + progress * (x1 - x0);
                    const y = y0 + progress * (y1 - y0);
                    this.targetCenter_ = [x, y];
                }
                if (animation.sourceResolution && animation.targetResolution) {
                    const resolution =
                        progress === 1
                            ? animation.targetResolution
                            : animation.sourceResolution +
                            progress *
                            (animation.targetResolution - animation.sourceResolution);
                    if (animation.anchor) {
                        const size = this.getViewportSize_(this.getRotation());
                        const constrainedResolution = this.constraints_.resolution(
                            resolution,
                            0,
                            size,
                            true,
                        );
                        this.targetCenter_ = this.calculateCenterZoom(
                            constrainedResolution,
                            animation.anchor,
                        );
                    }
                    this.nextResolution_ = animation.targetResolution;
                    this.targetResolution_ = resolution;
                    this.applyTargetState_(true);
                }
                if (
                    animation.sourceRotation !== undefined &&
                    animation.targetRotation !== undefined
                ) {
                    const rotation =
                        progress === 1
                            ? modulo(animation.targetRotation + Math.PI, 2 * Math.PI) -
                            Math.PI
                            : animation.sourceRotation +
                            progress *
                            (animation.targetRotation - animation.sourceRotation);
                    if (animation.anchor) {
                        const constrainedRotation = this.constraints_.rotation(
                            rotation,
                            true,
                        );
                        this.targetCenter_ = this.calculateCenterRotate(
                            constrainedRotation,
                            animation.anchor,
                        );
                    }
                    this.nextRotation_ = animation.targetRotation;
                    this.targetRotation_ = rotation;
                }
                this.applyTargetState_(true);
                more = true;
                if (!animation.complete) {
                    break;
                }
            }
            if (seriesComplete) {
                this.animations_[i] = null;
                this.setHint(ViewHints.ANIMATING, -1);
                this.nextCenter_ = null;
                this.nextResolution_ = NaN;
                this.nextRotation_ = NaN;
                const callback = series[0].callback;
                if (callback) {
                    animationCallback(callback, true);
                }
            }
        }
        // prune completed series
        this.animations_ = this.animations_.filter(Boolean);
        if (more && this.updateAnimationKey_ === undefined) {
            this.updateAnimationKey_ = requestAnimationFrame(
                this.updateAnimations_.bind(this),
            );
        }
    }

    /**
     * @param rotation Target rotation.
     * @param anchor Rotation anchor.
     * @return Center for rotation and anchor.
     */
    calculateCenterRotate(rotation: number, anchor: Coordinate): Coordinate | undefined {
        let center;
        const currentCenter = this.getCenterInternal();
        if (currentCenter !== undefined) {
            center = [currentCenter[0] - anchor[0], currentCenter[1] - anchor[1]];
            rotateCoordinate(center, rotation - this.getRotation());
            addCoordinate(center, anchor);
        }
        return center;
    }

    /**
     * @param resolution Target resolution.
     * @param anchor Zoom anchor.
     * @return Center for resolution and anchor.
     */
    calculateCenterZoom(resolution: number, anchor: Coordinate): Coordinate | undefined {
        let center;
        const currentCenter = this.getCenterInternal();
        const currentResolution = this.getResolution();
        if (currentCenter !== undefined && currentResolution !== undefined) {
            const x =
                anchor[0] -
                (resolution * (anchor[0] - currentCenter[0])) / currentResolution;
            const y =
                anchor[1] -
                (resolution * (anchor[1] - currentCenter[1])) / currentResolution;
            center = [x, y];
        }
        return center;
    }

    /**
     * Returns the current viewport size.
     *
     * @param rotation Take into account the rotation of the viewport when
     *      giving the size
     * @return Viewport size or `[100, 100]` when no viewport is found.
     */
    private getViewportSize_(rotation?: number): Size {
        const size = this.viewportSize_;
        if (rotation) {
            const w = size[0];
            const h = size[1];
            return [
                (
                    Math.abs(w * Math.cos(rotation)) +
                    Math.abs(h * Math.sin(rotation))
                ),
                (
                    Math.abs(w * Math.sin(rotation)) +
                    Math.abs(h * Math.cos(rotation))
                ),
            ];
        }
        return size;
    }

    /**
     * Stores the viewport size on the view.
     *
     * The viewport size is not read every time from the DOM to avoid
     * performance hit and layout reflow. This should be done on map size
     * change.
     *
     * Note: the constraints are not resolved during an animation to avoid
     * stopping it
     * @param size Viewport size; if undefined, [100, 100] is assumed
     */
    setViewportSize(size?: Size) {
        this.viewportSize_ = Array.isArray(size)
            ? size.slice() as Size
            : [100, 100];
        if (!this.getAnimating()) {
            this.resolveConstraints(0);
        }
    }

    /**
     * Get the view center.
     * 
     * @return The center of the view.
     * @observable
     * @api
     */
    getCenter(): Coordinate | undefined {
        const center = this.getCenterInternal();
        if (!center) {
            return center;
        }
        return toUserCoordinate(center, this.getProjection());
    }

    /**
     * Get the view center without transforming to user projection.
     * @return The center of the view.
     */
    getCenterInternal(): Coordinate | undefined {
        return this.get(ViewProperties.CENTER);
    }

    /**
     * @return Constraints.
     */
    getConstraints(): Constraints {
        return this.constraints_;
    }

    /**
     * @return Resolution constraint is set
     */
    getConstrainResolution(): boolean {
        return this.get('constrainResolution');
    }

    /**
     * @param hints Destination array.
     * @return Hint.
     */
    getHints(hints?: number[]): number[] {
        if (hints !== undefined) {
            hints[0] = this.hints_[0];
            hints[1] = this.hints_[1];
            return hints;
        }
        return this.hints_.slice();
    }

    /**
     * Calculate the extent for the current view state and the passed box size.
     *
     * @param size The pixel dimensions of the box into which the calculated
     *      extent should fit. Defaults to the size of the map the view is
     *      associated with. If no map or multiple maps are connected to the
     *      view, provide the desired box size (e.g. `map.getSize()`).
     * @return Extent.
     * @api
     */
    calculateExtent(size?: Size): Extent {
        const extent = this.calculateExtentInternal(size);
        return toUserExtent(extent, this.getProjection());
    }

    /**
     * @param size Box pixel size. If not provided, the map's last known
     *      viewport size will be used.
     * @return Extent.
     */
    calculateExtentInternal(size?: Size): Extent {
        size = size || this.getViewportSizeMinusPadding_();
        const center = this.getCenterInternal() as Coordinate;
        assert(center, 'The view center is not defined');
        const resolution = this.getResolution() as number;
        assert(resolution !== undefined, 'The view resolution is not defined');
        const rotation = this.getRotation() as number;
        assert(rotation !== undefined, 'The view rotation is not defined');

        return getForViewAndSize(center, resolution, rotation, size);
    }

    /**
     * Get the maximum resolution of the view.
     * 
     * @return The maximum resolution of the view.
     * @api
     */
    getMaxResolution(): number {
        return this.maxResolution_;
    }

    /**
     * Get the minimum resolution of the view.
     * 
     * @return The minimum resolution of the view.
     * @api
     */
    getMinResolution(): number {
        return this.minResolution_;
    }

    /**
     * Get the maximum zoom level for the view.
     * @return The maximum zoom level.
     * @api
     */
    getMaxZoom(): number {
        return this.getZoomForResolution(this.minResolution_)!;
    }

    /**
     * Set a new maximum zoom level for the view.
     * @param zoom The maximum zoom level.
     * @api
     */
    setMaxZoom(zoom: number) {
        this.applyOptions_(this.getUpdatedOptions_({ maxZoom: zoom }));
    }

    /**
     * Get the minimum zoom level for the view.
     * @return The minimum zoom level.
     * @api
     */
    getMinZoom(): number {
        return this.getZoomForResolution(this.maxResolution_)!;
    }

    /**
     * Set a new minimum zoom level for the view.
     * @param zoom The minimum zoom level.
     * @api
     */
    setMinZoom(zoom: number) {
        this.applyOptions_(this.getUpdatedOptions_({ minZoom: zoom }));
    }

    /**
     * Set whether the view should allow intermediary zoom levels.
     * @param enabled Whether the resolution is constrained.
     * @api
     */
    setConstrainResolution(enabled: boolean) {
        this.applyOptions_(this.getUpdatedOptions_({ constrainResolution: enabled }));
    }

    /**
     * Get the view projection.
     * @return The projection of the view.
     * @api
     */
    getProjection(): Projection {
        return this.projection_;
    }

    /**
     * Get the view resolution.
     * @return The resolution of the view.
     * @observable
     * @api
     */
    getResolution(): number | undefined {
        return this.get(ViewProperties.RESOLUTION);
    }

    /**
     * Get the resolutions for the view.
     *
     * This returns the array of resolutions passed to the constructor of the
     * View, or undefined if none were given.
     *
     * @return The resolutions of the view.
     * @api
     */
    getResolutions(): number[] | undefined {
        return this.resolutions_;
    }

    /**
     * Get the resolution for a provided extent (in map units) and size (in pixels).
     * @param extent Extent.
     * @param size Box pixel size.
     * @return The resolution at which the provided extent will render at
     *     the given size.
     * @api
     */
    getResolutionForExtent(extent: Extent, size?: Size): number {
        return this.getResolutionForExtentInternal(
            fromUserExtent(extent, this.getProjection()),
            size,
        );
    }

    /**
     * Get the resolution for a provided extent (in map units) and size (in pixels).
     * @param extent Extent.
     * @param size Box pixel size.
     * @return The resolution at which the provided extent will render at
     *     the given size.
     */
    getResolutionForExtentInternal(extent: Extent, size?: Size): number {
        size = size || this.getViewportSizeMinusPadding_();
        const xResolution = getWidth(extent) / size[0];
        const yResolution = getHeight(extent) / size[1];
        return Math.max(xResolution, yResolution);
    }

    /**
     * Return a function that returns a value between 0 and 1 for a resolution.
     *
     * Exponential scaling is assumed.
     *
     * @param power Power.
     * @return Resolution for value function.
     */
    getResolutionForValueFunction(
        power?: number
    ): (resolution: number) => number {
        power = power || 2;
        const maxResolution = this.getConstrainedResolution(this.maxResolution_);
        const minResolution = this.minResolution_;
        const max = Math.log(maxResolution / minResolution) / Math.log(power);
        return (
            /**
             * @param value Value.
             * @return Resolution.
             */
            function (value: number): number {
                const resolution = maxResolution / Math.pow(power, value * max);
                return resolution;
            }
        );
    }

    /**
     * Get the view rotation.
     * 
     * @return The rotation of the view in radians.
     * @observable
     * @api
     */
    getRotation(): number {
        return this.get(ViewProperties.ROTATION);
    }

    /**
     * Return a function that returns a resolution for a value between
     * 0 and 1.
     * 
     * Exponential scaling is assumed.
     * 
     * @param power Power.
     * @return Value for resolution function.
     */
    getValueForResolutionFunction(
        power: number
    ): (resolution: number) => number {
        const logPower = Math.log(power || 2);
        const maxResolution = this.getConstrainedResolution(this.maxResolution_);
        const minResolution = this.minResolution_;
        const max = Math.log(maxResolution / minResolution) / logPower;
        return (
            /**
             * @param resolution Resolution.
             * @return Value.
             */
            function (resolution: number): number {
                const value = Math.log(maxResolution / resolution) / logPower / max;
                return value;
            }
        );
    }

    /**
     * Returns the size of the viewport minus padding.
     *
     * @param rotation Take into account the rotation of the viewport when
     *      giving the size
     * @return Viewport size reduced by the padding.
     */
    private getViewportSizeMinusPadding_(rotation?: number): Size {
        let size = this.getViewportSize_(rotation);
        const padding = this.padding_;
        if (padding) {
            size = [
                size[0] - padding[1] - padding[3],
                size[1] - padding[0] - padding[2],
            ];
        }
        return size;
    }

    /**
     * @return View state.
     */
    getState(): State {
        const projection = this.getProjection();
        const resolution = this.getResolution();
        const rotation = this.getRotation();
        let center = this.getCenterInternal();
        const padding = this.padding_;
        if (padding) {
            const reducedSize = this.getViewportSizeMinusPadding_();
            center = calculateCenterOn(
                center,
                this.getViewportSize_(),
                [reducedSize[0] / 2 + padding[3], reducedSize[1] / 2 + padding[0]],
                resolution,
                rotation,
            );
        }
        return {
            center: center.slice(0),
            projection: projection !== undefined ? projection : null,
            resolution: resolution,
            nextCenter: this.nextCenter_,
            nextResolution: this.nextResolution_,
            nextRotation: this.nextRotation_,
            rotation: rotation,
            zoom: this.getZoom(),
        };
    }

    /**
     * @return Like `FrameState`, but just `viewState` and `extent`.
     */
    getViewStateAndExtent(): ViewStateLayerStateExtent {
        return {
            viewState: this.getState(),
            extent: this.calculateExtent(),
        };
    }

    /**
     * Get the current zoom level.
     *
     * This method may return non-integer zoom levels if the view does not
     * constrain the resolution, or if an interaction or animation is underway.
     *
     * @return Zoom.
     * @api
     */
    getZoom(): number | undefined {
        let zoom;
        const resolution = this.getResolution();
        if (resolution !== undefined) {
            zoom = this.getZoomForResolution(resolution);
        }
        return zoom;
    }

    /**
     * Get the zoom level for a resolution.
     * 
     * @param resolution The resolution.
     * @return The zoom level for the provided resolution.
     * @api
     */
    getZoomForResolution(resolution: number): number | undefined {
        let offset = this.minZoom_ || 0;
        let max, zoomFactor;
        if (this.resolutions_) {
            const nearest = linearFindNearest(this.resolutions_, resolution, 1);
            offset = nearest;
            max = this.resolutions_[nearest];
            if (nearest == this.resolutions_.length - 1) {
                zoomFactor = 2;
            } else {
                zoomFactor = max / this.resolutions_[nearest + 1];
            }
        } else {
            max = this.maxResolution_;
            zoomFactor = this.zoomFactor_;
        }
        return offset + Math.log(max / resolution) / Math.log(zoomFactor);
    }

    /**
     * Get the resolution for a zoom level.
     * 
     * @param zoom Zoom level.
     * @return The view resolution for the provided zoom level.
     * @api
     */
    getResolutionForZoom(zoom: number): number {
        if (this.resolutions_) {
            if (this.resolutions_.length <= 1) {
                return 0;
            }
            const baseLevel = clamp(
                Math.floor(zoom),
                0,
                this.resolutions_.length - 2,
            );
            const zoomFactor =
                this.resolutions_[baseLevel] / this.resolutions_[baseLevel + 1];
            return (
                this.resolutions_[baseLevel] /
                Math.pow(zoomFactor, clamp(zoom - baseLevel, 0, 1))
            );
        }
        return (
            this.maxResolution_ / Math.pow(this.zoomFactor_, zoom - this.minZoom_)
        );
    }

    /**
     * Fit the given geometry or extent based on the given map size and border.
     *
     * The size is pixel dimensions of the box to fit the extent into. In most
     * cases you will want to use the map size, that is `map.getSize()`. Takes
     * care of the map angle.
     *
     * @param geometryOrExtent The geometry or extent
     *     to fit the view to.
     * @param options Options.
     * @api
     */
    fit(geometryOrExtent: SimpleGeometry | Extent, options?: FitOptions) {
        let geometry: SimpleGeometry;
        assert(
            Array.isArray(geometryOrExtent) ||
            typeof (
                geometryOrExtent as any
            ).getSimplifiedGeometry === 'function',
            'Invalid extent or geometry provided as `geometry`',
        );
        if (Array.isArray(geometryOrExtent)) {
            assert(
                !isEmpty(geometryOrExtent),
                'Cannot fit empty extent provided as `geometry`',
            );
            const extent = fromUserExtent(
                geometryOrExtent, this.getProjection()
            );
            geometry = polygonFromExtent(extent);
        } else if (geometryOrExtent.getType() === 'Circle') {
            const extent = fromUserExtent(
                geometryOrExtent.getExtent(),
                this.getProjection(),
            );
            geometry = polygonFromExtent(extent);
            geometry.rotate(this.getRotation(), getCenter(extent));
        } else {
            const userProjection = getUserProjection();
            if (userProjection) {
                geometry = (
                    geometryOrExtent
                        .clone()
                        .transform(
                            userProjection, this.getProjection()
                        ) as SimpleGeometry
                );
            } else {
                geometry = geometryOrExtent;
            }
        }

        this.fitInternal(geometry, options);
    }

    /**
     * Calculate rotated extent
     * 
     * @param geometry The geometry.
     * @return The rotated extent for the geometry.
     */
    rotatedExtentForGeometry(geometry: SimpleGeometry): Extent {
        const rotation = this.getRotation();
        const cosAngle = Math.cos(rotation);
        const sinAngle = Math.sin(-rotation);
        const coords = geometry.getFlatCoordinates();
        const stride = geometry.getStride();
        let minRotX = +Infinity;
        let minRotY = +Infinity;
        let maxRotX = -Infinity;
        let maxRotY = -Infinity;
        for (let i = 0, ii = coords.length; i < ii; i += stride) {
            const rotX = coords[i] * cosAngle - coords[i + 1] * sinAngle;
            const rotY = coords[i] * sinAngle + coords[i + 1] * cosAngle;
            minRotX = Math.min(minRotX, rotX);
            minRotY = Math.min(minRotY, rotY);
            maxRotX = Math.max(maxRotX, rotX);
            maxRotY = Math.max(maxRotY, rotY);
        }
        return [minRotX, minRotY, maxRotX, maxRotY];
    }

    /**
     * @param geometry The geometry.
     * @param options Options.
     */
    fitInternal(geometry: SimpleGeometry, options?: FitOptions) {
        options = options || {};
        let size = options.size;
        if (!size) {
            size = this.getViewportSizeMinusPadding_();
        }
        const padding =
            options.padding !== undefined ? options.padding : [0, 0, 0, 0];
        const nearest = options.nearest !== undefined ? options.nearest : false;
        let minResolution;
        if (options.minResolution !== undefined) {
            minResolution = options.minResolution;
        } else if (options.maxZoom !== undefined) {
            minResolution = this.getResolutionForZoom(options.maxZoom);
        } else {
            minResolution = 0;
        }

        const rotatedExtent = this.rotatedExtentForGeometry(geometry);

        // calculate resolution
        let resolution = this.getResolutionForExtentInternal(rotatedExtent, [
            size[0] - padding[1] - padding[3],
            size[1] - padding[0] - padding[2],
        ]);
        resolution = isNaN(resolution)
            ? minResolution
            : Math.max(resolution, minResolution);
        resolution = this.getConstrainedResolution(resolution, nearest ? 0 : 1);

        // calculate center
        const rotation = this.getRotation();
        const sinAngle = Math.sin(rotation);
        const cosAngle = Math.cos(rotation);
        const centerRot = getCenter(rotatedExtent);
        centerRot[0] += ((padding[1] - padding[3]) / 2) * resolution;
        centerRot[1] += ((padding[0] - padding[2]) / 2) * resolution;
        const centerX = centerRot[0] * cosAngle - centerRot[1] * sinAngle;
        const centerY = centerRot[1] * cosAngle + centerRot[0] * sinAngle;
        const center = this.getConstrainedCenter([centerX, centerY], resolution);
        const callback = options.callback ? options.callback : VOID;

        if (options.duration !== undefined) {
            this.animateInternal(
                {
                    resolution: resolution,
                    center: center,
                    duration: options.duration,
                    easing: options.easing,
                },
                callback,
            );
        } else {
            this.targetResolution_ = resolution;
            this.targetCenter_ = center;
            this.applyTargetState_(false, true);
            animationCallback(callback, true);
        }
    }

    /**
     * Center on coordinate and view position.
     * 
     * @param coordinate Coordinate.
     * @param size Box pixel size.
     * @param position Position on the view to center on.
     * @api
     */
    centerOn(coordinate: Coordinate, size: Size, position: Pixel) {
        this.centerOnInternal(
            fromUserCoordinate(coordinate, this.getProjection()),
            size,
            position,
        );
    }

    /**
     * @param coordinate Coordinate.
     * @param size Box pixel size.
     * @param position Position on the view to center on.
     */
    centerOnInternal(coordinate: Coordinate, size: Size, position: Pixel) {
        this.setCenterInternal(
            calculateCenterOn(
                coordinate,
                size,
                position,
                this.getResolution(),
                this.getRotation(),
            ),
        );
    }

    /**
     * Calculates the shift between map and viewport center.
     * 
     * @param center Center.
     * @param resolution Resolution.
     * @param rotation Rotation.
     * @param size Size.
     * @return Center shift.
     */
    calculateCenterShift(
        center: Coordinate,
        resolution: number,
        rotation: number,
        size: Size
    ): number[] | undefined {
        let centerShift;
        const padding = this.padding_;
        if (padding && center) {
            const reducedSize = this.getViewportSizeMinusPadding_(-rotation);
            const shiftedCenter = calculateCenterOn(
                center,
                size,
                [reducedSize[0] / 2 + padding[3], reducedSize[1] / 2 + padding[0]],
                resolution,
                rotation,
            );
            centerShift = [
                center[0] - shiftedCenter[0],
                center[1] - shiftedCenter[1],
            ];
        }
        return centerShift;
    }

    /**
     * @return Is defined.
     */
    isDef(): boolean {
        return !!this.getCenterInternal() && this.getResolution() !== undefined;
    }

    /**
     * Adds relative coordinates to the center of the view.
     * 
     * Any extent constraint will apply.
     * 
     * @param deltaCoordinates Relative value to add.
     * @api
     */
    adjustCenter(deltaCoordinates: Coordinate) {
        const center = toUserCoordinate(this.targetCenter_, this.getProjection());
        this.setCenter([
            center[0] + deltaCoordinates[0],
            center[1] + deltaCoordinates[1],
        ]);
    }

    /**
     * Adds relative coordinates to the center of the view.
     * 
     * Any extent constraint will apply.
     * 
     * @param deltaCoordinates Relative value to add.
     */
    adjustCenterInternal(deltaCoordinates: Coordinate) {
        const center = this.targetCenter_;
        this.setCenterInternal([
            center[0] + deltaCoordinates[0],
            center[1] + deltaCoordinates[1],
        ]);
    }

    /**
     * Multiply the view resolution by a ratio, optionally using an anchor.
     *
     * Any resolution constraint will apply.
     *
     * @param ratio The ratio to apply on the view resolution.
     * @param anchor The origin of the transformation.
     * @api
     */
    adjustResolution(ratio: number, anchor?: Coordinate) {
        anchor = anchor && fromUserCoordinate(anchor, this.getProjection());
        this.adjustResolutionInternal(ratio, anchor);
    }

    /**
     * Multiply the view resolution by a ratio, optionally using an anchor.
     *
     * Any resolution constraint will apply.
     *
     * @param ratio The ratio to apply on the view resolution.
     * @param anchor The origin of the transformation.
     */
    adjustResolutionInternal(ratio: number, anchor?: Coordinate) {
        const isMoving = this.getAnimating() || this.getInteracting();
        const size = this.getViewportSize_(this.getRotation());
        const newResolution = this.constraints_.resolution(
            this.targetResolution_ * ratio,
            0,
            size,
            isMoving,
        );

        if (anchor) {
            this.targetCenter_ = this.calculateCenterZoom(newResolution, anchor);
        }

        this.targetResolution_ *= ratio;
        this.applyTargetState_();
    }

    /**
     * Adds a value to the view zoom level, optionally using an anchor. Any resolution
     * constraint will apply.
     * @param delta Relative value to add to the zoom level.
     * @param anchor The origin of the transformation.
     * @api
     */
    adjustZoom(delta: number, anchor?: Coordinate) {
        this.adjustResolution(Math.pow(this.zoomFactor_, -delta), anchor);
    }

    /**
     * Adds a value to the view rotation, optionally using an anchor. Any rotation
     * constraint will apply.
     * @param delta Relative value to add to the zoom rotation, in radians.
     * @param anchor The rotation center.
     * @api
     */
    adjustRotation(delta: number, anchor?: Coordinate) {
        if (anchor) {
            anchor = fromUserCoordinate(anchor, this.getProjection());
        }
        this.adjustRotationInternal(delta, anchor);
    }

    /**
     * @param delta Relative value to add to the zoom rotation, in radians.
     * @param anchor The rotation center.
     */
    adjustRotationInternal(delta: number, anchor?: Coordinate) {
        const isMoving = this.getAnimating() || this.getInteracting();
        const newRotation = this.constraints_.rotation(
            this.targetRotation_ + delta,
            isMoving,
        );
        if (anchor) {
            this.targetCenter_ = this.calculateCenterRotate(newRotation, anchor);
        }
        this.targetRotation_ += delta;
        this.applyTargetState_();
    }

    /**
     * Set the center of the current view. Any extent constraint will apply.
     * 
     * @param center The center of the view.
     * @observable
     * @api
     */
    setCenter(center: Coordinate | undefined) {
        this.setCenterInternal(
            center ? fromUserCoordinate(center, this.getProjection()) : center,
        );
    }

    /**
     * Set the center using the view projection (not the user projection).
     * 
     * @param center The center of the view.
     */
    setCenterInternal(center: Coordinate | undefined) {
        this.targetCenter_ = center;
        this.applyTargetState_();
    }

    /**
     * @param hint Hint.
     * @param delta Delta.
     * @return New value.
     */
    setHint(hint: ViewHint, delta: number): number {
        this.hints_[hint] += delta;
        this.changed();
        return this.hints_[hint];
    }

    /**
     * Set the resolution for this view. 
     *
     * Any resolution constraint will apply.
     *
     * @param resolution The resolution of the view.
     * @observable
     * @api
     */
    setResolution(resolution: number | undefined) {
        this.targetResolution_ = resolution;
        this.applyTargetState_();
    }

    /**
     * Set the rotation for this view.
     *
     *  Any rotation constraint will apply.
     *
     * @param rotation The rotation of the view in radians.
     * @observable
     * @api
     */
    setRotation(rotation: number) {
        this.targetRotation_ = rotation;
        this.applyTargetState_();
    }

    /**
     * Zoom to a specific zoom level.
     *
     * Any resolution constrain will apply.
     *
     * @param zoom Zoom level.
     * @api
     */
    setZoom(zoom: number) {
        this.setResolution(this.getResolutionForZoom(zoom));
    }

    /**
     * Recompute rotation/resolution/center based on target values.
     *
     * Note: we have to compute rotation first, then resolution and center
     * considering that parameters can influence one another in case a view
     * extent constraint is present.
     *
     * @param doNotCancelAnims Do not cancel animations.
     * @param forceMoving Apply constraints as if the view is moving.
     */
    private applyTargetState_(
        doNotCancelAnims?: boolean,
        forceMoving?: boolean
    ) {
        const isMoving = (
            this.getAnimating() || this.getInteracting() || forceMoving
        );

        // compute rotation
        const newRotation = this.constraints_.rotation(
            this.targetRotation_,
            isMoving,
        );
        const size = this.getViewportSize_(newRotation);
        const newResolution = this.constraints_.resolution(
            this.targetResolution_,
            0,
            size,
            isMoving,
        );
        const newCenter = this.constraints_.center(
            this.targetCenter_,
            newResolution,
            size,
            isMoving,
            this.calculateCenterShift(
                this.targetCenter_,
                newResolution,
                newRotation,
                size,
            ),
        );

        if (this.get(ViewProperties.ROTATION) !== newRotation) {
            this.set(ViewProperties.ROTATION, newRotation);
        }
        if (this.get(ViewProperties.RESOLUTION) !== newResolution) {
            this.set(ViewProperties.RESOLUTION, newResolution);
            this.set('zoom', this.getZoom(), true);
        }
        if (
            !newCenter ||
            !this.get(ViewProperties.CENTER) ||
            !equals(this.get(ViewProperties.CENTER), newCenter)
        ) {
            this.set(ViewProperties.CENTER, newCenter);
        }

        if (this.getAnimating() && !doNotCancelAnims) {
            this.cancelAnimations();
        }
        this.cancelAnchor_ = undefined;
    }

    /**
     * If any constraints need to be applied, an animation will be triggered.
     * This is typically done on interaction end.
     *
     * Note: calling this with a duration of 0 will apply the constrained
     * values straight away, without animation.
     *
     * @param duration The animation duration in ms.
     * @param resolutionDirection Which direction to zoom.
     * @param anchor The origin of the transformation.
     */
    resolveConstraints(
        duration?: number,
        resolutionDirection?: number,
        anchor?: Coordinate
    ) {
        duration = duration !== undefined ? duration : 200;
        const direction = resolutionDirection || 0;

        const newRotation = this.constraints_.rotation(this.targetRotation_);
        const size = this.getViewportSize_(newRotation);
        const newResolution = this.constraints_.resolution(
            this.targetResolution_,
            direction,
            size,
        );
        const newCenter = this.constraints_.center(
            this.targetCenter_,
            newResolution,
            size,
            false,
            this.calculateCenterShift(
                this.targetCenter_,
                newResolution,
                newRotation,
                size,
            ),
        );

        if (duration === 0 && !this.cancelAnchor_) {
            this.targetResolution_ = newResolution;
            this.targetRotation_ = newRotation;
            this.targetCenter_ = newCenter;
            this.applyTargetState_();
            return;
        }

        anchor = anchor || (duration === 0 ? this.cancelAnchor_ : undefined);
        this.cancelAnchor_ = undefined;

        if (
            this.getResolution() !== newResolution ||
            this.getRotation() !== newRotation ||
            !this.getCenterInternal() ||
            !equals(this.getCenterInternal(), newCenter)
        ) {
            if (this.getAnimating()) {
                this.cancelAnimations();
            }

            this.animateInternal({
                rotation: newRotation,
                center: newCenter,
                resolution: newResolution,
                duration: duration,
                easing: easeOut,
                anchor: anchor,
            });
        }
    }

    /**
     * Notify the View that an interaction has started.
     * The view state will be resolved to a stable one if needed
     * (depending on its constraints).
     * @api
     */
    beginInteraction() {
        this.resolveConstraints(0);

        this.setHint(ViewHints.INTERACTING, 1);
    }

    /**
     * Notify the View that an interaction has ended. The view state will be resolved
     * to a stable one if needed (depending on its constraints).
     * @param duration Animation duration in ms.
     * @param resolutionDirection Which direction to zoom.
     * @param anchor The origin of the transformation.
     * @api
     */
    endInteraction(
        duration?: number,
        resolutionDirection?: number,
        anchor?: Coordinate
    ) {
        anchor = anchor && fromUserCoordinate(anchor, this.getProjection());
        this.endInteractionInternal(duration, resolutionDirection, anchor);
    }

    /**
     * Notify the View that an interaction has ended. The view state will be resolved
     * to a stable one if needed (depending on its constraints).
     * @param duration Animation duration in ms.
     * @param resolutionDirection Which direction to zoom.
     * @param anchor The origin of the transformation.
     */
    endInteractionInternal(
        duration?: number,
        resolutionDirection?: number,
        anchor?: Coordinate
    ) {
        if (!this.getInteracting()) {
            return;
        }
        this.setHint(ViewHints.INTERACTING, -1);
        this.resolveConstraints(duration, resolutionDirection, anchor);
    }

    /**
     * Get a valid position for the view center according to the current
     * constraints.
     * 
     * @param targetCenter Target center position.
     * @param targetResolution Target resolution. If not supplied, the current
     *      one will be used. This is useful to guess a valid center position
     *      at a different zoom level.
     * @return Valid center position.
     */
    getConstrainedCenter(
        targetCenter?: Coordinate,
        targetResolution?: number
    ): Coordinate | undefined {
        const size = this.getViewportSize_(this.getRotation());
        return this.constraints_.center(
            targetCenter,
            targetResolution || this.getResolution(),
            size,
        );
    }

    /**
     * Get a valid zoom level according to the current view constraints.
     *
     * @param targetZoom Target zoom.
     * @param direction Indicate which resolution should be used by a renderer
     *      if the view resolution does not match any resolution of the tile
     *      source. If 0, the nearest resolution will be used. If 1, the
     *      nearest lower resolution will be used. If -1, the nearest higher
     *      resolution will be used.
     * @return Valid zoom level.
     */
    getConstrainedZoom(
        targetZoom?: number,
        direction: number = 0
    ): number | undefined {
        const targetRes = this.getResolutionForZoom(targetZoom);
        return this.getZoomForResolution(
            this.getConstrainedResolution(targetRes, direction),
        );
    }

    /**
     * Get a valid resolution according to the current view constraints.
     *
     * @param targetResolution Target resolution.
     * @param directionIndicate which resolution should be used by a renderer
     *      if the view resolution does not match any resolution of the tile
     *      source. If 0, the nearest resolution will be used. If 1, the
     *      nearest lower resolution will be used. If -1, the nearest higher
     *      resolution will be used.
     * @return Valid resolution.
     */
    getConstrainedResolution(
        targetResolution?: number,
        direction: number = 0
    ): number | undefined {
        direction = direction || 0;
        const size = this.getViewportSize_(this.getRotation());

        return this.constraints_.resolution(
            targetResolution, direction, size
        );
    }
}

/**
 * @param callback Callback.
 * @param returnValue Return value.
 */
function animationCallback(
    callback: (returnValue: any) => void, returnValue: any
) {
    setTimeout(function () {
        callback(returnValue);
    }, 0);
}


/**
 * @param options View options.
 * @return The constraint.
 */
export function createCenterConstraint(
    options: ViewOptions
): CenterConstraintType {
    if (options.extent !== undefined) {
        const smooth =
            options.smoothExtentConstraint !== undefined
                ? options.smoothExtentConstraint
                : true;
        return createExtent(options.extent, options.constrainOnlyCenter, smooth);
    }

    const projection = createProjection(options.projection, 'EPSG:3857');
    if (options.multiWorld !== true && projection.isGlobal()) {
        const extent = projection.getExtent().slice();
        extent[0] = -Infinity;
        extent[2] = Infinity;
        return createExtent(extent, false, false);
    }

    return centerNone;
}


/**
 * @param options View options.
 * @return The constraint.
 */
export function createResolutionConstraint(options: ViewOptions): {
    constraint: ResolutionConstraintType;
    maxResolution: number;
    minResolution: number;
    minZoom: number;
    zoomFactor: number;
} {
    let resolutionConstraint;
    let maxResolution;
    let minResolution;

    // TODO: move these to be ol constants
    // see https://github.com/openlayers/openlayers/issues/2076
    const defaultMaxZoom = 28;
    const defaultZoomFactor = 2;

    let minZoom =
        options.minZoom !== undefined ? options.minZoom : DEFAULT_MIN_ZOOM;

    let maxZoom =
        options.maxZoom !== undefined ? options.maxZoom : defaultMaxZoom;

    const zoomFactor =
        options.zoomFactor !== undefined ? options.zoomFactor : defaultZoomFactor;

    const multiWorld =
        options.multiWorld !== undefined ? options.multiWorld : false;

    const smooth =
        options.smoothResolutionConstraint !== undefined
            ? options.smoothResolutionConstraint
            : true;

    const showFullExtent =
        options.showFullExtent !== undefined ? options.showFullExtent : false;

    const projection = createProjection(options.projection, 'EPSG:3857');
    const projExtent = projection.getExtent();
    let constrainOnlyCenter = options.constrainOnlyCenter;
    let extent = options.extent;
    if (!multiWorld && !extent && projection.isGlobal()) {
        constrainOnlyCenter = false;
        extent = projExtent;
    }

    if (options.resolutions !== undefined) {
        const resolutions = options.resolutions;
        maxResolution = resolutions[minZoom];
        minResolution =
            resolutions[maxZoom] !== undefined
                ? resolutions[maxZoom]
                : resolutions[resolutions.length - 1];

        if (options.constrainResolution) {
            resolutionConstraint = createSnapToResolutions(
                resolutions,
                smooth,
                !constrainOnlyCenter && extent,
                showFullExtent,
            );
        } else {
            resolutionConstraint = createMinMaxResolution(
                maxResolution,
                minResolution,
                smooth,
                !constrainOnlyCenter && extent,
                showFullExtent,
            );
        }
    } else {
        // calculate the default min and max resolution
        const size = !projExtent
            ? // use an extent that can fit the whole world if need be
            (360 * METERS_PER_UNIT.degrees) / projection.getMetersPerUnit()
            : Math.max(getWidth(projExtent), getHeight(projExtent));

        const defaultMaxResolution =
            size / DEFAULT_TILE_SIZE / Math.pow(defaultZoomFactor, DEFAULT_MIN_ZOOM);

        const defaultMinResolution =
            defaultMaxResolution /
            Math.pow(defaultZoomFactor, defaultMaxZoom - DEFAULT_MIN_ZOOM);

        // user provided maxResolution takes precedence
        maxResolution = options.maxResolution;
        if (maxResolution !== undefined) {
            minZoom = 0;
        } else {
            maxResolution = defaultMaxResolution / Math.pow(zoomFactor, minZoom);
        }

        // user provided minResolution takes precedence
        minResolution = options.minResolution;
        if (minResolution === undefined) {
            if (options.maxZoom !== undefined) {
                if (options.maxResolution !== undefined) {
                    minResolution = maxResolution / Math.pow(zoomFactor, maxZoom);
                } else {
                    minResolution = defaultMaxResolution / Math.pow(zoomFactor, maxZoom);
                }
            } else {
                minResolution = defaultMinResolution;
            }
        }

        // given discrete zoom levels, minResolution may be different than provided
        maxZoom =
            minZoom +
            Math.floor(
                Math.log(maxResolution / minResolution) / Math.log(zoomFactor),
            );
        minResolution = maxResolution / Math.pow(zoomFactor, maxZoom - minZoom);

        if (options.constrainResolution) {
            resolutionConstraint = createSnapToPower(
                zoomFactor,
                maxResolution,
                minResolution,
                smooth,
                !constrainOnlyCenter && extent,
                showFullExtent,
            );
        } else {
            resolutionConstraint = createMinMaxResolution(
                maxResolution,
                minResolution,
                smooth,
                !constrainOnlyCenter && extent,
                showFullExtent,
            );
        }
    }
    return {
        constraint: resolutionConstraint,
        maxResolution: maxResolution,
        minResolution: minResolution,
        minZoom: minZoom,
        zoomFactor: zoomFactor,
    };
}


/**
 * @param options View options.
 * @return Rotation constraint.
 */
export function createRotationConstraint(
    options: ViewOptions
): RotationConstraintType {
    const enableRotation =
        options.enableRotation !== undefined ? options.enableRotation : true;
    if (enableRotation) {
        const constrainRotation = options.constrainRotation;
        if (constrainRotation === undefined || constrainRotation === true) {
            return createSnapToZero();
        }
        if (constrainRotation === false) {
            return rotationNone;
        }
        if (typeof constrainRotation === 'number') {
            return createSnapToN(constrainRotation);
        }
        return rotationNone;
    }
    return disable;
}


/**
 * Determine if an animation involves no view change.
 * 
 * @param animation The animation.
 * @return The animation involves no view change.
 */
export function isNoopAnimation(animation: Animation): boolean {
    if (animation.sourceCenter && animation.targetCenter) {
        if (!coordinatesEqual(animation.sourceCenter, animation.targetCenter)) {
            return false;
        }
    }
    if (animation.sourceResolution !== animation.targetResolution) {
        return false;
    }
    if (animation.sourceRotation !== animation.targetRotation) {
        return false;
    }
    return true;
}


/**
 * @param coordinate Coordinate.
 * @param size Box pixel size.
 * @param position Position on the view to center on.
 * @param resolution Resolution.
 * @param rotation Rotation.
 * @return Shifted center.
 */
function calculateCenterOn(
    coordinate: Coordinate,
    size: Size,
    position: Pixel,
    resolution: number,
    rotation: number
): Coordinate {
    // calculate rotated position
    const cosAngle = Math.cos(-rotation);
    let sinAngle = Math.sin(-rotation);
    let rotX = coordinate[0] * cosAngle - coordinate[1] * sinAngle;
    let rotY = coordinate[1] * cosAngle + coordinate[0] * sinAngle;
    rotX += (size[0] / 2 - position[0]) * resolution;
    rotY += (position[1] - size[1] / 2) * resolution;

    // go back to original angle
    sinAngle = -sinAngle; // go back to original rotation
    const centerX = rotX * cosAngle - rotY * sinAngle;
    const centerY = rotY * cosAngle + rotX * sinAngle;

    return [centerX, centerY];
}


export default View;
