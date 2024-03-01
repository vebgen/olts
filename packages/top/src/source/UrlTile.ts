
import TileEventType from './TileEventType';
import TileSource, {TileSourceEvent} from './Tile';
import type { TileState} from '../tile';
import {createFromTemplates, expandUrl} from '../tile-url-function';
import {getKeyZXY} from '../tile-coord';
import {getUid} from '@olts/core/util';

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property {boolean} [attributionsCollapsible=true] Attributions are collapsible.
 * @property [cacheSize] Cache size.
 * @property {boolean} [opaque=false] Whether the layer is opaque.
 * @property {ProjectionLike} [projection] Projection.
 * @property {import("./Source").State} [state] State.
 * @property {import("../tilegrid/TileGrid").default} [tileGrid] TileGrid.
 * @property {import("../Tile").LoadFunction} tileLoadFunction TileLoadFunction.
 * @property [tilePixelRatio] TilePixelRatio.
 * @property {import("../Tile").UrlFunction} [tileUrlFunction] TileUrlFunction.
 * @property [url] Url.
 * @property {string[]} [urls] Urls.
 * @property {boolean} [wrapX=true] WrapX.
 * @property [transition] Transition.
 * @property [key] Key.
 * @property {number|import("../array").NearestDirectionFunction} [zDirection=0] ZDirection.
 * @property {boolean} [interpolate=false] Use interpolated values when resampling.  By default,
 * the nearest neighbor is used when resampling.
 */

/**
 * Base class for sources providing tiles divided into a tile grid over http.
 *
 * @fires import("./Tile").TileSourceEvent
 */
export class UrlTile extends TileSource {
  /**
   * @param {Options} options Image tile options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize,
      opaque: options.opaque,
      projection: options.projection,
      state: options.state,
      tileGrid: options.tileGrid,
      tilePixelRatio: options.tilePixelRatio,
      wrapX: options.wrapX,
      transition: options.transition,
      interpolate: options.interpolate,
      key: options.key,
      attributionsCollapsible: options.attributionsCollapsible,
      zDirection: options.zDirection,
    });

    /**
     * @private
     * @type {boolean}
     */
    this.generateTileUrlFunction_ =
      this.tileUrlFunction === UrlTile.prototype.tileUrlFunction;

    /**
     * @protected
     * @type {import("../Tile").LoadFunction}
     */
    this.tileLoadFunction = options.tileLoadFunction;

    if (options.tileUrlFunction) {
      this.tileUrlFunction = options.tileUrlFunction;
    }

    /**
     * @protected
     * @type {!string[]|null}
     */
    this.urls = null;

    if (options.urls) {
      this.setUrls(options.urls);
    } else if (options.url) {
      this.setUrl(options.url);
    }

    /**
     * @private
     * @type {!Record<string, boolean>}
     */
    this.tileLoadingKeys_ = {};
  }

  /**
   * Return the tile load function of the source.
   * @return {import("../Tile").LoadFunction} TileLoadFunction
   * @api
   */
  getTileLoadFunction() {
    return this.tileLoadFunction;
  }

  /**
   * Return the tile URL function of the source.
   * @return {import("../Tile").UrlFunction} TileUrlFunction
   * @api
   */
  getTileUrlFunction() {
    return Object.getPrototypeOf(this).tileUrlFunction === this.tileUrlFunction
      ? this.tileUrlFunction.bind(this)
      : this.tileUrlFunction;
  }

  /**
   * Return the URLs used for this source.
   * When a tileUrlFunction is used instead of url or urls,
   * null will be returned.
   * @return {!string[]|null} URLs.
   * @api
   */
  getUrls() {
    return this.urls;
  }

  /**
   * Handle tile change events.
   * @param {import("../events/Event").default} event Event.
   * @protected
   */
  handleTileChange(event) {
    const tile = /** @type {import("../Tile").default} */ (event.target);
    const uid = getUid(tile);
    const tileState = tile.getState();
    let type;
    if (tileState == TileStates.LOADING) {
      this.tileLoadingKeys_[uid] = true;
      type = TileEventType.TILELOADSTART;
    } else if (uid in this.tileLoadingKeys_) {
      delete this.tileLoadingKeys_[uid];
      type =
        tileState == TileStates.ERROR
          ? TileEventType.TILELOADERROR
          : tileState == TileStates.LOADED
            ? TileEventType.TILELOADEND
            : undefined;
    }
    if (type != undefined) {
      this.dispatchEvent(new TileSourceEvent(type, tile));
    }
  }

  /**
   * Set the tile load function of the source.
   * @param {import("../Tile").LoadFunction} tileLoadFunction Tile load function.
   * @api
   */
  setTileLoadFunction(tileLoadFunction) {
    this.tileCache.clear();
    this.tileLoadFunction = tileLoadFunction;
    this.changed();
  }

  /**
   * Set the tile URL function of the source.
   * @param {import("../Tile").UrlFunction} tileUrlFunction Tile URL function.
   * @param [key] Optional new tile key for the source.
   * @api
   */
  setTileUrlFunction(tileUrlFunction, key) {
    this.tileUrlFunction = tileUrlFunction;
    this.tileCache.pruneExceptNewestZ();
    if (typeof key !== 'undefined') {
      this.setKey(key);
    } else {
      this.changed();
    }
  }

  /**
   * Set the URL to use for requests.
   * @param url URL.
   * @api
   */
  setUrl(url) {
    const urls = expandUrl(url);
    this.urls = urls;
    this.setUrls(urls);
  }

  /**
   * Set the URLs to use for requests.
   * @param {string[]} urls URLs.
   * @api
   */
  setUrls(urls) {
    this.urls = urls;
    const key = urls.join('\n');
    if (this.generateTileUrlFunction_) {
      this.setTileUrlFunction(createFromTemplates(urls, this.tileGrid), key);
    } else {
      this.setKey(key);
    }
  }

  /**
   * @param {TileCoord} tileCoord Tile coordinate.
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {string|undefined} Tile URL.
   */
  tileUrlFunction(tileCoord, pixelRatio, projection) {
    return undefined;
  }

  /**
   * Marks a tile coord as being used, without triggering a load.
   * @param z Tile coordinate z.
   * @param x Tile coordinate x.
   * @param y Tile coordinate y.
   */
  useTile(z, x, y) {
    const tileCoordKey = getKeyZXY(z, x, y);
    if (this.tileCache.containsKey(tileCoordKey)) {
      this.tileCache.get(tileCoordKey);
    }
  }
}

export default UrlTile;
