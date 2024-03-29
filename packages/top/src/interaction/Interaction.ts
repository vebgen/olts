import { BaseObject } from '@olts/events';
import InteractionProperty from './Property';
import { easeOut, linear } from '../easing';

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType|
 *     'change:active', import("../Object").ObjectEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     'change:active', Return>} InteractionOnSignature
 */

/**
 * Object literal with config options for interactions.
 * @typedef {Object} InteractionOptions
 * @property {function(import("../MapBrowserEvent").default):boolean} handleEvent
 * Method called by the map to notify the interaction that a browser event was
 * dispatched to the map. If the function returns a falsy value, propagation of
 * the event to other interactions in the map's interactions chain will be
 * prevented (this includes functions with no explicit return). The interactions
 * are traversed in reverse order of the interactions collection of the map.
 */

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * User actions that change the state of the map. Some are similar to controls,
 * but are not associated with a DOM element.
 * For example, {@link module:ol/interaction/KeyboardZoom~KeyboardZoom} is
 * functionally the same as {@link module:ol/control/Zoom~Zoom}, but triggered
 * by a keyboard event not a button element event.
 * Although interactions do not have a DOM element, some of them do render
 * vectors and so are visible on the screen.
 * @api
 */
export class Interaction extends BaseObject {

    /**
     *
     */
    override on: InteractionOnSignature<EventsKey>;

    /**
     *
     */
    override once: InteractionOnSignature<EventsKey>;

    /**
     *
     */
    override un: InteractionOnSignature<void>;

    /**
     * @param {InteractionOptions} [options] Options.
     */
    constructor(options: InteractionOptions) {
        super();
        this.on = this.onInternal as InteractionOnSignature<EventsKey>;
        this.once = this.onceInternal as InteractionOnSignature<EventsKey>;
        this.un = this.unInternal as InteractionOnSignature<void>;

        if (options && options.handleEvent) {
            this.handleEvent = options.handleEvent;
        }

        /**
         * @private
         * @type {import("../Map").default|null}
         */
        this.map_ = null;

        this.setActive(true);
    }

    /**
     * Return whether the interaction is currently active.
     * @return {boolean} `true` if the interaction is active, `false` otherwise.
     * @observable
     * @api
     */
    getActive(): boolean {
        return /** @type {boolean} */ (this.get(InteractionProperty.ACTIVE));
    }

    /**
     * Get the map associated with this interaction.
     * @return {import("../Map").default|null} Map.
     * @api
     */
    getMap(): import("../Map").default | null {
        return this.map_;
    }

    /**
     * Handles the {@link module:ol/MapBrowserEvent~MapBrowserEvent map browser event}.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Map browser event.
     * @return {boolean} `false` to stop event propagation.
     * @api
     */
    handleEvent(mapBrowserEvent: import("../Map/browser-event").default): boolean {
        return true;
    }

    /**
     * Activate or deactivate the interaction.
     * @param {boolean} active Active.
     * @observable
     * @api
     */
    setActive(active: boolean) {
        this.set(InteractionProperty.ACTIVE, active);
    }

    /**
     * Remove the interaction from its current map and attach it to the new map.
     * Subclasses may set up event handlers to get notified about changes to
     * the map here.
     * @param {import("../Map").default|null} map Map.
     */
    setMap(map: import("../Map").default | null) {
        this.map_ = map;
    }
}

/**
 * @param {import("../View").default} view View.
 * @param {Coordinate} delta Delta.
 * @param [duration] Duration.
 */
export function pan(view: import("../View").default, delta: Coordinate, duration: number) {
    const currentCenter = view.getCenterInternal();
    if (currentCenter) {
        const center = [currentCenter[0] + delta[0], currentCenter[1] + delta[1]];
        view.animateInternal({
            duration: duration !== undefined ? duration : 250,
            easing: linear,
            center: view.getConstrainedCenter(center),
        });
    }
}

/**
 * @param {import("../View").default} view View.
 * @param delta Delta from previous zoom level.
 * @param {Coordinate} [anchor] Anchor coordinate in the user projection.
 * @param [duration] Duration.
 */
export function zoomByDelta(view: import("../View").default, delta: number, anchor: Coordinate, duration: number) {
    const currentZoom = view.getZoom();

    if (currentZoom === undefined) {
        return;
    }

    const newZoom = view.getConstrainedZoom(currentZoom + delta);
    const newResolution = view.getResolutionForZoom(newZoom);

    if (view.getAnimating()) {
        view.cancelAnimations();
    }
    view.animate({
        resolution: newResolution,
        anchor: anchor,
        duration: duration !== undefined ? duration : 250,
        easing: easeOut,
    });
}

export default Interaction;
