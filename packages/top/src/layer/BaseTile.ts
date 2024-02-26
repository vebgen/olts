
import { EventsKey } from '@olts/events';
import Layer from './Layer';
import TileProperty from './TileProperty';

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<import("./Base").BaseLayerObjectEventTypes|
 *     import("./Layer").LayerEventType|'change:preload'|'change:useInterimTilesOnError', import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<import("../render/EventType").LayerRenderEventTypes, import("../render/Event").default, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|import("./Base").BaseLayerObjectEventTypes|
 *   import("./Layer").LayerEventType|'change:preload'|'change:useInterimTilesOnError'|import("../render/EventType").LayerRenderEventTypes, Return>} BaseTileLayerOnSignature
 */

/**
 * @template {import("../source/Tile").default} TileSourceType
 * @typedef {Object} Options
 * @property {string} [className='ol-layer'] A CSS class name to set to the layer element.
 * @property {number} [opacity=1] Opacity (0, 1).
 * @property {boolean} [visible=true] Visibility.
 * @property {Extent} [extent] The bounding extent for layer rendering.  The layer will not be
 * rendered outside of this extent.
 * @property {number} [zIndex] The z-index for layer rendering.  At rendering time, the layers
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
 * @property {number} [preload=0] Preload. Load low-resolution tiles up to `preload` levels. `0`
 * means no preloading.
 * @property {TileSourceType} [source] Source for this layer.
 * @property {import("../Map").default} [map] Sets the layer as overlay on a map. The map will not manage
 * this layer in its layers collection, and the layer will be rendered on top. This is useful for
 * temporary layers. The standard way to add a layer to a map and have it managed by the map is to
 * use {@link import("../Map").default#addLayer map.addLayer()}.
 * @property {boolean} [useInterimTilesOnError=true] Use interim tiles on error.
 * @property {Record<string, *>} [properties] Arbitrary observable properties. Can be accessed with `#get()` and `#set()`.
 */

/**
 * For layer sources that provide pre-rendered, tiled images in grids that are
 * organized by zoom levels for specific resolutions.
 * Note that any property set in the options is set as a {@link module:ol/Object~BaseObject}
 * property on the layer object; for example, setting `title: 'My Title'` in the
 * options means that `title` is observable, and has get/set accessors.
 *
 * @template {import("../source/Tile").default} TileSourceType
 * @template {import("../renderer/Layer").default} RendererType
 * @extends {Layer<TileSourceType, RendererType>}
 * @api
 */
export class BaseTileLayer extends Layer {

    /**
     * 
     */
    override on: BaseTileLayerOnSignature<EventsKey>;

    /**
     * 
     */
    override once: BaseTileLayerOnSignature<EventsKey>;

    /**
     * 
     */
    override un: BaseTileLayerOnSignature<void>;

    /**
     * @param {Options<TileSourceType>} [options] Tile layer options.
     */
    constructor(options: Options<TileSourceType>) {
        options = options ? options : {};

        const baseOptions = Object.assign({}, options);

        delete baseOptions.preload;
        delete baseOptions.useInterimTilesOnError;
        super(baseOptions);
        this.on = this.onInternal as BaseTileLayerOnSignature<EventsKey>;
        this.once = this.onceInternal as BaseTileLayerOnSignature<EventsKey>;
        this.un = this.unInternal as BaseTileLayerOnSignature<void>;

        this.setPreload(options.preload !== undefined ? options.preload : 0);
        this.setUseInterimTilesOnError(
            options.useInterimTilesOnError !== undefined
                ? options.useInterimTilesOnError
                : true,
        );
    }

    /**
     * Return the level as number to which we will preload tiles up to.
     * @return {number} The level to preload tiles up to.
     * @observable
     * @api
     */
    getPreload(): number {
        return /** @type {number} */ (this.get(TileProperty.PRELOAD));
    }

    /**
     * Set the level as number to which we will preload tiles up to.
     * @param {number} preload The level to preload tiles up to.
     * @observable
     * @api
     */
    setPreload(preload: number) {
        this.set(TileProperty.PRELOAD, preload);
    }

    /**
     * Whether we use interim tiles on error.
     * @return {boolean} Use interim tiles on error.
     * @observable
     * @api
     */
    getUseInterimTilesOnError(): boolean {
        return /** @type {boolean} */ (
            this.get(TileProperty.USE_INTERIM_TILES_ON_ERROR)
        );
    }

    /**
     * Set whether we use interim tiles on error.
     * @param {boolean} useInterimTilesOnError Use interim tiles on error.
     * @observable
     * @api
     */
    setUseInterimTilesOnError(useInterimTilesOnError: boolean) {
        this.set(TileProperty.USE_INTERIM_TILES_ON_ERROR, useInterimTilesOnError);
    }

    /**
     * Get data for a pixel location.  The return type depends on the source data.  For image tiles,
     * a four element RGBA array will be returned.  For data tiles, the array length will match the
     * number of bands in the dataset.  For requests outside the layer extent, `null` will be returned.
     * Data for a image tiles can only be retrieved if the source's `crossOrigin` property is set.
     *
     * ```js
     * // display layer data on every pointer move
     * map.on('pointermove', (event) => {
     *   console.log(layer.getData(event.pixel));
     * });
     * ```
     * @param {import("../pixel").Pixel} pixel Pixel.
     * @return {Uint8ClampedArray|Uint8Array|Float32Array|DataView|null} Pixel data.
     * @api
     */
    getData(pixel: import("../pixel").Pixel): Uint8ClampedArray | Uint8Array | Float32Array | DataView | null {
        return super.getData(pixel);
    }
}

export default BaseTileLayer;
