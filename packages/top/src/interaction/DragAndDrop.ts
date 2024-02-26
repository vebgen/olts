
// FIXME should handle all geo-referenced data, not just vector data

import { BaseEvent as Event, EventsKey } from '@olts/events';
import type { EventType } from '@olts/events';
import Interaction from './Interaction';
import { TRUE } from '@olts/core/functions';
import { get as getProjection, getUserProjection } from '../proj';
import { listen, unlistenByKey } from '../events';

/**
 * @typedef {Object} Options
 * @property {Array<typeof import("../format/Feature").default|import("../format/Feature").default>} [formatConstructors] Format constructors
 * (and/or formats pre-constructed with options).
 * @property {import("../source/Vector").default} [source] Optional vector source where features will be added.  If a source is provided
 * all existing features will be removed and new features will be added when
 * they are dropped on the target.  If you want to add features to a vector
 * source without removing the existing features (append only), instead of
 * providing the source option listen for the "addfeatures" event.
 * @property {ProjectionLike} [projection] Target projection. By default, the map's view's projection is used.
 * @property {HTMLElement} [target] The element that is used as the drop target, default is the viewport element.
 */

/**
 * @enum {string}
 */
const DragAndDropEventType = {
    /**
     * Triggered when features are added
     * @event DragAndDropEvent#addfeatures
     * @api
     */
    ADD_FEATURES: 'addfeatures',
};

/**
 * Events emitted by {@link module:ol/interaction/DragAndDrop~DragAndDrop} instances are instances
 * of this type.
 */
export class DragAndDropEvent extends Event {
    /**
     * @param {DragAndDropEventType} type Type.
     * @param {File} file File.
     * @param {Array<import("../Feature").default>} [features] Features.
     * @param {import("../proj/Projection").default} [projection] Projection.
     */
    constructor(type: DragAndDropEventType, file: File, features: Array<import("../Feature").default>, projection: import("../proj/Projection").default) {
        super(type);

        /**
         * The features parsed from dropped data.
         * @type {Array<import("../Feature").FeatureLike>|undefined}
         * @api
         */
        this.features = features;

        /**
         * The dropped file.
         * @type {File}
         * @api
         */
        this.file = file;

        /**
         * The feature projection.
         * @type {import("../proj/Projection").default|undefined}
         * @api
         */
        this.projection = projection;
    }
}

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType|
 *     'change:active', import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<'addfeatures', DragAndDropEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     'change:active'|'addfeatures', Return>} DragAndDropOnSignature
 */

/**
 * Handles input of vector data by drag and drop.
 *
 * @api
 *
 * @fires DragAndDropEvent
 */
export class DragAndDrop extends Interaction {

    /**
     * 
     */
    override on: DragAndDropOnSignature<EventsKey>;

    /**
     * 
     */
    override once: DragAndDropOnSignature<EventsKey>;

    /**
     * 
     */
    override un: DragAndDropOnSignature<void>;

    /**
     * @param {Options} [options] Options.
     */
    constructor(options: Options) {
        options = options ? options : {};

        super({
            handleEvent: TRUE,
        });
        this.on = this.onInternal as DragAndDropOnSignature<EventsKey>;
        this.once = this.onceInternal as DragAndDropOnSignature<EventsKey>;
        this.un = this.unInternal as DragAndDropOnSignature<void>;

        /**
         * @private
         * @type {boolean}
         */
        this.readAsBuffer_ = false;

        /**
         * @private
         * @type {Array<import("../format/Feature").default>}
         */
        this.formats_ = [];
        const formatConstructors = options.formatConstructors
            ? options.formatConstructors
            : [];
        for (let i = 0, ii = formatConstructors.length; i < ii; ++i) {
            let format = formatConstructors[i];
            if (typeof format === 'function') {
                format = new format();
            }
            this.formats_.push(format);
            this.readAsBuffer_ =
                this.readAsBuffer_ || format.getType() === 'arraybuffer';
        }

        /**
         * @private
         * @type {import("../proj/Projection").default}
         */
        this.projection_ = options.projection
            ? getProjection(options.projection)
            : null;

        /**
         * @private
         * @type {?Array<import("../events").EventsKey>}
         */
        this.dropListenKeys_ = null;

        /**
         * @private
         * @type {import("../source/Vector").default}
         */
        this.source_ = options.source || null;

        /**
         * @private
         * @type {HTMLElement|null}
         */
        this.target = options.target ? options.target : null;
    }

    /**
     * @param {File} file File.
     * @param {Event} event Load event.
     * @private
     */
    handleResult_(file: File, event: Event) {
        const result = event.target.result;
        const map = this.getMap();
        let projection = this.projection_;
        if (!projection) {
            projection = getUserProjection();
            if (!projection) {
                const view = map.getView();
                projection = view.getProjection();
            }
        }

        let text;
        const formats = this.formats_;
        for (let i = 0, ii = formats.length; i < ii; ++i) {
            const format = formats[i];
            let input = result;
            if (this.readAsBuffer_ && format.getType() !== 'arraybuffer') {
                if (text === undefined) {
                    text = new TextDecoder().decode(result);
                }
                input = text;
            }
            const features = this.tryReadFeatures_(format, input, {
                featureProjection: projection,
            });
            if (features && features.length > 0) {
                if (this.source_) {
                    this.source_.clear();
                    this.source_.addFeatures(features);
                }
                this.dispatchEvent(
                    new DragAndDropEvent(
                        DragAndDropEventType.ADD_FEATURES,
                        file,
                        features,
                        projection,
                    ),
                );
                break;
            }
        }
    }

    /**
     * @private
     */
    registerListeners_() {
        const map = this.getMap();
        if (map) {
            const dropArea = this.target ? this.target : map.getViewport();
            this.dropListenKeys_ = [
                listen(dropArea, EventType.DROP, this.handleDrop, this),
                listen(dropArea, EventType.DRAGENTER, this.handleStop, this),
                listen(dropArea, EventType.DRAGOVER, this.handleStop, this),
                listen(dropArea, EventType.DROP, this.handleStop, this),
            ];
        }
    }

    /**
     * Activate or deactivate the interaction.
     * @param {boolean} active Active.
     * @observable
     * @api
     */
    setActive(active: boolean) {
        if (!this.getActive() && active) {
            this.registerListeners_();
        }
        if (this.getActive() && !active) {
            this.unregisterListeners_();
        }
        super.setActive(active);
    }

    /**
     * Remove the interaction from its current map and attach it to the new map.
     * Subclasses may set up event handlers to get notified about changes to
     * the map here.
     * @param {import("../Map").default} map Map.
     */
    setMap(map: import("../Map").default) {
        this.unregisterListeners_();
        super.setMap(map);
        if (this.getActive()) {
            this.registerListeners_();
        }
    }

    /**
     * @param {import("../format/Feature").default} format Format.
     * @param {string} text Text.
     * @param {import("../format/Feature").ReadOptions} options Read options.
     * @private
     * @return {Array<import("../Feature").default>} Features.
     */
    tryReadFeatures_(format: import("../format/Feature").default, text: string, options: import("../format/Feature").ReadOptions): Array<import("../Feature").default> {
        try {
            return (
                /** @type {Array<import("../Feature").default>} */
                (format.readFeatures(text, options))
            );
        } catch (e) {
            return null;
        }
    }

    /**
     * @private
     */
    unregisterListeners_() {
        if (this.dropListenKeys_) {
            this.dropListenKeys_.forEach(unlistenByKey);
            this.dropListenKeys_ = null;
        }
    }

    /**
     * @param {DragEvent} event Event.
     */
    handleDrop(event: DragEvent) {
        const files = event.dataTransfer.files;
        for (let i = 0, ii = files.length; i < ii; ++i) {
            const file = files.item(i);
            const reader = new FileReader();
            reader.addEventListener(
                EventType.LOAD,
                this.handleResult_.bind(this, file),
            );
            if (this.readAsBuffer_) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        }
    }

    /**
     * @param {DragEvent} event Event.
     */
    handleStop(event: DragEvent) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }
}

export default DragAndDrop;
