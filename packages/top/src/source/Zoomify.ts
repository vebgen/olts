
import {DEFAULT_TILE_SIZE} from '../tile-grid/common';

import ImageTile from '../ImageTile';
import TileGrid from '../tile-grid/TileGrid';
import TileImage from './TileImage';
import type { TileState} from '../tile';
import {createCanvasContext2D} from '@olts/core/dom';
import {createFromTileUrlFunctions, expandUrl} from '../tile-url-function';
import {getCenter} from '@olts/core/extent';
import {toSize} from '../size';

/**
 * @typedef {'default' | 'truncated'} TierSizeCalculation
 */

export class CustomTile extends ImageTile {
  /**
   * @param {Size} tileSize Full tile size.
   * @param {TileCoord} tileCoord Tile coordinate.
   * @param {import("../TileState").default} state State.
   * @param src Image source URI.
   * @param {?string} crossOrigin Cross origin.
   * @param {import("../Tile").LoadFunction} tileLoadFunction Tile load function.
   * @param {import("../Tile").Options} [options] Tile options.
   */
  constructor(
    tileSize,
    tileCoord,
    state,
    src,
    crossOrigin,
    tileLoadFunction,
    options,
  ) {
    super(tileCoord, state, src, crossOrigin, tileLoadFunction, options);

    /**
     * @private
     * @type {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement}
     */
    this.zoomifyImage_ = null;

    /**
     * @type {Size}
     */
    this.tileSize_ = tileSize;
  }

  /**
   * Get the image element for this tile.
   * @return {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} Image.
   */
  getImage() {
    if (this.zoomifyImage_) {
      return this.zoomifyImage_;
    }
    const image = super.getImage();
    if (this.state == TileStates.LOADED) {
      const tileSize = this.tileSize_;
      if (image.width == tileSize[0] && image.height == tileSize[1]) {
        this.zoomifyImage_ = image;
        return image;
      }
      const context = createCanvasContext2D(tileSize[0], tileSize[1]);
      context.drawImage(image, 0, 0);
      this.zoomifyImage_ = context.canvas;
      return context.canvas;
    }
    return image;
  }
}

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property [cacheSize] Initial tile cache size. Will auto-grow to hold at least the number of tiles in the viewport.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value  you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * linear interpolation is used when resampling.  Set to false to use the nearest neighbor instead.
 * @property {ProjectionLike} [projection] Projection.
 * @property [tilePixelRatio] The pixel ratio used by the tile service. For example, if the tile service advertizes 256px by 256px tiles but actually sends 512px by 512px images (for retina/hidpi devices) then `tilePixelRatio` should be set to `2`
 * @property [reprojectionErrorThreshold=0.5] Maximum allowed reprojection error (in pixels).
 * Higher values can increase reprojection performance, but decrease precision.
 * @property url URL template or base URL of the Zoomify service.
 * A base URL is the fixed part
 * of the URL, excluding the tile group, z, x, and y folder structure, e.g.
 * `http://my.zoomify.info/IMAGE.TIF/`. A URL template must include
 * `{TileGroup}`, `{x}`, `{y}`, and `{z}` placeholders, e.g.
 * `http://my.zoomify.info/IMAGE.TIF/{TileGroup}/{z}-{x}-{y}.jpg`.
 * Internet Imaging Protocol (IIP) with JTL extension can be also used with
 * `{tileIndex}` and `{z}` placeholders, e.g.
 * `http://my.zoomify.info?FIF=IMAGE.TIF&JTL={z},{tileIndex}`.
 * A `{?-?}` template pattern, for example `subdomain{a-f}.domain.com`, may be
 * used instead of defining each one separately in the `urls` option.
 * @property {TierSizeCalculation} [tierSizeCalculation] Tier size calculation method: `default` or `truncated`.
 * @property {Size} size Size.
 * @property {Extent} [extent] Extent for the TileGrid that is created.
 * Default sets the TileGrid in the
 * fourth quadrant, meaning extent is `[0, -height, width, 0]`. To change the
 * extent to the first quadrant (the default for OpenLayers 2) set the extent
 * as `[0, 0, width, height]`.
 * @property [transition] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 * @property [tileSize=256] Tile size. Same tile size is used for all zoom levels.
 * @property {number|import("../array").NearestDirectionFunction} [zDirection=0]
 * Choose whether to use tiles with a higher or lower zoom level when between integer
 * zoom levels. See {@link module:ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
 */

/**
 * Layer source for tile data in Zoomify format (both Zoomify and Internet
 * Imaging Protocol are supported).
 * @api
 */
export class Zoomify extends TileImage {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {
    const size = options.size;
    const tierSizeCalculation =
      options.tierSizeCalculation !== undefined
        ? options.tierSizeCalculation
        : 'default';

    const tilePixelRatio = options.tilePixelRatio || 1;
    const imageWidth = size[0];
    const imageHeight = size[1];
    const tierSizeInTiles = [];
    const tileSize = options.tileSize || DEFAULT_TILE_SIZE;
    let tileSizeForTierSizeCalculation = tileSize * tilePixelRatio;

    switch (tierSizeCalculation) {
      case 'default':
        while (
          imageWidth > tileSizeForTierSizeCalculation ||
          imageHeight > tileSizeForTierSizeCalculation
        ) {
          tierSizeInTiles.push([
            Math.ceil(imageWidth / tileSizeForTierSizeCalculation),
            Math.ceil(imageHeight / tileSizeForTierSizeCalculation),
          ]);
          tileSizeForTierSizeCalculation += tileSizeForTierSizeCalculation;
        }
        break;
      case 'truncated':
        let width = imageWidth;
        let height = imageHeight;
        while (
          width > tileSizeForTierSizeCalculation ||
          height > tileSizeForTierSizeCalculation
        ) {
          tierSizeInTiles.push([
            Math.ceil(width / tileSizeForTierSizeCalculation),
            Math.ceil(height / tileSizeForTierSizeCalculation),
          ]);
          width >>= 1;
          height >>= 1;
        }
        break;
      default:
        throw new Error('Unknown `tierSizeCalculation` configured');
    }

    tierSizeInTiles.push([1, 1]);
    tierSizeInTiles.reverse();

    const resolutions = [tilePixelRatio];
    const tileCountUpToTier = [0];
    for (let i = 1, ii = tierSizeInTiles.length; i < ii; i++) {
      resolutions.push(tilePixelRatio << i);
      tileCountUpToTier.push(
        tierSizeInTiles[i - 1][0] * tierSizeInTiles[i - 1][1] +
          tileCountUpToTier[i - 1],
      );
    }
    resolutions.reverse();

    const tileGrid = new TileGrid({
      tileSize: tileSize,
      extent: options.extent || [0, -imageHeight, imageWidth, 0],
      resolutions: resolutions,
    });

    let url = options.url;
    if (url && !url.includes('{TileGroup}') && !url.includes('{tileIndex}')) {
      url += '{TileGroup}/{z}-{x}-{y}.jpg';
    }
    const urls = expandUrl(url);

    let tileWidth = tileSize * tilePixelRatio;

    /**
     * @param template Template.
     * @return {import("../Tile").UrlFunction} Tile URL function.
     */
    function createFromTemplate(template) {
      return (
        /**
         * @param {TileCoord} tileCoord Tile Coordinate.
         * @param pixelRatio Pixel ratio.
         * @param {import("../proj/Projection").default} projection Projection.
         * @return {string|undefined} Tile URL.
         */
        function (tileCoord, pixelRatio, projection) {
          if (!tileCoord) {
            return undefined;
          }
          const tileCoordZ = tileCoord[0];
          const tileCoordX = tileCoord[1];
          const tileCoordY = tileCoord[2];
          const tileIndex =
            tileCoordX + tileCoordY * tierSizeInTiles[tileCoordZ][0];
          const tileGroup =
            ((tileIndex + tileCountUpToTier[tileCoordZ]) / tileWidth) | 0;
          const localContext = {
            'z': tileCoordZ,
            'x': tileCoordX,
            'y': tileCoordY,
            'tileIndex': tileIndex,
            'TileGroup': 'TileGroup' + tileGroup,
          };
          return template.replace(/\{(\w+?)\}/g, function (m, p) {
            return localContext[p];
          });
        }
      );
    }

    const tileUrlFunction = createFromTileUrlFunctions(
      urls.map(createFromTemplate),
    );

    const ZoomifyTileClass = CustomTile.bind(
      null,
      toSize(tileSize * tilePixelRatio),
    );

    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize,
      crossOrigin: options.crossOrigin,
      interpolate: options.interpolate,
      projection: options.projection,
      tilePixelRatio: tilePixelRatio,
      reprojectionErrorThreshold: options.reprojectionErrorThreshold,
      tileClass: ZoomifyTileClass,
      tileGrid: tileGrid,
      tileUrlFunction: tileUrlFunction,
      transition: options.transition,
    });

    /**
     * @type {number|import("../array").NearestDirectionFunction}
     */
    this.zDirection = options.zDirection;

    // Server retina tile detection (non-standard):
    // Try loading the center tile for the highest resolution. If it is not
    // available, we are dealing with retina tiles, and need to adjust the
    // tile url calculation.
    const tileUrl = tileGrid.getTileCoordForCoordAndResolution(
      getCenter(tileGrid.getExtent()),
      resolutions[resolutions.length - 1],
    );
    const testTileUrl = tileUrlFunction(tileUrl, 1, null);
    const image = new Image();
    image.addEventListener('error', () => {
      tileWidth = tileSize;
      this.changed();
    });
    image.src = testTileUrl;
  }
}

export default Zoomify;
