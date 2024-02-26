
import { BaseObject } from '@olts/events';
import LayerProperty from './Property.js';
import { abstract } from '@olts/core/util';
import { assert } from '@olts/core/asserts';
import { clamp } from '@olts/core/math';

/**
 * A css color, or a function called with a view resolution returning a css color.
 *
 * @typedef {string|function(number):string} BackgroundColor
 * @api
 */

/**
 * @typedef {ObjectEventType|'change:extent'|'change:maxResolution'|'change:maxZoom'|
 *    'change:minResolution'|'change:minZoom'|'change:opacity'|'change:visible'|'change:zIndex'} BaseLayerObjectEventTypes
 */

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event.js").default, Return> &
 *   import("../Observable").OnSignature<BaseLayerObjectEventTypes, import("../Object").ObjectEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|BaseLayerObjectEventTypes, Return>} BaseLayerOnSignature
 */

/**
 * @typedef {Object} Options
 * @property {string} [className='ol-layer'] A CSS class name to set to the layer element.
 * @property {number} [opacity=1] Opacity (0, 1).
 * @property {boolean} [visible=true] Visibility.
 * @property {Extent} [extent] The bounding extent for layer rendering.  The layer will not be
 * rendered outside of this extent.
 * @property {number | undefined} [zIndex] The z-index for layer rendering.  At rendering time, the layers
 * will be ordered, first by Z-index and then by position. When `undefined`, a `zIndex` of 0 is assumed
 * for layers that are added to the map's `layers` collection, or `Infinity` when the layer's `setMap()`
 * method was used.
 * @property {number} [minResolution] The minimum resolution (inclusive) at which this layer will be
 * visible.
 * @property {number} [maxResolution] The maximum resolution (exclusive) below which this layer will
 * be visible.
 * @property {number} [minZoom] The minimum view zoom level (exclusive) above which this layer will be
 * visible.
 * @property {number} [maxZoom] The maximum view zoom level (inclusive) at which this layer will
 * be visible.
 * @property {BackgroundColor} [background] Background color for the layer. If not specified, no background
 * will be rendered.
 * @property {Object<string, *>} [properties] Arbitrary observable properties. Can be accessed with `#get()` and `#set()`.
 */

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Note that with {@link module:ol/layer/Base~BaseLayer} and all its subclasses, any property set in
 * the options is set as a {@link module:ol/Object~BaseObject} property on the layer object, so
 * is observable, and has get/set accessors.
 *
 * @api
 */
export class BaseLayer extends BaseObject {

    /**
     * 
     */
    override on: BaseLayerOnSignature<EventsKey>;

    /**
     * 
     */
    override once: BaseLayerOnSignature<EventsKey>;

    /**
     * 
     */
    override un: BaseLayerOnSignature<void>;

    /**
     * @param {Options} options Layer options.
     */
    constructor(options: Options) {
        super();
        this.on = this.onInternal as BaseLayerOnSignature<EventsKey>;
        this.once = this.onceInternal as BaseLayerOnSignature<EventsKey>;
        this.un = this.unInternal as BaseLayerOnSignature<void>;

        /**
         * @type {BackgroundColor|false}
         * @private
         */
        this.background_ = options.background;

        /**
         * @type {Object<string, *>}
         */
        const properties: { [s: string]: *; } = Object.assign({}, options);
        if (typeof options.properties === 'object') {
            delete properties.properties;
            Object.assign(properties, options.properties);
        }

        properties[LayerProperty.OPACITY] =
            options.opacity !== undefined ? options.opacity : 1;
        assert(
            typeof properties[LayerProperty.OPACITY] === 'number',
            'Layer opacity must be a number',
        );

        properties[LayerProperty.VISIBLE] =
            options.visible !== undefined ? options.visible : true;
        properties[LayerProperty.Z_INDEX] = options.zIndex;
        properties[LayerProperty.MAX_RESOLUTION] =
            options.maxResolution !== undefined ? options.maxResolution : Infinity;
        properties[LayerProperty.MIN_RESOLUTION] =
            options.minResolution !== undefined ? options.minResolution : 0;
        properties[LayerProperty.MIN_ZOOM] =
            options.minZoom !== undefined ? options.minZoom : -Infinity;
        properties[LayerProperty.MAX_ZOOM] =
            options.maxZoom !== undefined ? options.maxZoom : Infinity;

        /**
         * @type {string}
         * @private
         */
        this.className_ =
            properties.className !== undefined ? properties.className : 'ol-layer';
        delete properties.className;

        this.setProperties(properties);

        /**
         * @type {import("./Layer.js").State}
         * @private
         */
        this.state_ = null;
    }

    /**
     * Get the background for this layer.
     * @return {BackgroundColor|false} Layer background.
     */
    getBackground(): BackgroundColor | false {
        return this.background_;
    }

    /**
     * @return {string} CSS class name.
     */
    getClassName(): string {
        return this.className_;
    }

    /**
     * This method is not meant to be called by layers or layer renderers because the state
     * is incorrect if the layer is included in a layer group.
     *
     * @param {boolean} [managed] Layer is managed.
     * @return {import("./Layer.js").State} Layer state.
     */
    getLayerState(managed: boolean): import("./Layer.js").State {
        /** @type {import("./Layer.js").State} */
        const state: import("./Layer.js").State =
            this.state_ ||
      /** @type {?} */ ({
                layer: this,
                managed: managed === undefined ? true : managed,
            });
        const zIndex = this.getZIndex();
        state.opacity = clamp(Math.round(this.getOpacity() * 100) / 100, 0, 1);
        state.visible = this.getVisible();
        state.extent = this.getExtent();
        state.zIndex = zIndex === undefined && !state.managed ? Infinity : zIndex;
        state.maxResolution = this.getMaxResolution();
        state.minResolution = Math.max(this.getMinResolution(), 0);
        state.minZoom = this.getMinZoom();
        state.maxZoom = this.getMaxZoom();
        this.state_ = state;

        return state;
    }

    /**
     * @abstract
     * @param {Array<import("./Layer.js").default>} [array] Array of layers (to be
     *     modified in place).
     * @return {Array<import("./Layer.js").default>} Array of layers.
     */
    getLayersArray(array: Array<import("./Layer.js").default>): Array<import("./Layer.js").default> {
        return abstract();
    }

    /**
     * @abstract
     * @param {Array<import("./Layer.js").State>} [states] Optional list of layer
     *     states (to be modified in place).
     * @return {Array<import("./Layer.js").State>} List of layer states.
     */
    getLayerStatesArray(states: Array<import("./Layer.js").State>): Array<import("./Layer.js").State> {
        return abstract();
    }

    /**
     * Return the {@link module:ol/extent~Extent extent} of the layer or `undefined` if it
     * will be visible regardless of extent.
     * @return {Extent|undefined} The layer extent.
     * @observable
     * @api
     */
    getExtent(): Extent | undefined {
        return /** @type {Extent|undefined} */ (
            this.get(LayerProperty.EXTENT)
        );
    }

    /**
     * Return the maximum resolution of the layer. Returns Infinity if
     * the layer has no maximum resolution set.
     * @return {number} The maximum resolution of the layer.
     * @observable
     * @api
     */
    getMaxResolution(): number {
        return /** @type {number} */ (this.get(LayerProperty.MAX_RESOLUTION));
    }

    /**
     * Return the minimum resolution of the layer. Returns 0 if
     * the layer has no minimum resolution set.
     * @return {number} The minimum resolution of the layer.
     * @observable
     * @api
     */
    getMinResolution(): number {
        return /** @type {number} */ (this.get(LayerProperty.MIN_RESOLUTION));
    }

    /**
     * Return the minimum zoom level of the layer. Returns -Infinity if
     * the layer has no minimum zoom set.
     * @return {number} The minimum zoom level of the layer.
     * @observable
     * @api
     */
    getMinZoom(): number {
        return /** @type {number} */ (this.get(LayerProperty.MIN_ZOOM));
    }

    /**
     * Return the maximum zoom level of the layer. Returns Infinity if
     * the layer has no maximum zoom set.
     * @return {number} The maximum zoom level of the layer.
     * @observable
     * @api
     */
    getMaxZoom(): number {
        return /** @type {number} */ (this.get(LayerProperty.MAX_ZOOM));
    }

    /**
     * Return the opacity of the layer (between 0 and 1).
     * @return {number} The opacity of the layer.
     * @observable
     * @api
     */
    getOpacity(): number {
        return /** @type {number} */ (this.get(LayerProperty.OPACITY));
    }

    /**
     * @abstract
     * @return {import("../source/Source.js").State} Source state.
     */
    getSourceState(): import("../source/Source.js").State {
        return abstract();
    }

    /**
     * Return the value of this layer's `visible` property. To find out whether the layer
     * is visible on a map, use `isVisible()` instead.
     * @return {boolean} The value of the `visible` property of the layer.
     * @observable
     * @api
     */
    getVisible(): boolean {
        return /** @type {boolean} */ (this.get(LayerProperty.VISIBLE));
    }

    /**
     * Return the Z-index of the layer, which is used to order layers before
     * rendering. Returns undefined if the layer is unmanaged.
     * @return {number|undefined} The Z-index of the layer.
     * @observable
     * @api
     */
    getZIndex(): number | undefined {
        return /** @type {number|undefined} */ (this.get(LayerProperty.Z_INDEX));
    }

    /**
     * Sets the background color.
     * @param {BackgroundColor} [background] Background color.
     */
    setBackground(background: BackgroundColor) {
        this.background_ = background;
        this.changed();
    }

    /**
     * Set the extent at which the layer is visible.  If `undefined`, the layer
     * will be visible at all extents.
     * @param {Extent|undefined} extent The extent of the layer.
     * @observable
     * @api
     */
    setExtent(extent: Extent | undefined) {
        this.set(LayerProperty.EXTENT, extent);
    }

    /**
     * Set the maximum resolution at which the layer is visible.
     * @param {number} maxResolution The maximum resolution of the layer.
     * @observable
     * @api
     */
    setMaxResolution(maxResolution: number) {
        this.set(LayerProperty.MAX_RESOLUTION, maxResolution);
    }

    /**
     * Set the minimum resolution at which the layer is visible.
     * @param {number} minResolution The minimum resolution of the layer.
     * @observable
     * @api
     */
    setMinResolution(minResolution: number) {
        this.set(LayerProperty.MIN_RESOLUTION, minResolution);
    }

    /**
     * Set the maximum zoom (exclusive) at which the layer is visible.
     * Note that the zoom levels for layer visibility are based on the
     * view zoom level, which may be different from a tile source zoom level.
     * @param {number} maxZoom The maximum zoom of the layer.
     * @observable
     * @api
     */
    setMaxZoom(maxZoom: number) {
        this.set(LayerProperty.MAX_ZOOM, maxZoom);
    }

    /**
     * Set the minimum zoom (inclusive) at which the layer is visible.
     * Note that the zoom levels for layer visibility are based on the
     * view zoom level, which may be different from a tile source zoom level.
     * @param {number} minZoom The minimum zoom of the layer.
     * @observable
     * @api
     */
    setMinZoom(minZoom: number) {
        this.set(LayerProperty.MIN_ZOOM, minZoom);
    }

    /**
     * Set the opacity of the layer, allowed values range from 0 to 1.
     * @param {number} opacity The opacity of the layer.
     * @observable
     * @api
     */
    setOpacity(opacity: number) {
        assert(typeof opacity === 'number', 'Layer opacity must be a number');
        this.set(LayerProperty.OPACITY, opacity);
    }

    /**
     * Set the visibility of the layer (`true` or `false`).
     * @param {boolean} visible The visibility of the layer.
     * @observable
     * @api
     */
    setVisible(visible: boolean) {
        this.set(LayerProperty.VISIBLE, visible);
    }

    /**
     * Set Z-index of the layer, which is used to order layers before rendering.
     * The default Z-index is 0.
     * @param {number} zindex The z-index of the layer.
     * @observable
     * @api
     */
    setZIndex(zindex: number) {
        this.set(LayerProperty.Z_INDEX, zindex);
    }

    /**
     * Clean up.
     */
    disposeInternal() {
        if (this.state_) {
            this.state_.layer = null;
            this.state_ = null;
        }
        super.disposeInternal();
    }
}

export default BaseLayer;
