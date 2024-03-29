import Layer from './Layer';

/**
 * @template {import("../source/Image").default} ImageSourceType
 * @typedef {Object} Options
 * @property [className='ol-layer'] A CSS class name to set to the layer element.
 * @property [opacity=1] Opacity (0, 1).
 * @property {boolean} [visible=true] Visibility.
 * @property {Extent} [extent] The bounding extent for layer rendering.  The layer will not be
 * rendered outside of this extent.
 * @property [zIndex] The z-index for layer rendering.  At rendering time, the layers
 * will be ordered, first by Z-index and then by position. When `undefined`, a `zIndex` of 0 is assumed
 * for layers that are added to the map's `layers` collection, or `Infinity` when the layer's `setMap()`
 * method was used.
 * @property [minResolution] The minimum resolution (inclusive) at which this layer will be
 * visible.
 * @property [maxResolution] The maximum resolution (exclusive) below which this layer will
 * be visible.
 * @property [minZoom] The minimum view zoom level (exclusive) above which this layer will be
 * visible.
 * @property [maxZoom] The maximum view zoom level (inclusive) at which this layer will
 * be visible.
 * @property {import("../Map").default} [map] Sets the layer as overlay on a map. The map will not manage
 * this layer in its layers collection, and the layer will be rendered on top. This is useful for
 * temporary layers. The standard way to add a layer to a map and have it managed by the map is to
 * use {@link import("../Map").default#addLayer map.addLayer()}.
 * @property {ImageSourceType} [source] Source for this layer.
 * @property {Record<string, *>} [properties] Arbitrary observable properties. Can be accessed with `#get()` and `#set()`.
 */

/**
 * Server-rendered images that are available for arbitrary extents and
 * resolutions.
 * Note that any property set in the options is set as a {@link module:ol/Object~BaseObject}
 * property on the layer object; for example, setting `title: 'My Title'` in the
 * options means that `title` is observable, and has get/set accessors.
 *
 * @template {import("../source/Image").default} ImageSourceType
 * @template {import("../renderer/Layer").default} RendererType
 * @extends {Layer<ImageSourceType, RendererType>}
 * @api
 */
export class BaseImageLayer extends Layer {
  /**
   * @param {Options<ImageSourceType>} [options] Layer options.
   */
  constructor(options) {
    options = options ? options : {};
    super(options);
  }
}

export default BaseImageLayer;
