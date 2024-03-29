
import Control from './Control';
import type { EventType } from '@olts/events';
import MapProperty from '../Map/property';
import { CLASS_CONTROL, CLASS_UNSELECTABLE, CLASS_UNSUPPORTED } from '@olts/core/css';
import { listen, unlistenByKey } from '../events';
import { replaceNode } from '@olts/core/dom';

const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'MSFullscreenChange',
];

/**
 * @enum {string}
 */
const FullScreenEventType = {
    /**
     * Triggered after the map entered fullscreen.
     * @event FullScreenEventType#enterfullscreen
     * @api
     */
    ENTERFULLSCREEN: 'enterfullscreen',

    /**
     * Triggered after the map leave fullscreen.
     * @event FullScreenEventType#leavefullscreen
     * @api
     */
    LEAVEFULLSCREEN: 'leavefullscreen',
};

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes|
 *     'enterfullscreen'|'leavefullscreen', import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType, import("../Object").ObjectEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|
 *     'enterfullscreen'|'leavefullscreen'|ObjectEventType, Return>} FullScreenOnSignature
 */

/**
 * @typedef {Object} Options
 * @property [className='ol-full-screen'] CSS class name.
 * @property {string|Text|HTMLElement} [label='\u2922'] Text label to use for the button.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property {string|Text|HTMLElement} [labelActive='\u00d7'] Text label to use for the
 * button when full-screen is active.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property [activeClassName=className + '-true'] CSS class name for the button
 * when full-screen is active.
 * @property [inactiveClassName=className + '-false'] CSS class name for the button
 * when full-screen is inactive.
 * @property [tipLabel='Toggle full-screen'] Text label to use for the button tip.
 * @property {boolean} [keys=false] Full keyboard access.
 * @property {HTMLElement|string} [target] Specify a target if you want the
 * control to be rendered outside of the map's viewport.
 * @property {HTMLElement|string} [source] The element to be displayed
 * fullscreen. When not provided, the element containing the map viewport will
 * be displayed fullscreen.
 */

/**
 * Provides a button that when clicked fills up the full screen with the map.
 * The full screen source element is by default the element containing the map viewport unless
 * overridden by providing the `source` option. In which case, the dom
 * element introduced using this parameter will be displayed in full screen.
 *
 * When in full screen mode, a close button is shown to exit full screen mode.
 * The [Fullscreen API](https://www.w3.org/TR/fullscreen/) is used to
 * toggle the map in full screen mode.
 *
 * @fires FullScreenEventType#enterfullscreen
 * @fires FullScreenEventType#leavefullscreen
 * @api
 */
export class FullScreen extends Control {
    /**
     *
     */
    override on: FullScreenOnSignature<EventsKey>;

    /**
     *
     */
    override once: FullScreenOnSignature<EventsKey>;

    /**
     *
     */
    override un: FullScreenOnSignature<void>;

    /**
     * @param {Options} [options] Options.
     */
    constructor(options: Options) {
        options = options ? options : {};

        super({
            element: document.createElement('div'),
            target: options.target,
        });

        this.on = this.onInternal as FullScreenOnSignature<EventsKey>;
        this.once = this.onceInternal as FullScreenOnSignature<EventsKey>;
        this.un = this.unInternal as FullScreenOnSignature<void>;

        /**
         * @private
         * @type {boolean}
         */
        this.keys_ = options.keys !== undefined ? options.keys : false;

        /**
         * @private
         * @type {HTMLElement|string|undefined}
         */
        this.source_ = options.source;

        /**
         * @type {boolean}
         * @private
         */
        this.isInFullscreen_ = false;

        /**
         * @private
         */
        this.boundHandleMapTargetChange_ = this.handleMapTargetChange_.bind(this);

        /**
         * @private
         * @type {string}
         */
        this.cssClassName_ =
            options.className !== undefined ? options.className : 'ol-full-screen';

        /**
         * @private
         * @type {Array<import("../events").EventsKey>}
         */
        this.documentListeners_ = [];

        /**
         * @private
         * @type {string[]}
         */
        this.activeClassName_ =
            options.activeClassName !== undefined
                ? options.activeClassName.split(' ')
                : [this.cssClassName_ + '-true'];

        /**
         * @private
         * @type {string[]}
         */
        this.inactiveClassName_ =
            options.inactiveClassName !== undefined
                ? options.inactiveClassName.split(' ')
                : [this.cssClassName_ + '-false'];

        const label = options.label !== undefined ? options.label : '\u2922';

        /**
         * @private
         * @type {Text|HTMLElement}
         */
        this.labelNode_ =
            typeof label === 'string' ? document.createTextNode(label) : label;

        const labelActive =
            options.labelActive !== undefined ? options.labelActive : '\u00d7';

        /**
         * @private
         * @type {Text|HTMLElement}
         */
        this.labelActiveNode_ =
            typeof labelActive === 'string'
                ? document.createTextNode(labelActive)
                : labelActive;

        const tipLabel = options.tipLabel ? options.tipLabel : 'Toggle full-screen';

        /**
         * @private
         * @type {HTMLElement}
         */
        this.button_ = document.createElement('button');
        this.button_.title = tipLabel;
        this.button_.setAttribute('type', 'button');
        this.button_.appendChild(this.labelNode_);
        this.button_.addEventListener(
            EventTypes.CLICK,
            this.handleClick_.bind(this),
            false,
        );
        this.setClassName_(this.button_, this.isInFullscreen_);

        this.element.className = `${this.cssClassName_} ${CLASS_UNSELECTABLE} ${CLASS_CONTROL}`;
        this.element.appendChild(this.button_);
    }

    /**
     * @param {MouseEvent} event The event to handle
     * @private
     */
    handleClick_(event: MouseEvent) {
        event.preventDefault();
        this.handleFullScreen_();
    }

    /**
     * @private
     */
    handleFullScreen_() {
        const map = this.getMap();
        if (!map) {
            return;
        }
        const doc = map.getOwnerDocument();
        if (!isFullScreenSupported(doc)) {
            return;
        }
        if (isFullScreen(doc)) {
            exitFullScreen(doc);
        } else {
            let element;
            if (this.source_) {
                element =
                    typeof this.source_ === 'string'
                        ? doc.getElementById(this.source_)
                        : this.source_;
            } else {
                element = map.getTargetElement();
            }
            if (this.keys_) {
                requestFullScreenWithKeys(element);
            } else {
                requestFullScreen(element);
            }
        }
    }

    /**
     * @private
     */
    handleFullScreenChange_() {
        const map = this.getMap();
        if (!map) {
            return;
        }
        const wasInFullscreen = this.isInFullscreen_;
        this.isInFullscreen_ = isFullScreen(map.getOwnerDocument());
        if (wasInFullscreen !== this.isInFullscreen_) {
            this.setClassName_(this.button_, this.isInFullscreen_);
            if (this.isInFullscreen_) {
                replaceNode(this.labelActiveNode_, this.labelNode_);
                this.dispatchEvent(FullScreenEventType.ENTERFULLSCREEN);
            } else {
                replaceNode(this.labelNode_, this.labelActiveNode_);
                this.dispatchEvent(FullScreenEventType.LEAVEFULLSCREEN);
            }
            map.updateSize();
        }
    }

    /**
     * @param {HTMLElement} element Target element
     * @param {boolean} fullscreen True if fullscreen class name should be active
     * @private
     */
    setClassName_(element: HTMLElement, fullscreen: boolean) {
        if (fullscreen) {
            element.classList.remove(...this.inactiveClassName_);
            element.classList.add(...this.activeClassName_);
        } else {
            element.classList.remove(...this.activeClassName_);
            element.classList.add(...this.inactiveClassName_);
        }
    }

    /**
     * Remove the control from its current map and attach it to the new map.
     * Pass `null` to just remove the control from the current map.
     * Subclasses may set up event handlers to get notified about changes to
     * the map here.
     * @param {import("../Map").default|null} map Map.
     * @api
     */
    setMap(map: import("../Map").default | null) {
        const oldMap = this.getMap();
        if (oldMap) {
            oldMap.removeChangeListener(
                MapProperties.TARGET,
                this.boundHandleMapTargetChange_,
            );
        }

        super.setMap(map);

        this.handleMapTargetChange_();
        if (map) {
            map.addChangeListener(
                MapProperties.TARGET,
                this.boundHandleMapTargetChange_,
            );
        }
    }

    /**
     * @private
     */
    handleMapTargetChange_() {
        const listeners = this.documentListeners_;
        for (let i = 0, ii = listeners.length; i < ii; ++i) {
            unlistenByKey(listeners[i]);
        }
        listeners.length = 0;

        const map = this.getMap();
        if (map) {
            const doc = map.getOwnerDocument();
            if (isFullScreenSupported(doc)) {
                this.element.classList.remove(CLASS_UNSUPPORTED);
            } else {
                this.element.classList.add(CLASS_UNSUPPORTED);
            }

            for (let i = 0, ii = events.length; i < ii; ++i) {
                listeners.push(
                    listen(doc, events[i], this.handleFullScreenChange_, this),
                );
            }
            this.handleFullScreenChange_();
        }
    }
}

/**
 * @param {Document} doc The root document to check.
 * @return {boolean} Fullscreen is supported by the current platform.
 */
function isFullScreenSupported(doc: Document): boolean {
    const body = doc.body;
    return !!(
        body['webkitRequestFullscreen'] ||
        (body.requestFullscreen && doc.fullscreenEnabled)
    );
}

/**
 * @param {Document} doc The root document to check.
 * @return {boolean} Element is currently in fullscreen.
 */
function isFullScreen(doc: Document): boolean {
    return !!(doc['webkitIsFullScreen'] || doc.fullscreenElement);
}

/**
 * Request to fullscreen an element.
 * @param {HTMLElement} element Element to request fullscreen
 */
function requestFullScreen(element: HTMLElement) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element['webkitRequestFullscreen']) {
        element['webkitRequestFullscreen']();
    }
}

/**
 * Request to fullscreen an element with keyboard input.
 * @param {HTMLElement} element Element to request fullscreen
 */
function requestFullScreenWithKeys(element: HTMLElement) {
    if (element['webkitRequestFullscreen']) {
        element['webkitRequestFullscreen']();
    } else {
        requestFullScreen(element);
    }
}

/**
 * Exit fullscreen.
 * @param {Document} doc The document to exit fullscren from
 */
function exitFullScreen(doc: Document) {
    if (doc.exitFullscreen) {
        doc.exitFullscreen();
    } else if (doc['webkitExitFullscreen']) {
        doc['webkitExitFullscreen']();
    }
}

export default FullScreen;
