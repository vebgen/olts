
// FIXME check order of async callbacks

/**
 * See https://mapbox.com/developers/api/.
 */

import TileImage from './TileImage';
import {applyTransform, intersects} from '@olts/core/extent';
import {createFromTemplates} from '../tile-url-function';
import {createXYZ, extentFromProjection} from '../tile-grid';
import {get as getProjection, getTransformFromProjections} from '../proj';
import {jsonp as requestJSONP} from '../net';

/**
 * @typedef {Object} Config
 * @property [name] The name.
 * @property [description] The description.
 * @property [version] The version.
 * @property [attribution] The attribution.
 * @property [template] The template.
 * @property [legend] The legend.
 * @property [scheme] The scheme.
 * @property {string[]} tiles The tile URL templates.
 * @property {string[]} [grids] Optional grids.
 * @property [minzoom] Minimum zoom level.
 * @property [maxzoom] Maximum zoom level.
 * @property {number[]} [bounds] Optional bounds.
 * @property {number[]} [center] Optional center.
 */

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property [cacheSize] Initial tile cache size. Will auto-grow to hold at least the number of tiles in the viewport.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * linear interpolation is used when resampling.  Set to false to use the nearest neighbor instead.
 * @property {boolean} [jsonp=false] Use JSONP with callback to load the TileJSON.
 * Useful when the server does not support CORS..
 * @property [reprojectionErrorThreshold=0.5] Maximum allowed reprojection error (in pixels).
 * Higher values can increase reprojection performance, but decrease precision.
 * @property {Config} [tileJSON] TileJSON configuration for this source.
 * If not provided, `url` must be configured.
 * @property {import("../Tile").LoadFunction} [tileLoadFunction] Optional function to load a tile given a URL. The default is
 * ```js
 * function(imageTile, src) {
 *   imageTile.getImage().src = src;
 * };
 * ```
 * @property {number|Size} [tileSize=[256, 256]] The tile size used by the tile service.
 * Note: `tileSize` and other non-standard TileJSON properties are currently ignored.
 * @property [url] URL to the TileJSON file. If not provided, `tileJSON` must be configured.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * @property [transition] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 * @property {number|import("../array").NearestDirectionFunction} [zDirection=0]
 * Choose whether to use tiles with a higher or lower zoom level when between integer
 * zoom levels. See {@link module:ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
 */

/**
 * Layer source for tile data in TileJSON format.
 * @api
 */
export class TileJSON extends TileImage {
  /**
   * @param {Options} options TileJSON options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize,
      crossOrigin: options.crossOrigin,
      interpolate: options.interpolate,
      projection: getProjection('EPSG:3857'),
      reprojectionErrorThreshold: options.reprojectionErrorThreshold,
      state: 'loading',
      tileLoadFunction: options.tileLoadFunction,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
      transition: options.transition,
      zDirection: options.zDirection,
    });

    /**
     * @type {Config}
     * @private
     */
    this.tileJSON_ = null;

    /**
     * @type {number|Size}
     * @private
     */
    this.tileSize_ = options.tileSize;

    if (options.url) {
      if (options.jsonp) {
        requestJSONP(
          options.url,
          this.handleTileJSONResponse.bind(this),
          this.handleTileJSONError.bind(this),
        );
      } else {
        const client = new XMLHttpRequest();
        client.addEventListener('load', this.onXHRLoad_.bind(this));
        client.addEventListener('error', this.onXHRError_.bind(this));
        client.open('GET', options.url);
        client.send();
      }
    } else if (options.tileJSON) {
      this.handleTileJSONResponse(options.tileJSON);
    } else {
      throw new Error('Either `url` or `tileJSON` options must be provided');
    }
  }

  /**
   * @private
   * @param {Event} event The load event.
   */
  onXHRLoad_(event) {
    const client = /** @type {XMLHttpRequest} */ (event.target);
    // status will be 0 for file:// urls
    if (!client.status || (client.status >= 200 && client.status < 300)) {
      let response;
      try {
        response = /** @type {Config} */ (JSON.parse(client.responseText));
      } catch (err) {
        this.handleTileJSONError();
        return;
      }
      this.handleTileJSONResponse(response);
    } else {
      this.handleTileJSONError();
    }
  }

  /**
   * @private
   * @param {Event} event The error event.
   */
  onXHRError_(event) {
    this.handleTileJSONError();
  }

  /**
   * @return {Config} The tilejson object.
   * @api
   */
  getTileJSON() {
    return this.tileJSON_;
  }

  /**
   * @protected
   * @param {Config} tileJSON Tile JSON.
   */
  handleTileJSONResponse(tileJSON) {
    const epsg4326Projection = getProjection('EPSG:4326');

    const sourceProjection = this.getProjection();
    let extent;
    if (tileJSON['bounds'] !== undefined) {
      const transform = getTransformFromProjections(
        epsg4326Projection,
        sourceProjection,
      );
      extent = applyTransform(tileJSON['bounds'], transform);
    }

    const gridExtent = extentFromProjection(sourceProjection);
    const minZoom = tileJSON['minzoom'] || 0;
    const maxZoom = tileJSON['maxzoom'] || 22;
    const tileGrid = createXYZ({
      extent: gridExtent,
      maxZoom: maxZoom,
      minZoom: minZoom,
      tileSize: this.tileSize_,
    });
    this.tileGrid = tileGrid;

    this.tileUrlFunction = createFromTemplates(tileJSON['tiles'], tileGrid);

    if (tileJSON['attribution'] && !this.getAttributions()) {
      const attributionExtent = extent !== undefined ? extent : gridExtent;
      this.setAttributions(function (frameState) {
        if (intersects(attributionExtent, frameState.extent)) {
          return [tileJSON['attribution']];
        }
        return null;
      });
    }
    this.tileJSON_ = tileJSON;
    this.setState('ready');
  }

  /**
   * @protected
   */
  handleTileJSONError() {
    this.setState('error');
  }
}

export default TileJSON;
