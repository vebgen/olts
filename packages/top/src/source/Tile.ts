
import { BaseEvent as Event, EventsKey, Options } from '@olts/events';
import Source from './Source';
import TileCache from '../TileCache';
import type { TileState} from '../tile';
import { abstract } from '@olts/core/util';
import { assert } from '@olts/core/asserts';
import { equivalent } from '../proj';
import { getKeyZXY, withinExtentAndZ } from '../tile-coord';
import {
    getForProjection as getTileGridForProjection,
    wrapX,
} from '../tile-grid';
import { scale as scaleSize, toSize } from '../size';
import { Size } from '@olts/core/size';

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType, import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<import("./TileEventType").TileSourceEventTypes, TileSourceEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType|
 *     import("./TileEventType").TileSourceEventTypes, Return>} TileSourceOnSignature
 */

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property {boolean} [attributionsCollapsible=true] Attributions are collapsible.
 * @property [cacheSize] CacheSize.
 * @property {boolean} [opaque=false] Whether the layer is opaque.
 * @property [tilePixelRatio] TilePixelRatio.
 * @property {ProjectionLike} [projection] Projection.
 * @property {import("./Source").State} [state] State.
 * @property {import("../tilegrid/TileGrid").default} [tileGrid] TileGrid.
 * @property {boolean} [wrapX=false] WrapX.
 * @property [transition] Transition.
 * @property [key] Key.
 * @property {number|import("../array").NearestDirectionFunction} [zDirection=0] ZDirection.
 * @property {boolean} [interpolate=false] Use interpolated values when resampling.  By default,
 * the nearest neighbor is used when resampling.
 */

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for sources providing images divided into a tile grid.
 * @abstract
 * @api
 */
export class TileSource extends Source {

    /**
     *
     */
    override on: TileSourceOnSignature<EventsKey>;

    /**
     *
     */
    override once: TileSourceOnSignature<EventsKey>;

    /**
     *
     */
    override un: TileSourceOnSignature<void>;

    /**
     * @param {Options} options SourceTile source options.
     */
    constructor(options: Options) {
        super({
            attributions: options.attributions,
            attributionsCollapsible: options.attributionsCollapsible,
            projection: options.projection,
            state: options.state,
            wrapX: options.wrapX,
            interpolate: options.interpolate,
        });
        this.on = this.onInternal as TileSourceOnSignature<EventsKey>;
        this.once = this.onceInternal as TileSourceOnSignature<EventsKey>;
        this.un = this.unInternal as TileSourceOnSignature<void>;

        /**
         * @private
         * @type {boolean}
         */
        this.opaque_ = options.opaque !== undefined ? options.opaque : false;

        /**
         * @private
         * @type {number}
         */
        this.tilePixelRatio_ =
            options.tilePixelRatio !== undefined ? options.tilePixelRatio : 1;

        /**
         * @type {import("../tilegrid/TileGrid").default|null}
         */
        this.tileGrid = options.tileGrid !== undefined ? options.tileGrid : null;

        const tileSize = [256, 256];
        if (this.tileGrid) {
            toSize(this.tileGrid.getTileSize(this.tileGrid.getMinZoom()), tileSize);
        }

        /**
         * @protected
         * @type {import("../TileCache").default}
         */
        this.tileCache = new TileCache(options.cacheSize || 0);

        /**
         * @protected
         * @type {Size}
         */
        this.tmpSize = [0, 0];

        /**
         * @private
         * @type {string}
         */
        this.key_ = options.key || '';

        /**
         * @protected
         * @type {import("../Tile").Options}
         */
        this.tileOptions = {
            transition: options.transition,
            interpolate: options.interpolate,
        };

        /**
         * zDirection hint, read by the renderer. Indicates which resolution should be used
         * by a renderer if the views resolution does not match any resolution of the tile source.
         * If 0, the nearest resolution will be used. If 1, the nearest lower resolution
         * will be used. If -1, the nearest higher resolution will be used.
         * @type {number|import("../array").NearestDirectionFunction}
         */
        this.zDirection = options.zDirection ? options.zDirection : 0;
    }

    /**
     * @return {boolean} Can expire cache.
     */
    canExpireCache(): boolean {
        return this.tileCache.canExpireCache();
    }

    /**
     * @param {import("../proj/Projection").default} projection Projection.
     * @param {!Record<string, boolean>} usedTiles Used tiles.
     */
    expireCache(projection: import("../proj/Projection").default, usedTiles: { [s: string]: boolean; }) {
        const tileCache = this.getTileCacheForProjection(projection);
        if (tileCache) {
            tileCache.expireCache(usedTiles);
        }
    }

    /**
     * @param {import("../proj/Projection").default} projection Projection.
     * @param z Zoom level.
     * @param {import("../TileRange").default} tileRange Tile range.
     * @param {function(import("../Tile").default):(boolean|void)} callback Called with each
     *     loaded tile.  If the callback returns `false`, the tile will not be
     *     considered loaded.
     * @return {boolean} The tile range is fully covered with loaded tiles.
     */
    forEachLoadedTile(projection: import("../proj/Projection").default, z: number, tileRange: import("../TileRange").default, callback: (arg0: import("../tile").default) => (boolean | void)): boolean {
        const tileCache = this.getTileCacheForProjection(projection);
        if (!tileCache) {
            return false;
        }

        let covered = true;
        let tile, tileCoordKey, loaded;
        for (let x = tileRange.minX; x <= tileRange.maxX; ++x) {
            for (let y = tileRange.minY; y <= tileRange.maxY; ++y) {
                tileCoordKey = getKeyZXY(z, x, y);
                loaded = false;
                if (tileCache.containsKey(tileCoordKey)) {
                    tile = /** @type {!import("../Tile").default} */ (
                        tileCache.get(tileCoordKey)
                    );
                    loaded = tile.getState() === TileStates.LOADED;
                    if (loaded) {
                        loaded = callback(tile) !== false;
                    }
                }
                if (!loaded) {
                    covered = false;
                }
            }
        }
        return covered;
    }

    /**
     * @param {import("../proj/Projection").default} projection Projection.
     * @return Gutter.
     */
    getGutterForProjection(projection: import("../proj/Projection").default): number {
        return 0;
    }

    /**
     * Return the key to be used for all tiles in the source.
     * @return The key for all tiles.
     */
    getKey(): string {
        return this.key_;
    }

    /**
     * Set the value to be used as the key for all tiles in the source.
     * @param key The key for tiles.
     * @protected
     */
    setKey(key: string) {
        if (this.key_ !== key) {
            this.key_ = key;
            this.changed();
        }
    }

    /**
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {boolean} Opaque.
     */
    getOpaque(projection: import("../proj/Projection").default): boolean {
        return this.opaque_;
    }

    /**
     * @param {import("../proj/Projection").default} [projection] Projection.
     * @return {number[]|null} Resolutions.
     */
    getResolutions(projection: import("../proj/Projection").default): number[] | null {
        const tileGrid = projection
            ? this.getTileGridForProjection(projection)
            : this.tileGrid;
        if (!tileGrid) {
            return null;
        }
        return tileGrid.getResolutions();
    }

    /**
     * @abstract
     * @param z Tile coordinate z.
     * @param x Tile coordinate x.
     * @param y Tile coordinate y.
     * @param pixelRatio Pixel ratio.
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {!import("../Tile").default} Tile.
     */
    getTile(z: number, x: number, y: number, pixelRatio: number, projection: import("../proj/Projection").default): import("../tile").default {
        return abstract();
    }

    /**
     * Return the tile grid of the tile source.
     * @return {import("../tilegrid/TileGrid").default|null} Tile grid.
     * @api
     */
    getTileGrid(): import("../tile-grid/TileGrid").default | null {
        return this.tileGrid;
    }

    /**
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {!import("../tilegrid/TileGrid").default} Tile grid.
     */
    getTileGridForProjection(projection: import("../proj/Projection").default): import("../tile-grid/TileGrid").default {
        if (!this.tileGrid) {
            return getTileGridForProjection(projection);
        }
        return this.tileGrid;
    }

    /**
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {import("../TileCache").default} Tile cache.
     * @protected
     */
    getTileCacheForProjection(projection: import("../proj/Projection").default): import("../TileCache").default {
        const sourceProjection = this.getProjection();
        assert(
            sourceProjection === null || equivalent(sourceProjection, projection),
            'A VectorTile source can only be rendered if it has a projection compatible with the view projection.',
        );
        return this.tileCache;
    }

    /**
     * Get the tile pixel ratio for this source. Subclasses may override this
     * method, which is meant to return a supported pixel ratio that matches the
     * provided `pixelRatio` as close as possible.
     * @param pixelRatio Pixel ratio.
     * @return Tile pixel ratio.
     */
    getTilePixelRatio(pixelRatio: number): number {
        return this.tilePixelRatio_;
    }

    /**
     * @param z Z.
     * @param pixelRatio Pixel ratio.
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {Size} Tile size.
     */
    getTilePixelSize(z: number, pixelRatio: number, projection: import("../proj/Projection").default): Size {
        const tileGrid = this.getTileGridForProjection(projection);
        const tilePixelRatio = this.getTilePixelRatio(pixelRatio);
        const tileSize = toSize(tileGrid.getTileSize(z), this.tmpSize);
        if (tilePixelRatio == 1) {
            return tileSize;
        }
        return scaleSize(tileSize, tilePixelRatio, this.tmpSize);
    }

    /**
     * Returns a tile coordinate wrapped around the x-axis. When the tile coordinate
     * is outside the resolution and extent range of the tile grid, `null` will be
     * returned.
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {import("../proj/Projection").default} [projection] Projection.
     * @return {TileCoord} Tile coordinate to be passed to the tileUrlFunction or
     *     null if no tile URL should be created for the passed `tileCoord`.
     */
    getTileCoordForTileUrlFunction(tileCoord: TileCoord, projection: import("../proj/Projection").default): TileCoord {
        projection = projection !== undefined ? projection : this.getProjection();
        const tileGrid = this.getTileGridForProjection(projection);
        if (this.getWrapX() && projection.isGlobal()) {
            tileCoord = wrapX(tileGrid, tileCoord, projection);
        }
        return withinExtentAndZ(tileCoord, tileGrid) ? tileCoord : null;
    }

    /**
     * Remove all cached tiles from the source. The next render cycle will fetch new tiles.
     * @api
     */
    clear() {
        this.tileCache.clear();
    }

    refresh() {
        this.clear();
        super.refresh();
    }

    /**
     * Increases the cache size if needed
     * @param tileCount Minimum number of tiles needed.
     * @param {import("../proj/Projection").default} projection Projection.
     */
    updateCacheSize(tileCount: number, projection: import("../proj/Projection").default) {
        const tileCache = this.getTileCacheForProjection(projection);
        if (tileCount > tileCache.highWaterMark) {
            tileCache.highWaterMark = tileCount;
        }
    }

    /**
     * Marks a tile coord as being used, without triggering a load.
     * @abstract
     * @param z Tile coordinate z.
     * @param x Tile coordinate x.
     * @param y Tile coordinate y.
     * @param {import("../proj/Projection").default} projection Projection.
     */
    useTile(z: number, x: number, y: number, projection: import("../proj/Projection").default) { }
}

/**
 * Events emitted by {@link TileSource} instances are instances of this
 * type.
 */
export class TileSourceEvent extends Event {
    /**
     * @param type Type.
     * @param {import("../Tile").default} tile The tile.
     */
    constructor(type: string, tile: import("../tile").default) {
        super(type);

        /**
         * The tile related to the event.
         * @type {import("../Tile").default}
         * @api
         */
        this.tile = tile;
    }
}

export default TileSource;
