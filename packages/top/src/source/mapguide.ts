

import {appendParams} from '../uri';
import {decode} from '../Image';
import {getCenter, getHeight, getWidth} from '@olts/core/extent';
import {getRequestExtent} from './Image';

/**
 * @typedef {Object} LoaderOptions
 * @property [url] The mapagent url.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property [displayDpi=96] The display resolution.
 * @property [metersPerUnit=1] The meters-per-unit value.
 * @property {boolean} [hidpi=true] Use the `ol/Map#pixelRatio` value when requesting
 * the image from the remote server.
 * @property {boolean} [useOverlay] If `true`, will use `GETDYNAMICMAPOVERLAYIMAGE`.
 * @property [ratio=1] Ratio. `1` means image requests are the size of the map viewport, `2` means
 * twice the width and height of the map viewport, and so on. Must be `1` or higher.
 * @property {Object} [params] Additional query parameters.
 * @property {function(HTMLImageElement, string): Promise<import('../DataTile').ImageLike>} [load] Function
 * to perform loading of the image. Receives the created `HTMLImageElement` and the desired `src` as argument and
 * returns a promise resolving to the loaded or decoded image. Default is {@link module:ol/Image.decode}.
 */

/**
 * @param {Extent} extent The map extents.
 * @param {Size} size The viewport size.
 * @param metersPerUnit The meters-per-unit value.
 * @param dpi The display resolution.
 * @return The computed map scale.
 */
function getScale(extent, size, metersPerUnit, dpi) {
  const mcsW = getWidth(extent);
  const mcsH = getHeight(extent);
  const devW = size[0];
  const devH = size[1];
  const mpp = 0.0254 / dpi;
  if (devH * mcsW > devW * mcsH) {
    return (mcsW * metersPerUnit) / (devW * mpp); // width limited
  }
  return (mcsH * metersPerUnit) / (devH * mpp); // height limited
}

/**
 * @param baseUrl The mapagent url.
 * @param {Record<string, string|number>} params Request parameters.
 * @param {Extent} extent Extent.
 * @param {Size} size Size.
 * @param {boolean} useOverlay If `true`, will use `GETDYNAMICMAPOVERLAYIMAGE`.
 * @param metersPerUnit The meters-per-unit value.
 * @param displayDpi The display resolution.
 * @return The mapagent map image request URL.
 */
function getUrl(
  baseUrl,
  params,
  extent,
  size,
  useOverlay,
  metersPerUnit,
  displayDpi,
) {
  const scale = getScale(extent, size, metersPerUnit, displayDpi);
  const center = getCenter(extent);
  const baseParams = {
    'OPERATION': useOverlay ? 'GETDYNAMICMAPOVERLAYIMAGE' : 'GETMAPIMAGE',
    'VERSION': '2.0.0',
    'LOCALE': 'en',
    'CLIENTAGENT': 'ol/source/ImageMapGuide source',
    'CLIP': '1',
    'SETDISPLAYDPI': displayDpi,
    'SETDISPLAYWIDTH': Math.round(size[0]),
    'SETDISPLAYHEIGHT': Math.round(size[1]),
    'SETVIEWSCALE': scale,
    'SETVIEWCENTERX': center[0],
    'SETVIEWCENTERY': center[1],
  };
  Object.assign(baseParams, params);
  return appendParams(baseUrl, baseParams);
}

/**
 * Creates a loader for MapGuide images.
 * @param {LoaderOptions} options Image ArcGIS Rest Options.
 * @return {import('../Image').ImageObjectPromiseLoader} ArcGIS Rest image.
 * @api
 */
export function createLoader(options) {
  const load = options.load || decode;

  /** @type {import('../Image').ImageObjectPromiseLoader} */
  return function (extent, resolution, pixelRatio) {
    const image = new Image();
    if (options.crossOrigin !== null) {
      image.crossOrigin = options.crossOrigin;
    }
    extent = getRequestExtent(extent, resolution, pixelRatio, options.ratio);
    const width = getWidth(extent) / resolution;
    const height = getHeight(extent) / resolution;
    const size = [width * pixelRatio, height * pixelRatio];
    const src = getUrl(
      options.url,
      options.params,
      extent,
      size,
      options.useOverlay,
      options.metersPerUnit || 1,
      options.displayDpi || 96,
    );
    return load(image, src).then((image) => ({image, extent, pixelRatio}));
  };
}
