
import type { EventType } from '@olts/events';
import ImageState from '../ImageState';
import Observable from '../Observable';
import {abstract} from '@olts/core/util';

/**
 * @template {import("../layer/Layer").default} LayerType
 */
export class LayerRenderer extends Observable {
  /**
   * @param {LayerType} layer Layer.
   */
  constructor(layer) {
    super();

    /**
     * The renderer is initialized and ready to render.
     * @type {boolean}
     */
    this.ready = true;

    /** @private */
    this.boundHandleImageChange_ = this.handleImageChange_.bind(this);

    /**
     * @protected
     * @type {LayerType}
     */
    this.layer_ = layer;

    /**
     * @type {import("../render/canvas/ExecutorGroup").default}
     */
    this.declutterExecutorGroup = null;
  }

  /**
   * Asynchronous layer level hit detection.
   * @param {import("../pixel").Pixel} pixel Pixel.
   * @return {Promise<Array<import("../Feature").FeatureLike>>} Promise that resolves with
   * an array of features.
   */
  getFeatures(pixel) {
    return abstract();
  }

  /**
   * @param {import("../pixel").Pixel} pixel Pixel.
   * @return {Uint8ClampedArray|Uint8Array|Float32Array|DataView|null} Pixel data.
   */
  getData(pixel) {
    return null;
  }

  /**
   * Determine whether render should be called.
   * @abstract
   * @param {import("../Map").FrameState} frameState Frame state.
   * @return {boolean} Layer is ready to be rendered.
   */
  prepareFrame(frameState) {
    return abstract();
  }

  /**
   * Render the layer.
   * @abstract
   * @param {import("../Map").FrameState} frameState Frame state.
   * @param {HTMLElement|null} target Target that may be used to render content to.
   * @return {HTMLElement|null} The rendered element.
   */
  renderFrame(frameState, target) {
    return abstract();
  }

  /**
   * @param {Record<number, Record<string, import("../Tile").default>>} tiles Lookup of loaded tiles by zoom level.
   * @param zoom Zoom level.
   * @param {import("../Tile").default} tile Tile.
   * @return {boolean|void} If `false`, the tile will not be considered loaded.
   */
  loadedTileCallback(tiles, zoom, tile) {
    if (!tiles[zoom]) {
      tiles[zoom] = {};
    }
    tiles[zoom][tile.tileCoord.toString()] = tile;
    return undefined;
  }

  /**
   * Create a function that adds loaded tiles to the tile lookup.
   * @param {import("../source/Tile").default} source Tile source.
   * @param {import("../proj/Projection").default} projection Projection of the tiles.
   * @param {Record<number, Record<string, import("../Tile").default>>} tiles Lookup of loaded tiles by zoom level.
   * @return {function(number, import("../TileRange").default):boolean} A function that can be
   *     called with a zoom level and a tile range to add loaded tiles to the lookup.
   * @protected
   */
  createLoadedTileFinder(source, projection, tiles) {
    return (
      /**
       * @param zoom Zoom level.
       * @param {import("../TileRange").default} tileRange Tile range.
       * @return {boolean} The tile range is fully loaded.
       */
      (zoom, tileRange) => {
        const callback = this.loadedTileCallback.bind(this, tiles, zoom);
        return source.forEachLoadedTile(projection, zoom, tileRange, callback);
      }
    );
  }
  /**
   * @abstract
   * @param {Coordinate} coordinate Coordinate.
   * @param {import("../Map").FrameState} frameState Frame state.
   * @param hitTolerance Hit tolerance in pixels.
   * @param {import("./vector").FeatureCallback<T>} callback Feature callback.
   * @param {Array<import("./Map").HitMatch<T>>} matches The hit detected matches with tolerance.
   * @return {T|undefined} Callback result.
   * @template T
   */
  forEachFeatureAtCoordinate(
    coordinate,
    frameState,
    hitTolerance,
    callback,
    matches,
  ) {
    return undefined;
  }

  /**
   * @return {LayerType} Layer.
   */
  getLayer() {
    return this.layer_;
  }

  /**
   * Perform action necessary to get the layer rendered after new fonts have loaded
   * @abstract
   */
  handleFontsChanged() {}

  /**
   * Handle changes in image state.
   * @param {import("../events/Event").default} event Image change event.
   * @private
   */
  handleImageChange_(event) {
    const image = /** @type {import("../Image").default} */ (event.target);
    if (
      image.getState() === ImageState.LOADED ||
      image.getState() === ImageState.ERROR
    ) {
      this.renderIfReadyAndVisible();
    }
  }

  /**
   * Load the image if not already loaded, and register the image change
   * listener if needed.
   * @param {import("../Image").default} image Image.
   * @return {boolean} `true` if the image is already loaded, `false` otherwise.
   * @protected
   */
  loadImage(image) {
    let imageState = image.getState();
    if (imageState != ImageState.LOADED && imageState != ImageState.ERROR) {
      image.addEventListener(EventTypes.CHANGE, this.boundHandleImageChange_);
    }
    if (imageState == ImageState.IDLE) {
      image.load();
      imageState = image.getState();
    }
    return imageState == ImageState.LOADED;
  }

  /**
   * @protected
   */
  renderIfReadyAndVisible() {
    const layer = this.getLayer();
    if (layer && layer.getVisible() && layer.getSourceState() === 'ready') {
      layer.changed();
    }
  }

  /**
   * Clean up.
   */
  disposeInternal() {
    delete this.layer_;
    super.disposeInternal();
  }
}

export default LayerRenderer;
