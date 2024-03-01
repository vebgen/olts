import Tile from './tile';
import { createCanvasContext2D, releaseCanvas } from '@olts/core/dom';
import { getUid } from '@olts/core/util';

/**
 * @typedef {Object} ReplayState
 * @property {boolean} dirty Dirty.
 * @property {null|import("./render").OrderFunction} renderedRenderOrder RenderedRenderOrder.
 * @property renderedTileRevision RenderedTileRevision.
 * @property renderedResolution RenderedResolution.
 * @property renderedRevision RenderedRevision.
 * @property renderedTileResolution RenderedTileResolution.
 * @property renderedTileZ RenderedTileZ.
 */

/**
 * @type {HTMLCanvasElement[]}
 */
const canvasPool: HTMLCanvasElement[] = [];

export class VectorRenderTile extends Tile {
    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {TileState} state State.
     * @param {TileCoord} urlTileCoord Wrapped tile coordinate for source urls.
     * @param {function(VectorRenderTile):Array<import("./VectorTile").default>} getSourceTiles Function
     * to get source tiles for this tile.
     */
    constructor(tileCoord: TileCoord, state: TileState, urlTileCoord: TileCoord, getSourceTiles: (arg0: VectorRenderTile) => Array<import("./VectorTile").default>) {
        super(tileCoord, state, { transition: 0 });

        /**
         * @private
         * @type {!Record<string, CanvasRenderingContext2D>}
         */
        this.context_ = {};

        /**
         * Executor groups by layer uid. Entries are read/written by the renderer.
         * @type {Record<string, Array<import("./render/canvas/ExecutorGroup").default>>}
         */
        this.executorGroups = {};

        /**
         * Executor groups for decluttering, by layer uid. Entries are read/written by the renderer.
         * @type {Record<string, Array<import("./render/canvas/ExecutorGroup").default>>}
         */
        this.declutterExecutorGroups = {};

        /**
         * Number of loading source tiles. Read/written by the source.
         * @type {number}
         */
        this.loadingSourceTiles = 0;

        /**
         * @type {Record<number, ImageData>}
         */
        this.hitDetectionImageData = {};

        /**
         * @private
         * @type {!Record<string, ReplayState>}
         */
        this.replayState_ = {};

        /**
         * @type {Array<import("./VectorTile").default>}
         */
        this.sourceTiles = [];

        /**
         * @type {Record<string, boolean>}
         */
        this.errorTileKeys = {};

        /**
         * @type {number}
         */
        this.wantedResolution;

        /**
         * @type {!function():Array<import("./VectorTile").default>}
         */
        this.getSourceTiles = getSourceTiles.bind(undefined, this);

        /**
         * @type {TileCoord}
         */
        this.wrappedTileCoord = urlTileCoord;
    }

    /**
     * @param {import("./layer/Layer").default} layer Layer.
     * @return {CanvasRenderingContext2D} The rendering context.
     */
    getContext(layer: import("./layer/Layer").default): CanvasRenderingContext2D {
        const key = getUid(layer);
        if (!(key in this.context_)) {
            this.context_[key] = createCanvasContext2D(1, 1, canvasPool);
        }
        return this.context_[key];
    }

    /**
     * @param {import("./layer/Layer").default} layer Layer.
     * @return {boolean} Tile has a rendering context for the given layer.
     */
    hasContext(layer: import("./layer/Layer").default): boolean {
        return getUid(layer) in this.context_;
    }

    /**
     * Get the Canvas for this tile.
     * @param {import("./layer/Layer").default} layer Layer.
     * @return {HTMLCanvasElement} Canvas.
     */
    getImage(layer: import("./layer/Layer").default): HTMLCanvasElement {
        return this.hasContext(layer) ? this.getContext(layer).canvas : null;
    }

    /**
     * @param {import("./layer/Layer").default} layer Layer.
     * @return {ReplayState} The replay state.
     */
    getReplayState(layer: import("./layer/Layer").default): ReplayState {
        const key = getUid(layer);
        if (!(key in this.replayState_)) {
            this.replayState_[key] = {
                dirty: false,
                renderedRenderOrder: null,
                renderedResolution: NaN,
                renderedRevision: -1,
                renderedTileResolution: NaN,
                renderedTileRevision: -1,
                renderedTileZ: -1,
            };
        }
        return this.replayState_[key];
    }

    /**
     * Load the tile.
     */
    load() {
        this.getSourceTiles();
    }

    /**
     * Remove from the cache due to expiry
     */
    release() {
        for (const key in this.context_) {
            const context = this.context_[key];
            releaseCanvas(context);
            canvasPool.push(context.canvas);
            delete this.context_[key];
        }
        super.release();
    }
}

export default VectorRenderTile;
