
import Collection from '../Collection';
import CollectionEventType from '../CollectionEventType';
import { BaseEvent as Event } from '@olts/events';
import Feature from '../Feature';
import Interaction from './Interaction';
import VectorLayer from '../layer/Vector';
import { TRUE } from '@olts/core/functions';
import { clear } from '../obj';
import { createEditingStyle } from '../style/Style';
import { extend } from '@olts/core/array';
import { getUid } from '@olts/core/util';
import { never, shiftKeyOnly, singleClick } from '../events/condition';

/**
 * @enum {string}
 */
const SelectEventType = {
    /**
     * Triggered when feature(s) has been (de)selected.
     * @event SelectEvent#select
     * @api
     */
    SELECT: 'select',
};

/**
 * A function that takes an {@link module:ol/Feature~Feature} and returns `true` if the feature may be
 * selected or `false` otherwise.
 * @typedef {function(import("../Feature").default, import("../layer/Layer").default<import("../source/Source").default>):boolean} FilterFunction
 */

/**
 * @typedef {Object} Options
 * @property {import("../events/condition").Condition} [addCondition] A function
 * that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled.
 * By default, this is {@link module:ol/events/condition.never}. Use this if you
 * want to use different events for add and remove instead of `toggle`.
 * @property {import("../events/condition").Condition} [condition] A function that
 * takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled. This is the event
 * for the selected features as a whole. By default, this is
 * {@link module:ol/events/condition.singleClick}. Clicking on a feature selects that
 * feature and removes any that were in the selection. Clicking outside any
 * feature removes all from the selection.
 * See `toggle`, `add`, `remove` options for adding/removing extra features to/
 * from the selection.
 * @property {Array<import("../layer/Layer").default>|function(import("../layer/Layer").default<import("../source/Source").default>): boolean} [layers]
 * A list of layers from which features should be selected. Alternatively, a
 * filter function can be provided. The function will be called for each layer
 * in the map and should return `true` for layers that you want to be
 * selectable. If the option is absent, all visible layers will be considered
 * selectable.
 * @property {import("../style/Style").StyleLike|null} [style]
 * Style for the selected features. By default the default edit style is used
 * (see {@link module:ol/style/Style~Style}). Set to `null` if this interaction should not apply
 * any style changes for selected features.
 * If set to a falsey value, the selected feature's style will not change.
 * @property {import("../events/condition").Condition} [removeCondition] A function
 * that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled.
 * By default, this is {@link module:ol/events/condition.never}. Use this if you
 * want to use different events for add and remove instead of `toggle`.
 * @property {import("../events/condition").Condition} [toggleCondition] A function
 * that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled. This is in addition
 * to the `condition` event. By default,
 * {@link module:ol/events/condition.shiftKeyOnly}, i.e. pressing `shift` as
 * well as the `condition` event, adds that feature to the current selection if
 * it is not currently selected, and removes it if it is. See `add` and `remove`
 * if you want to use different events instead of a toggle.
 * @property {boolean} [multi=false] A boolean that determines if the default
 * behaviour should select only single features or all (overlapping) features at
 * the clicked map position. The default of `false` means single select.
 * @property {Collection<Feature>} [features]
 * Collection where the interaction will place selected features. Optional. If
 * not set the interaction will create a collection. In any case the collection
 * used by the interaction is returned by
 * {@link module:ol/interaction/Select~Select#getFeatures}.
 * @property {FilterFunction} [filter] A function
 * that takes an {@link module:ol/Feature~Feature} and an
 * {@link module:ol/layer/Layer~Layer} and returns `true` if the feature may be
 * selected or `false` otherwise.
 * @property [hitTolerance=0] Hit-detection tolerance. Pixels inside
 * the radius around the given position will be checked for features.
 */

/**
 * Events emitted by {@link module:ol/interaction/Select~Select} instances are instances of
 * this type.
 */
export class SelectEvent extends Event {
    /**
     * @param {SelectEventType} type The event type.
     * @param {Array<import("../Feature").default>} selected Selected features.
     * @param {Array<import("../Feature").default>} deselected Deselected features.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Associated
     *     {@link module:ol/MapBrowserEvent~MapBrowserEvent}.
     */
    constructor(type: SelectEventType, selected: Array<import("../Feature").default>, deselected: Array<import("../Feature").default>, mapBrowserEvent: import("../Map/browser-event").default) {
        super(type);

        /**
         * Selected features array.
         * @type {Array<import("../Feature").default>}
         * @api
         */
        this.selected = selected;

        /**
         * Deselected features array.
         * @type {Array<import("../Feature").default>}
         * @api
         */
        this.deselected = deselected;

        /**
         * Associated {@link module:ol/MapBrowserEvent~MapBrowserEvent}.
         * @type {import("../MapBrowserEvent").default}
         * @api
         */
        this.mapBrowserEvent = mapBrowserEvent;
    }
}

/**
 * Original feature styles to reset to when features are no longer selected.
 * @type {Record<number, import("../style/Style").default|Array<import("../style/Style").default>|import("../style/Style").StyleFunction>}
 */
const originalFeatureStyles: { [n: number]: import("../style/Style").default | Array<import("../style/Style").default> | import("../style/Style").StyleFunction; } = {};

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType|
 *     'change:active', import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<'select', SelectEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     'change:active'|'select', Return>} SelectOnSignature
 */

/**
 * Interaction for selecting vector features. By default, selected features are
 * styled differently, so this interaction can be used for visual highlighting,
 * as well as selecting features for other actions, such as modification or
 * output. There are three ways of controlling which features are selected:
 * using the browser event as defined by the `condition` and optionally the
 * `toggle`, `add`/`remove`, and `multi` options; a `layers` filter; and a
 * further feature filter using the `filter` option.
 *
 * @fires SelectEvent
 * @api
 */
export class Select extends Interaction {

    /**
     *
     */
    override on: SelectOnSignature<EventsKey>;

    /**
     *
     */
    override once: SelectOnSignature<EventsKey>;

    /**
     *
     */
    override un: SelectOnSignature<void>;

    /**
     * @param {Options} [options] Options.
     */
    constructor(options: Options) {
        super();
        this.on = this.onInternal as SelectOnSignature<EventsKey>;
        this.once = this.onceInternal as SelectOnSignature<EventsKey>;
        this.un = this.unInternal as SelectOnSignature<void>;

        options = options ? options : {};

        /**
         * @private
         */
        this.boundAddFeature_ = this.addFeature_.bind(this);

        /**
         * @private
         */
        this.boundRemoveFeature_ = this.removeFeature_.bind(this);

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.condition_ = options.condition ? options.condition : singleClick;

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.addCondition_ = options.addCondition ? options.addCondition : never;

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.removeCondition_ = options.removeCondition
            ? options.removeCondition
            : never;

        /**
         * @private
         * @type {import("../events/condition").Condition}
         */
        this.toggleCondition_ = options.toggleCondition
            ? options.toggleCondition
            : shiftKeyOnly;

        /**
         * @private
         * @type {boolean}
         */
        this.multi_ = options.multi ? options.multi : false;

        /**
         * @private
         * @type {FilterFunction}
         */
        this.filter_ = options.filter ? options.filter : TRUE;

        /**
         * @private
         * @type {number}
         */
        this.hitTolerance_ = options.hitTolerance ? options.hitTolerance : 0;

        /**
         * @private
         * @type {import("../style/Style").default|Array<import("../style/Style").default>|import("../style/Style").StyleFunction|null}
         */
        this.style_ =
            options.style !== undefined ? options.style : getDefaultStyleFunction();

        /**
         * @private
         * @type {Collection<Feature>}
         */
        this.features_ = options.features || new Collection();

        /** @type {function(import("../layer/Layer").default<import("../source/Source").default>): boolean} */
        let layerFilter: (arg0: import("../layer/Layer").default<import("../source/Source").default>) => boolean;
        if (options.layers) {
            if (typeof options.layers === 'function') {
                layerFilter = options.layers;
            } else {
                const layers = options.layers;
                layerFilter = function (layer) {
                    return layers.includes(layer);
                };
            }
        } else {
            layerFilter = TRUE;
        }

        /**
         * @private
         * @type {function(import("../layer/Layer").default<import("../source/Source").default>): boolean}
         */
        this.layerFilter_ = layerFilter;

        /**
         * An association between selected feature (key)
         * and layer (value)
         * @private
         * @type {Record<string, import("../layer/Layer").default>}
         */
        this.featureLayerAssociation_ = {};
    }

    /**
     * @param {import("../Feature").default} feature Feature.
     * @param {import("../layer/Layer").default} layer Layer.
     * @private
     */
    addFeatureLayerAssociation_(feature: import("../Feature").default, layer: import("../layer/Layer").default) {
        this.featureLayerAssociation_[getUid(feature)] = layer;
    }

    /**
     * Get the selected features.
     * @return {Collection<Feature>} Features collection.
     * @api
     */
    getFeatures(): Collection<Feature> {
        return this.features_;
    }

    /**
     * Returns the Hit-detection tolerance.
     * @return Hit tolerance in pixels.
     * @api
     */
    getHitTolerance(): number {
        return this.hitTolerance_;
    }

    /**
     * Returns the associated {@link module:ol/layer/Vector~VectorLayer vector layer} of
     * a selected feature.
     * @param {import("../Feature").default} feature Feature
     * @return {import('../layer/Vector').default} Layer.
     * @api
     */
    getLayer(feature: import("../Feature").default): import('../layer/Vector').default {
        return /** @type {import('../layer/Vector').default} */ (
            this.featureLayerAssociation_[getUid(feature)]
        );
    }

    /**
     * Hit-detection tolerance. Pixels inside the radius around the given position
     * will be checked for features.
     * @param hitTolerance Hit tolerance in pixels.
     * @api
     */
    setHitTolerance(hitTolerance: number) {
        this.hitTolerance_ = hitTolerance;
    }

    /**
     * Remove the interaction from its current map, if any,  and attach it to a new
     * map, if any. Pass `null` to just remove the interaction from the current map.
     * @param {import("../Map").default|null} map Map.
     * @api
     */
    setMap(map: import("../Map").default | null) {
        const currentMap = this.getMap();
        if (currentMap && this.style_) {
            this.features_.forEach(this.restorePreviousStyle_.bind(this));
        }
        super.setMap(map);
        if (map) {
            this.features_.addEventListener(
                CollectionEventType.ADD,
                this.boundAddFeature_,
            );
            this.features_.addEventListener(
                CollectionEventType.REMOVE,
                this.boundRemoveFeature_,
            );

            if (this.style_) {
                this.features_.forEach(this.applySelectedStyle_.bind(this));
            }
        } else {
            this.features_.removeEventListener(
                CollectionEventType.ADD,
                this.boundAddFeature_,
            );
            this.features_.removeEventListener(
                CollectionEventType.REMOVE,
                this.boundRemoveFeature_,
            );
        }
    }

    /**
     * @param {import("../Collection").CollectionEvent<Feature>} evt Event.
     * @private
     */
    addFeature_(evt: import("../Collection").CollectionEvent<Feature>) {
        const feature = evt.element;
        if (this.style_) {
            this.applySelectedStyle_(feature);
        }
        if (!this.getLayer(feature)) {
            const layer = /** @type {VectorLayer} */ (
                this.getMap()
                    .getAllLayers()
                    .find(function (layer) {
                        if (
                            layer instanceof VectorLayer &&
                            layer.getSource() &&
                            layer.getSource().hasFeature(feature)
                        ) {
                            return layer;
                        }
                    })
            );
            if (layer) {
                this.addFeatureLayerAssociation_(feature, layer);
            }
        }
    }

    /**
     * @param {import("../Collection").CollectionEvent<Feature>} evt Event.
     * @private
     */
    removeFeature_(evt: import("../Collection").CollectionEvent<Feature>) {
        if (this.style_) {
            this.restorePreviousStyle_(evt.element);
        }
    }

    /**
     * @return {import("../style/Style").StyleLike|null} Select style.
     */
    getStyle(): import("../style/Style").StyleLike | null {
        return this.style_;
    }

    /**
     * @param {Feature} feature Feature
     * @private
     */
    applySelectedStyle_(feature: Feature) {
        const key = getUid(feature);
        if (!(key in originalFeatureStyles)) {
            originalFeatureStyles[key] = feature.getStyle();
        }
        feature.setStyle(this.style_);
    }

    /**
     * @param {Feature} feature Feature
     * @private
     */
    restorePreviousStyle_(feature: Feature) {
        const interactions = this.getMap().getInteractions().getArray();
        for (let i = interactions.length - 1; i >= 0; --i) {
            const interaction = interactions[i];
            if (
                interaction !== this &&
                interaction instanceof Select &&
                interaction.getStyle() &&
                interaction.getFeatures().getArray().lastIndexOf(feature) !== -1
            ) {
                feature.setStyle(interaction.getStyle());
                return;
            }
        }

        const key = getUid(feature);
        feature.setStyle(originalFeatureStyles[key]);
        delete originalFeatureStyles[key];
    }

    /**
     * @param {Feature} feature Feature.
     * @private
     */
    removeFeatureLayerAssociation_(feature: Feature) {
        delete this.featureLayerAssociation_[getUid(feature)];
    }

    /**
     * Handles the {@link module:ol/MapBrowserEvent~MapBrowserEvent map browser event} and may change the
     * selected state of features.
     * @param {import("../MapBrowserEvent").default} mapBrowserEvent Map browser event.
     * @return {boolean} `false` to stop event propagation.
     */
    handleEvent(mapBrowserEvent: import("../Map/browser-event").default): boolean {
        if (!this.condition_(mapBrowserEvent)) {
            return true;
        }
        const add = this.addCondition_(mapBrowserEvent);
        const remove = this.removeCondition_(mapBrowserEvent);
        const toggle = this.toggleCondition_(mapBrowserEvent);
        const set = !add && !remove && !toggle;
        const map = mapBrowserEvent.map;
        const features = this.getFeatures();

        /**
         * @type {Feature[]}
         */
        const deselected:Feature[] = [];

        /**
         * @type {Feature[]}
         */
        const selected:Feature[] = [];

        if (set) {
            // Replace the currently selected feature(s) with the feature(s) at the
            // pixel, or clear the selected feature(s) if there is no feature at
            // the pixel.
            clear(this.featureLayerAssociation_);
            map.forEachFeatureAtPixel(
                mapBrowserEvent.pixel,
                /**
                 * @param {import("../Feature").FeatureLike} feature Feature.
                 * @param {import("../layer/Layer").default} layer Layer.
                 * @return {boolean|undefined} Continue to iterate over the features.
                 */
                (feature: import("../Feature").FeatureLike, layer: import("../layer/Layer").default): boolean | undefined => {
                    if (!(feature instanceof Feature) || !this.filter_(feature, layer)) {
                        return;
                    }
                    this.addFeatureLayerAssociation_(feature, layer);
                    selected.push(feature);
                    return !this.multi_;
                },
                {
                    layerFilter: this.layerFilter_,
                    hitTolerance: this.hitTolerance_,
                },
            );
            for (let i = features.getLength() - 1; i >= 0; --i) {
                const feature = features.item(i);
                const index = selected.indexOf(feature);
                if (index > -1) {
                    // feature is already selected
                    selected.splice(index, 1);
                } else {
                    features.remove(feature);
                    deselected.push(feature);
                }
            }
            if (selected.length !== 0) {
                features.extend(selected);
            }
        } else {
            // Modify the currently selected feature(s).
            map.forEachFeatureAtPixel(
                mapBrowserEvent.pixel,
                /**
                 * @param {import("../Feature").FeatureLike} feature Feature.
                 * @param {import("../layer/Layer").default} layer Layer.
                 * @return {boolean|undefined} Continue to iterate over the features.
                 */
                (feature: import("../Feature").FeatureLike, layer: import("../layer/Layer").default): boolean | undefined => {
                    if (!(feature instanceof Feature) || !this.filter_(feature, layer)) {
                        return;
                    }
                    if ((add || toggle) && !features.getArray().includes(feature)) {
                        this.addFeatureLayerAssociation_(feature, layer);
                        selected.push(feature);
                    } else if (
                        (remove || toggle) &&
                        features.getArray().includes(feature)
                    ) {
                        deselected.push(feature);
                        this.removeFeatureLayerAssociation_(feature);
                    }
                    return !this.multi_;
                },
                {
                    layerFilter: this.layerFilter_,
                    hitTolerance: this.hitTolerance_,
                },
            );
            for (let j = deselected.length - 1; j >= 0; --j) {
                features.remove(deselected[j]);
            }
            features.extend(selected);
        }
        if (selected.length > 0 || deselected.length > 0) {
            this.dispatchEvent(
                new SelectEvent(
                    SelectEventType.SELECT,
                    selected,
                    deselected,
                    mapBrowserEvent,
                ),
            );
        }
        return true;
    }
}

/**
 * @return {import("../style/Style").StyleFunction} Styles.
 */
function getDefaultStyleFunction(): import("../style/Style").StyleFunction {
    const styles = createEditingStyle();
    extend(styles['Polygon'], styles['LineString']);
    extend(styles['GeometryCollection'], styles['LineString']);

    return function (feature) {
        if (!feature.getGeometry()) {
            return null;
        }
        return styles[feature.getGeometry().getType()];
    };
}

export default Select;
