/**
 * @module ol/structs/LRUCache
 */

import { assert } from '../asserts';

interface Entry<T = any> {
    key_: string;
    newer: Entry | null;
    older: Entry | null;
    value_: T;
}


export type ForEach<T> = (arg0: T, arg1: string, arg2: LRUCache<T>) => any;


/**
 * Implements a Least-Recently-Used cache where the keys do not conflict with
 * Object's properties (e.g. 'hasOwnProperty' is not allowed as a key).
 *
 * Expiring items from the cache is the responsibility of the user.
 *
 * @fires BaseEvent
 * @template T
 */
export class LRUCache<T> {
    /**
     * Desired max cache size after expireCache(). If set to 0, no cache entries
     * will be pruned at all.
     */
    highWaterMark: number;
    private count_: number;
    private entries_: Record<string, Entry<T>>;
    private oldest_: Entry<T> | null;
    private newest_: Entry<T> | null;

    /**
     * @param highWaterMark High water mark.
     */
    constructor(highWaterMark?: number) {

        this.highWaterMark = highWaterMark !== undefined ? highWaterMark : 2048;
        this.count_ = 0;
        this.entries_ = {};
        this.oldest_ = null;
        this.newest_ = null;
    }

    /**
     * @return Can expire cache.
     */
    canExpireCache(): boolean {
        return this.highWaterMark > 0 && this.getCount() > this.highWaterMark;
    }

    /**
     * Expire the cache.
     *
     * @param keep Keys to keep. To be implemented by subclasses.
     */
    expireCache(keep?: Record<string, boolean>) {
        while (this.canExpireCache()) {
            this.pop();
        }
    }

    /**
     * FIXME empty description for jsdoc
     */
    clear() {
        this.count_ = 0;
        this.entries_ = {};
        this.oldest_ = null;
        this.newest_ = null;
    }

    /**
     * Tell if the cache contains the given key.
     *
     * @param key Key.
     * @return Contains key.
     */
    containsKey(key: string): boolean {
        return this.entries_.hasOwnProperty(key);
    }

    /**
     * @param f The function to call for every entry from the oldest to the
     *     newer. This function takes 3 arguments (the entry value, the entry
     *     key and the LRUCache object). The return value is ignored.
     */
    forEach(f: ForEach<T>) {
        let entry = this.oldest_;
        while (entry) {
            f(entry.value_, entry.key_, this);
            entry = entry.newer;
        }
    }

    /**
     * @param key Key.
     * @param options Options (reserved for subclasses).
     * @return Value.
     */
    get(key: string, options?: any): T {
        const entry = this.entries_[key];
        assert(
            entry !== undefined,
            'Tried to get a value for a key that does not exist in the cache',
        );
        if (entry === this.newest_) {
            return entry.value_;
        }
        if (entry === this.oldest_) {
            this.oldest_ = this.oldest_.newer as Entry<T>;
            this.oldest_.older = null;
        } else {
            entry.newer!.older = entry.older;
            entry.older!.newer = entry.newer;
        }
        entry.newer = null;
        entry.older = this.newest_;
        this.newest_!.newer = entry;
        this.newest_ = entry;
        return entry.value_;
    }

    /**
     * Remove an entry from the cache.
     *
     * @param key The entry key.
     * @return The removed entry.
     */
    remove(key: string): T {
        const entry = this.entries_[key];
        assert(
            entry !== undefined,
            'Tried to get a value for a key that does not exist in the cache',
        );
        if (entry === this.newest_) {
            this.newest_ = /** @type {Entry} */ (entry.older);
            if (this.newest_) {
                this.newest_.newer = null;
            }
        } else if (entry === this.oldest_) {
            this.oldest_ = /** @type {Entry} */ (entry.newer);
            if (this.oldest_) {
                this.oldest_.older = null;
            }
        } else {
            entry.newer!.older = entry.older;
            entry.older!.newer = entry.newer;
        }
        delete this.entries_[key];
        --this.count_;
        return entry.value_;
    }

    /**
     * @return Count.
     */
    getCount(): number {
        return this.count_;
    }

    /**
     * @return Keys.
     */
    getKeys(): string[] {
        const keys = new Array(this.count_);
        let i = 0;
        let entry;
        for (entry = this.newest_; entry; entry = entry.older) {
            keys[i++] = entry.key_;
        }
        return keys;
    }

    /**
     * @return Values.
     */
    getValues(): T[] {
        const values = new Array(this.count_);
        let i = 0;
        let entry;
        for (entry = this.newest_; entry; entry = entry.older) {
            values[i++] = entry.value_;
        }
        return values;
    }

    /**
     * @return Last value.
     */
    peekLast(): T {
        return this.oldest_!.value_;
    }

    /**
     * @return Last key.
     */
    peekLastKey(): string {
        return this.oldest_!.key_;
    }

    /**
     * Get the key of the newest item in the cache.
     *
     * Throws if the cache is empty.
     *
     * @return The newest key.
     */
    peekFirstKey(): string {
        return this.newest_!.key_;
    }

    /**
     * Return an entry without updating least recently used time.
     *
     * @param key Key.
     * @return Value.
     */
    peek(key: string): T | undefined {
        return this.entries_[key]?.value_;
    }

    /**
     * @return value Value.
     */
    pop(): T {
        const entry = this.oldest_!;
        delete this.entries_[entry.key_];
        if (entry.newer) {
            entry.newer.older = null;
        }
        this.oldest_ = entry.newer;
        if (!this.oldest_) {
            this.newest_ = null;
        }
        --this.count_;
        return entry.value_;
    }

    /**
     * @param key Key.
     * @param value Value.
     */
    replace(key: string, value: T) {
        this.get(key); // update `newest_`
        this.entries_[key].value_ = value;
    }

    /**
     * @param key Key.
     * @param value Value.
     */
    set(key: string, value: T) {
        assert(
            !(key in this.entries_),
            'Tried to set a value for a key that is used already',
        );
        const entry = {
            key_: key,
            newer: null,
            older: this.newest_,
            value_: value,
        };
        if (!this.newest_) {
            this.oldest_ = entry;
        } else {
            this.newest_.newer = entry;
        }
        this.newest_ = entry;
        this.entries_[key] = entry;
        ++this.count_;
    }

    /**
     * Set a maximum number of entries for the cache.
     *
     * @param size Cache size.
     * @api
     */
    setSize(size: number) {
        this.highWaterMark = size;
    }
}

export default LRUCache;
