
import TileRange, {
    createOrUpdate as createOrUpdateTileRange,
} from '../TileRange';
import { DEFAULT_TILE_SIZE } from './common';
import { assert } from '@olts/core/asserts';
import { ceil, clamp, floor } from '@olts/core/math';
import { createOrUpdate, getTopLeft } from '@olts/core/extent';
import { TileCoord, createOrUpdate as createOrUpdateTileCoord } from '../tile-coord';
import { intersectsLinearRing } from '@olts/geometry/flat';
import { isSorted, linearFindNearest } from '@olts/core/array';
import { toSize } from '../size';
import { Coordinate } from '@olts/core/coordinate';

/**
 * @private
 * @type {TileCoord}
 */
const tmpTileCoord: TileCoord = [0, 0, 0];

/**
 * Number of decimal digits to consider in integer values when rounding.
 * @type {number}
 */
const DECIMALS: number = 5;

/**
 * @typedef {Object} Options
 * @property {Extent} [extent] Extent for the tile grid. No tiles outside this
 * extent will be requested by {@link TileSource} sources. When no `origin` or
 * `origins` are configured, the `origin` will be set to the top-left corner of the extent.
 * @property [minZoom=0] Minimum zoom.
 * @property {Coordinate} [origin] The tile grid origin, i.e. where the `x`
 * and `y` axes meet (`[z, 0, 0]`). Tile coordinates increase left to right and downwards. If not
 * specified, `extent` or `origins` must be provided.
 * @property {Coordinate[]} [origins] Tile grid origins, i.e. where
 * the `x` and `y` axes meet (`[z, 0, 0]`), for each zoom level. If given, the array length
 * should match the length of the `resolutions` array, i.e. each resolution can have a different
 * origin. Tile coordinates increase left to right and downwards. If not specified, `extent` or
 * `origin` must be provided.
 * @property {!number[]} resolutions Resolutions. The array index of each resolution needs
 * to match the zoom level. This means that even if a `minZoom` is configured, the resolutions
 * array will have a length of `maxZoom + 1`.
 * @property {Size[]} [sizes] Number of tile rows and columns
 * of the grid for each zoom level. If specified the values
 * define each zoom level's extent together with the `origin` or `origins`.
 * A grid `extent` can be configured in addition, and will further limit the extent
 * for which tile requests are made by sources. If the bottom-left corner of
 * an extent is used as `origin` or `origins`, then the `y` value must be
 * negative because OpenLayers tile coordinates use the top left as the origin.
 * @property {number|Size} [tileSize] Tile size.
 * Default is `[256, 256]`.
 * @property {Array<number|Size>} [tileSizes] Tile sizes. If given, the array length
 * should match the length of the `resolutions` array, i.e. each resolution can have a different
 * tile size.
 */

/**
 * Base class for setting the grid pattern for sources accessing tiled-image
 * servers.
 * @api
 */
export class TileGrid {
    /**
     * @param {Options} options Tile grid options.
     */
    constructor(options: Options) {
        /**
         * @protected
         * @type {number}
         */
        this.minZoom = options.minZoom !== undefined ? options.minZoom : 0;

        /**
         * @private
         * @type {!number[]}
         */
        this.resolutions_ = options.resolutions;
        assert(
            isSorted(
                this.resolutions_,
                /**
                 * @param a First resolution
                 * @param b Second resolution
                 * @return Comparison result
                 */
                (a: number, b: number): number => b - a,
                true,
            ),
            '`resolutions` must be sorted in descending order',
        );

        // check if we've got a consistent zoom factor and origin
        let zoomFactor;
        if (!options.origins) {
            for (let i = 0, ii = this.resolutions_.length - 1; i < ii; ++i) {
                if (!zoomFactor) {
                    zoomFactor = this.resolutions_[i] / this.resolutions_[i + 1];
                } else {
                    if (this.resolutions_[i] / this.resolutions_[i + 1] !== zoomFactor) {
                        zoomFactor = undefined;
                        break;
                    }
                }
            }
        }

        /**
         * @private
         * @type {number|undefined}
         */
        this.zoomFactor_ = zoomFactor;

        /**
         * @protected
         * @type {number}
         */
        this.maxZoom = this.resolutions_.length - 1;

        /**
         * @private
         * @type {Coordinate|null}
         */
        this.origin_ = options.origin !== undefined ? options.origin : null;

        /**
         * @private
         * @type {Coordinate[]}
         */
        this.origins_ = null;
        if (options.origins !== undefined) {
            this.origins_ = options.origins;
            assert(
                this.origins_.length == this.resolutions_.length,
                'Number of `origins` and `resolutions` must be equal',
            );
        }

        const extent = options.extent;

        if (extent !== undefined && !this.origin_ && !this.origins_) {
            this.origin_ = getTopLeft(extent);
        }

        assert(
            (!this.origin_ && this.origins_) || (this.origin_ && !this.origins_),
            'Either `origin` or `origins` must be configured, never both',
        );

        /**
         * @private
         * @type {Array<number|Size>}
         */
        this.tileSizes_ = null;
        if (options.tileSizes !== undefined) {
            this.tileSizes_ = options.tileSizes;
            assert(
                this.tileSizes_.length == this.resolutions_.length,
                'Number of `tileSizes` and `resolutions` must be equal',
            );
        }

        /**
         * @private
         * @type {number|Size}
         */
        this.tileSize_ =
            options.tileSize !== undefined
                ? options.tileSize
                : !this.tileSizes_
                    ? DEFAULT_TILE_SIZE
                    : null;
        assert(
            (!this.tileSize_ && this.tileSizes_) ||
            (this.tileSize_ && !this.tileSizes_),
            'Either `tileSize` or `tileSizes` must be configured, never both',
        );

        /**
         * @private
         * @type {Extent}
         */
        this.extent_ = extent !== undefined ? extent : null;

        /**
         * @private
         * @type {Array<import("../TileRange").default>}
         */
        this.fullTileRanges_ = null;

        /**
         * @private
         * @type {Size}
         */
        this.tmpSize_ = [0, 0];

        /**
         * @private
         * @type {Extent}
         */
        this.tmpExtent_ = [0, 0, 0, 0];

        if (options.sizes !== undefined) {
            this.fullTileRanges_ = options.sizes.map((size, z) => {
                const tileRange = new TileRange(
                    Math.min(0, size[0]),
                    Math.max(size[0] - 1, -1),
                    Math.min(0, size[1]),
                    Math.max(size[1] - 1, -1),
                );
                if (extent) {
                    const restrictedTileRange = this.getTileRangeForExtentAndZ(extent, z);
                    tileRange.minX = Math.max(restrictedTileRange.minX, tileRange.minX);
                    tileRange.maxX = Math.min(restrictedTileRange.maxX, tileRange.maxX);
                    tileRange.minY = Math.max(restrictedTileRange.minY, tileRange.minY);
                    tileRange.maxY = Math.min(restrictedTileRange.maxY, tileRange.maxY);
                }
                return tileRange;
            });
        } else if (extent) {
            this.calculateTileRanges_(extent);
        }
    }

    /**
     * Call a function with each tile coordinate for a given extent and zoom level.
     *
     * @param {Extent} extent Extent.
     * @param zoom Integer zoom level.
     * @param {function(TileCoord): void} callback Function called with each tile coordinate.
     * @api
     */
    forEachTileCoord(extent: Extent, zoom: number, callback: (arg0: TileCoord) => void) {
        const tileRange = this.getTileRangeForExtentAndZ(extent, zoom);
        for (let i = tileRange.minX, ii = tileRange.maxX; i <= ii; ++i) {
            for (let j = tileRange.minY, jj = tileRange.maxY; j <= jj; ++j) {
                callback([zoom, i, j]);
            }
        }
    }

    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {function(number, import("../TileRange").default): boolean} callback Callback.
     * @param {import("../TileRange").default} [tempTileRange] Temporary import("../TileRange").default object.
     * @param {Extent} [tempExtent] Temporary Extent object.
     * @return {boolean} Callback succeeded.
     */
    forEachTileCoordParentTileRange(
        tileCoord: TileCoord,
        callback: (arg0: number, arg1: import("../TileRange").default) => boolean,
        tempTileRange: import("../TileRange").default,
        tempExtent: Extent,
    ): boolean {
        let tileRange, x, y;
        let tileCoordExtent = null;
        let z = tileCoord[0] - 1;
        if (this.zoomFactor_ === 2) {
            x = tileCoord[1];
            y = tileCoord[2];
        } else {
            tileCoordExtent = this.getTileCoordExtent(tileCoord, tempExtent);
        }
        while (z >= this.minZoom) {
            if (x !== undefined && y !== undefined) {
                x = Math.floor(x / 2);
                y = Math.floor(y / 2);
                tileRange = createOrUpdateTileRange(x, x, y, y, tempTileRange);
            } else {
                tileRange = this.getTileRangeForExtentAndZ(
                    tileCoordExtent,
                    z,
                    tempTileRange,
                );
            }
            if (callback(z, tileRange)) {
                return true;
            }
            --z;
        }
        return false;
    }

    /**
     * Get the extent for this tile grid, if it was configured.
     * @return {Extent} Extent.
     * @api
     */
    getExtent(): Extent {
        return this.extent_;
    }

    /**
     * Get the maximum zoom level for the grid.
     * @return Max zoom.
     * @api
     */
    getMaxZoom(): number {
        return this.maxZoom;
    }

    /**
     * Get the minimum zoom level for the grid.
     * @return Min zoom.
     * @api
     */
    getMinZoom(): number {
        return this.minZoom;
    }

    /**
     * Get the origin for the grid at the given zoom level.
     * @param z Integer zoom level.
     * @return {Coordinate} Origin.
     * @api
     */
    getOrigin(z: number): Coordinate {
        if (this.origin_) {
            return this.origin_;
        }
        return this.origins_[z];
    }

    /**
     * Get the resolution for the given zoom level.
     * @param z Integer zoom level.
     * @return Resolution.
     * @api
     */
    getResolution(z: number): number {
        return this.resolutions_[z];
    }

    /**
     * Get the list of resolutions for the tile grid.
     * @return {number[]} Resolutions.
     * @api
     */
    getResolutions(): number[] {
        return this.resolutions_;
    }

    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {import("../TileRange").default} [tempTileRange] Temporary import("../TileRange").default object.
     * @param {Extent} [tempExtent] Temporary Extent object.
     * @return {import("../TileRange").default|null} Tile range.
     */
    getTileCoordChildTileRange(tileCoord: TileCoord, tempTileRange: import("../TileRange").default, tempExtent: Extent): import("../TileRange").default | null {
        if (tileCoord[0] < this.maxZoom) {
            if (this.zoomFactor_ === 2) {
                const minX = tileCoord[1] * 2;
                const minY = tileCoord[2] * 2;
                return createOrUpdateTileRange(
                    minX,
                    minX + 1,
                    minY,
                    minY + 1,
                    tempTileRange,
                );
            }
            const tileCoordExtent = this.getTileCoordExtent(
                tileCoord,
                tempExtent || this.tmpExtent_,
            );
            return this.getTileRangeForExtentAndZ(
                tileCoordExtent,
                tileCoord[0] + 1,
                tempTileRange,
            );
        }
        return null;
    }

    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param z Integer zoom level.
     * @param {import("../TileRange").default} [tempTileRange] Temporary import("../TileRange").default object.
     * @return {import("../TileRange").default|null} Tile range.
     */
    getTileRangeForTileCoordAndZ(tileCoord: TileCoord, z: number, tempTileRange: import("../TileRange").default): import("../TileRange").default | null {
        if (z > this.maxZoom || z < this.minZoom) {
            return null;
        }

        const tileCoordZ = tileCoord[0];
        const tileCoordX = tileCoord[1];
        const tileCoordY = tileCoord[2];

        if (z === tileCoordZ) {
            return createOrUpdateTileRange(
                tileCoordX,
                tileCoordY,
                tileCoordX,
                tileCoordY,
                tempTileRange,
            );
        }

        if (this.zoomFactor_) {
            const factor = Math.pow(this.zoomFactor_, z - tileCoordZ);
            const minX = Math.floor(tileCoordX * factor);
            const minY = Math.floor(tileCoordY * factor);
            if (z < tileCoordZ) {
                return createOrUpdateTileRange(minX, minX, minY, minY, tempTileRange);
            }

            const maxX = Math.floor(factor * (tileCoordX + 1)) - 1;
            const maxY = Math.floor(factor * (tileCoordY + 1)) - 1;
            return createOrUpdateTileRange(minX, maxX, minY, maxY, tempTileRange);
        }

        const tileCoordExtent = this.getTileCoordExtent(tileCoord, this.tmpExtent_);
        return this.getTileRangeForExtentAndZ(tileCoordExtent, z, tempTileRange);
    }

    /**
     * Get a tile range for the given extent and integer zoom level.
     * @param {Extent} extent Extent.
     * @param z Integer zoom level.
     * @param {import("../TileRange").default} [tempTileRange] Temporary tile range object.
     * @return {import("../TileRange").default} Tile range.
     */
    getTileRangeForExtentAndZ(extent: Extent, z: number, tempTileRange: import("../TileRange").default): import("../TileRange").default {
        this.getTileCoordForXYAndZ_(extent[0], extent[3], z, false, tmpTileCoord);
        const minX = tmpTileCoord[1];
        const minY = tmpTileCoord[2];
        this.getTileCoordForXYAndZ_(extent[2], extent[1], z, true, tmpTileCoord);
        const maxX = tmpTileCoord[1];
        const maxY = tmpTileCoord[2];
        return createOrUpdateTileRange(minX, maxX, minY, maxY, tempTileRange);
    }

    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @return {Coordinate} Tile center.
     */
    getTileCoordCenter(tileCoord: TileCoord): Coordinate {
        const origin = this.getOrigin(tileCoord[0]);
        const resolution = this.getResolution(tileCoord[0]);
        const tileSize = toSize(this.getTileSize(tileCoord[0]), this.tmpSize_);
        return [
            origin[0] + (tileCoord[1] + 0.5) * tileSize[0] * resolution,
            origin[1] - (tileCoord[2] + 0.5) * tileSize[1] * resolution,
        ];
    }

    /**
     * Get the extent of a tile coordinate.
     *
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {Extent} [tempExtent] Temporary extent object.
     * @return {Extent} Extent.
     * @api
     */
    getTileCoordExtent(tileCoord: TileCoord, tempExtent: Extent): Extent {
        const origin = this.getOrigin(tileCoord[0]);
        const resolution = this.getResolution(tileCoord[0]);
        const tileSize = toSize(this.getTileSize(tileCoord[0]), this.tmpSize_);
        const minX = origin[0] + tileCoord[1] * tileSize[0] * resolution;
        const minY = origin[1] - (tileCoord[2] + 1) * tileSize[1] * resolution;
        const maxX = minX + tileSize[0] * resolution;
        const maxY = minY + tileSize[1] * resolution;
        return createOrUpdate(minX, minY, maxX, maxY, tempExtent);
    }

    /**
     * Get the tile coordinate for the given map coordinate and resolution.  This
     * method considers that coordinates that intersect tile boundaries should be
     * assigned the higher tile coordinate.
     *
     * @param {Coordinate} coordinate Coordinate.
     * @param resolution Resolution.
     * @param {TileCoord} [opt_tileCoord] Destination TileCoord object.
     * @return {TileCoord} Tile coordinate.
     * @api
     */
    getTileCoordForCoordAndResolution(coordinate: Coordinate, resolution: number, opt_tileCoord: TileCoord): TileCoord {
        return this.getTileCoordForXYAndResolution_(
            coordinate[0],
            coordinate[1],
            resolution,
            false,
            opt_tileCoord,
        );
    }

    /**
     * Note that this method should not be called for resolutions that correspond
     * to an integer zoom level.  Instead call the `getTileCoordForXYAndZ_` method.
     * @param x X.
     * @param y Y.
     * @param resolution Resolution (for a non-integer zoom level).
     * @param {boolean} reverseIntersectionPolicy Instead of letting edge
     *     intersections go to the higher tile coordinate, let edge intersections
     *     go to the lower tile coordinate.
     * @param {TileCoord} [opt_tileCoord] Temporary TileCoord object.
     * @return {TileCoord} Tile coordinate.
     * @private
     */
    getTileCoordForXYAndResolution_(
        x: number,
        y: number,
        resolution: number,
        reverseIntersectionPolicy: boolean,
        opt_tileCoord: TileCoord,
    ): TileCoord {
        const z = this.getZForResolution(resolution);
        const scale = resolution / this.getResolution(z);
        const origin = this.getOrigin(z);
        const tileSize = toSize(this.getTileSize(z), this.tmpSize_);

        let tileCoordX = (scale * (x - origin[0])) / resolution / tileSize[0];
        let tileCoordY = (scale * (origin[1] - y)) / resolution / tileSize[1];

        if (reverseIntersectionPolicy) {
            tileCoordX = ceil(tileCoordX, DECIMALS) - 1;
            tileCoordY = ceil(tileCoordY, DECIMALS) - 1;
        } else {
            tileCoordX = floor(tileCoordX, DECIMALS);
            tileCoordY = floor(tileCoordY, DECIMALS);
        }

        return createOrUpdateTileCoord(z, tileCoordX, tileCoordY, opt_tileCoord);
    }

    /**
     * Although there is repetition between this method and `getTileCoordForXYAndResolution_`,
     * they should have separate implementations.  This method is for integer zoom
     * levels.  The other method should only be called for resolutions corresponding
     * to non-integer zoom levels.
     * @param x Map x coordinate.
     * @param y Map y coordinate.
     * @param z Integer zoom level.
     * @param {boolean} reverseIntersectionPolicy Instead of letting edge
     *     intersections go to the higher tile coordinate, let edge intersections
     *     go to the lower tile coordinate.
     * @param {TileCoord} [opt_tileCoord] Temporary TileCoord object.
     * @return {TileCoord} Tile coordinate.
     * @private
     */
    getTileCoordForXYAndZ_(x: number, y: number, z: number, reverseIntersectionPolicy: boolean, opt_tileCoord: TileCoord): TileCoord {
        const origin = this.getOrigin(z);
        const resolution = this.getResolution(z);
        const tileSize = toSize(this.getTileSize(z), this.tmpSize_);

        let tileCoordX = (x - origin[0]) / resolution / tileSize[0];
        let tileCoordY = (origin[1] - y) / resolution / tileSize[1];

        if (reverseIntersectionPolicy) {
            tileCoordX = ceil(tileCoordX, DECIMALS) - 1;
            tileCoordY = ceil(tileCoordY, DECIMALS) - 1;
        } else {
            tileCoordX = floor(tileCoordX, DECIMALS);
            tileCoordY = floor(tileCoordY, DECIMALS);
        }

        return createOrUpdateTileCoord(z, tileCoordX, tileCoordY, opt_tileCoord);
    }

    /**
     * Get a tile coordinate given a map coordinate and zoom level.
     * @param {Coordinate} coordinate Coordinate.
     * @param z Integer zoom level, e.g. the result of a `getZForResolution()` method call
     * @param {TileCoord} [opt_tileCoord] Destination TileCoord object.
     * @return {TileCoord} Tile coordinate.
     * @api
     */
    getTileCoordForCoordAndZ(
        coordinate: Coordinate,
        z: number,
        opt_tileCoord?: TileCoord
    ): TileCoord {
        return this.getTileCoordForXYAndZ_(
            coordinate[0],
            coordinate[1],
            z,
            false,
            opt_tileCoord,
        );
    }

    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @return Tile resolution.
     */
    getTileCoordResolution(tileCoord: TileCoord): number {
        return this.resolutions_[tileCoord[0]];
    }

    /**
     * Get the tile size for a zoom level. The type of the return value matches the
     * `tileSize` or `tileSizes` that the tile grid was configured with. To always
     * get an {@link Size}, run the result through {@link module:ol/size.toSize}.
     * @param z Z.
     * @return {number|Size} Tile size.
     * @api
     */
    getTileSize(z: number): number | Size {
        if (this.tileSize_) {
            return this.tileSize_;
        }
        return this.tileSizes_[z];
    }

    /**
     * @param z Zoom level.
     * @return {import("../TileRange").default|null} Extent tile range for the specified zoom level.
     */
    getFullTileRange(z: number): import("../TileRange").default | null {
        if (!this.fullTileRanges_) {
            return this.extent_
                ? this.getTileRangeForExtentAndZ(this.extent_, z)
                : null;
        }
        return this.fullTileRanges_[z];
    }

    /**
     * @param resolution Resolution.
     * @param {number|import("../array").NearestDirectionFunction} [opt_direction]
     *     If 0, the nearest resolution will be used.
     *     If 1, the nearest higher resolution (lower Z) will be used. If -1, the
     *     nearest lower resolution (higher Z) will be used. Default is 0.
     *     Use a {@link module:ol/array~NearestDirectionFunction} for more precise control.
     *
     * For example to change tile Z at the midpoint of zoom levels
     * ```js
     * function(value, high, low) {
     *   return value - low * Math.sqrt(high / low);
     * }
     * ```
     * @return Z.
     * @api
     */
    getZForResolution(resolution: number, opt_direction: number | import("../array").NearestDirectionFunction): number {
        const z = linearFindNearest(
            this.resolutions_,
            resolution,
            opt_direction || 0,
        );
        return clamp(z, this.minZoom, this.maxZoom);
    }

    /**
     * The tile with the provided tile coordinate intersects the given viewport.
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {number[]} viewport Viewport as returned from {@link module:ol/extent.getRotatedViewport}.
     * @return {boolean} The tile with the provided tile coordinate intersects the given viewport.
     */
    tileCoordIntersectsViewport(tileCoord: TileCoord, viewport: number[]): boolean {
        return intersectsLinearRing(
            viewport,
            0,
            viewport.length,
            2,
            this.getTileCoordExtent(tileCoord),
        );
    }

    /**
     * @param {!Extent} extent Extent for this tile grid.
     * @private
     */
    calculateTileRanges_(extent: Extent) {
        const length = this.resolutions_.length;
        const fullTileRanges = new Array(length);
        for (let z = this.minZoom; z < length; ++z) {
            fullTileRanges[z] = this.getTileRangeForExtentAndZ(extent, z);
        }
        this.fullTileRanges_ = fullTileRanges;
    }
}

export default TileGrid;
