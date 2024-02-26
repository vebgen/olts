import { ValueOf } from '@olts/core';
import { Target as EventTarget, EventTypes } from '@olts/events';
import { Projection } from '@olts/core/proj';
import { easeIn } from '@olts/core/easing';

import { TileCoord } from './tile-coord';



/**
 *
 */
export const TileStates = {
    IDLE: 0,
    LOADING: 1,
    LOADED: 2,

    /**
     * Indicates that tile loading failed
     */
    ERROR: 3,
    EMPTY: 4,
} as const;


export type TileState = ValueOf<typeof TileStates>;



/**
 * A function that takes an {@link Tile} for the tile and a `{string}` for the
 * url as arguments. The default is
 *
 * ```js
 * source.setTileLoadFunction(function(tile, src) {
 *   tile.getImage().src = src;
 * });
 * ```
 *
 * For more fine grained control, the load function can use fetch or
 * XMLHttpRequest and involve error handling:
 *
 * ```js
 * import TileState from 'ol/TileState';
 *
 * source.setTileLoadFunction(function(tile, src) {
 *   const xhr = new XMLHttpRequest();
 *   xhr.responseType = 'blob';
 *   xhr.addEventListener('loadend', function (evt) {
 *     const data = this.response;
 *     if (data !== undefined) {
 *       tile.getImage().src = URL.createObjectURL(data);
 *     } else {
 *       tile.setState(TileStates.ERROR);
 *     }
 *   });
 *   xhr.addEventListener('error', function () {
 *     tile.setState(TileStates.ERROR);
 *   });
 *   xhr.open('GET', src);
 *   xhr.send();
 * });
 * ```
 *
 * @api
 */
export type LoadFunction = (tile: Tile, src: string) => void;


/**
 * {@link TileSource} sources use a function of this type to get the url that
 * provides a tile for a given tile coordinate.
 *
 * This function takes an {@link TileCoord} for the tile coordinate, a
 * `{number}` representing the pixel ratio and a {@link Projection} for the
 * projection  as arguments and returns a `{string}` representing the tile URL,
 * or undefined if no tile should be requested for the passed tile coordinate.
 *
 * @api
 */
export type UrlFunction = (
    tileCoord: TileCoord,
    pixelRatio: number,
    projection: Projection
) => string | undefined;


/**
 * 
 * @api
 */
export interface Options {
    /**
     * A duration for tile opacity transitions in milliseconds.
     * 
     * A duration of 0 disables the opacity transition.
     * 
     * @default 250
     */
    transition?: number;

    /**
     * Use interpolated values when resampling.
     * 
     * By default, the nearest neighbor is used when resampling.
     * 
     * @default false
     */
    interpolate?: boolean;
}


/**
 * Base class for tiles.
 *
 */
export abstract class Tile extends EventTarget {
    /**
     * The tile coordinate.
     */
    tileCoord: TileCoord;

    /**
     * State.
     */
    protected state: TileState;

    /**
     * An "interim" tile for this tile.
     *
     * The interim tile may be used while this one is loading, for "smooth"
     * transitions when changing params/dimensions on the source.
     */
    interimTile: Tile | null = null;

    /**
     * A key assigned to the tile.
     *
     * This is used by the tile source to determine if this tile can
     * effectively be used, or if a new tile should be created and this one be
     * used as an interim tile for this new tile.
     */
    key: string = '';

    /**
     * The duration for the opacity transition.
     */
    transition_: number;

    /**
     * Lookup of start times for rendering transitions.
     * 
     * If the start time is
     * equal to -1, the transition is complete.
     */
    transitionStarts_: Record<string, number> = {};

    /**
     *
     */
    interpolate: boolean;

    /**
     * @param tileCoord Tile coordinate.
     * @param state State.
     * @param {Options} [options] Tile options.
     */
    constructor(tileCoord: TileCoord, state: TileState, options: Options) {
        super();

        options = options ? options : {};
        this.tileCoord = tileCoord;
        this.state = state;
        this.transition_ = options.transition === undefined
            ? 250
            : options.transition;
        this.interpolate = !!options.interpolate;
    }

    /**
     *
     */
    protected changed() {
        this.dispatchEvent(EventTypes.CHANGE);
    }

    /**
     * Called by the tile cache when the tile is removed from the cache due to
     * expiry
     */
    release() {
        if (this.state === TileStates.ERROR) {
            // to remove the `change` listener on this tile in
            // `ol/TileQueue#handleTileChange`
            this.setState(TileStates.EMPTY);
        }
    }

    /**
     * @return Key.
     */
    getKey(): string {
        return this.key + '/' + this.tileCoord;
    }

    /**
     * Get the interim tile most suitable for rendering using the chain of
     * interim tiles.
     *
     * This corresponds to the  most recent tile that has been loaded, if no
     * such tile exists, the original tile is returned.
     * 
     * @return Best tile for rendering.
     */
    getInterimTile(): Tile {
        let tile = this.interimTile;
        if (!tile) {
            //empty chain
            return this;
        }

        // find the first loaded tile and return it. Since the chain is sorted
        // in decreasing order of creation time, there is no need to search the
        // remainder of the list (all those tiles correspond to older requests
        // and will be cleaned up by refreshInterimChain)
        do {
            if (tile.getState() == TileStates.LOADED) {
                // Show tile immediately instead of fading it in after loading,
                // because the interim tile is in place already
                this.transition_ = 0;
                return tile;
            }
            tile = tile.interimTile;
        } while (tile);

        // we can not find a better tile
        return this;
    }

    /**
     * Goes through the chain of interim tiles and discards sections of the
     * chain that are no longer relevant.
     */
    refreshInterimChain() {
        let tile = this.interimTile;
        if (!tile) {
            return;
        }

        let prev: Tile = this;
        do {
            if (tile.getState() == TileStates.LOADED) {
                //we have a loaded tile, we can discard the rest of the list we
                //would could abort any LOADING tile request older than this
                //tile (i.e. any LOADING tile following this entry in the
                //chain)
                tile.interimTile = null;
                break;
            }
            if (tile.getState() == TileStates.LOADING) {
                //keep this LOADING tile any loaded tiles later in the chain
                //are older than this tile, so we're still interested in the
                //request
                prev = tile;
            } else if (tile.getState() == TileStates.IDLE) {
                //the head of the list is the most current tile, we don't need
                //to start any other requests for this chain
                prev.interimTile = tile.interimTile;
            } else {
                prev = tile;
            }
            tile = prev.interimTile;
        } while (tile);
    }

    /**
     * Get the tile coordinate for this tile.
     * 
     * @return The tile coordinate.
     * @api
     */
    getTileCoord(): TileCoord {
        return this.tileCoord;
    }

    /**
     * 
     * 
     * @return State.
     */
    getState(): TileState {
        return this.state;
    }

    /**
     * Sets the state of this tile.
     *
     * If you write your own {@link LoadFunction tileLoadFunction} , it is
     * important to set the state correctly to
     * {@link module:ol/TileState~ERROR} when the tile cannot be loaded.
     * Otherwise the tile cannot be removed from the tile queue and will block
     * other requests.
     *
     * @param state State.
     * @api
     */
    setState(state: TileState) {
        if (this.state !== TileStates.ERROR && this.state > state) {
            throw new Error('Tile load sequence violation');
        }
        this.state = state;
        this.changed();
    }

    /**
     * Load the image or retry if loading previously failed.
     *
     * Loading is taken care of by the tile queue, and calling this method is
     * only needed for preloading or for reloading in case of an error.
     *
     * @api
     */
    abstract load(): any;

    /**
     * Get the alpha value for rendering.
     * 
     * @param id An id for the renderer.
     * @param time The render frame time.
     * @return A number between 0 and 1.
     */
    getAlpha(id: string, time: number): number {
        if (!this.transition_) {
            return 1;
        }

        let start = this.transitionStarts_[id];
        if (!start) {
            start = time;
            this.transitionStarts_[id] = start;
        } else if (start === -1) {
            return 1;
        }

        const delta = time - start + 1000 / 60; // avoid rendering at 0
        if (delta >= this.transition_) {
            return 1;
        }
        return easeIn(delta / this.transition_);
    }

    /**
     * Determine if a tile is in an alpha transition.
     *
     * A tile is considered in transition if tile.getAlpha() has not yet been
     * called or has been called and returned 1.
     * 
     * @param id An id for the renderer.
     * @return The tile is in transition.
     */
    inTransition(id: string): boolean {
        if (!this.transition_) {
            return false;
        }
        return this.transitionStarts_[id] !== -1;
    }

    /**
     * Mark a transition as complete.
     * 
     * @param id An id for the renderer.
     */
    endTransition(id: string) {
        if (this.transition_) {
            this.transitionStarts_[id] = -1;
        }
    }
}


export default Tile;
