import { ValueOf } from "@olts/core";


/**
 * Predefined event types.
 */
export const EventTypes = {
    /**
     * Generic change event. Triggered when the revision counter is increased.
     * @event BaseEvent#change
     * @api
     */
    CHANGE: 'change',

    /**
     * Generic error event. Triggered when an error occurs.
     * @event BaseEvent#error
     * @api
     */
    ERROR: 'error',

    BLUR: 'blur',
    CLEAR: 'clear',
    CONTEXTMENU: 'contextmenu',
    CLICK: 'click',
    DBLCLICK: 'dblclick',
    DRAGENTER: 'dragenter',
    DRAGOVER: 'dragover',
    DROP: 'drop',
    FOCUS: 'focus',
    KEYDOWN: 'keydown',
    KEYPRESS: 'keypress',
    LOAD: 'load',
    RESIZE: 'resize',
    TOUCHMOVE: 'touchmove',
    WHEEL: 'wheel',
} as const;


/**
 * Predefined event types.
 */
export type EventType = ValueOf<typeof EventTypes>;


export default EventTypes;
