
import Layer from './Layer';
import WebGLPointsLayerRenderer from '../renderer/webgl/PointsLayer';
import {parseLiteralStyle} from '../webgl/styleparser';

/**
 * @template {import("../source/Vector").default} VectorSourceType
 * @typedef {Object} Options
 * @property {import('../style/webgl').WebGLStyle} style Literal style to apply to the layer features.
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
 * @property {VectorSourceType} [source] Point source.
 * @property {boolean} [disableHitDetection=false] Setting this to true will provide a slight performance boost, but will
 * prevent all hit detection on the layer.
 * @property {Record<string, *>} [properties] Arbitrary observable properties. Can be accessed with `#get()` and `#set()`.
 */

/**
 * Layer optimized for rendering large point datasets. Takes a `style` property which
 * is a serializable JSON object describing how the layer should be rendered.
 *
 * Here are a few samples of literal style objects:
 * ```js
 * const style = {
 *   'circle-radius': 8,
 *   'circle-fill-color': '#33AAFF',
 *   'circle-opacity': 0.9
 * }
 * ```
 *
 * ```js
 * const style = {
 *   'icon-src': '../static/exclamation-mark.png',
 *   'icon-offset': [0, 12],
 *   'icon-width': 4,
 *   'icon-height': 8
 * }
 * ```
 *
 * **Important: a `WebGLPoints` layer must be manually disposed when removed, otherwise the underlying WebGL context
 * will not be garbage collected.**
 *
 * Note that any property set in the options is set as a {@link module:ol/Object~BaseObject}
 * property on the layer object; for example, setting `title: 'My Title'` in the
 * options means that `title` is observable, and has get/set accessors.
 *
 * @template {import("../source/Vector").default} VectorSourceType
 * @extends {Layer<VectorSourceType, WebGLPointsLayerRenderer>}
 * @fires import("../render/Event").RenderEvent
 */
export class WebGLPointsLayer extends Layer {
  /**
   * @param {Options<VectorSourceType>} options Options.
   */
  constructor(options) {
    const baseOptions = Object.assign({}, options);

    super(baseOptions);

    /**
     * @private
     * @type {import('../webgl/styleparser').StyleParseResult}
     */
    this.parseResult_ = parseLiteralStyle(options.style);

    /**
     * @type {Record<string, (string|number|number[]|boolean)>}
     * @private
     */
    this.styleVariables_ = options.style.variables || {};

    /**
     * @private
     * @type {boolean}
     */
    this.hitDetectionDisabled_ = !!options.disableHitDetection;
  }

  createRenderer() {
    const attributes = Object.keys(this.parseResult_.attributes).map(
      (name) => ({
        name,
        ...this.parseResult_.attributes[name],
      }),
    );
    return new WebGLPointsLayerRenderer(this, {
      vertexShader: this.parseResult_.builder.getSymbolVertexShader(),
      fragmentShader: this.parseResult_.builder.getSymbolFragmentShader(),
      hitDetectionEnabled: !this.hitDetectionDisabled_,
      uniforms: this.parseResult_.uniforms,
      attributes:
        /** @type {Array<import('../renderer/webgl/PointsLayer').CustomAttribute>} */ (
          attributes
        ),
    });
  }

  /**
   * Update any variables used by the layer style and trigger a re-render.
   * @param {Record<string, number>} variables Variables to update.
   */
  updateStyleVariables(variables) {
    Object.assign(this.styleVariables_, variables);
    this.changed();
  }
}

export default WebGLPointsLayer;
