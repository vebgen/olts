
import Tile from './tile';
import type { TileState } from './tile';

export class VectorTile extends Tile {
    /**
     * @param {TileCoord} tileCoord Tile coordinate.
     * @param {TileState} state State.
     * @param {string} src Data source url.
     * @param {import("./format/Feature").default<typeof import("./Feature").default|typeof import("./render/Feature").default>} format Feature format.
     * @param {import("./Tile").LoadFunction} tileLoadFunction Tile load function.
     * @param {import("./Tile").Options} [options] Tile options.
     */
    constructor(tileCoord: TileCoord, state: TileState, src: string, format: import("./format/Feature").default<typeof import("./Feature").default | typeof import("./render/Feature").default>, tileLoadFunction: import("./Tile").LoadFunction, options: import("./Tile").Options) {
        super(tileCoord, state, options);

        /**
         * Extent of this tile; set by the source.
         * @type {Extent}
         */
        this.extent = null;

        /**
         * @private
         * @type {import("./format/Feature").default}
         */
        this.format_ = format;

        /**
         * @private
         * @type {Array<import("./Feature").FeatureLike>}
         */
        this.features_ = null;

        /**
         * @private
         * @type {import("./featureloader").FeatureLoader}
         */
        this.loader_;

        /**
         * Feature projection of this tile; set by the source.
         * @type {Projection}
         */
        this.projection = null;

        /**
         * Resolution of this tile; set by the source.
         * @type {number}
         */
        this.resolution;

        /**
         * @private
         * @type {import("./Tile").LoadFunction}
         */
        this.tileLoadFunction_ = tileLoadFunction;

        /**
         * @private
         * @type {string}
         */
        this.url_ = src;

        this.key = src;
    }

    /**
     * Get the feature format assigned for reading this tile's features.
     * @return {import("./format/Feature").default} Feature format.
     * @api
     */
    getFormat(): import("./format/Feature").default {
        return this.format_;
    }

    /**
     * Get the features for this tile. Geometries will be in the view projection.
     * @return {Array<import("./Feature").FeatureLike>} Features.
     * @api
     */
    getFeatures(): Array<import("./Feature").FeatureLike> {
        return this.features_;
    }

    /**
     * Load not yet loaded URI.
     */
    load() {
        if (this.state == TileStates.IDLE) {
            this.setState(TileStates.LOADING);
            this.tileLoadFunction_(this, this.url_);
            if (this.loader_) {
                this.loader_(this.extent, this.resolution, this.projection);
            }
        }
    }

    /**
     * Handler for successful tile load.
     * @param {Array<import("./Feature").default>} features The loaded features.
     * @param {Projection} dataProjection Data projection.
     */
    onLoad(features: Array<import("./Feature").default>, dataProjection: Projection) {
        this.setFeatures(features);
    }

    /**
     * Handler for tile load errors.
     */
    onError() {
        this.setState(TileStates.ERROR);
    }

    /**
     * Function for use in an {@link module:ol/source/VectorTile~VectorTile}'s `tileLoadFunction`.
     * Sets the features for the tile.
     * @param {Array<import("./Feature").FeatureLike>} features Features.
     * @api
     */
    setFeatures(features: Array<import("./Feature").FeatureLike>) {
        this.features_ = features;
        this.setState(TileStates.LOADED);
    }

    /**
     * Set the feature loader for reading this tile's features.
     * @param {import("./featureloader").FeatureLoader} loader Feature loader.
     * @api
     */
    setLoader(loader: import("./feature-loader").FeatureLoader) {
        this.loader_ = loader;
    }
}

export default VectorTile;
