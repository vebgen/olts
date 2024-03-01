

import ImageCanvas from '../ImageCanvas';
import ImageSource from './Image';
import {
  containsExtent,
  getHeight,
  getWidth,
  scaleFromCenter,
} from '@olts/core/extent';

/**
 * A function returning the canvas element (`{HTMLCanvasElement}`)
 * used by the source as an image. The arguments passed to the function are:
 * {@link module:ol/extent~Extent} the image extent, `{number}` the image resolution,
 * `{number}` the pixel ratio of the map, {@link module:ol/size~Size} the image size,
 * and {@link Projection} the image projection. The canvas returned by
 * this function is cached by the source. The this keyword inside the function
 * references the {@link module:ol/source/ImageCanvas~ImageCanvasSource}.
 *
 * @typedef {function(this:import("../ImageCanvas").default, Extent, number,
 *     number, Size, import("../proj/Projection").default): HTMLCanvasElement} FunctionType
 */

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property {FunctionType} [canvasFunction] Canvas function.
 * The function returning the canvas element used by the source
 * as an image. The arguments passed to the function are: {@link Extent} the
 * image extent, `{number}` the image resolution, `{number}` the pixel ratio of the map,
 * {@link Size} the image size, and {@link import("../proj/Projection").default} the image
 * projection. The canvas returned by this function is cached by the source. If
 * the value returned by the function is later changed then
 * `changed` should be called on the source for the source to
 * invalidate the current cached image. See: {@link module:ol/Observable~Observable#changed}
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * linear interpolation is used when resampling.  Set to false to use the nearest neighbor instead.
 * @property {ProjectionLike} [projection] Projection. Default is the view projection.
 * @property [ratio=1.5] Ratio. 1 means canvases are the size of the map viewport, 2 means twice the
 * width and height of the map viewport, and so on. Must be `1` or higher.
 * @property {number[]} [resolutions] Resolutions.
 * If specified, new canvases will be created for these resolutions
 * @property {import("./Source").State} [state] Source state.
 */

/**
 * Base class for image sources where a canvas element is the image.
 * @api
 */
export class ImageCanvasSource extends ImageSource {
  /**
   * @param {Options} [options] ImageCanvas options.
   */
  constructor(options) {
    options = options ? options : {};

    super({
      attributions: options.attributions,
      interpolate: options.interpolate,
      projection: options.projection,
      resolutions: options.resolutions,
      state: options.state,
    });

    /**
     * @private
     * @type {FunctionType}
     */
    this.canvasFunction_ = options.canvasFunction;

    /**
     * @private
     * @type {import("../ImageCanvas").default}
     */
    this.canvas_ = null;

    /**
     * @private
     * @type {number}
     */
    this.renderedRevision_ = 0;

    /**
     * @private
     * @type {number}
     */
    this.ratio_ = options.ratio !== undefined ? options.ratio : 1.5;
  }

  /**
   * @param {Extent} extent Extent.
   * @param resolution Resolution.
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {import("../ImageCanvas").default} Single image.
   */
  getImageInternal(extent, resolution, pixelRatio, projection) {
    resolution = this.findNearestResolution(resolution);

    let canvas = this.canvas_;
    if (
      canvas &&
      this.renderedRevision_ == this.getRevision() &&
      canvas.getResolution() == resolution &&
      canvas.getPixelRatio() == pixelRatio &&
      containsExtent(canvas.getExtent(), extent)
    ) {
      return canvas;
    }

    extent = extent.slice();
    scaleFromCenter(extent, this.ratio_);
    const width = getWidth(extent) / resolution;
    const height = getHeight(extent) / resolution;
    const size = [width * pixelRatio, height * pixelRatio];

    const canvasElement = this.canvasFunction_.call(
      this,
      extent,
      resolution,
      pixelRatio,
      size,
      projection,
    );
    if (canvasElement) {
      canvas = new ImageCanvas(extent, resolution, pixelRatio, canvasElement);
    }
    this.canvas_ = canvas;
    this.renderedRevision_ = this.getRevision();

    return canvas;
  }
}

export default ImageCanvasSource;
