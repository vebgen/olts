
// FIXME draw drag box
import { BaseEvent as Event, EventsKey } from '@olts/events';
import PointerInteraction from './Pointer';
import RenderBox from '../render/Box';
import { mouseActionButton } from '../events/condition';

/**
 * A function that takes a {@link module:ol/MapBrowserEvent~MapBrowserEvent} and two
 * {@link module:ol/pixel~Pixel}s and returns a `{boolean}`. If the condition is met,
 * true should be returned.
 * @typedef {function(this: ?, import("../MapBrowserEvent").default, import("../pixel").Pixel, import("../pixel").Pixel):boolean} EndCondition
 */

/**
 * @typedef {Object} Options
 * @property [className='ol-dragbox'] CSS class name for styling the box.
 * @property {import("../events/condition").Condition} [condition] A function that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a boolean
 * to indicate whether that event should be handled.
 * Default is {@link ol/events/condition~mouseActionButton}.
 * @property [minArea=64] The minimum area of the box in pixel, this value is used by the default
 * `boxEndCondition` function.
 * @property {EndCondition} [boxEndCondition] A function that takes a {@link module:ol/MapBrowserEvent~MapBrowserEvent} and two
 * {@link module:ol/pixel~Pixel}s to indicate whether a `boxend` event should be fired.
 * Default is `true` if the area of the box is bigger than the `minArea` option.
 * @property {function(this:DragBox, import("../MapBrowserEvent").default):void} [onBoxEnd] Code to execute just
 * before `boxend` is fired.
 */

/**
 * @enum {string}
 */
const DragBoxEventType = {
    /**
     * Triggered upon drag box start.
     * @event DragBoxEvent#boxstart
     * @api
     */
    BOXSTART: 'boxstart',

    /**
     * Triggered on drag when box is active.
     * @event DragBoxEvent#boxdrag
     * @api
     */
    BOXDRAG: 'boxdrag',

    /**
     * Triggered upon drag box end.
     * @event DragBoxEvent#boxend
     * @api
     */
    BOXEND: 'boxend',

    /**
     * Triggered upon drag box canceled.
     * @event DragBoxEvent#boxcancel
     * @api
     */
    BOXCANCEL: 'boxcancel',
};

/**
 * Events emitted by {@link module:ol/interaction/DragBox~DragBox} instances are instances of
 * this type.
 */
export class DragBoxEvent extends Event {
    /**
     * @param type The event type.
     * @param {Coordinate} coordinate The event coordinate.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Originating event.
     */
    constructor(type: string, coordinate: Coordinate, mapBrowserEvent: import("../Map/browser-event").default) {
        super(type);

        /**
         * The coordinate of the drag event.
         * @const
         * @type {Coordinate}
         * @api
         */
        this.coordinate = coordinate;

        /**
         * @const
         * @type {import("../MapBrowserEvent").default}
         * @api
         */
        this.mapBrowserEvent = mapBrowserEvent;
    }
}

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType|
 *     'change:active', import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<'boxcancel'|'boxdrag'|'boxend'|'boxstart', DragBoxEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     'change:active'|'boxcancel'|'boxdrag'|'boxend', Return>} DragBoxOnSignature
 */

/**
 * Allows the user to draw a vector box by clicking and dragging on the map,
 * normally combined with an {@link module:ol/events/condition} that limits
 * it to when the shift or other key is held down. This is used, for example,
 * for zooming to a specific area of the map
 * (see {@link module:ol/interaction/DragZoom~DragZoom} and
 * {@link module:ol/interaction/DragRotateAndZoom~DragRotateAndZoom}).
 *
 * @fires DragBoxEvent
 * @api
 */
export class DragBox extends PointerInteraction {

    /**
     *
     */
    override on: DragBoxOnSignature<EventsKey>;

    /**
     *
     */
    override once: DragBoxOnSignature<EventsKey>;

    /**
     *
     */
    override un: DragBoxOnSignature<void>;

    /**
     * @param {Options} [options] Options.
     */
    constructor(options: Options) {
        super();
        this.on = this.onInternal as DragBoxOnSignature<EventsKey>;
        this.once = this.onceInternal as DragBoxOnSignature<EventsKey>;
        this.un = this.unInternal as DragBoxOnSignature<void>;

        options = options ? options : {};

        /**
         * @type {import("../render/Box").default}
         * @private
         */
        this.box_ = new RenderBox(options.className || 'ol-dragbox');

        /**
         * @type {number}
         * @private
         */
        this.minArea_ = options.minArea !== undefined ? options.minArea : 64;

        if (options.onBoxEnd) {
            this.onBoxEnd = options.onBoxEnd;
        }

        /**
         * @type {import("../pixel").Pixel}
         * @private
         */
        this.startPixel_ = null;

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.condition_ = options.condition ? options.condition : mouseActionButton;

        /**
         * @private
         * @type {EndCondition}
         */
        this.boxEndCondition_ = options.boxEndCondition
            ? options.boxEndCondition
            : this.defaultBoxEndCondition;
    }

    /**
     * The default condition for determining whether the boxend event
     * should fire.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent The originating MapBrowserEvent
     *     leading to the box end.
     * @param {import("../pixel").Pixel} startPixel The starting pixel of the box.
     * @param {import("../pixel").Pixel} endPixel The end pixel of the box.
     * @return {boolean} Whether or not the boxend condition should be fired.
     */
    defaultBoxEndCondition(mapBrowserEvent: import("../Map/browser-event").default, startPixel: import("../pixel").Pixel, endPixel: import("../pixel").Pixel): boolean {
        const width = endPixel[0] - startPixel[0];
        const height = endPixel[1] - startPixel[1];
        return width * width + height * height >= this.minArea_;
    }

    /**
     * Returns geometry of last drawn box.
     * @return {Polygon} Geometry.
     * @api
     */
    getGeometry(): Polygon {
        return this.box_.getGeometry();
    }

    /**
     * Handle pointer drag events.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Event.
     */
    handleDragEvent(mapBrowserEvent: import("../Map/browser-event").default) {
        this.box_.setPixels(this.startPixel_, mapBrowserEvent.pixel);

        this.dispatchEvent(
            new DragBoxEvent(
                DragBoxEventType.BOXDRAG,
                mapBrowserEvent.coordinate,
                mapBrowserEvent,
            ),
        );
    }

    /**
     * Handle pointer up events.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Event.
     * @return {boolean} If the event was consumed.
     */
    handleUpEvent(mapBrowserEvent: import("../Map/browser-event").default): boolean {
        this.box_.setMap(null);

        const completeBox = this.boxEndCondition_(
            mapBrowserEvent,
            this.startPixel_,
            mapBrowserEvent.pixel,
        );
        if (completeBox) {
            this.onBoxEnd(mapBrowserEvent);
        }
        this.dispatchEvent(
            new DragBoxEvent(
                completeBox ? DragBoxEventType.BOXEND : DragBoxEventType.BOXCANCEL,
                mapBrowserEvent.coordinate,
                mapBrowserEvent,
            ),
        );
        return false;
    }

    /**
     * Handle pointer down events.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Event.
     * @return {boolean} If the event was consumed.
     */
    handleDownEvent(mapBrowserEvent: import("../Map/browser-event").default): boolean {
        if (this.condition_(mapBrowserEvent)) {
            this.startPixel_ = mapBrowserEvent.pixel;
            this.box_.setMap(mapBrowserEvent.map);
            this.box_.setPixels(this.startPixel_, this.startPixel_);
            this.dispatchEvent(
                new DragBoxEvent(
                    DragBoxEventType.BOXSTART,
                    mapBrowserEvent.coordinate,
                    mapBrowserEvent,
                ),
            );
            return true;
        }
        return false;
    }

    /**
     * Function to execute just before `onboxend` is fired
     * @param {import("../MapBrowserEvent").default} event Event.
     */
    onBoxEnd(event: import("../Map/browser-event").default) { }
}

export default DragBox;
