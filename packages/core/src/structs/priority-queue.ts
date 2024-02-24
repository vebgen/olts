import { assert } from '../asserts';
import { clear } from '../js-obj';


export const DROP: number = Infinity;


/**
 * Get a rank for an item.
 *
 * @param item Item.
 * @returns The rank of the item.
 */
export type PriorityFunction<T> = (item: T) => number;


/**
 * Get a key for an item.
 *
 * @param item Item.
 * @returns The string key of the item.
 */
export type KeyFunction<T> = (item: T) => string;


/**
 * Priority queue.
 *
 * The implementation is inspired from the Closure Library's Heap class and
 * Python's heapq module.
 *
 * @see https://github.com/google/closure-library/blob/master/closure/goog/structs/heap
 * and https://hg.python.org/cpython/file/2.7/Lib/heapq.py.
 */
export class PriorityQueue<T> {

    private priorityFunction_: PriorityFunction<T>;
    private keyFunction_: KeyFunction<T>;
    private elements_: T[];
    private priorities_: number[];
    private queuedElements_: Record<string, boolean>;

    /**
     * @param priorityFunction Priority function.
     * @param keyFunction Key function.
     */
    constructor(
        priorityFunction: PriorityFunction<T>,
        keyFunction: KeyFunction<T>
    ) {
        this.priorityFunction_ = priorityFunction;
        this.keyFunction_ = keyFunction;
        this.elements_ = [];
        this.priorities_ = [];
        this.queuedElements_ = {};
    }

    /**
     * Empty internal containers.
     */
    clear() {
        this.elements_.length = 0;
        this.priorities_.length = 0;
        clear(this.queuedElements_);
    }

    /**
     * Remove and return the highest-priority element. O(log N).
     *
     * @return Element.
     */
    dequeue(): T {
        const elements = this.elements_;
        const priorities = this.priorities_;
        const element = elements[0];
        if (elements.length == 1) {
            elements.length = 0;
            priorities.length = 0;
        } else {
            elements[0] = elements.pop() as T;
            priorities[0] = priorities.pop() as number;
            this.siftUp_(0);
        }
        const elementKey = this.keyFunction_(element);
        delete this.queuedElements_[elementKey];
        return element;
    }

    /**
     * Enqueue an element. O(log N).
     *
     * @param element Element.
     * @return The element was added to the queue.
     */
    enqueue(element: T): boolean {
        assert(
            !(this.keyFunction_(element) in this.queuedElements_),
            'Tried to enqueue an `element` that was already added to the queue',
        );
        const priority = this.priorityFunction_(element);
        if (priority != DROP) {
            this.elements_.push(element);
            this.priorities_.push(priority);
            this.queuedElements_[this.keyFunction_(element)] = true;
            this.siftDown_(0, this.elements_.length - 1);
            return true;
        }
        return false;
    }

    /**
     * Get the number of elements in the queue.
     *
     * @return Count.
     */
    getCount(): number {
        return this.elements_.length;
    }

    /**
     * Gets the index of the left child of the node at the given index.
     *
     * @param index The index of the node to get the left child for.
     * @return The index of the left child.
     */
    private getLeftChildIndex_(index: number): number {
        return index * 2 + 1;
    }

    /**
     * Gets the index of the right child of the node at the given index.
     *
     * @param index The index of the node to get the right child for.
     * @return The index of the right child.
     */
    private getRightChildIndex_(index: number): number {
        return index * 2 + 2;
    }

    /**
     * Gets the index of the parent of the node at the given index.
     *
     * @param index The index of the node to get the parent for.
     * @return The index of the parent.
     */
    private getParentIndex_(index: number): number {
        return (index - 1) >> 1;
    }

    /**
     * Make this a heap. O(N).
     */
    private heapify_() {
        let i;
        for (i = (this.elements_.length >> 1) - 1; i >= 0; i--) {
            this.siftUp_(i);
        }
    }

    /**
     * @return Is empty.
     */
    isEmpty(): boolean {
        return this.elements_.length === 0;
    }

    /**
     * @param key Key.
     * @return Is key queued.
     */
    isKeyQueued(key: string): boolean {
        return key in this.queuedElements_;
    }

    /**
     * @param element Element.
     * @return Is queued.
     */
    isQueued(element: T): boolean {
        return this.isKeyQueued(this.keyFunction_(element));
    }

    /**
     * @param index The index of the node to move down.
     */
    private siftUp_(index: number) {
        const elements = this.elements_;
        const priorities = this.priorities_;
        const count = elements.length;
        const element = elements[index];
        const priority = priorities[index];
        const startIndex = index;

        while (index < count >> 1) {
            const lIndex = this.getLeftChildIndex_(index);
            const rIndex = this.getRightChildIndex_(index);

            const smallerChildIndex =
                rIndex < count && priorities[rIndex] < priorities[lIndex]
                    ? rIndex
                    : lIndex;

            elements[index] = elements[smallerChildIndex];
            priorities[index] = priorities[smallerChildIndex];
            index = smallerChildIndex;
        }

        elements[index] = element;
        priorities[index] = priority;
        this.siftDown_(startIndex, index);
    }

    /**
     * @param {number} startIndex The index of the root.
     * @param {number} index The index of the node to move up.
     */
    private siftDown_(startIndex: number, index: number) {
        const elements = this.elements_;
        const priorities = this.priorities_;
        const element = elements[index];
        const priority = priorities[index];

        while (index > startIndex) {
            const parentIndex = this.getParentIndex_(index);
            if (priorities[parentIndex] > priority) {
                elements[index] = elements[parentIndex];
                priorities[index] = priorities[parentIndex];
                index = parentIndex;
            } else {
                break;
            }
        }
        elements[index] = element;
        priorities[index] = priority;
    }

    /**
     * FIXME empty description for jsdoc
     */
    reprioritize() {
        const priorityFunction = this.priorityFunction_;
        const elements = this.elements_;
        const priorities = this.priorities_;
        let index = 0;
        const n = elements.length;
        let element, i, priority;
        for (i = 0; i < n; ++i) {
            element = elements[i];
            priority = priorityFunction(element);
            if (priority == DROP) {
                delete this.queuedElements_[this.keyFunction_(element)];
            } else {
                priorities[index] = priority;
                elements[index++] = element;
            }
        }
        elements.length = index;
        priorities.length = index;
        this.heapify_();
    }
}

export default PriorityQueue;
