/**
 * Stripped down implementation of the W3C DOM Level 2 Event interface.
 * See https://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-interface.
 *
 * This implementation only provides `type` and `target` properties, and
 * `stopPropagation` and `preventDefault` methods. It is meant as base class
 * for higher level events defined in the library, and works with
 * {@link Target}.
 */
class BaseEvent {

    /**
     * Prevent event propagation.
     */
    propagationStopped: boolean;

    /**
     * Prevent default.
     *
     * If true it means that no emulated `click`, `singleclick` or `doubleclick`
     * events will be fired.
     */
    defaultPrevented: boolean;

    /**
     * The event type.
     * @api
     */
    type: string;

    /**
     * The event target.
     * @api
     */
    target: null | object;


    constructor(type: string) {
        this.type = type;
        this.target = null;
        this.propagationStopped = false;
        this.defaultPrevented = false;
    }

    /**
     * Prevent default.
     *
     * This means that no emulated `click`, `singleclick` or `doubleclick`
     * events will be fired.
     * @api
     */
    preventDefault() {
        this.defaultPrevented = true;
    }

    /**
     * Stop event propagation.
     * @api
     */
    stopPropagation() {
        this.propagationStopped = true;
    }
}


/**
 * Stop event propagation.
 * @param evt The event to change.
 */
export function stopPropagation(evt: BaseEvent) {
    evt.stopPropagation();
}


/**
 * Prevent the default action.
 * @param evt The event to change.
 */
export function preventDefault(evt: BaseEvent) {
    evt.preventDefault();
}


export default BaseEvent;
