import {
    EventTypes, EventsKey, Target, listen, unlistenByKey
} from '@olts/events';

import { PointerEventTypes } from '../pointer/EventType.js';
import { Map } from './map';
import { PASSIVE_EVENT_LISTENERS } from '@olts/core/has';
import { MapBrowserEvent } from './browser-event.js';
import { MapBrowserEventTypes } from './browser-event-types';


/**
 *
 */
export class MapBrowserEventHandler extends Target {

    /**
     * This is the element that we will listen to the real events on.
     */
    private map_: Map;

    /**
     *
     */
    private clickTimeoutId_: ReturnType<typeof setTimeout> | undefined;

    /**
     * Emulate dblclick and singleclick. Will be true when only one pointer is
     * active
     */
    private emulateClicks_: boolean = false;

    /**
     *
     */
    private dragging_: boolean = false;

    /**
     *
     */
    private dragListenerKeys_: EventsKey[] = [];

    /**
     *
     */
    private moveTolerance_: number;

    /**
     * The most recent "down" type event (or null if none have occurred).
     *
     * Set on pointerdown.
     */
    private down_: PointerEvent | null = null;

    /**
     *
     */
    private activePointers_: PointerEvent[] = [];

    /**
     *
     */
    private trackedTouches_: Record<number, PointerEvent> = {};

    /**
     *
     */
    private element_: HTMLElement;

    /**
     *
     */
    private pointerdownListenerKey_: EventsKey;

    /**
     *
     */
    private originalPointerMoveEvent_: PointerEvent | null = null;

    /**
     *
     */
    private relayedListenerKey_: EventsKey;

    /**
     *
     */
    private boundHandleTouchMove_: (event: TouchEvent) => void;

    /**
     * @param map The map with the viewport to listen to events on.
     * @param moveTolerance The minimal distance the pointer must travel to
     *    trigger a move.
     */
    constructor(map: Map, moveTolerance?: number) {
        super(map);

        this.map_ = map;
        this.moveTolerance_ = moveTolerance === undefined ? 1 : moveTolerance;
        const element = this.map_.getViewport();
        this.trackedTouches_ = {};
        this.element_ = element;
        this.pointerdownListenerKey_ = listen(
            element,
            PointerEventTypes.POINTERDOWN,
            this.handlePointerDown_ as any,
            this,
        );
        this.relayedListenerKey_ = listen(
            element,
            PointerEventTypes.POINTERMOVE,
            this.relayMoveEvent_ as any,
            this,
        );
        this.boundHandleTouchMove_ = this.handleTouchMove_.bind(this);
        this.element_.addEventListener(
            EventTypes.TOUCHMOVE,
            this.boundHandleTouchMove_,
            PASSIVE_EVENT_LISTENERS ? { passive: false } : false,
        );
    }

    /**
     * @param pointerEvent Pointer event.
     */
    private emulateClick_(pointerEvent: PointerEvent) {
        let newEvent = new MapBrowserEvent(
            MapBrowserEventTypes.CLICK,
            this.map_,
            pointerEvent,
        );
        this.dispatchEvent(newEvent);
        if (this.clickTimeoutId_ !== undefined) {
            // double-click
            clearTimeout(this.clickTimeoutId_);
            this.clickTimeoutId_ = undefined;
            newEvent = new MapBrowserEvent(
                MapBrowserEventTypes.DBLCLICK,
                this.map_,
                pointerEvent,
            );
            this.dispatchEvent(newEvent);
        } else {
            // click
            this.clickTimeoutId_ = setTimeout(() => {
                this.clickTimeoutId_ = undefined;
                const newEvent = new MapBrowserEvent(
                    MapBrowserEventTypes.SINGLECLICK,
                    this.map_,
                    pointerEvent,
                );
                this.dispatchEvent(newEvent);
            }, 250);
        }
    }

    /**
     * Keeps track on how many pointers are currently active.
     *
     * @param pointerEvent Pointer event.
     */
    private updateActivePointers_(pointerEvent: PointerEvent) {
        const event = pointerEvent;
        const id = event.pointerId;

        if (
            event.type == MapBrowserEventTypes.POINTERUP ||
            event.type == MapBrowserEventTypes.POINTERCANCEL
        ) {
            delete this.trackedTouches_[id];
            for (const pointerId in this.trackedTouches_) {
                if (this.trackedTouches_[pointerId].target !== event.target) {
                    // Some platforms assign a new pointerId when the target
                    // changes. If this happens, delete one tracked pointer. If
                    // there is more than one tracked pointer for the old
                    // target, it will be cleared by subsequent POINTERUP
                    // events from other pointers.
                    delete this.trackedTouches_[pointerId];
                    break;
                }
            }
        } else if (
            event.type == MapBrowserEventTypes.POINTERDOWN ||
            event.type == MapBrowserEventTypes.POINTERMOVE
        ) {
            this.trackedTouches_[id] = event;
        }
        this.activePointers_ = Object.values(this.trackedTouches_);
    }

    /**
     * @param pointerEvent Pointer event.
     */
    private handlePointerUp_(pointerEvent: PointerEvent) {
        this.updateActivePointers_(pointerEvent);
        const newEvent = new MapBrowserEvent(
            MapBrowserEventTypes.POINTERUP,
            this.map_,
            pointerEvent,
            undefined,
            undefined,
            this.activePointers_,
        );
        this.dispatchEvent(newEvent);

        // We emulate click events on left mouse button click, touch contact,
        // and pen contact. isMouseActionButton returns true in these cases
        // (evt.button is set to 0). See
        // http://www.w3.org/TR/pointerevents/#button-states We only fire
        // click, singleclick, and doubleclick if nobody has called
        // event.preventDefault().
        if (
            this.emulateClicks_ &&
            !newEvent.defaultPrevented &&
            !this.dragging_ &&
            this.isMouseActionButton_(pointerEvent)
        ) {
            this.emulateClick_(this.down_!);
        }

        if (this.activePointers_.length === 0) {
            this.dragListenerKeys_.forEach(unlistenByKey);
            this.dragListenerKeys_.length = 0;
            this.dragging_ = false;
            this.down_ = null;
        }
    }

    /**
     * @param pointerEvent Pointer event.
     * @return If the left mouse button was pressed.
     */
    private isMouseActionButton_(pointerEvent: PointerEvent): boolean {
        return pointerEvent.button === 0;
    }

    /**
     * @param pointerEvent Pointer event.
     */
    private handlePointerDown_(pointerEvent: PointerEvent) {
        this.emulateClicks_ = this.activePointers_.length === 0;
        this.updateActivePointers_(pointerEvent);
        const newEvent = new MapBrowserEvent(
            MapBrowserEventTypes.POINTERDOWN,
            this.map_,
            pointerEvent,
            undefined,
            undefined,
            this.activePointers_,
        );
        this.dispatchEvent(newEvent);

        this.down_ = new PointerEvent(pointerEvent.type, pointerEvent);
        Object.defineProperty(this.down_, 'target', {
            writable: false,
            value: pointerEvent.target,
        });

        if (this.dragListenerKeys_.length === 0) {
            const doc = this.map_.getOwnerDocument();
            this.dragListenerKeys_.push(
                listen(
                    doc,
                    MapBrowserEventTypes.POINTERMOVE,
                    this.handlePointerMove_ as any,
                    this,
                ),
                listen(
                    doc,
                    MapBrowserEventTypes.POINTERUP,
                    this.handlePointerUp_ as any,
                    this
                ),
                /* Note that the listener for `pointercancel is set up on
                 * `pointerEventHandler_` and not
                 * `documentPointerEventHandler_` like the `pointerup` and
                 * `pointermove` listeners.
                 *
                 * The reason for this is the following:
                 * `TouchSource.vacuumTouches_()` issues `pointercancel`
                 * events, when there was no `touchend` for a `touchstart`.
                 * Now, let's say a first `touchstart` is registered on
                 * `pointerEventHandler_`. The `documentPointerEventHandler_`
                 * is set up. But `documentPointerEventHandler_` doesn't know
                 * about the first `touchstart`. If there is no `touchend` for
                 * the `touchstart`, we can only receive a `touchcancel` from
                 * `pointerEventHandler_`, because it is only registered there.
                 */
                listen(
                    this.element_,
                    MapBrowserEventTypes.POINTERCANCEL,
                    this.handlePointerUp_ as any,
                    this,
                ),
            );
            if (this.element_.getRootNode && this.element_.getRootNode() !== doc) {
                this.dragListenerKeys_.push(
                    listen(
                        this.element_.getRootNode(),
                        MapBrowserEventTypes.POINTERUP,
                        this.handlePointerUp_ as any,
                        this,
                    ),
                );
            }
        }
    }

    /**
     * @param pointerEvent Pointer event.
     */
    private handlePointerMove_(pointerEvent: PointerEvent) {
        // Between pointerdown and pointerup, pointermove events are triggered.
        // To avoid a 'false' touchmove event to be dispatched, we test if the
        // pointer moved a significant distance.
        if (this.isMoving_(pointerEvent)) {
            this.updateActivePointers_(pointerEvent);
            this.dragging_ = true;
            const newEvent = new MapBrowserEvent(
                MapBrowserEventTypes.POINTERDRAG,
                this.map_,
                pointerEvent,
                this.dragging_,
                undefined,
                this.activePointers_,
            );
            this.dispatchEvent(newEvent);
        }
    }

    /**
     * Wrap and relay a pointermove event.
     *
     * @param pointerEvent Pointer event.
     */
    private relayMoveEvent_(pointerEvent: PointerEvent) {
        this.originalPointerMoveEvent_ = pointerEvent;
        const dragging = !!(this.down_ && this.isMoving_(pointerEvent));
        this.dispatchEvent(
            new MapBrowserEvent(
                MapBrowserEventTypes.POINTERMOVE,
                this.map_,
                pointerEvent,
                dragging,
            ),
        );
    }

    /**
     * Flexible handling of a `touch-action: none` css equivalent: because
     * calling `preventDefault()` on a `pointermove` event does not stop native
     * page scrolling and zooming, we also listen for `touchmove` and call
     * `preventDefault()` on it when an interaction (currently `DragPan`
     * handles the event.
     *
     * @param {TouchEvent} event Event.
     */
    private handleTouchMove_(event: TouchEvent) {
        // Due to https://github.com/mpizenberg/elm-pep/issues/2,
        // `this.originalPointerMoveEvent_` may not be initialized yet when we
        // get here on a platform without native pointer events, when elm-pep
        // is used as pointer events polyfill.
        const originalEvent = this.originalPointerMoveEvent_;
        if (
            (!originalEvent || originalEvent.defaultPrevented) &&
            (typeof event.cancelable !== 'boolean' || event.cancelable === true)
        ) {
            event.preventDefault();
        }
    }

    /**
     * @param pointerEvent Pointer event.
     * @return Is moving.
     */
    private isMoving_(pointerEvent: PointerEvent): boolean {
        return (
            this.dragging_ ||
            Math.abs(
                pointerEvent.clientX - this.down_!.clientX
            ) >
            this.moveTolerance_ ||
            Math.abs(
                pointerEvent.clientY - this.down_!.clientY
            ) > this.moveTolerance_
        );
    }

    /**
     * Clean up.
     */
    override disposeInternal() {
        if (this.relayedListenerKey_) {
            unlistenByKey(this.relayedListenerKey_);
            this.relayedListenerKey_ = null as any;
        }
        this.element_.removeEventListener(
            EventTypes.TOUCHMOVE,
            this.boundHandleTouchMove_,
        );

        if (this.pointerdownListenerKey_) {
            unlistenByKey(this.pointerdownListenerKey_);
            this.pointerdownListenerKey_ = null as any;
        }

        this.dragListenerKeys_.forEach(unlistenByKey);
        this.dragListenerKeys_.length = 0;

        this.element_ = null as any;
        super.disposeInternal();
    }
}


export default MapBrowserEventHandler;
