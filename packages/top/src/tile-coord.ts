import { TileGrid } from "./tile-grid";


/**
 * An array of three numbers representing the location of a tile in a tile
 * grid. The order is `z` (zoom level), `x` (column), and `y` (row).
 * @api
 */
export type TileCoord = [number, number, number];


/**
 * @param z Z.
 * @param x X.
 * @param y Y.
 * @param tileCoord Tile coordinate.
 * @return Tile coordinate.
 */
export function createOrUpdate(
    z: number, x: number, y: number, tileCoord?: TileCoord
): TileCoord {
    if (tileCoord !== undefined) {
        tileCoord[0] = z;
        tileCoord[1] = x;
        tileCoord[2] = y;
        return tileCoord;
    }
    return [z, x, y];
}


/**
 * @param z Z.
 * @param x X.
 * @param y Y.
 * @return Key.
 */
export function getKeyZXY(z: number, x: number, y: number): string {
    return z + '/' + x + '/' + y;
}


/**
 * Get the key for a tile coord.
 * 
 * @param tileCoord The tile coord.
 * @return Key.
 */
export function getKey(tileCoord: TileCoord): string {
    return getKeyZXY(tileCoord[0], tileCoord[1], tileCoord[2]);
}


/**
 * Get the tile cache key for a tile key obtained through `tile.getKey()`.
 * 
 * @param tileKey The tile key.
 * @return The cache key.
 */
export function getCacheKeyForTileKey(tileKey: string): string {
    const [z, x, y] = tileKey
        .substring(tileKey.lastIndexOf('/') + 1, tileKey.length)
        .split(',')
        .map(Number);
    return getKeyZXY(z, x, y);
}

/**
 * Get a tile coord given a key.
 * @param key The tile coord key.
 * @return The tile coord.
 */
export function fromKey(key: string): TileCoord {
    return key.split('/').map(Number) as TileCoord;
}


/**
 * 
 * @param tileCoord Tile coord.
 * @return Hash.
 */
export function hash(tileCoord: TileCoord): number {
    return (tileCoord[1] << tileCoord[0]) + tileCoord[2];
}


/**
 * @param tileCoord Tile coordinate.
 * @param tileGrid Tile grid.
 * @return Tile coordinate is within extent and zoom level range.
 */
export function withinExtentAndZ(
    tileCoord: TileCoord, tileGrid: TileGrid
): boolean {
    const z = tileCoord[0];
    const x = tileCoord[1];
    const y = tileCoord[2];

    if (tileGrid.getMinZoom() > z || z > tileGrid.getMaxZoom()) {
        return false;
    }
    const tileRange = tileGrid.getFullTileRange(z);
    if (!tileRange) {
        return true;
    }
    return tileRange.containsXY(x, y);
}
