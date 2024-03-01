

import { fromUserExtent, fromUserResolution, toUserExtent } from './proj';

/**
 * Strategy function for loading all features with a single request.
 * @param {Extent} extent Extent.
 * @param resolution Resolution.
 * @return {Extent[]} Extents.
 * @api
 */
export function all(extent: Extent, resolution: number): Extent[] {
    return [[-Infinity, -Infinity, Infinity, Infinity]];
}

/**
 * Strategy function for loading features based on the view's extent and
 * resolution.
 * @param {Extent} extent Extent.
 * @param resolution Resolution.
 * @return {Extent[]} Extents.
 * @api
 */
export function bbox(extent: Extent, resolution: number): Extent[] {
    return [extent];
}

/**
 * Creates a strategy function for loading features based on a tile grid.
 * @param {TileGrid} tileGrid Tile grid.
 * @return {function(Extent, number, import("./proj").Projection):Extent[]} Loading strategy.
 * @api
 */
export function tile(tileGrid: TileGrid): (arg0: Extent, arg1: number, arg2: import("./proj").Projection) => Extent[] {
    return (
        /**
         * @param {Extent} extent Extent.
         * @param resolution Resolution.
         * @param {import("./proj").Projection} projection Projection.
         * @return {Extent[]} Extents.
         */
        function (extent: Extent, resolution: number, projection: import("./proj").Projection): Extent[] {
            const z = tileGrid.getZForResolution(
                fromUserResolution(resolution, projection),
            );
            const tileRange = tileGrid.getTileRangeForExtentAndZ(
                fromUserExtent(extent, projection),
                z,
            );
            /** @type {Extent[]} */
            const extents: Extent[] = [];
            /** @type {TileCoord} */
            const tileCoord: TileCoord = [z, 0, 0];
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
