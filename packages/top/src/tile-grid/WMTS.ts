

import TileGrid from './TileGrid';
import {get as getProjection} from '../proj';

/**
 * @typedef {Object} Options
 * @property {Extent} [extent] Extent for the tile grid. No tiles
 * outside this extent will be requested by {@link TileSource} sources.
 * When no `origin` or `origins` are configured, the `origin` will be set to the
 * top-left corner of the extent.
 * @property {Coordinate} [origin] The tile grid origin, i.e.
 * where the `x` and `y` axes meet (`[z, 0, 0]`). Tile coordinates increase left
 * to right and downwards. If not specified, `extent` or `origins` must be provided.
 * @property {Coordinate[]} [origins] Tile grid origins,
 * i.e. where the `x` and `y` axes meet (`[z, 0, 0]`), for each zoom level. If
 * given, the array length should match the length of the `resolutions` array, i.e.
 * each resolution can have a different origin. Tile coordinates increase left to
 * right and downwards. If not specified, `extent` or `origin` must be provided.
 * @property {!number[]} resolutions Resolutions. The array index of each
 * resolution needs to match the zoom level. This means that even if a `minZoom`
 * is configured, the resolutions array will have a length of `maxZoom + 1`
 * @property {!string[]} matrixIds matrix IDs. The length of this array needs
 * to match the length of the `resolutions` array.
 * @property {Size[]} [sizes] Number of tile rows and columns
 * of the grid for each zoom level. The values here are the `TileMatrixWidth` and
 * `TileMatrixHeight` advertised in the GetCapabilities response of the WMTS, and
 * define each zoom level's extent together with the `origin` or `origins`.
 * A grid `extent` can be configured in addition, and will further limit the extent for
 * which tile requests are made by sources. If the bottom-left corner of
 * an extent is used as `origin` or `origins`, then the `y` value must be
 * negative because OpenLayers tile coordinates use the top left as the origin.
 * @property {number|Size} [tileSize] Tile size.
 * @property {Array<number|Size>} [tileSizes] Tile sizes. The length of
 * this array needs to match the length of the `resolutions` array.
 */

/**
 * Set the grid pattern for sources accessing WMTS tiled-image servers.
 * @api
 */
export class WMTSTileGrid extends TileGrid {
  /**
   * @param {Options} options WMTS options.
   */
  constructor(options) {
    super({
      extent: options.extent,
      origin: options.origin,
      origins: options.origins,
      resolutions: options.resolutions,
      tileSize: options.tileSize,
      tileSizes: options.tileSizes,
      sizes: options.sizes,
    });

    /**
     * @private
     * @type {!string[]}
     */
    this.matrixIds_ = options.matrixIds;
  }

  /**
   * @param z Z.
   * @return MatrixId..
   */
  getMatrixId(z) {
    return this.matrixIds_[z];
  }

  /**
   * Get the list of matrix identifiers.
   * @return {string[]} MatrixIds.
   * @api
   */
  getMatrixIds() {
    return this.matrixIds_;
  }
}

export default WMTSTileGrid;

/**
 * Create a tile grid from a WMTS capabilities matrix set and an
 * optional TileMatrixSetLimits.
 * @param {Object} matrixSet An object representing a matrixSet in the
 *     capabilities document.
 * @param {Extent} [extent] An optional extent to restrict the tile
 *     ranges the server provides.
 * @param {Object[]} [matrixLimits] An optional object representing
 *     the available matrices for tileGrid.
 * @return {WMTSTileGrid} WMTS tileGrid instance.
 * @api
 */
export function createFromCapabilitiesMatrixSet(
  matrixSet,
  extent,
  matrixLimits,
) {
  /** @type {!number[]} */
  const resolutions = [];
  /** @type {!string[]} */
  const matrixIds = [];
  /** @type {!Coordinate[]} */
  const origins = [];
  /** @type {!Array<number|Size>} */
  const tileSizes = [];
  /** @type {!Size[]} */
  const sizes = [];

  matrixLimits = matrixLimits !== undefined ? matrixLimits : [];

  const supportedCRSPropName = 'SupportedCRS';
  const matrixIdsPropName = 'TileMatrix';
  const identifierPropName = 'Identifier';
  const scaleDenominatorPropName = 'ScaleDenominator';
  const topLeftCornerPropName = 'TopLeftCorner';
  const tileWidthPropName = 'TileWidth';
  const tileHeightPropName = 'TileHeight';

  const code = matrixSet[supportedCRSPropName];
  const projection = getProjection(code);
  const metersPerUnit = projection.getMetersPerUnit();
  // swap origin x and y coordinates if axis orientation is lat/long
  const switchOriginXY = projection.getAxisOrientation().substr(0, 2) == 'ne';

  matrixSet[matrixIdsPropName].sort(function (a, b) {
    return b[scaleDenominatorPropName] - a[scaleDenominatorPropName];
  });

  matrixSet[matrixIdsPropName].forEach(function (elt) {
    let matrixAvailable;
    // use of matrixLimits to filter TileMatrices from GetCapabilities
    // TileMatrixSet from unavailable matrix levels.
    if (matrixLimits.length > 0) {
      matrixAvailable = matrixLimits.find(function (elt_ml) {
        if (elt[identifierPropName] == elt_ml[matrixIdsPropName]) {
          return true;
        }
        // Fallback for tileMatrix identifiers that don't get prefixed
        // by their tileMatrixSet identifiers.
        if (!elt[identifierPropName].includes(':')) {
          return (
            matrixSet[identifierPropName] + ':' + elt[identifierPropName] ===
            elt_ml[matrixIdsPropName]
          );
        }
        return false;
      });
    } else {
      matrixAvailable = true;
    }

    if (matrixAvailable) {
      matrixIds.push(elt[identifierPropName]);
      const resolution =
        (elt[scaleDenominatorPropName] * 0.28e-3) / metersPerUnit;
      const tileWidth = elt[tileWidthPropName];
      const tileHeight = elt[tileHeightPropName];
      if (switchOriginXY) {
        origins.push([
          elt[topLeftCornerPropName][1],
          elt[topLeftCornerPropName][0],
        ]);
      } else {
        origins.push(elt[topLeftCornerPropName]);
      }
      resolutions.push(resolution);
      tileSizes.push(
        tileWidth == tileHeight ? tileWidth : [tileWidth, tileHeight],
      );
      sizes.push([elt['MatrixWidth'], elt['MatrixHeight']]);
    }
  });

  return new WMTSTileGrid({
    extent: extent,
    origins: origins,
    resolutions: resolutions,
    matrixIds: matrixIds,
    tileSizes: tileSizes,
    sizes: sizes,
  });
}
