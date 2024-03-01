import { isEmpty } from '@olts/core/js-obj';
import { getUid } from '@olts/core/util';

import BaseEvent, { BaseEvent as Event } from './event';
import { EventsKey, Listener } from './events';
import {
    CombinedOnSignature, EventTypes, Observable, OnSignature
} from './observable';


/**
 *
 */
export const Types = {
    /**
     * Triggered when a property is changed.
     * @event ObjectEvent#propertychange
     * @api
     */
    PROPERTYCHANGE: 'propertychange',
} as const;
export type ObjectEventType = (typeof Types)[keyof (typeof Types)];


/**
 * Events emitted by {@link BaseObject} instances are instances of this type.
 */
export class ObjectEvent extends Event {

    /**
     * The name of the property whose value is changing.
     * @api
     */
    key: string;

    /**
     * The old value.
     *
     * To get the new value use `e.target.get(e.key)` where `e` is the event
     * object.
     * @api
     */
    oldValue: any;

    /**
     * @param type The event type.
     * @param key The property name.
     * @param oldValue The old value for `key`.
     */
    constructor(type: string, key: string, oldValue: any) {
        super(type);
        this.key = key;
        this.oldValue = oldValue;
    }
}


export type ObjectOnSignature<Return> =
    & OnSignature<EventTypes, BaseEvent, Return>
    & OnSignature<ObjectEventType, ObjectEvent, Return>
    & CombinedOnSignature<EventTypes | ObjectEventType, Return>;


type Values = Record<string, any>;


/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 *
 * Most non-trivial classes inherit from this.
 *
 * This extends {@link Observable} with observable properties, where each
 * property is observable as well as the object as a whole.
 *
 * Classes that inherit from this have pre-defined properties, to which you can
 * add your owns. The pre-defined properties are listed in this documentation
 * as 'Observable Properties', and have their own accessors; for example,
 * {@link Map} has a `target` property, accessed with `getTarget()` and changed
 * with `setTarget()`. Not all properties are however settable. There are also
 * general-purpose accessors `get()` and `set()`. For example, `get('target')`
 * is equivalent to `getTarget()`.
 *
 * The `set` accessors trigger a change event, and you can monitor this by
 * registering a listener. For example, {@link View} has a `center` property,
 * so `view.on('change:center', function(evt) {...});` would call the function
 * whenever the value of the center property changes. Within the function,
 * `evt.target` would be the view, so `evt.target.getCenter()` would return the
 * new center.
 *
 * You can add your own observable properties with `object.set('prop',
 * 'value')`, and retrieve that with `object.get('prop')`. You can listen for
 * changes on that property value with `object.on('change:prop', listener)`.
 * You can get a list of all properties with {@link BaseObject#getProperties}.
 *
 * Note that the observable properties are separate from standard JS
 * properties. You can, for example, give your map object a title with
 * `map.title='New title'` and with `map.set('title', 'Another title')`. The
 * first will be a `hasOwnProperty`; the second will appear in
 * `getProperties()`. Only the second is observable.
 *
 * Properties can be deleted by using the unset method. E.g.
 * object.unset('foo').
 *
 * @fires ObjectEvent
 * @api
 */
export class BaseObject extends Observable {

    override on: ObjectOnSignature<EventsKey>;
    override once: ObjectOnSignature<EventsKey>;
    override un: ObjectOnSignature<void>;
    values_: Values | null = null;

    /**
     * @param values An object with key-value pairs.
     */
    constructor(values?: Values) {
        super();
        this.on = this.onInternal as ObjectOnSignature<EventsKey>;
        this.once = this.onceInternal as ObjectOnSignature<EventsKey>;
        this.un = this.unInternal as ObjectOnSignature<void>;

        // Call {@link getUid} to ensure that the order of objects' ids is the
        // same as the order in which they were created.  This also helps to
        // ensure that object properties are always added in the same order,
        // which helps many JavaScript engines generate faster code.
        getUid(this);

        if (values !== undefined) {
            this.setProperties(values);
        }
    }

    /**
     * Gets a value.
     *
     * @param key Key name.
     * @return Value.
     * @api
     */
    get(key: string): any {
        let value;
        if (this.values_ && this.values_.hasOwnProperty(key)) {
            value = this.values_[key];
        }
        return value;
    }

    /**
     * Get a list of object property names.
     *
     * @return List of property names.
     * @api
     */
    getKeys(): string[] {
        return (this.values_ && Object.keys(this.values_)) || [];
    }

    /**
     * Get an object of all property names and values.
     *
     * @return Object.
     * @api
     */
    getProperties<T = Values>(): T {
        return ((this.values_ && Object.assign({}, this.values_)) || {}) as T;
    }

    /**
     * Get an object of all property names and values.
     *
     * @return Object.
     */
    getPropertiesInternal(): Values | null {
        return this.values_;
    }

    /**
     * @return The object has properties.
     */
    hasProperties(): boolean {
        return !!this.values_;
    }

    /**
     * @param key Key name.
     * @param oldValue Old value.
     */
    notify(key: string, oldValue: any) {
        let eventType;
        eventType = `change:${key}`;
        if (this.hasListener(eventType)) {
            this.dispatchEvent(new ObjectEvent(eventType, key, oldValue));
        }
        eventType = Types.PROPERTYCHANGE;
        if (this.hasListener(eventType)) {
            this.dispatchEvent(new ObjectEvent(eventType, key, oldValue));
        }
    }

    /**
     * @param key Key name.
     * @param listener Listener.
     */
    addChangeListener(key: string, listener: Listener) {
        this.addEventListener(`change:${key}`, listener);
    }

    /**
     * @param key Key name.
     * @param listener Listener.
     */
    removeChangeListener(key: string, listener: Listener) {
        this.removeEventListener(`change:${key}`, listener);
    }

    /**
     * Sets a value.
     *
     * @param key Key name.
     * @param value Value.
     * @param silent Update without triggering an event.
     * @api
     */
    set(key: string, value: any, silent?: boolean) {
        const values = this.values_ || (this.values_ = {});
        if (silent) {
            values[key] = value;
        } else {
            const oldValue = values[key];
            values[key] = value;
            if (oldValue !== value) {
                this.notify(key, oldValue);
            }
        }
    }

    /**
     * Sets a collection of key-value pairs.
     *
     * Note that this changes any existing properties and adds new ones (it
     * does not remove any existing properties).
     *
     * @param values Values.
     * @param silent Update without triggering an event.
     * @api
     */
    setProperties(values: Values, silent?: boolean) {
        for (const key in values) {
            this.set(key, values[key], silent);
        }
    }

    /**
     * Apply any properties from another object without triggering events.
     *
     * @param source The source object.
     */
    protected applyProperties(source: BaseObject) {
        if (!source.values_) {
            return;
        }
        Object.assign(this.values_ || (this.values_ = {}), source.values_);
    }

    /**
     * Unsets a property.
     *
     * @param key Key name.
     * @param silent Unset without triggering an event.
     * @api
     */
    unset(key: string, silent?: boolean) {
        if (this.values_ && key in this.values_) {
            const oldValue = this.values_[key];
            delete this.values_[key];
            if (isEmpty(this.values_)) {
                this.values_ = null;
            }
            if (!silent) {
                this.notify(key, oldValue);
            }
        }
    }
}


export default BaseObject;
