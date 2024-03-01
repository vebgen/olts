
import DataTile from '../DataTile';
import type { EventType } from '@olts/events';
import ReprojDataTile from '../reproj/DataTile';
import TileCache from '../TileCache';
import TileEventType from './TileEventType';
import TileSource, {TileSourceEvent} from './Tile';
import type { TileState} from '../tile';
import {
  createXYZ,
  extentFromProjection,
  getForProjection as getTileGridForProjection,
} from '../tile-grid';
import {equivalent, get as getProjection} from '../proj';
import {getKeyZXY} from '../tile-coord';
import {getUid} from '@olts/core/util';
import {toPromise} from '@olts/core/functions';
import {toSize} from '../size';

/**
 * Data tile loading function.  The function is called with z, x, and y tile coordinates and
 * returns {@link import("../DataTile").Data data} for a tile or a promise for the same.
 * @typedef {function(number, number, number) : (import("../DataTile").Data|Promise<import("../DataTile").Data>)} Loader
 */

/**
 * @typedef {Object} Options
 * @property {Loader} [loader] Data loader.  Called with z, x, and y tile coordinates.
 * Returns {@link import("../DataTile").Data data} for a tile or a promise for the same.
 * For loaders that generate images, the promise should not resolve until the image is loaded.
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property {boolean} [attributionsCollapsible=true] Attributions are collapsible.
 * @property [maxZoom=42] Optional max zoom level. Not used if `tileGrid` is provided.
 * @property [minZoom=0] Optional min zoom level. Not used if `tileGrid` is provided.
 * @property {number|Size} [tileSize=[256, 256]] The pixel width and height of the source tiles.
 * This may be different than the rendered pixel size if a `tileGrid` is provided.
 * @property [gutter=0] The size in pixels of the gutter around data tiles to ignore.
 * This allows artifacts of rendering at tile edges to be ignored.
 * Supported data should be wider and taller than the tile size by a value of `2 x gutter`.
 * @property [maxResolution] Optional tile grid resolution at level zero. Not used if `tileGrid` is provided.
 * @property {ProjectionLike} [projection='EPSG:3857'] Tile projection.
 * @property {import("../tilegrid/TileGrid").default} [tileGrid] Tile grid.
 * @property {boolean} [opaque=false] Whether the layer is opaque.
 * @property {import("./Source").State} [state] The source state.
 * @property {boolean} [wrapX=false] Render tiles beyond the antimeridian.
 * @property [transition] Transition time when fading in new tiles (in milliseconds).
 * @property [bandCount=4] Number of bands represented in the data.
 * @property {boolean} [interpolate=false] Use interpolated values when resampling.  By default,
 * the nearest neighbor is used when resampling.
 */

/**
 * A source for typed array data tiles.
 *
 * @fires import("./Tile").TileSourceEvent
 * @api
 */
export class DataTileSource extends TileSource {
  /**
   * @param {Options} options DataTile source options.
   */
  constructor(options) {
    const projection =
      options.projection === undefined ? 'EPSG:3857' : options.projection;

    let tileGrid = options.tileGrid;
    if (tileGrid === undefined && projection) {
      tileGrid = createXYZ({
        extent: extentFromProjection(projection),
        maxResolution: options.maxResolution,
        maxZoom: options.maxZoom,
        minZoom: options.minZoom,
        tileSize: options.tileSize,
      });
    }

    super({
      cacheSize: 0.1, // don't cache on the source
      attributions: options.attributions,
      attributionsCollapsible: options.attributionsCollapsible,
      projection: projection,
      tileGrid: tileGrid,
      opaque: options.opaque,
      state: options.state,
      wrapX: options.wrapX,
      transition: options.transition,
      interpolate: options.interpolate,
    });

    /**
     * @private
     * @type {number}
     */
    this.gutter_ = options.gutter !== undefined ? options.gutter : 0;

    /**
     * @private
     * @type {Size|null}
     */
    this.tileSize_ = options.tileSize ? toSize(options.tileSize) : null;

    /**
     * @private
     * @type {Size[]|null}
     */
    this.tileSizes_ = null;

    /**
     * @private
     * @type {!Record<string, boolean>}
     */
    this.tileLoadingKeys_ = {};

    /**
     * @private
     */
    this.loader_ = options.loader;

    this.handleTileChange_ = this.handleTileChange_.bind(this);

    /**
     * @type {number}
     */
    this.bandCount = options.bandCount === undefined ? 4 : options.bandCount; // assume RGBA if undefined

    /**
     * @private
     * @type {!Record<string, import("../tilegrid/TileGrid").default>}
     */
    this.tileGridForProjection_ = {};

    /**
     * @private
     * @type {!Record<string, import("../TileCache").default>}
     */
    this.tileCacheForProjection_ = {};
  }

  /**
   * Set the source tile sizes.  The length of the array is expected to match the number of
   * levels in the tile grid.
   * @protected
   * @param {Size[]} tileSizes An array of tile sizes.
   */
  setTileSizes(tileSizes) {
    this.tileSizes_ = tileSizes;
  }

  /**
   * Get the source tile size at the given zoom level.  This may be different than the rendered tile
   * size.
   * @protected
   * @param z Tile zoom level.
   * @return {Size} The source tile size.
   */
  getTileSize(z) {
    if (this.tileSizes_) {
      return this.tileSizes_[z];
    }
    if (this.tileSize_) {
      return this.tileSize_;
    }
    const tileGrid = this.getTileGrid();
    return tileGrid ? toSize(tileGrid.getTileSize(z)) : [256, 256];
  }

  /**
   * @param {import("../proj/Projection").default} projection Projection.
   * @return Gutter.
   */
  getGutterForProjection(projection) {
    const thisProj = this.getProjection();
    if (!thisProj || equivalent(thisProj, projection)) {
      return this.gutter_;
    }

    return 0;
  }

  /**
   * @param {Loader} loader The data loader.
   * @protected
   */
  setLoader(loader) {
    this.loader_ = loader;
  }

  /**
   * @param z Tile coordinate z.
   * @param x Tile coordinate x.
   * @param y Tile coordinate y.
   * @param {import("../proj/Projection").default} targetProj The output projection.
   * @param {import("../proj/Projection").default} sourceProj The input projection.
   * @return {!DataTile} Tile.
   */
  getReprojTile_(z, x, y, targetProj, sourceProj) {
    const cache = this.getTileCacheForProjection(targetProj);
    const tileCoordKey = getKeyZXY(z, x, y);
    if (cache.containsKey(tileCoordKey)) {
      const tile = cache.get(tileCoordKey);
      if (tile && tile.key == this.getKey()) {
        return tile;
      }
    }

    const tileGrid = this.getTileGrid();
    const reprojTilePixelRatio = Math.max.apply(
      null,
      tileGrid.getResolutions().map((r, z) => {
        const tileSize = toSize(tileGrid.getTileSize(z));
        const textureSize = this.getTileSize(z);
        return Math.max(
          textureSize[0] / tileSize[0],
          textureSize[1] / tileSize[1],
        );
      }),
    );

    const sourceTileGrid = this.getTileGridForProjection(sourceProj);
    const targetTileGrid = this.getTileGridForProjection(targetProj);
    const tileCoord = [z, x, y];
    const wrappedTileCoord = this.getTileCoordForTileUrlFunction(
      tileCoord,
      targetProj,
    );

    const options = Object.assign(
      {
        sourceProj,
        sourceTileGrid,
        targetProj,
        targetTileGrid,
        tileCoord,
        wrappedTileCoord,
        pixelRatio: reprojTilePixelRatio,
        gutter: this.getGutterForProjection(sourceProj),
        getTileFunction: (z, x, y, pixelRatio) =>
          this.getTile(z, x, y, pixelRatio, sourceProj),
      },
      this.tileOptions,
    );
    const newTile = new ReprojDataTile(options);
    newTile.key = this.getKey();
    return newTile;
  }

  /**
   * @param z Tile coordinate z.
   * @param x Tile coordinate x.
   * @param y Tile coordinate y.
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {!DataTile} Tile.
   */
  getTile(z, x, y, pixelRatio, projection) {
    const sourceProjection = this.getProjection();
    if (
      sourceProjection &&
      projection &&
      !equivalent(sourceProjection, projection)
    ) {
      return this.getReprojTile_(z, x, y, projection, sourceProjection);
    }

    const size = this.getTileSize(z);
    const tileCoordKey = getKeyZXY(z, x, y);
    if (this.tileCache.containsKey(tileCoordKey)) {
      return this.tileCache.get(tileCoordKey);
    }

    const sourceLoader = this.loader_;

    function loader() {
      return toPromise(function () {
        return sourceLoader(z, x, y);
      });
    }

    const options = Object.assign(
      {
        tileCoord: [z, x, y],
        loader: loader,
        size: size,
      },
      this.tileOptions,
    );

    const tile = new DataTile(options);
    tile.key = this.getKey();
    tile.addEventListener(EventTypes.CHANGE, this.handleTileChange_);

    this.tileCache.set(tileCoordKey, tile);
    return tile;
  }

  /**
   * Handle tile change events.
   * @param {import("../events/Event").default} event Event.
   */
  handleTileChange_(event) {
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
    if (type) {
      this.dispatchEvent(new TileSourceEvent(type, tile));
    }
  }

  /**
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {!import("../tilegrid/TileGrid").default} Tile grid.
   */
  getTileGridForProjection(projection) {
    const thisProj = this.getProjection();
    if (this.tileGrid && (!thisProj || equivalent(thisProj, projection))) {
      return this.tileGrid;
    }

    const projKey = getUid(projection);
    if (!(projKey in this.tileGridForProjection_)) {
      this.tileGridForProjection_[projKey] =
        getTileGridForProjection(projection);
    }
    return this.tileGridForProjection_[projKey];
  }

  /**
   * Sets the tile grid to use when reprojecting the tiles to the given
   * projection instead of the default tile grid for the projection.
   *
   * This can be useful when the default tile grid cannot be created
   * (e.g. projection has no extent defined) or
   * for optimization reasons (custom tile size, resolutions, ...).
   *
   * @param {ProjectionLike} projection Projection.
   * @param {import("../tilegrid/TileGrid").default} tilegrid Tile grid to use for the projection.
   * @api
   */
  setTileGridForProjection(projection, tilegrid) {
    const proj = getProjection(projection);
    if (proj) {
      const projKey = getUid(proj);
      if (!(projKey in this.tileGridForProjection_)) {
        this.tileGridForProjection_[projKey] = tilegrid;
      }
    }
  }

  /**
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {import("../TileCache").default} Tile cache.
   */
  getTileCacheForProjection(projection) {
    const thisProj = this.getProjection();
    if (!thisProj || equivalent(thisProj, projection)) {
      return this.tileCache;
    }

    const projKey = getUid(projection);
    if (!(projKey in this.tileCacheForProjection_)) {
      this.tileCacheForProjection_[projKey] = new TileCache(0.1); // don't cache
    }
    return this.tileCacheForProjection_[projKey];
  }

  /**
   * @param {import("../proj/Projection").default} projection Projection.
   * @param {!Record<string, boolean>} usedTiles Used tiles.
   */
  expireCache(projection, usedTiles) {
    const usedTileCache = this.getTileCacheForProjection(projection);

    this.tileCache.expireCache(
      this.tileCache == usedTileCache ? usedTiles : {},
    );
    for (const id in this.tileCacheForProjection_) {
      const tileCache = this.tileCacheForProjection_[id];
      tileCache.expireCache(tileCache == usedTileCache ? usedTiles : {});
    }
  }

  clear() {
    super.clear();
    for (const id in this.tileCacheForProjection_) {
      this.tileCacheForProjection_[id].clear();
    }
  }
}

export default DataTileSource;
