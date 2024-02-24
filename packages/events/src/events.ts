import { BaseEvent } from './event';
import { clear } from '@olts/core/js-obj';
import { EventTargetLike } from './target';

/**
 * Key to use with {@link Observable.unByKey}.
 * @api
 */
export interface EventsKey {
    /**
     * Listener.
     */
    listener: ListenerFunction;

    /**
     * Target.
     */
    target: EventTargetLike;

    /**
     * Type.
     */
    type: string;
}



/**
 * Listener function. This function is called with an event object as argument.
 * When the function returns `false`, event propagation will stop.
 *
 * @api
 */
export type ListenerFunction = (event: Event | BaseEvent) => void | boolean;


/**
 *
 */
export interface ListenerObject {
    /**
     * HandleEvent listener function.
     */
    handleEvent: ListenerFunction;
}


export type Listener = ListenerFunction | ListenerObject;


/**
 * Registers an event listener on an event target.
 *
 * Inspired by
 * https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html
 *
 * This function efficiently binds a `listener` to a `this` object, and returns
 * a key for use with {@link unlistenByKey}.
 *
 * @param target Event target.
 * @param type Event type.
 * @param listener Listener.
 * @param thisArg Object referenced by the `this` keyword in the
 *     listener. Default is the `target`.
 * @param once If true, add the listener as one-off listener.
 * @return Unique key for the listener.
 */
export function listen(
    target: EventTargetLike,
    type: string,
    listener: ListenerFunction,
    thisArg?: object,
    once?: boolean
): EventsKey {
    if (thisArg && thisArg !== target) {
        listener = listener.bind(thisArg);
    }
    if (once) {
        const originalListener = listener;
        listener = function (this: any,) {
            target.removeEventListener(type, listener);
            originalListener.apply(
                this, arguments as unknown as [Event | BaseEvent]
            );
        };
    }
    const eventsKey = {
        target: target,
        type: type,
        listener: listener,
    };
    target.addEventListener(type, listener);
    return eventsKey;
}


/**
 * Registers a one-off event listener on an event target.
 *
 * Inspired by
 * https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html
 *
 * This function efficiently binds a `listener` as self-unregistering listener
 * to a `this` object, and returns a key for use with {@link unlistenByKey} in
 * case the listener needs to be unregistered before it is called.
 *
 * When {@link listen} is called with the same arguments after this
 * function, the self-unregistering listener will be turned into a permanent
 * listener.
 *
 * @param target Event target.
 * @param type Event type.
 * @param listener Listener.
 * @param thisArg Object referenced by the `this` keyword in the listener.
 *     Default is the `target`.
 * @return Key for unlistenByKey.
 */
export function listenOnce(
    target: EventTargetLike,
    type: string,
    listener: ListenerFunction,
    thisArg?: object
): EventsKey {
    return listen(target, type, listener, thisArg, true);
}


/**
 * Unregisters event listeners on an event target.
 *
 * Inspired by
 * https://google.github.io/closure-library/api/source/closure/goog/events/events.js.src.html
 *
 * The argument passed to this function is the key returned from
 * {@link listen} or {@link listenOnce}.
 *
 * @param key The key.
 */
export function unlistenByKey(key: EventsKey) {
    if (key && key.target) {
        key.target.removeEventListener(key.type, key.listener);
        clear(key as unknown as Record<string, unknown>);
    }
}
