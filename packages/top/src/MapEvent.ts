import { BaseEvent as Event } from '@olts/events';

/**
 * Events emitted as map events are instances of this type.
 * See {@link module:ol/Map~Map} for which events trigger a map event.
 */
export class MapEvent extends Event {
    /**
     * @param {string} type Event type.
     * @param {import("./Map").default} map Map.
     * @param {?import("./Map").FrameState} [frameState] Frame state.
     */
    constructor(type, map, frameState) {
        super(type);

        /**
         * The map where the event occurred.
         * @type {import("./Map").default}
         * @api
         */
        this.map = map;

        /**
         * The frame state at the time of the event.
         * @type {?import("./Map").FrameState}
         * @api
         */
        this.frameState = frameState !== undefined ? frameState : null;
    }
}

export default MapEvent;
