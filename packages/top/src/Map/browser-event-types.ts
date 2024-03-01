import { ValueOf } from '@olts/core';
import { EventTypes } from '@olts/events';


/**
 * Constants for event names.
 */
export const MapBrowserEventTypes = {
    /**
     * A true single click with no dragging and no double click. Note that this
     * event is delayed by 250 ms to ensure that it is not a double click.
     * @event module:ol/MapBrowserEvent~MapBrowserEvent#singleclick
     * @api
     */
    SINGLECLICK: 'singleclick',

    /**
     * A click with no dragging. A double click will fire two of this.
     * @event module:ol/MapBrowserEvent~MapBrowserEvent#click
     * @api
     */
    CLICK: EventTypes.CLICK,

    /**
     * A true double click, with no dragging.
     * @event module:ol/MapBrowserEvent~MapBrowserEvent#dblclick
     * @api
     */
    DBLCLICK: EventTypes.DBLCLICK,

    /**
     * Triggered when a pointer is dragged.
     * @event module:ol/MapBrowserEvent~MapBrowserEvent#pointerdrag
     * @api
     */
    POINTERDRAG: 'pointerdrag',

    /**
     * Triggered when a pointer is moved. Note that on touch devices this is
     * triggered when the map is panned, so is not the same as mousemove.
     * @event module:ol/MapBrowserEvent~MapBrowserEvent#pointermove
     * @api
     */
    POINTERMOVE: 'pointermove',

    POINTERDOWN: 'pointerdown',
    POINTERUP: 'pointerup',
    POINTEROVER: 'pointerover',
    POINTEROUT: 'pointerout',
    POINTERENTER: 'pointerenter',
    POINTERLEAVE: 'pointerleave',
    POINTERCANCEL: 'pointercancel',
} as const;


/**
 *
 */
export type MapBrowserEventType = ValueOf<typeof MapBrowserEventTypes>


/***
 *
 */
export type Types =
    | 'singleclick'
    | 'click'
    | 'dblclick'
    | 'pointerdrag'
    | 'pointermove';
