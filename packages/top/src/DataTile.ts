import { createCanvasContext2D } from '@olts/core/dom';

import Tile, { TileStates } from './tile';
import type { TileState} from './tile';
import { Size } from '@olts/core/size';
import { TileCoord } from './tile-coord';


export type ImageLike =
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement | ImageBitmap;

    
export type ArrayLike =
    | Uint8Array
    | Uint8ClampedArray
    | Float32Array
    | DataView;


/**
 * Data that can be used with a DataTile.
 */
type Data = ArrayLike | ImageLike;


/**
 * @param data Tile data.
 * @return The image-like data.
 */
export function asImageLike(data: Data): ImageLike | null {
    return data instanceof Image ||
        data instanceof HTMLCanvasElement ||
        data instanceof HTMLVideoElement ||
        data instanceof ImageBitmap
        ? data
        : null;
}


/**
 * @param data Tile data.
 * @return The array-like data.
 */
export function asArrayLike(data: Data): ArrayLike | null {
    return data instanceof Uint8Array ||
        data instanceof Uint8ClampedArray ||
        data instanceof Float32Array ||
        data instanceof DataView
        ? data
        : null;
}


/**
 * 
 */
let sharedContext: CanvasRenderingContext2D | null = null;


/**
 * @param image The image.
 * @return The data.
 */
export function toArray(image: ImageLike): Uint8ClampedArray {
    if (!sharedContext) {
        sharedContext = createCanvasContext2D(
            image.width,
            image.height,
            undefined,
            { willReadFrequently: true },
        );
    }
    const canvas = sharedContext.canvas;
    const width = image.width;
    if (canvas.width !== width) {
        canvas.width = width;
    }
    const height = image.height;
    if (canvas.height !== height) {
        canvas.height = height;
    }
    sharedContext.clearRect(0, 0, width, height);
    sharedContext.drawImage(image, 0, 0);
    return sharedContext.getImageData(0, 0, width, height).data;
}


/**
 * 
 */
const defaultSize: Size = [256, 256];


/**
 * 
 * @api
 */
export interface Options {
    /**
     * Tile coordinate.
     */
    tileCoord: TileCoord;

    /**
     * Data loader.
     *
     * For loaders that generate images, the promise should not resolve until
     * the image is loaded.
     * 
     * @returns The data
     */
    loader: () => Promise<Data>;

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

    /**
     * Tile size.
     * 
     * @default [256, 256]
     */
    size?: Size;
}


/**
 * 
 */
export class DataTile extends Tile {

    /**
     * Data loader.
     *
     * For loaders that generate images, the promise should not resolve until
     * the image is loaded.
     * 
     * @returns The data
     */
    private loader_: () => Promise<Data>;

    /**
     * 
     */
    private data_: Data | null = null;

    /**
     * 
     */
    private error_: Error | null = null;
    
    /**
     * Tile size.
     */
    private size_: Size | null;


    /**
     * @param options Tile options.
     */
    constructor(options: Options) {
        const state = TileStates.IDLE;

        super(options.tileCoord, state, {
            transition: options.transition,
            interpolate: options.interpolate,
        });

        this.loader_ = options.loader;
        this.size_ = options.size || null;
    }

    /**
     * Get the tile size.
     * 
     * @return Tile size.
     */
    getSize(): Size {
        if (this.size_) {
            return this.size_;
        }
        if (!this.data_) {
            throw new Error('Size not provided and data not yet loaded');
        }
        const imageData = asImageLike(this.data_);
        if (imageData) {
            return [imageData.width, imageData.height];
        }
        return defaultSize;
    }

    /**
     * Get the data for the tile.
     * 
     * @return Tile data.
     * @api
     */
    getData(): Data {
        if (!this.data_) {
            throw new Error('Data not yet loaded');
        }
        return this.data_;
    }

    /**
     * Get any loading error.
     * 
     * @return Loading error.
     * @api
     */
    getError(): Error | null {
        return this.error_;
    }

    /**
     * Load not yet loaded URI.
     * 
     * @api
     */
    override load() {
        if (this.state !== TileStates.IDLE && this.state !== TileStates.ERROR) {
            return;
        }
        this.state = TileStates.LOADING;
        this.changed();

        const self = this;
        this.loader_()
            .then(function (data) {
                self.data_ = data;
                self.state = TileStates.LOADED;
                self.changed();
            })
            .catch(function (error) {
                self.error_ = error;
                self.state = TileStates.ERROR;
                self.changed();
            });
    }
}


export default DataTile;
