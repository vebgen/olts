

import TileImage from './TileImage';
import {createEmpty} from '@olts/core/extent';
import {getRequestUrl} from './arcgisRest';
import {modulo} from '@olts/core/math';
import {scale as scaleSize, toSize} from '../size';
import {hash as tileCoordHash} from '../tile-coord';

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property [cacheSize] Initial tile cache size. Will auto-grow to hold at least the number of tiles in the viewport.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * linear interpolation is used when resampling.  Set to false to use the nearest neighbor instead.
 * @property {Record<string,*>} [params] ArcGIS Rest parameters. This field is optional. Service defaults will be
 * used for any fields not specified. `FORMAT` is `PNG32` by default. `F` is `IMAGE` by
 * default. `TRANSPARENT` is `true` by default.  `BBOX`, `SIZE`, `BBOXSR`,
 * and `IMAGESR` will be set dynamically. Set `LAYERS` to
 * override the default service layer visibility. See
 * https://developers.arcgis.com/rest/services-reference/export-map.htm
 * for further reference.
 * @property {boolean} [hidpi=true] Use the `ol/Map#pixelRatio` value when requesting
 * the image from the remote server.
 * @property {import("../tilegrid/TileGrid").default} [tileGrid] Tile grid. Base this on the resolutions,
 * tilesize and extent supported by the server.
 * If this is not defined, a default grid will be used: if there is a projection
 * extent, the grid will be based on that; if not, a grid based on a global
 * extent with origin at 0,0 will be used.
 * @property {ProjectionLike} [projection] Projection. Default is the view projection.
 * The projection code must contain a numeric end portion separated by :
 * or the entire code must form a valid ArcGIS SpatialReference definition.
 * @property [reprojectionErrorThreshold=0.5] Maximum allowed reprojection error (in pixels).
 * Higher values can increase reprojection performance, but decrease precision.
 * @property {import("../Tile").LoadFunction} [tileLoadFunction] Optional function to load a tile given a URL.
 * The default is
 * ```js
 * function(imageTile, src) {
 *   imageTile.getImage().src = src;
 * };
 * ```
 * @property [url] ArcGIS Rest service URL for a Map Service or Image Service. The
 * url should include /MapServer or /ImageServer.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * @property [transition] Duration of the opacity transition for rendering.  To disable the opacity
 * transition, pass `transition: 0`.
 * @property {string[]} [urls] ArcGIS Rest service urls. Use this instead of `url` when the ArcGIS
 * Service supports multiple urls for export requests.
 * @property {number|import("../array").NearestDirectionFunction} [zDirection=0]
 * Choose whether to use tiles with a higher or lower zoom level when between integer
 * zoom levels. See {@link module:ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
 */

/**
 * Layer source for tile data from ArcGIS Rest services. Map and Image
 * Services are supported.
 *
 * For cached ArcGIS services, better performance is available using the
 * {@link module:ol/source/XYZ~XYZ} data source.
 * @api
 */
export class TileArcGISRest extends TileImage {
  /**
   * @param {Options} [options] Tile ArcGIS Rest options.
   */
  constructor(options) {
    options = options ? options : {};

    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize,
      crossOrigin: options.crossOrigin,
      interpolate: options.interpolate,
      projection: options.projection,
      reprojectionErrorThreshold: options.reprojectionErrorThreshold,
      tileGrid: options.tileGrid,
      tileLoadFunction: options.tileLoadFunction,
      url: options.url,
      urls: options.urls,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
      transition: options.transition,
      zDirection: options.zDirection,
    });

    /**
     * @private
     * @type {!Object}
     */
    this.params_ = Object.assign({}, options.params);

    /**
     * @private
     * @type {boolean}
     */
    this.hidpi_ = options.hidpi !== undefined ? options.hidpi : true;

    /**
     * @private
     * @type {Extent}
     */
    this.tmpExtent_ = createEmpty();

    this.setKey(this.getKeyForParams_());
  }

  /**
   * @private
   * @return The key for the current params.
   */
  getKeyForParams_() {
    let i = 0;
    const res = [];
    for (const key in this.params_) {
      res[i++] = key + '-' + this.params_[key];
    }
    return res.join('/');
  }

  /**
   * Get the user-provided params, i.e. those passed to the constructor through
   * the "params" option, and possibly updated using the updateParams method.
   * @return {Object} Params.
   * @api
   */
  getParams() {
    return this.params_;
  }

  /**
   * @param {TileCoord} tileCoord Tile coordinate.
   * @param {Size} tileSize Tile size.
   * @param {Extent} tileExtent Tile extent.
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @param {Object} params Params.
   * @return {string|undefined} Request URL.
   * @private
   */
  getRequestUrl_(
    tileCoord,
    tileSize,
    tileExtent,
    pixelRatio,
    projection,
    params,
  ) {
    const urls = this.urls;
    if (!urls) {
      return undefined;
    }
    let url;
    if (urls.length == 1) {
      url = urls[0];
    } else {
      const index = modulo(tileCoordHash(tileCoord), urls.length);
      url = urls[index];
    }

    return getRequestUrl(
      url,
      tileExtent,
      (
        this.tileGrid || this.getTileGridForProjection(projection)
      ).getResolution(tileCoord[0]),
      pixelRatio,
      projection,
      params,
    );
  }

  /**
   * Get the tile pixel ratio for this source.
   * @param pixelRatio Pixel ratio.
   * @return Tile pixel ratio.
   */
  getTilePixelRatio(pixelRatio) {
    return this.hidpi_ ? pixelRatio : 1;
  }

  /**
   * Update the user-provided params.
   * @param {Object} params Params.
   * @api
   */
  updateParams(params) {
    Object.assign(this.params_, params);
    this.setKey(this.getKeyForParams_());
  }

  /**
   * @param {TileCoord} tileCoord The tile coordinate
   * @param pixelRatio The pixel ratio
   * @param {import("../proj/Projection").default} projection The projection
   * @return {string|undefined} The tile URL
   * @override
   */
  tileUrlFunction(tileCoord, pixelRatio, projection) {
    let tileGrid = this.getTileGrid();
    if (!tileGrid) {
      tileGrid = this.getTileGridForProjection(projection);
    }

    if (tileGrid.getResolutions().length <= tileCoord[0]) {
      return undefined;
    }

    if (pixelRatio != 1 && !this.hidpi_) {
      pixelRatio = 1;
    }

    const tileExtent = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent_);
    let tileSize = toSize(tileGrid.getTileSize(tileCoord[0]), this.tmpSize);

    if (pixelRatio != 1) {
      tileSize = scaleSize(tileSize, pixelRatio, this.tmpSize);
    }

    // Apply default params and override with user specified values.
    const baseParams = {
      'F': 'image',
      'FORMAT': 'PNG32',
      'TRANSPARENT': true,
    };
    Object.assign(baseParams, this.params_);

    return this.getRequestUrl_(
      tileCoord,
      tileSize,
      tileExtent,
      pixelRatio,
      projection,
      baseParams,
    );
  }
}

export default TileArcGISRest;
