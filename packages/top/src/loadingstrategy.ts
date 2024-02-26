

import {fromUserExtent, fromUserResolution, toUserExtent} from './proj.js';

/**
 * Strategy function for loading all features with a single request.
 * @param {Extent} extent Extent.
 * @param {number} resolution Resolution.
 * @return {Array<Extent>} Extents.
 * @api
 */
export function all(extent, resolution) {
  return [[-Infinity, -Infinity, Infinity, Infinity]];
}

/**
 * Strategy function for loading features based on the view's extent and
 * resolution.
 * @param {Extent} extent Extent.
 * @param {number} resolution Resolution.
 * @return {Array<Extent>} Extents.
 * @api
 */
export function bbox(extent, resolution) {
  return [extent];
}

/**
 * Creates a strategy function for loading features based on a tile grid.
 * @param {import("./tilegrid/TileGrid.js").default} tileGrid Tile grid.
 * @return {function(Extent, number, import("./proj.js").Projection):Extent[]} Loading strategy.
 * @api
 */
export function tile(tileGrid) {
  return (
    /**
     * @param {Extent} extent Extent.
     * @param {number} resolution Resolution.
     * @param {import("./proj.js").Projection} projection Projection.
     * @return {Array<Extent>} Extents.
     */
    function (extent, resolution, projection) {
      const z = tileGrid.getZForResolution(
        fromUserResolution(resolution, projection),
      );
      const tileRange = tileGrid.getTileRangeForExtentAndZ(
        fromUserExtent(extent, projection),
        z,
      );
      /** @type {Array<Extent>} */
      const extents = [];
      /** @type {import("./tilecoord.js").TileCoord} */
      const tileCoord = [z, 0, 0];
      for (
        tileCoord[1] = tileRange.minX;
        tileCoord[1] <= tileRange.maxX;
        ++tileCoord[1]
      ) {
        for (
          tileCoord[2] = tileRange.minY;
          tileCoord[2] <= tileRange.maxY;
          ++tileCoord[2]
        ) {
          extents.push(
            toUserExtent(tileGrid.getTileCoordExtent(tileCoord), projection),
          );
        }
      }
      return extents;
    }
  );
}
