import RBush_ from 'rbush';

import { Extent, createOrUpdate, equals } from '@olts/core/extent';
import { getUid } from '../util';
import { isEmpty } from '../js-obj';


/**
 * An entry
 */
export interface Entry<T> {
    /**
     * MinX.
     */
    minX: number;

    /**
     * MinY.
     */
    minY: number;

    /**
     * MaxX.
     */
    maxX: number;

    /**
     * MaxY.
     */
    maxY: number;

    /**
     * Value.
     */
    value?: T;
}


/**
 * Wrapper around the RBush by Vladimir Agafonkin.
 *
 * @see https://github.com/mourner/rbush.
 */
export class RBush<T> {
    private rBush_: RBush_<Entry<T>>;

    /**
     * A mapping between the objects added to this rbush wrapper
     * and the objects that are actually added to the internal rbush.
     */
    private items_: Record<string, Entry<T>>;

    /**
     * @param maxEntries Max entries.
     */
    constructor(maxEntries?: number) {
        this.rBush_ = new RBush_(maxEntries);
        this.items_ = {};
    }

    /**
     * Insert a value into the RBush.
     *
     * @param extent Extent.
     * @param value Value.
     */
    insert(extent: Extent, value: T) {
        const item: Entry<T> = {
            minX: extent[0],
            minY: extent[1],
            maxX: extent[2],
            maxY: extent[3],
            value,
        };

        this.rBush_.insert(item);
        this.items_[getUid(value)] = item;
    }

    /**
     * Bulk-insert values into the RBush.
     *
     * @param extents Extents.
     * @param values Values.
     */
    load(extents: Extent[], values: T[]) {
        const items = new Array(values.length);
        for (let i = 0, l = values.length; i < l; i++) {
            const extent = extents[i];
            const value = values[i];

            const item: Entry<T> = {
                minX: extent[0],
                minY: extent[1],
                maxX: extent[2],
                maxY: extent[3],
                value: value,
            };
            items[i] = item;
            this.items_[getUid(value)] = item;
        }
        this.rBush_.load(items);
    }

    /**
     * Remove a value from the RBush.
     *
     * @param value Value.
     * @return Removed.
     */
    remove(value: T): boolean {
        const uid = getUid(value);

        // get the object in which the value was wrapped when adding to the
        // internal rbush. then use that object to do the removal.
        const item = this.items_[uid];
        delete this.items_[uid];
        return this.rBush_.remove(item) !== null;
    }

    /**
     * Update the extent of a value in the RBush.
     *
     * @param extent Extent.
     * @param value Value.
     */
    update(extent: Extent, value: T) {
        const item = this.items_[getUid(value)];
        const bBox = [item.minX, item.minY, item.maxX, item.maxY] as Extent;
        if (!equals(bBox, extent)) {
            this.remove(value);
            this.insert(extent, value);
        }
    }

    /**
     * Return all values in the RBush.
     *
     * @return All.
     */
    getAll(): T[] {
        const items = this.rBush_.all();
        return items.map(function (item) {
            return item.value as T;
        });
    }

    /**
     * Return all values in the given extent.
     *
     * @param extent Extent.
     * @return All in extent.
     */
    getInExtent(extent: Extent): T[] {
        const bBox: Entry<T> = {
            minX: extent[0],
            minY: extent[1],
            maxX: extent[2],
            maxY: extent[3],
        };
        const items = this.rBush_.search(bBox);
        return items.map(function (item) {
            return item.value as T;
        });
    }

    /**
     * Calls a callback function with each value in the tree.
     *
     * If the callback returns a truthy value, this value is returned without
     * checking the rest of the tree.
     *
     * @param callback Callback.
     * @return Callback return value.
     */
    forEach(callback: (item: T) => any): any {
        return this.forEach_(this.getAll(), callback);
    }

    /**
     * Calls a callback function with each value in the provided extent.
     *
     * @param extent Extent.
     * @param callback Callback.
     * @return Callback return value.
     */
    forEachInExtent(
        extent: Extent,
        callback: (item: T) => any
    ): any {
        return this.forEach_(this.getInExtent(extent), callback);
    }

    /**
     * @param values Values.
     * @param callback Callback.
     * @private
     * @return Callback return value.
     */
    forEach_(values: T[], callback: (item: T) => any): any {
        let result;
        for (let i = 0, l = values.length; i < l; i++) {
            result = callback(values[i]);
            if (result) {
                return result;
            }
        }
        return result;
    }

    /**
     * @return Is empty.
     */
    isEmpty(): boolean {
        return isEmpty(this.items_);
    }

    /**
     * Remove all values from the RBush.
     */
    clear() {
        this.rBush_.clear();
        this.items_ = {};
    }

    /**
     * @param extent Extent.
     * @return Extent.
     */
    getExtent(extent?: Extent): Extent {
        const data = this.rBush_.toJSON();
        return createOrUpdate(
            data.minX, data.minY, data.maxX, data.maxY, extent
        );
    }

    /**
     * @param rbush R-Tree.
     */
    concat(rbush: RBush<T>) {
        this.rBush_.load(rbush.rBush_.all());
        for (const i in rbush.items_) {
            this.items_[i] = rbush.items_[i];
        }
    }
}


export default RBush;
