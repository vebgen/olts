

import Control from './Control';
import EventType from '../pointer/EventType';
import {
    get as getProjection,
    getTransformFromProjections,
    getUserProjection,
    identityTransform,
} from '../proj';
import { listen } from '../events';
import { wrapX } from '../coordinate';
import { EventsKey } from '@olts/events';

/**
 * @type {string}
 */
const PROJECTION: string = 'projection';

/**
 * @type {string}
 */
const COORDINATE_FORMAT: string = 'coordinateFormat';

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType|
 *     'change:coordinateFormat'|'change:projection', import("../Object").ObjectEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     'change:coordinateFormat'|'change:projection', Return>} MousePositionOnSignature
 */

/**
 * @typedef {Object} Options
 * @property {string} [className='ol-mouse-position'] CSS class name.
 * @property {CoordinateFormat} [coordinateFormat] Coordinate format.
 * @property {ProjectionLike} [projection] Projection. Default is the view projection.
 * @property {function(import("../MapEvent").default):void} [render] Function called when the
 * control should be re-rendered. This is called in a `requestAnimationFrame`
 * callback.
 * @property {HTMLElement|string} [target] Specify a target if you want the
 * control to be rendered outside of the map's viewport.
 * @property {string} [placeholder] Markup to show when the mouse position is not
 * available (e.g. when the pointer leaves the map viewport).  By default, a non-breaking space is rendered
 * initially and the last position is retained when the mouse leaves the viewport.
 * When a string is provided (e.g. `'no position'` or `''` for an empty string) it is used as a
 * placeholder.
 * @property {boolean} [wrapX=true] Wrap the world horizontally on the projection's antimeridian, if it
 * is a global projection.
 */

/**
 * A control to show the 2D coordinates of the mouse cursor. By default, these
 * are in the view projection, but can be in any supported projection.
 * By default the control is shown in the top right corner of the map, but this
 * can be changed by using the css selector `.ol-mouse-position`.
 *
 * On touch devices, which usually do not have a mouse cursor, the coordinates
 * of the currently touched position are shown.
 *
 * @api
 */
export class MousePosition extends Control {
    /**
     * 
     */
    override on: MousePositionOnSignature<EventsKey>;

    /**
     * 
     */
    override once: MousePositionOnSignature<EventsKey>;

    /**
     * 
     */
    override un: MousePositionOnSignature<void>;

    /**
     * @param {Options} [options] Mouse position options.
     */
    constructor(options: Options) {
        options = options ? options : {};

        const element = document.createElement('div');
        element.className =
            options.className !== undefined ? options.className : 'ol-mouse-position';

        super({
            element: element,
            render: options.render,
            target: options.target,
        });

        this.on = this.onInternal as MousePositionOnSignature<EventsKey>;
        this.once = this.onceInternal as MousePositionOnSignature<EventsKey>;
        this.un = this.unInternal as MousePositionOnSignature<void>;

        this.addChangeListener(PROJECTION, this.handleProjectionChanged_);

        if (options.coordinateFormat) {
            this.setCoordinateFormat(options.coordinateFormat);
        }
        if (options.projection) {
            this.setProjection(options.projection);
        }

        /**
         * @private
         * @type {boolean}
         */
        this.renderOnMouseOut_ = options.placeholder !== undefined;

        /**
         * @private
         * @type {string}
         */
        this.placeholder_ = this.renderOnMouseOut_ ? options.placeholder : '&#160;';

        /**
         * @private
         * @type {string}
         */
        this.renderedHTML_ = element.innerHTML;

        /**
         * @private
         * @type {?import("../proj/Projection").default}
         */
        this.mapProjection_ = null;

        /**
         * @private
         * @type {?import("../proj").TransformFunction}
         */
        this.transform_ = null;

        /**
         * @private
         * @type {boolean}
         */
        this.wrapX_ = options.wrapX === false ? false : true;
    }

    /**
     * @private
     */
    handleProjectionChanged_() {
        this.transform_ = null;
    }

    /**
     * Return the coordinate format type used to render the current position or
     * undefined.
     * @return {CoordinateFormat|undefined} The format to render the current
     *     position in.
     * @observable
     * @api
     */
    getCoordinateFormat(): CoordinateFormat | undefined {
        return /** @type {CoordinateFormat|undefined} */ (
            this.get(COORDINATE_FORMAT)
        );
    }

    /**
     * Return the projection that is used to report the mouse position.
     * @return {import("../proj/Projection").default|undefined} The projection to report mouse
     *     position in.
     * @observable
     * @api
     */
    getProjection(): import("../proj/Projection").default | undefined {
        return /** @type {import("../proj/Projection").default|undefined} */ (
            this.get(PROJECTION)
        );
    }

    /**
     * @param {MouseEvent} event Browser event.
     * @protected
     */
    handleMouseMove(event: MouseEvent) {
        const map = this.getMap();
        this.updateHTML_(map.getEventPixel(event));
    }

    /**
     * @param {Event} event Browser event.
     * @protected
     */
    handleMouseOut(event: Event) {
        this.updateHTML_(null);
    }

    /**
     * Remove the control from its current map and attach it to the new map.
     * Pass `null` to just remove the control from the current map.
     * Subclasses may set up event handlers to get notified about changes to
     * the map here.
     * @param {import("../Map").default|null} map Map.
     * @api
     */
    setMap(map: import("../Map").default | null) {
        super.setMap(map);
        if (map) {
            const viewport = map.getViewport();
            this.listenerKeys.push(
                listen(viewport, EventType.POINTERMOVE, this.handleMouseMove, this),
            );
            if (this.renderOnMouseOut_) {
                this.listenerKeys.push(
                    listen(viewport, EventType.POINTEROUT, this.handleMouseOut, this),
                );
            }
            this.updateHTML_(null);
        }
    }

    /**
     * Set the coordinate format type used to render the current position.
     * @param {CoordinateFormat} format The format to render the current
     *     position in.
     * @observable
     * @api
     */
    setCoordinateFormat(format: CoordinateFormat) {
        this.set(COORDINATE_FORMAT, format);
    }

    /**
     * Set the projection that is used to report the mouse position.
     * @param {ProjectionLike} projection The projection to report mouse
     *     position in.
     * @observable
     * @api
     */
    setProjection(projection: ProjectionLike) {
        this.set(PROJECTION, getProjection(projection));
    }

    /**
     * @param {?import("../pixel").Pixel} pixel Pixel.
     * @private
     */
    updateHTML_(pixel: import("../pixel").Pixel | null) {
        let html = this.placeholder_;
        if (pixel && this.mapProjection_) {
            if (!this.transform_) {
                const projection = this.getProjection();
                if (projection) {
                    this.transform_ = getTransformFromProjections(
                        this.mapProjection_,
                        projection,
                    );
                } else {
                    this.transform_ = identityTransform;
                }
            }
            const map = this.getMap();
            const coordinate = map.getCoordinateFromPixelInternal(pixel);
            if (coordinate) {
                const userProjection = getUserProjection();
                if (userProjection) {
                    this.transform_ = getTransformFromProjections(
                        this.mapProjection_,
                        userProjection,
                    );
                }
                this.transform_(coordinate, coordinate);
                if (this.wrapX_) {
                    const projection =
                        userProjection || this.getProjection() || this.mapProjection_;
                    wrapX(coordinate, projection);
                }
                const coordinateFormat = this.getCoordinateFormat();
                if (coordinateFormat) {
                    html = coordinateFormat(coordinate);
                } else {
                    html = coordinate.toString();
                }
            }
        }
        if (!this.renderedHTML_ || html !== this.renderedHTML_) {
            this.element.innerHTML = html;
            this.renderedHTML_ = html;
        }
    }

    /**
     * Update the projection. Rendering of the coordinates is done in
     * `handleMouseMove` and `handleMouseUp`.
     * @param {import("../MapEvent").default} mapEvent Map event.
     * @override
     */
    render(mapEvent: import("../MapEvent").default) {
        const frameState = mapEvent.frameState;
        if (!frameState) {
            this.mapProjection_ = null;
        } else {
            if (this.mapProjection_ != frameState.viewState.projection) {
                this.mapProjection_ = frameState.viewState.projection;
                this.transform_ = null;
            }
        }
    }
}

export default MousePosition;
