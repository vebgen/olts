
import { Target as EventTarget } from '@olts/events';
import type { EventType } from '@olts/events';
import ImageTile from '../ImageTile';
import type { TileState} from '../tile';
import {abstract} from '@olts/core/util';

/**
 * @typedef {import("../Tile").default} BaseTileType
 */

/**
 * @template {BaseTileType} TileType
 * @typedef {Object} TileRepresentationOptions
 * @property {TileType} tile The tile.
 * @property {import("../tilegrid/TileGrid").default} grid Tile grid.
 * @property {import("../webgl/Helper").default} helper WebGL helper.
 * @property [gutter=0] The size in pixels of the gutter around image tiles to ignore.
 */

/**
 * Base class for representing a tile in a webgl context
 * @template {import("../Tile").default} TileType
 * @abstract
 */
export class BaseTileRepresentation extends EventTarget {
  /**
   * @param {TileRepresentationOptions<TileType>} options The tile representation options.
   */
  constructor(options) {
    super();

    /**
     * @type {TileType}
     */
    this.tile;
    this.handleTileChange_ = this.handleTileChange_.bind(this);

    /**
     * @type {number}
     * @protected
     */
    this.gutter_ = options.gutter || 0;

    /**
     * @type {import("../webgl/Helper").default}
     * @protected
     */
    this.helper_ = options.helper;

    this.loaded = false;
    this.ready = false;
  }

  /**
   * @param {TileType} tile Tile.
   */
  setTile(tile) {
    if (tile !== this.tile) {
      if (this.tile) {
        this.tile.removeEventListener(EventTypes.CHANGE, this.handleTileChange_);
      }
      this.tile = tile;
      this.loaded = tile.getState() === TileStates.LOADED;
      if (this.loaded) {
        this.uploadTile();
      } else {
        if (tile instanceof ImageTile) {
          const image = tile.getImage();
          if (image instanceof Image && !image.crossOrigin) {
            image.crossOrigin = 'anonymous';
          }
        }
        tile.addEventListener(EventTypes.CHANGE, this.handleTileChange_);
      }
    }
  }

  /**
   * @abstract
   * @protected
   */
  uploadTile() {
    abstract();
  }

  setReady() {
    this.ready = true;
    this.dispatchEvent(EventTypes.CHANGE);
  }

  handleTileChange_() {
    if (this.tile.getState() === TileStates.LOADED) {
      this.loaded = true;
      this.uploadTile();
    }
  }

  disposeInternal() {
    this.tile.removeEventListener(EventTypes.CHANGE, this.handleTileChange_);
  }
}

export default BaseTileRepresentation;
