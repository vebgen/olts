

import type { EventType } from '@olts/events';
import Tile from '../VectorTile';
import TileCache from '../TileCache';
import TileGrid from '../tile-grid/TileGrid';
import type { TileState} from '../tile';
import UrlTile from './UrlTile';
import VectorRenderTile from '../VectorRenderTile';
import {DEFAULT_MAX_ZOOM} from '../tile-grid/common';
import {
  buffer as bufferExtent,
  getIntersection,
  intersects,
} from '@olts/core/extent';
import {createXYZ, extentFromProjection} from '../tile-grid';
import {fromKey, getCacheKeyForTileKey, getKeyZXY} from '../tile-coord';
import {isEmpty} from '../obj';
import {loadFeaturesXhr} from '../feature-loader';
import {toSize} from '../size';

/**
 * @template {import("../Feature").FeatureLike} FeatureType
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property {boolean} [attributionsCollapsible=true] Attributions are collapsible.
 * @property [cacheSize] Initial tile cache size. Will auto-grow to hold at least twice the number of tiles in the viewport.
 * @property {Extent} [extent] Extent.
 * @property {import("../format/Feature").default<import("../format/Feature").FeatureToFeatureClass<FeatureType>>} [format] Feature format for tiles. Used and required by the default.
 * @property {boolean} [overlaps=true] This source may have overlapping geometries. Setting this
 * to `false` (e.g. for sources with polygons that represent administrative
 * boundaries or TopoJSON sources) allows the renderer to optimise fill and
 * stroke operations.
 * @property {ProjectionLike} [projection='EPSG:3857'] Projection of the tile grid.
 * @property {import("./Source").State} [state] Source state.
 * @property {typeof import("../VectorTile").default} [tileClass] Class used to instantiate image tiles.
 * Default is {@link module:ol/VectorTile~VectorTile}.
 * @property [maxZoom=22] Optional max zoom level. Not used if `tileGrid` is provided.
 * @property [minZoom] Optional min zoom level. Not used if `tileGrid` is provided.
 * @property {number|Size} [tileSize=512] Optional tile size. Not used if `tileGrid` is provided.
 * @property [maxResolution] Optional tile grid resolution at level zero. Not used if `tileGrid` is provided.
 * @property {import("../tilegrid/TileGrid").default} [tileGrid] Tile grid.
 * @property {import("../Tile").LoadFunction} [tileLoadFunction]
 * Optional function to load a tile given a URL. Could look like this for pbf tiles:
 * ```js
 * function(tile, url) {
 *   tile.setLoader(function(extent, resolution, projection) {
 *     fetch(url).then(function(response) {
 *       response.arrayBuffer().then(function(data) {
 *         const format = tile.getFormat() // ol/format/MVT configured as source format
 *         const features = format.readFeatures(data, {
 *           extent: extent,
 *           featureProjection: projection
 *         });
 *         tile.setFeatures(features);
 *       });
 *     });
 *   });
 * }
 * ```
 * If you do not need extent, resolution and projection to get the features for a tile (e.g.
 * for GeoJSON tiles), your `tileLoadFunction` does not need a `setLoader()` call. Only make sure
 * to call `setFeatures()` on the tile:
 * ```js
 * const format = new GeoJSON({featureProjection: map.getView().getProjection()});
 * async function tileLoadFunction(tile, url) {
 *   const response = await fetch(url);
 *   const data = await response.json();
 *   tile.setFeatures(format.readFeatures(data));
 * }
 * ```
 * @property {import("../Tile").UrlFunction} [tileUrlFunction] Optional function to get tile URL given a tile coordinate and the projection.
 * @property [url] URL template. Must include `{x}`, `{y}` or `{-y}`, and `{z}` placeholders.
 * A `{?-?}` template pattern, for example `subdomain{a-f}.domain.com`, may be
 * used instead of defining each one separately in the `urls` option.
 * @property [transition] A duration for tile opacity
 * transitions in milliseconds. A duration of 0 disables the opacity transition.
 * @property {string[]} [urls] An array of URL templates.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * When set to `false`, only one world
 * will be rendered. When set to `true`, tiles will be wrapped horizontally to
 * render multiple worlds.
 * @property {number|import("../array").NearestDirectionFunction} [zDirection=1]
 * Choose whether to use tiles with a higher or lower zoom level when between integer
 * zoom levels. See {@link module:ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
 */

/**
 * Class for layer sources providing vector data divided into a tile grid, to be
 * used with {@link module:ol/layer/VectorTile~VectorTileLayer}. Although this source receives tiles
 * with vector features from the server, it is not meant for feature editing.
 * Features are optimized for rendering, their geometries are clipped at or near
 * tile boundaries and simplified for a view resolution. See
 * {@link module:ol/source/Vector~VectorSource} for vector sources that are suitable for feature
 * editing.
 *
 * @fires import("./Tile").TileSourceEvent
 * @api
 * @template {import("../Feature").FeatureLike} [FeatureType=import("../Feature").default]
 */
export class VectorTile extends UrlTile {
  /**
   * @param {!Options<FeatureType>} options Vector tile options.
   */
  constructor(options) {
    const projection = options.projection || 'EPSG:3857';

    const extent = options.extent || extentFromProjection(projection);

    const tileGrid =
      options.tileGrid ||
      createXYZ({
        extent: extent,
        maxResolution: options.maxResolution,
        maxZoom: options.maxZoom !== undefined ? options.maxZoom : 22,
        minZoom: options.minZoom,
        tileSize: options.tileSize || 512,
      });

    super({
      attributions: options.attributions,
      attributionsCollapsible: options.attributionsCollapsible,
      cacheSize: options.cacheSize,
      interpolate: true,
      opaque: false,
      projection: projection,
      state: options.state,
      tileGrid: tileGrid,
      tileLoadFunction: options.tileLoadFunction
        ? options.tileLoadFunction
        : defaultLoadFunction,
      tileUrlFunction: options.tileUrlFunction,
      url: options.url,
      urls: options.urls,
      wrapX: options.wrapX === undefined ? true : options.wrapX,
      transition: options.transition,
      zDirection: options.zDirection === undefined ? 1 : options.zDirection,
    });

    /**
     * @private
     * @type {import("../format/Feature").default<import("../format/Feature").FeatureToFeatureClass<FeatureType>>|null}
     */
    this.format_ = options.format ? options.format : null;

    /**
     * @private
     * @type {TileCache}
     */
    this.sourceTileCache = new TileCache(this.tileCache.highWaterMark);

    /**
     * @private
     * @type {boolean}
     */
    this.overlaps_ = options.overlaps == undefined ? true : options.overlaps;

    /**
     * @protected
     * @type {typeof import("../VectorTile").default}
     */
    this.tileClass = options.tileClass ? options.tileClass : Tile;

    /**
     * @private
     * @type {Record<string, import("../tilegrid/TileGrid").default>}
     */
    this.tileGrids_ = {};
  }

  /**
   * Get features whose bounding box intersects the provided extent. Only features for cached
   * tiles for the last rendered zoom level are available in the source. So this method is only
   * suitable for requesting tiles for extents that are currently rendered.
   *
   * Features are returned in random tile order and as they are included in the tiles. This means
   * they can be clipped, duplicated across tiles, and simplified to the render resolution.
   *
   * @param {Extent} extent Extent.
   * @return {Array<import("../Feature").FeatureLike>} Features.
   * @api
   */
  getFeaturesInExtent(extent) {
    const features = [];
    const tileCache = this.tileCache;
    if (tileCache.getCount() === 0) {
      return features;
    }
    const z = fromKey(tileCache.peekFirstKey())[0];
    const tileGrid = this.tileGrid;
    tileCache.forEach(function (tile) {
      if (tile.tileCoord[0] !== z || tile.getState() !== TileStates.LOADED) {
        return;
      }
      const sourceTiles = tile.getSourceTiles();
      for (let i = 0, ii = sourceTiles.length; i < ii; ++i) {
        const sourceTile = sourceTiles[i];
        const tileCoord = sourceTile.tileCoord;
        if (intersects(extent, tileGrid.getTileCoordExtent(tileCoord))) {
          const tileFeatures = sourceTile.getFeatures();
          if (tileFeatures) {
            for (let j = 0, jj = tileFeatures.length; j < jj; ++j) {
              const candidate = tileFeatures[j];
              const geometry = candidate.getGeometry();
              if (intersects(extent, geometry.getExtent())) {
                features.push(candidate);
              }
            }
          }
        }
      }
    });
    return features;
  }

  /**
   * @return {boolean} The source can have overlapping geometries.
   */
  getOverlaps() {
    return this.overlaps_;
  }

  /**
   * clear {@link module:ol/TileCache~TileCache} and delete all source tiles
   * @api
   */
  clear() {
    this.tileCache.clear();
    this.sourceTileCache.clear();
  }

  /**
   * @param {import("../proj/Projection").default} projection Projection.
   * @param {!Record<string, boolean>} usedTiles Used tiles.
   */
  expireCache(projection, usedTiles) {
    const tileCache = this.getTileCacheForProjection(projection);
    const usedSourceTiles = Object.keys(usedTiles).reduce((acc, key) => {
      const cacheKey = getCacheKeyForTileKey(key);
      const tile = tileCache.peek(cacheKey);
      if (tile) {
        const sourceTiles = tile.sourceTiles;
        for (let i = 0, ii = sourceTiles.length; i < ii; ++i) {
          acc[sourceTiles[i].getKey()] = true;
        }
      }
      return acc;
    }, {});
    super.expireCache(projection, usedTiles);
    this.sourceTileCache.expireCache(usedSourceTiles);
  }

  /**
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @param {VectorRenderTile} tile Vector image tile.
   * @return {Array<import("../VectorTile").default>} Tile keys.
   */
  getSourceTiles(pixelRatio, projection, tile) {
    if (tile.getState() === TileStates.IDLE) {
      tile.setState(TileStates.LOADING);
      const urlTileCoord = tile.wrappedTileCoord;
      const tileGrid = this.getTileGridForProjection(projection);
      const extent = tileGrid.getTileCoordExtent(urlTileCoord);
      const z = urlTileCoord[0];
      const resolution = tileGrid.getResolution(z);
      // make extent 1 pixel smaller so we don't load tiles for < 0.5 pixel render space
      bufferExtent(extent, -resolution, extent);
      const sourceTileGrid = this.tileGrid;
      const sourceExtent = sourceTileGrid.getExtent();
      if (sourceExtent) {
        getIntersection(extent, sourceExtent, extent);
      }
      const sourceZ = sourceTileGrid.getZForResolution(
        resolution,
        this.zDirection,
      );

      sourceTileGrid.forEachTileCoord(extent, sourceZ, (sourceTileCoord) => {
        const tileUrl = this.tileUrlFunction(
          sourceTileCoord,
          pixelRatio,
          projection,
        );
        const sourceTile = this.sourceTileCache.containsKey(tileUrl)
          ? this.sourceTileCache.get(tileUrl)
          : new this.tileClass(
              sourceTileCoord,
              tileUrl ? TileStates.IDLE : TileStates.EMPTY,
              tileUrl,
              this.format_,
              this.tileLoadFunction,
            );
        tile.sourceTiles.push(sourceTile);
        const sourceTileState = sourceTile.getState();
        if (sourceTileState < TileStates.LOADED) {
          const listenChange = (event) => {
            this.handleTileChange(event);
            const state = sourceTile.getState();
            if (state === TileStates.LOADED || state === TileStates.ERROR) {
              const sourceTileKey = sourceTile.getKey();
              if (sourceTileKey in tile.errorTileKeys) {
                if (sourceTile.getState() === TileStates.LOADED) {
                  delete tile.errorTileKeys[sourceTileKey];
                }
              } else {
                tile.loadingSourceTiles--;
              }
              if (state === TileStates.ERROR) {
                tile.errorTileKeys[sourceTileKey] = true;
              } else {
                sourceTile.removeEventListener(EventTypes.CHANGE, listenChange);
              }
              if (tile.loadingSourceTiles === 0) {
                tile.setState(
                  isEmpty(tile.errorTileKeys)
                    ? TileStates.LOADED
                    : TileStates.ERROR,
                );
              }
            }
          };
          sourceTile.addEventListener(EventTypes.CHANGE, listenChange);
          tile.loadingSourceTiles++;
        }
        if (sourceTileState === TileStates.IDLE) {
          sourceTile.extent =
            sourceTileGrid.getTileCoordExtent(sourceTileCoord);
          sourceTile.projection = projection;
          sourceTile.resolution = sourceTileGrid.getResolution(
            sourceTileCoord[0],
          );
          this.sourceTileCache.set(tileUrl, sourceTile);
          sourceTile.load();
        }
      });
      if (!tile.loadingSourceTiles) {
        tile.setState(
          tile.sourceTiles.some(
            (sourceTile) => sourceTile.getState() === TileStates.ERROR,
          )
            ? TileStates.ERROR
            : TileStates.LOADED,
        );
      }
    }

    return tile.sourceTiles;
  }

  /**
   * @param z Tile coordinate z.
   * @param x Tile coordinate x.
   * @param y Tile coordinate y.
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {!VectorRenderTile} Tile.
   */
  getTile(z, x, y, pixelRatio, projection) {
    const coordKey = getKeyZXY(z, x, y);
    const key = this.getKey();
    let tile;
    if (this.tileCache.containsKey(coordKey)) {
      tile = this.tileCache.get(coordKey);
      if (tile.key === key) {
        return tile;
      }
    }
    const tileCoord = [z, x, y];
    let urlTileCoord = this.getTileCoordForTileUrlFunction(
      tileCoord,
      projection,
    );
    const sourceExtent = this.getTileGrid().getExtent();
    const tileGrid = this.getTileGridForProjection(projection);
    if (urlTileCoord && sourceExtent) {
      const tileExtent = tileGrid.getTileCoordExtent(urlTileCoord);
      // make extent 1 pixel smaller so we don't load tiles for < 0.5 pixel render space
      bufferExtent(tileExtent, -tileGrid.getResolution(z), tileExtent);
      if (!intersects(sourceExtent, tileExtent)) {
        urlTileCoord = null;
      }
    }
    let empty = true;
    if (urlTileCoord !== null) {
      const sourceTileGrid = this.tileGrid;
      const resolution = tileGrid.getResolution(z);
      const sourceZ = sourceTileGrid.getZForResolution(resolution, 1);
      // make extent 1 pixel smaller so we don't load tiles for < 0.5 pixel render space
      const extent = tileGrid.getTileCoordExtent(urlTileCoord);
      bufferExtent(extent, -resolution, extent);
      sourceTileGrid.forEachTileCoord(extent, sourceZ, (sourceTileCoord) => {
        empty =
          empty &&
          !this.tileUrlFunction(sourceTileCoord, pixelRatio, projection);
      });
    }
    const newTile = new VectorRenderTile(
      tileCoord,
      empty ? TileStates.EMPTY : TileStates.IDLE,
      urlTileCoord,
      this.getSourceTiles.bind(this, pixelRatio, projection),
    );

    newTile.key = key;
    if (tile) {
      newTile.interimTile = tile;
      newTile.refreshInterimChain();
      this.tileCache.replace(coordKey, newTile);
    } else {
      this.tileCache.set(coordKey, newTile);
    }
    return newTile;
  }

  /**
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {!import("../tilegrid/TileGrid").default} Tile grid.
   */
  getTileGridForProjection(projection) {
    const code = projection.getCode();
    let tileGrid = this.tileGrids_[code];
    if (!tileGrid) {
      // A tile grid that matches the tile size of the source tile grid is more
      // likely to have 1:1 relationships between source tiles and rendered tiles.
      const sourceTileGrid = this.tileGrid;
      const resolutions = sourceTileGrid.getResolutions().slice();
      const origins = resolutions.map(function (resolution, z) {
        return sourceTileGrid.getOrigin(z);
      });
      const tileSizes = resolutions.map(function (resolution, z) {
        return sourceTileGrid.getTileSize(z);
      });
      const length = DEFAULT_MAX_ZOOM + 1;
      for (let z = resolutions.length; z < length; ++z) {
        resolutions.push(resolutions[z - 1] / 2);
        origins.push(origins[z - 1]);
        tileSizes.push(tileSizes[z - 1]);
      }
      tileGrid = new TileGrid({
        extent: sourceTileGrid.getExtent(),
        origins: origins,
        resolutions: resolutions,
        tileSizes: tileSizes,
      });
      this.tileGrids_[code] = tileGrid;
    }
    return tileGrid;
  }

  /**
   * Get the tile pixel ratio for this source.
   * @param pixelRatio Pixel ratio.
   * @return Tile pixel ratio.
   */
  getTilePixelRatio(pixelRatio) {
    return pixelRatio;
  }

  /**
   * @param z Z.
   * @param pixelRatio Pixel ratio.
   * @param {import("../proj/Projection").default} projection Projection.
   * @return {Size} Tile size.
   */
  getTilePixelSize(z, pixelRatio, projection) {
    const tileGrid = this.getTileGridForProjection(projection);
    const tileSize = toSize(tileGrid.getTileSize(z), this.tmpSize);
    return [
      Math.round(tileSize[0] * pixelRatio),
      Math.round(tileSize[1] * pixelRatio),
    ];
  }

  /**
   * Increases the cache size if needed
   * @param tileCount Minimum number of tiles needed.
   * @param {import("../proj/Projection").default} projection Projection.
   */
  updateCacheSize(tileCount, projection) {
    super.updateCacheSize(tileCount * 2, projection);
    this.sourceTileCache.highWaterMark =
      this.getTileCacheForProjection(projection).highWaterMark;
  }
}

export default VectorTile;

/**
 * Sets the loader for a tile.
 * @param {import("../VectorTile").default} tile Vector tile.
 * @param url URL.
 */
export function defaultLoadFunction(tile, url) {
  tile.setLoader(
    /**
     * @param {Extent} extent Extent.
     * @param resolution Resolution.
     * @param {import("../proj/Projection").default} projection Projection.
     */
    function (extent, resolution, projection) {
      loadFeaturesXhr(
        url,
        tile.getFormat(),
        extent,
        resolution,
        projection,
        tile.onLoad.bind(tile),
        tile.onError.bind(tile),
      );
    },
  );
}
