
import BaseEvent from './event';
import EventType from './event-type';
import { EventsKey, listen, listenOnce, unlistenByKey } from './events';
import { Target as EventTarget } from './target';


type ListenerFunction = (event: Event | BaseEvent) => any;


export interface WithOlKey {
    ol_key: EventsKey;
}


export type OnSignature<
    Type extends string,
    EventClass extends Event | BaseEvent,
    Return
> = (
    type: Type,
    listener: (event: EventClass) => any
) => Return;


export type CombinedOnSignature<
    Type extends string,
    Return
> = (
    type: Type[],
    listener: ListenerFunction
) => Return extends void ? void : Return[];


/**
 *
 */
export type EventTypes = 'change' | 'error';


/**
 *
 */
export type ObservableOnSignature<Return> =
    OnSignature<EventTypes, BaseEvent, Return> &
    CombinedOnSignature<EventTypes, Return>;


/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 *
 * An event target providing convenient methods for listener registration and
 * un-registration.
 *
 * A generic `change` event is always available through
 * {@link Observable#changed}.
 *
 * @fires BaseEvent
 * @api
 */
export class Observable extends EventTarget {

    /**
     * Listen for a certain type of event.
     *
     * @param type The event type or array of event types.
     * @param listener The listener function.
     * @return Unique key for the listener. If
     *     called with an array of event types as the first argument, the return
     *     will be an array of keys.
     * @api
     */
    on: ObservableOnSignature<EventsKey>;

    /**
     * Listen once for a certain type of event.
     *
     * @param type The event type or array of event types.
     * @param listener The listener function.
     * @return Unique key for the listener. If
     *     called with an array of event types as the first argument, the return
     *     will be an array of keys.
     * @api
     */
    once: ObservableOnSignature<EventsKey>;

    /**
     * Unlisten for a certain type of event.
     *
     * @param type The event type or array of event types.
     * @param listener The listener function.
     * @api
     */
    un: ObservableOnSignature<void>;

    /**
     * Each time the object is modified, its version number will be
     * incremented.
     */
    private revision_: number = 0;


    constructor() {
        super();
        this.on = this.onInternal as ObservableOnSignature<EventsKey>;
        this.once = this.onceInternal as ObservableOnSignature<EventsKey>;
        this.un = this.unInternal as ObservableOnSignature<void>;
    }


    /**
     * Increases the revision counter and dispatches a 'change' event.
     * @api
     */
    changed() {
        ++this.revision_;
        this.dispatchEvent(EventType.CHANGE);
    }

    /**
     * Get the version number for this object.
     *
     * Each time the object is modified, its version number will be
     * incremented.
     *
     * @return Revision.
     * @api
     */
    getRevision() {
        return this.revision_;
    }

    /**
     * Listen for a certain type of event.
     *
     * @param type Type.
     * @param listener Listener.
     * @return Event key.
     */
    protected onInternal(
        type: string | string[],
        listener: ListenerFunction
    ): EventsKey | EventsKey[] {
        if (Array.isArray(type)) {
            const len = type.length;
            const keys = new Array(len);
            for (let i = 0; i < len; ++i) {
                keys[i] = listen(this, type[i], listener);
            }
            return keys;
        }
        return listen(this, type as string, listener);
    }

    /**
     * Listen once for a certain type of event.
     *
     * @param type Type.
     * @param listener Listener.
     * @return Event key.
     */
    protected onceInternal(
        type: string | string[],
        listener: ListenerFunction
    ): EventsKey | EventsKey[] {
        let key;
        if (Array.isArray(type)) {
            const len = type.length;
            key = new Array(len);
            for (let i = 0; i < len; ++i) {
                key[i] = listenOnce(this, type[i], listener);
            }
        } else {
            key = listenOnce(this, type as string, listener);
        }
        (listener as unknown as WithOlKey).ol_key = key as EventsKey;
        return key;
    }

    /**
     * Unlisten for a certain type of event.
     *
     * @param type Type.
     * @param listener Listener.
     */
    protected unInternal(
        type: string | string[],
        listener: ListenerFunction
    ) {
        const key = (listener as unknown as WithOlKey).ol_key;
        if (key) {
            unByKey(key);
        } else if (Array.isArray(type)) {
            for (let i = 0, ii = type.length; i < ii; ++i) {
                this.removeEventListener(type[i], listener);
            }
        } else {
            this.removeEventListener(type, listener);
        }
    }
}



/**
 * Removes an event listener using the key returned by `on()` or `once()`.
 *
 * @param key The key returned by `on()` or `once()` (or an array of keys).
 * @api
 */
export function unByKey(key: EventsKey | EventsKey[]) {
    if (Array.isArray(key)) {
        for (let i = 0, ii = key.length; i < ii; ++i) {
            unlistenByKey(key[i]);
        }
    } else {
        unlistenByKey(key as EventsKey);
    }
}


export default Observable;
