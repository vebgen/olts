
import { Target as EventTarget } from '@olts/events';
import type { EventType } from '@olts/events';
import ImageState from './ImageState';
import { CREATE_IMAGE_BITMAP, IMAGE_DECODE } from '@olts/core/has';
import { listenOnce, unlistenByKey } from './events';
import { toPromise } from '@olts/core/functions';

/**
 * A function that takes an {@link module:ol/Image~ImageWrapper} for the image and a
 * `{string}` for the src as arguments. It is supposed to make it so the
 * underlying image {@link module:ol/Image~ImageWrapper#getImage} is assigned the
 * content specified by the src. If not specified, the default is
 *
 *     function(image, src) {
 *       image.getImage().src = src;
 *     }
 *
 * Providing a custom `imageLoadFunction` can be useful to load images with
 * post requests or - in general - through XHR requests, where the src of the
 * image element would be set to a data URI when the content is loaded.
 *
 * @typedef {function(import("./Image").default, string): void} LoadFunction
 * @api
 */

/**
 * @typedef {Object} ImageObject
 * @property {Extent} [extent] Extent, if different from the requested one.
 * @property {import("./resolution").ResolutionLike} [resolution] Resolution, if different from the requested one.
 * When x and y resolution are different, use the array type (`[xResolution, yResolution]`).
 * @property {number} [pixelRatio] Pixel ratio, if different from the requested one.
 * @property {import('./DataTile').ImageLike} image Image.
 */

/**
 * Loader function used for image sources. Receives extent, resolution and pixel ratio as arguments.
 * For images that cover any extent and resolution (static images), the loader function should not accept
 * any arguments. The function returns an {@link import("./DataTile").ImageLike image}, an
 * {@link import("./Image").ImageObject image object}, or a promise for the same.
 * For loaders that generate images, the promise should not resolve until the image is loaded.
 * If the returned image does not match the extent, resolution or pixel ratio passed to the loader,
 * it has to return an {@link import("./Image").ImageObject image object} with the `image` and the
 * correct `extent`, `resolution` and `pixelRatio`.
 *
 * @typedef {function(Extent, number, number, (function(HTMLImageElement, string): void)=): import("./DataTile").ImageLike|ImageObject|Promise<import("./DataTile").ImageLike|ImageObject>} Loader
 * @api
 */

/**
 * Loader function used for image sources. Receives extent, resolution and pixel ratio as arguments.
 * The function returns a promise for an  {@link import("./Image").ImageObject image object}.
 *
 * @typedef {function(Extent, number, number, (function(HTMLImageElement, string): void)=): import("./DataTile").ImageLike|ImageObject|Promise<import("./DataTile").ImageLike|ImageObject>} ImageObjectPromiseLoader
 */

export class ImageWrapper extends EventTarget {
    /**
     * @param {Extent} extent Extent.
     * @param {number|number[]|undefined} resolution Resolution. If provided as array, x and y
     * resolution will be assumed.
     * @param {number} pixelRatio Pixel ratio.
     * @param {import("./ImageState").default|import("./Image").Loader} stateOrLoader State.
     */
    constructor(extent: Extent, resolution: number | number[] | undefined, pixelRatio: number, stateOrLoader: import("./ImageState").default | import("./Image").Loader) {
        super();

        /**
         * @protected
         * @type {Extent}
         */
        this.extent = extent;

        /**
         * @private
         * @type {number}
         */
        this.pixelRatio_ = pixelRatio;

        /**
         * @protected
         * @type {number|number[]|undefined}
         */
        this.resolution = resolution;

        /**
         * @protected
         * @type {import("./ImageState").default}
         */
        this.state =
            typeof stateOrLoader === 'function' ? ImageState.IDLE : stateOrLoader;

        /**
         * @private
         * @type {import('./DataTile').ImageLike|null}
         */
        this.image_ = null;

        /**
         * @protected
         * @type {import("./Image").Loader}
         */
        this.loader = typeof stateOrLoader === 'function' ? stateOrLoader : null;
    }

    /**
     * @protected
     */
    changed() {
        this.dispatchEvent(EventType.CHANGE);
    }

    /**
     * @return {Extent} Extent.
     */
    getExtent(): Extent {
        return this.extent;
    }

    /**
     * @return {import('./DataTile').ImageLike} Image.
     */
    getImage(): import('./DataTile').ImageLike {
        return this.image_;
    }

    /**
     * @return {number} PixelRatio.
     */
    getPixelRatio(): number {
        return this.pixelRatio_;
    }

    /**
     * @return {number|number[]} Resolution.
     */
    getResolution(): number | number[] {
        return /** @type {number} */ (this.resolution);
    }

    /**
     * @return {import("./ImageState").default} State.
     */
    getState(): import("./ImageState").default {
        return this.state;
    }

    /**
     * Load not yet loaded URI.
     */
    load() {
        if (this.state == ImageState.IDLE) {
            if (this.loader) {
                this.state = ImageState.LOADING;
                this.changed();
                const resolution = this.getResolution();
                const requestResolution = Array.isArray(resolution)
                    ? resolution[0]
                    : resolution;
                toPromise(() =>
                    this.loader(
                        this.getExtent(),
                        requestResolution,
                        this.getPixelRatio(),
                    ),
                )
                    .then((image) => {
                        if ('image' in image) {
                            this.image_ = image.image;
                        }
                        if ('extent' in image) {
                            this.extent = image.extent;
                        }
                        if ('resolution' in image) {
                            this.resolution = image.resolution;
                        }
                        if ('pixelRatio' in image) {
                            this.pixelRatio_ = image.pixelRatio;
                        }
                        if (
                            image instanceof HTMLImageElement ||
                            image instanceof ImageBitmap ||
                            image instanceof HTMLCanvasElement ||
                            image instanceof HTMLVideoElement
                        ) {
                            this.image_ = image;
                        }
                        this.state = ImageState.LOADED;
                    })
                    .catch((error) => {
                        this.state = ImageState.ERROR;
                        console.error(error); // eslint-disable-line no-console
                    })
                    .finally(() => this.changed());
            }
        }
    }

    /**
     * @param {import('./DataTile').ImageLike} image The image.
     */
    setImage(image: import('./DataTile').ImageLike) {
        this.image_ = image;
    }

    /**
     * @param {number|number[]} resolution Resolution.
     */
    setResolution(resolution: number | number[]) {
        this.resolution = resolution;
    }
}

/**
 * @param {import('./DataTile').ImageLike} image Image element.
 * @param {function():any} loadHandler Load callback function.
 * @param {function():any} errorHandler Error callback function.
 * @return {function():void} Callback to stop listening.
 */
export function listenImage(image: import('./DataTile').ImageLike, loadHandler: () => any, errorHandler: () => any): () => void {
    const img = /** @type {HTMLImageElement} */ (image);
    let listening = true;
    let decoding = false;
    let loaded = false;

    const listenerKeys = [
        listenOnce(img, EventType.LOAD, function () {
            loaded = true;
            if (!decoding) {
                loadHandler();
            }
        }),
    ];

    if (img.src && IMAGE_DECODE) {
        decoding = true;
        img
            .decode()
            .then(function () {
                if (listening) {
                    loadHandler();
                }
            })
            .catch(function (error) {
                if (listening) {
                    if (loaded) {
                        loadHandler();
                    } else {
                        errorHandler();
                    }
                }
            });
    } else {
        listenerKeys.push(listenOnce(img, EventType.ERROR, errorHandler));
    }

    return function unlisten() {
        listening = false;
        listenerKeys.forEach(unlistenByKey);
    };
}

/**
 * Loads an image.
 * @param {HTMLImageElement} image Image, not yet loaded.
 * @param {string} [src] `src` attribute of the image. Optional, not required if already present.
 * @return {Promise<HTMLImageElement>} Promise resolving to an `HTMLImageElement`.
 * @api
 */
export function load(image: HTMLImageElement, src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        function handleLoad() {
            unlisten();
            resolve(image);
        }
        function handleError() {
            unlisten();
            reject(new Error('Image load error'));
        }
        function unlisten() {
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
        }
        image.addEventListener('load', handleLoad);
        image.addEventListener('error', handleError);
        if (src) {
            image.src = src;
        }
    });
}

/**
 * @param {HTMLImageElement} image Image, not yet loaded.
 * @param {string} [src] `src` attribute of the image. Optional, not required if already present.
 * @return {Promise<HTMLImageElement>} Promise resolving to an `HTMLImageElement`.
 */
export function decodeFallback(image: HTMLImageElement, src: string): Promise<HTMLImageElement> {
    if (src) {
        image.src = src;
    }
    return image.src && IMAGE_DECODE
        ? new Promise((resolve, reject) =>
            image
                .decode()
                .then(() => resolve(image))
                .catch((e) =>
                    image.complete && image.width ? resolve(image) : reject(e),
                ),
        )
        : load(image);
}

/**
 * Loads an image and decodes it to an `ImageBitmap` if `createImageBitmap()` is supported. Returns
 * the loaded image otherwise.
 * @param {HTMLImageElement} image Image, not yet loaded.
 * @param {string} [src] `src` attribute of the image. Optional, not required if already present.
 * @return {Promise<ImageBitmap|HTMLImageElement>} Promise resolving to an `ImageBitmap` or an
 * `HTMLImageElement` if `createImageBitmap()` is not supported.
 * @api
 */
export function decode(image: HTMLImageElement, src: string): Promise<ImageBitmap | HTMLImageElement> {
    if (src) {
        image.src = src;
    }
    return image.src && IMAGE_DECODE && CREATE_IMAGE_BITMAP
        ? image
            .decode()
            .then(() => createImageBitmap(image))
            .catch((e) => {
                if (image.complete && image.width) {
                    return image;
                }
                throw e;
            })
        : decodeFallback(image);
}

export default ImageWrapper;
