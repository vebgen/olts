import { ValueOf } from '@olts/core';
import { BaseEvent as Event, BaseObject, OnSignature, EventTypes, ObjectEvent, CombinedOnSignature, ObjectEventType, EventsKey } from '@olts/events';


/**
 * 
 */
const Property = {
    LENGTH: 'length',
} as const;


/**
 * 
 */
export const CollectionEventTypes = {
    /**
     * Triggered when an item is added to the collection.
     * @event CollectionEvent#add
     * @api
     */
    ADD: 'add',

    /**
     * Triggered when an item is removed from the collection.
     * @event CollectionEvent#remove
     * @api
     */
    REMOVE: 'remove',
} as const;


export type CollectionEventType = ValueOf<typeof CollectionEventTypes>;


/**
 * Events emitted by {@link Collection} instances are instances of this
 * type.
 */
export class CollectionEvent<T> extends Event {
    /**
     * The element that is added to or removed from the collection.
     * @api
     */
    element: T;

    /**
     * The index of the added or removed element.
     * @api
     */
    index: number;

    /**
     * @param type Type.
     * @param element Element.
     * @param index The index of the added or removed element.
     */
    constructor(type: CollectionEventType, element: T, index: number) {
        super(type);
        this.element = element;
        this.index = index;
    }
}


/***
 * 
 */
export type CollectionOnSignature<T, Return> =
    & OnSignature<EventTypes, Event, Return>
    & OnSignature<ObjectEventType | 'change:length', ObjectEvent, Return>
    & OnSignature<'add' | 'remove', CollectionEvent<T>, Return>
    & CombinedOnSignature<
        | EventTypes
        | ObjectEventType
        | 'change:length'
        | 'add'
        | 'remove',
        Return
    >;


/**
 * 
 */
export interface Options {
    /**
     * Disallow the same item from being added to the collection twice.
     * 
     * @default false
     */
    unique: boolean;
}


/**
 * An expanded version of standard JS Array, adding convenience methods for
 * manipulation.
 *
 * Add and remove changes to the Collection trigger a Collection event. Note
 * that this does not cover changes to the objects _within_ the Collection;
 * they trigger events on the appropriate object, not on the Collection as a
 * whole.
 *
 * @fires CollectionEvent
 *
 * @api
 */
export class Collection<T> extends BaseObject {
    /**
     * 
     */
    override on: CollectionOnSignature<T, EventsKey>;

    /**
     * 
     */
    override once: CollectionOnSignature<T, EventsKey>;

    /**
     * 
     */
    override un: CollectionOnSignature<T, void>;

    /**
     * @param {Array<T>} [array] Array.
     * @param {Options} [options] Collection options.
     */
    constructor(array:T[], options: Options) {
        super();
        this.on = this.onInternal as CollectionOnSignature<T, EventsKey>;
        this.once = this.onceInternal as CollectionOnSignature<T, EventsKey>;
        this.un = this.unInternal as CollectionOnSignature<T, void>;

        options = options || {};

        /**
         * @private
         * @type {boolean}
         */
        this.unique_ = !!options.unique;

        /**
         * @private
         * @type {!Array<T>}
         */
        this.array_ = array ? array : [];

        if (this.unique_) {
            for (let i = 0, ii = this.array_.length; i < ii; ++i) {
                this.assertUnique_(this.array_[i], i);
            }
        }

        this.updateLength_();
    }

    /**
     * Remove all elements from the collection.
     * @api
     */
    clear() {
        while (this.getLength() > 0) {
            this.pop();
        }
    }

    /**
     * Add elements to the collection.  This pushes each item in the provided array
     * to the end of the collection.
     * @param {!Array<T>} arr Array.
     * @return {Collection<T>} This collection.
     * @api
     */
    extend(arr:T[]): Collection<T> {
        for (let i = 0, ii = arr.length; i < ii; ++i) {
            this.push(arr[i]);
        }
        return this;
    }

    /**
     * Iterate over each element, calling the provided callback.
     * @param {function(T, number,T[]): *} f The function to call
     *     for every element. This function takes 3 arguments (the element, the
     *     index and the array). The return value is ignored.
     * @api
     */
    forEach(f: (arg0: T, arg1: number, arg2:T[]) => *) {
        const array = this.array_;
        for (let i = 0, ii = array.length; i < ii; ++i) {
            f(array[i], i, array);
        }
    }

    /**
     * Get a reference to the underlying Array object. Warning: if the array
     * is mutated, no events will be dispatched by the collection, and the
     * collection's "length" property won't be in sync with the actual length
     * of the array.
     * @return {!Array<T>} Array.
     * @api
     */
    getArray():T[] {
        return this.array_;
    }

    /**
     * Get the element at the provided index.
     * @param {number} index Index.
     * @return {T} Element.
     * @api
     */
    item(index: number): T {
        return this.array_[index];
    }

    /**
     * Get the length of this collection.
     * @return {number} The length of the array.
     * @observable
     * @api
     */
    getLength(): number {
        return this.get(Property.LENGTH);
    }

    /**
     * Insert an element at the provided index.
     * @param {number} index Index.
     * @param {T} elem Element.
     * @api
     */
    insertAt(index: number, elem: T) {
        if (index < 0 || index > this.getLength()) {
            throw new Error('Index out of bounds: ' + index);
        }
        if (this.unique_) {
            this.assertUnique_(elem);
        }
        this.array_.splice(index, 0, elem);
        this.updateLength_();
        this.dispatchEvent(
            new CollectionEvent(CollectionEventType.ADD, elem, index),
        );
    }

    /**
     * Remove the last element of the collection and return it.
     * Return `undefined` if the collection is empty.
     * @return {T|undefined} Element.
     * @api
     */
    pop(): T | undefined {
        return this.removeAt(this.getLength() - 1);
    }

    /**
     * Insert the provided element at the end of the collection.
     * @param {T} elem Element.
     * @return {number} New length of the collection.
     * @api
     */
    push(elem: T): number {
        if (this.unique_) {
            this.assertUnique_(elem);
        }
        const n = this.getLength();
        this.insertAt(n, elem);
        return this.getLength();
    }

    /**
     * Remove the first occurrence of an element from the collection.
     * @param {T} elem Element.
     * @return {T|undefined} The removed element or undefined if none found.
     * @api
     */
    remove(elem: T): T | undefined {
        const arr = this.array_;
        for (let i = 0, ii = arr.length; i < ii; ++i) {
            if (arr[i] === elem) {
                return this.removeAt(i);
            }
        }
        return undefined;
    }

    /**
     * Remove the element at the provided index and return it.
     * Return `undefined` if the collection does not contain this index.
     * @param {number} index Index.
     * @return {T|undefined} Value.
     * @api
     */
    removeAt(index: number): T | undefined {
        if (index < 0 || index >= this.getLength()) {
            return undefined;
        }
        const prev = this.array_[index];
        this.array_.splice(index, 1);
        this.updateLength_();
        this.dispatchEvent(
      /** @type {CollectionEvent<T>} */(
                new CollectionEvent(CollectionEventType.REMOVE, prev, index)
            ),
        );
        return prev;
    }

    /**
     * Set the element at the provided index.
     * @param {number} index Index.
     * @param {T} elem Element.
     * @api
     */
    setAt(index: number, elem: T) {
        const n = this.getLength();
        if (index >= n) {
            this.insertAt(index, elem);
            return;
        }
        if (index < 0) {
            throw new Error('Index out of bounds: ' + index);
        }
        if (this.unique_) {
            this.assertUnique_(elem, index);
        }
        const prev = this.array_[index];
        this.array_[index] = elem;
        this.dispatchEvent(
      /** @type {CollectionEvent<T>} */(
                new CollectionEvent(CollectionEventType.REMOVE, prev, index)
            ),
        );
        this.dispatchEvent(
      /** @type {CollectionEvent<T>} */(
                new CollectionEvent(CollectionEventType.ADD, elem, index)
            ),
        );
    }

    /**
     * @private
     */
    updateLength_() {
        this.set(Property.LENGTH, this.array_.length);
    }

    /**
     * @private
     * @param {T} elem Element.
     * @param {number} [except] Optional index to ignore.
     */
    assertUnique_(elem: T, except: number) {
        for (let i = 0, ii = this.array_.length; i < ii; ++i) {
            if (this.array_[i] === elem && i !== except) {
                throw new Error('Duplicate item added to a unique collection');
            }
        }
    }
}

export default Collection;
