import {
    METERS_PER_UNIT, Projection, ProjectionLike, getProjection
} from '@olts/core/proj';
import {
    Corner,
    Extent,
    containsCoordinate,
    createOrUpdate,
    getCorner,
    getHeight,
    getWidth,
} from '@olts/core/extent';
import { Size, toSize } from '@olts/core/size';

import TileGrid from './tile-grid/TileGrid';
import { DEFAULT_MAX_ZOOM, DEFAULT_TILE_SIZE } from './tile-grid/common';
import { TileCoord } from './tile-coord';

export { TileGrid };
export { default as WMTS } from './tile-grid/WMTS';


/**
 * @param projection Projection.
 * @return Default tile grid for the passed projection.
 */
export function getForProjection(projection: Projection): TileGrid {
    let tileGrid = projection.getDefaultTileGrid();
    if (!tileGrid) {
        tileGrid = createForProjection(projection);
        projection.setDefaultTileGrid(tileGrid);
    }
    return tileGrid;
}


/**
 * @param tileGrid Tile grid.
 * @param tileCoord Tile coordinate.
 * @param projection Projection.
 * @return Tile coordinate.
 */
export function wrapX(
    tileGrid: TileGrid, tileCoord: TileCoord, projection: Projection
): TileCoord {
    const z = tileCoord[0];
    const center = tileGrid.getTileCoordCenter(tileCoord);
    const projectionExtent = extentFromProjection(projection);
    if (!containsCoordinate(projectionExtent, center)) {
        const worldWidth = getWidth(projectionExtent);
        const worldsAway = Math.ceil(
            (projectionExtent[0] - center[0]) / worldWidth,
        );
        center[0] += worldWidth * worldsAway;
        return tileGrid.getTileCoordForCoordAndZ(center, z);
    }
    return tileCoord;
}


/**
 * @param extent Extent.
 * @param maxZoom Maximum zoom level (default is DEFAULT_MAX_ZOOM).
 * @param tileSize Tile size (default uses DEFAULT_TILE_SIZE).
 * @param corner Extent corner (default is `'top-left'`).
 * @return TileGrid instance.
 */
export function createForExtent(
    extent: Extent, maxZoom?: number, tileSize?: number | Size, corner?: Corner
): TileGrid {
    corner = corner !== undefined ? corner : 'top-left';

    const resolutions = resolutionsFromExtent(extent, maxZoom, tileSize);

    return new TileGrid({
        extent: extent,
        origin: getCorner(extent, corner),
        resolutions: resolutions,
        tileSize: tileSize,
    });
}


/**
 * 
 */
export interface XYZOptions {
    /**
     * Extent for the tile grid.
     *
     * The origin for an XYZ tile grid is the top-left corner of the extent. If
     * `maxResolution` is not provided the zero level of the grid is defined by
     * the resolution at which one tile fits in the provided extent. If not
     * provided, the extent of the EPSG:3857 projection is used.
     */
    extent?: Extent;

    /**
     * Resolution at level zero.
     */
    maxResolution?: number;

    /**
     * Maximum zoom.
     * 
     * This determines the number of levels in the grid set.
     * 
     * For example, a `maxZoom` of 21 means there are 22 levels in the grid set.
     * 
     * @default 42
     */
    maxZoom?: number;

    /**
     * Minimum zoom.
     * 
     * @default 0
     */
    minZoom?: number;

    /**
     * Tile size in pixels.
     * 
     * @default [256, 256]
     */
    tileSize?: number | Size;
}


/**
 * Creates a tile grid with a standard XYZ tiling scheme.
 * 
 * @param options Tile grid options.
 * @return Tile grid instance.
 * @api
 */
export function createXYZ(options?: XYZOptions): TileGrid {
    const xyzOptions = options || {};

    const extent = xyzOptions.extent || getProjection('EPSG:3857')!.getExtent();

    if (!extent) {
        throw new Error('extent is required');
    }

    const gridOptions = {
        extent: extent,
        minZoom: xyzOptions.minZoom,
        tileSize: xyzOptions.tileSize,
        resolutions: resolutionsFromExtent(
            extent,
            xyzOptions.maxZoom,
            xyzOptions.tileSize,
            xyzOptions.maxResolution,
        ),
    };
    return new TileGrid(gridOptions);
}

/**
 * Create a resolutions array from an extent.
 * 
 * A zoom factor of 2 is assumed.
 * 
 * @param extent Extent.
 * @param maxZoom Maximum zoom level (default is DEFAULT_MAX_ZOOM).
 * @param tileSize Tile size (default uses DEFAULT_TILE_SIZE).
 * @param maxResolution Resolution at level zero.
 * @return Resolutions array.
 */
function resolutionsFromExtent(
    extent: Extent,
    maxZoom: number = DEFAULT_MAX_ZOOM,
    tileSize: number | Size = DEFAULT_TILE_SIZE,
    maxResolution?: number
): number[] {
    tileSize = toSize(tileSize !== undefined ? tileSize : DEFAULT_TILE_SIZE);

    const height = getHeight(extent);
    const width = getWidth(extent);

    maxResolution = (maxResolution !== undefined && maxResolution > 0)
        ? maxResolution
        : Math.max(width / tileSize[0], height / tileSize[1]);

    const length = maxZoom + 1;
    const resolutions = new Array(length);
    for (let z = 0; z < length; ++z) {
        resolutions[z] = maxResolution / Math.pow(2, z);
    }
    return resolutions;
}


/**
 * @param projection Projection.
 * @param maxZoom Maximum zoom level (default is DEFAULT_MAX_ZOOM).
 * @param tileSize Tile size (default uses DEFAULT_TILE_SIZE).
 * @param corner Extent corner (default is `'top-left'`).
 * @return TileGrid instance.
 */
export function createForProjection(
    projection: ProjectionLike,
    maxZoom: number = DEFAULT_MAX_ZOOM,
    tileSize: number | Size = DEFAULT_TILE_SIZE,
    corner: Corner = 'top-left'
): TileGrid {
    const extent = extentFromProjection(projection);
    return createForExtent(extent, maxZoom, tileSize, corner);
}


/**
 * Generate a tile grid extent from a projection.
 *
 * If the projection has an extent, it is used.  If not, a global extent is
 * assumed.
 *
 * @param projection Projection.
 * @return Extent.
 */
export function extentFromProjection(projection: ProjectionLike): Extent {
    const proj: Projection | null = getProjection(projection);
    if (!proj) {
        throw new Error('Unknown projection');
    }
    let extent = proj.getExtent();
    const mpu = proj.getMetersPerUnit();
    if (mpu === undefined) {
        throw new Error('Unknown projection units');
    }
    if (!extent) {
        const half = (180 * METERS_PER_UNIT.degrees) / mpu;
        extent = createOrUpdate(-half, -half, half, half);
    }
    return extent;
}
