import { BaseEvent as Event } from '@olts/events';
import { ValueOf } from "@olts/core";

import { FrameState } from './frame-state';
import { Map } from './map';


/**
 *
 */
export const MapEventTypes = {
    /**
     * Triggered after a map frame is rendered.
     * @event module:ol/MapEvent~MapEvent#postrender
     * @api
     */
    POSTRENDER: 'postrender',

    /**
     * Triggered when the map starts moving.
     * @event module:ol/MapEvent~MapEvent#movestart
     * @api
     */
    MOVESTART: 'movestart',

    /**
     * Triggered after the map is moved.
     * @event module:ol/MapEvent~MapEvent#moveend
     * @api
     */
    MOVEEND: 'moveend',

    /**
     * Triggered when loading of additional map data (tiles, images, features) starts.
     * @event module:ol/MapEvent~MapEvent#loadstart
     * @api
     */
    LOADSTART: 'loadstart',

    /**
     * Triggered when loading of additional map data has completed.
     * @event module:ol/MapEvent~MapEvent#loadend
     * @api
     */
    LOADEND: 'loadend',
} as const;


export type MapEventType = ValueOf<typeof MapEventTypes>


/**
 * Events emitted as map events are instances of this type.
 * See {@link Map} for which events trigger a map event.
 */
export class MapEvent extends Event {

    /**
     * The map where the event occurred.
     */
    map: Map;

    /**
     * The frame state at the time of the event.
     */
    frameState: FrameState | null;


    /**
     * @param type Event type.
     * @param map Map.
     * @param frameState Frame state.
     */
    constructor(type: string, map: Map, frameState?: FrameState | null) {
        super(type);
        this.map = map;
        this.frameState = frameState !== undefined ? frameState : null;
    }
}


export default MapEvent;
