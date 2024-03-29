
import { BaseEvent as Event } from '@olts/events';
import type { EventType } from '@olts/events';
import ImageState from '../ImageState';
import ImageWrapper from '../Image';
import ReprojImage from '../reproj/Image';
import Source from './Source';
import { DECIMALS } from './common';
import { ceil } from '@olts/core/math';
import {
    containsExtent,
    equals,
    getCenter,
    getForViewAndSize,
    getHeight,
    getWidth,
} from '@olts/core/extent';
import { equivalent } from '../proj';
import { fromResolutionLike } from '../resolution';
import { linearFindNearest } from '@olts/core/array';

/**
 * @enum {string}
 */
export const ImageSourceEventType = {
    /**
     * Triggered when an image starts loading.
     * @event module:ol/source/Image.ImageSourceEvent#imageloadstart
     * @api
     */
    IMAGELOADSTART: 'imageloadstart',

    /**
     * Triggered when an image finishes loading.
     * @event module:ol/source/Image.ImageSourceEvent#imageloadend
     * @api
     */
    IMAGELOADEND: 'imageloadend',

    /**
     * Triggered if image loading results in an error.
     * @event module:ol/source/Image.ImageSourceEvent#imageloaderror
     * @api
     */
    IMAGELOADERROR: 'imageloaderror',
};

/**
 * @typedef {'imageloadend'|'imageloaderror'|'imageloadstart'} ImageSourceEventTypes
 */

/**
 * Events emitted by {@link module:ol/source/Image~ImageSource} instances are instances of this
 * type.
 */
export class ImageSourceEvent extends Event {
    /**
     * @param type Type.
     * @param {import("../Image").default} image The image.
     */
    constructor(type: string, image: import("../Image").default) {
        super(type);

        /**
         * The image related to the event.
         * @type {import("../Image").default}
         * @api
         */
        this.image = image;
    }
}

/***
 * @template Return
 * @typedef {import("../Observable").OnSignature<import("../Observable").EventTypes, import("../events/Event").default, Return> &
 *   import("../Observable").OnSignature<ObjectEventType, import("../Object").ObjectEvent, Return> &
 *   import("../Observable").OnSignature<ImageSourceEventTypes, ImageSourceEvent, Return> &
 *   CombinedOnSignature<import("../Observable").EventTypes|ObjectEventType
 *     |ImageSourceEventTypes, Return>} ImageSourceOnSignature
 */

/**
 * @typedef {Object} Options
 * @property {import("./Source").AttributionLike} [attributions] Attributions.
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * linear interpolation is used when resampling.  Set to false to use the nearest neighbor instead.
 * @property {import("../Image").Loader} [loader] Loader. Can either be a custom loader, or one of the
 * loaders created with a `createLoader()` function ({@link module:ol/source/wms.createLoader wms},
 * {@link module:ol/source/arcgisRest.createLoader arcgisRest}, {@link module:ol/source/mapguide.createLoader mapguide},
 * {@link module:ol/source/static.createLoader static}).
 * @property {ProjectionLike} [projection] Projection.
 * @property {number[]} [resolutions] Resolutions.
 * @property {import("./Source").State} [state] State.
 */

/**
 * Base class for sources providing a single image.
 * @fires module:ol/source/Image.ImageSourceEvent
 * @api
 */
export class ImageSource extends Source {

    /**
     *
     */
    override on: ImageSourceOnSignature<EventsKey>;

    /**
     *
     */
    override once: ImageSourceOnSignature<EventsKey>;

    /**
     *
     */
    override un: ImageSourceOnSignature<void>;

    /**
     * @param {Options} options Single image source options.
     */
    constructor(options: Options) {
        super({
            attributions: options.attributions,
            projection: options.projection,
            state: options.state,
            interpolate:
                options.interpolate !== undefined ? options.interpolate : true,
        });
        this.on = this.onInternal as ImageSourceOnSignature<EventsKey>;
        this.once = this.onceInternal as ImageSourceOnSignature<EventsKey>;
        this.un = this.unInternal as ImageSourceOnSignature<void>;

        /**
         * @protected
         * @type {import("../Image").Loader}
         */
        this.loader = options.loader || null;

        /**
         * @private
         * @type {number[]|null}
         */
        this.resolutions_ =
            options.resolutions !== undefined ? options.resolutions : null;

        /**
         * @private
         * @type {import("../reproj/Image").default}
         */
        this.reprojectedImage_ = null;

        /**
         * @private
         * @type {number}
         */
        this.reprojectedRevision_ = 0;

        /**
         * @protected
         * @type {import("../Image").default}
         */
        this.image = null;

        /**
         * @private
         * @type {Extent}
         */
        this.wantedExtent_;

        /**
         * @private
         * @type {number}
         */
        this.wantedResolution_;

        /**
         * @private
         * @type {boolean}
         */
        this.static_ = options.loader ? options.loader.length === 0 : false;

        /**
         * @private
         * @type {import("../proj/Projection").default}
         */
        this.wantedProjection_ = null;
    }

    /**
     * @return {number[]|null} Resolutions.
     */
    getResolutions(): number[] | null {
        return this.resolutions_;
    }

    /**
     * @param {number[]|null} resolutions Resolutions.
     */
    setResolutions(resolutions: number[] | null) {
        this.resolutions_ = resolutions;
    }

    /**
     * @protected
     * @param resolution Resolution.
     * @return Resolution.
     */
    findNearestResolution(resolution: number): number {
        const resolutions = this.getResolutions();
        if (resolutions) {
            const idx = linearFindNearest(resolutions, resolution, 0);
            resolution = resolutions[idx];
        }
        return resolution;
    }

    /**
     * @param {Extent} extent Extent.
     * @param resolution Resolution.
     * @param pixelRatio Pixel ratio.
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {import("../Image").default} Single image.
     */
    getImage(extent: Extent, resolution: number, pixelRatio: number, projection: import("../proj/Projection").default): import("../Image").default {
        const sourceProjection = this.getProjection();
        if (
            !sourceProjection ||
            !projection ||
            equivalent(sourceProjection, projection)
        ) {
            if (sourceProjection) {
                projection = sourceProjection;
            }

            return this.getImageInternal(extent, resolution, pixelRatio, projection);
        }
        if (this.reprojectedImage_) {
            if (
                this.reprojectedRevision_ == this.getRevision() &&
                equivalent(this.reprojectedImage_.getProjection(), projection) &&
                this.reprojectedImage_.getResolution() == resolution &&
                equals(this.reprojectedImage_.getExtent(), extent)
            ) {
                return this.reprojectedImage_;
            }
            this.reprojectedImage_.dispose();
            this.reprojectedImage_ = null;
        }

        this.reprojectedImage_ = new ReprojImage(
            sourceProjection,
            projection,
            extent,
            resolution,
            pixelRatio,
            (extent, resolution, pixelRatio) =>
                this.getImageInternal(extent, resolution, pixelRatio, sourceProjection),
            this.getInterpolate(),
        );
        this.reprojectedRevision_ = this.getRevision();

        return this.reprojectedImage_;
    }

    /**
     * @abstract
     * @param {Extent} extent Extent.
     * @param resolution Resolution.
     * @param pixelRatio Pixel ratio.
     * @param {import("../proj/Projection").default} projection Projection.
     * @return {import("../Image").default} Single image.
     * @protected
     */
    getImageInternal(extent: Extent, resolution: number, pixelRatio: number, projection: import("../proj/Projection").default): import("../Image").default {
        if (this.loader) {
            const requestExtent = getRequestExtent(extent, resolution, pixelRatio, 1);
            const requestResolution = this.findNearestResolution(resolution);
            if (
                this.image &&
                (this.static_ ||
                    (this.wantedProjection_ === projection &&
                        ((this.wantedExtent_ &&
                            containsExtent(this.wantedExtent_, requestExtent)) ||
                            containsExtent(this.image.getExtent(), requestExtent)) &&
                        ((this.wantedResolution_ &&
                            fromResolutionLike(this.wantedResolution_) ===
                            requestResolution) ||
                            fromResolutionLike(this.image.getResolution()) ===
                            requestResolution)))
            ) {
                return this.image;
            }
            this.wantedProjection_ = projection;
            this.wantedExtent_ = requestExtent;
            this.wantedResolution_ = requestResolution;
            this.image = new ImageWrapper(
                requestExtent,
                requestResolution,
                pixelRatio,
                this.loader,
            );
            this.image.addEventListener(
                EventTypes.CHANGE,
                this.handleImageChange.bind(this),
            );
        }
        return this.image;
    }

    /**
     * Handle image change events.
     * @param {import("../events/Event").default} event Event.
     * @protected
     */
    handleImageChange(event: import("../events/Event").default) {
        const image = /** @type {import("../Image").default} */ (event.target);
        let type;
        switch (image.getState()) {
            case ImageState.LOADING:
                this.loading = true;
                type = ImageSourceEventType.IMAGELOADSTART;
                break;
            case ImageState.LOADED:
                this.loading = false;
                type = ImageSourceEventType.IMAGELOADEND;
                break;
            case ImageState.ERROR:
                this.loading = false;
                type = ImageSourceEventType.IMAGELOADERROR;
                break;
            default:
                return;
        }
        if (this.hasListener(type)) {
            this.dispatchEvent(new ImageSourceEvent(type, image));
        }
    }
}

/**
 * Default image load function for image sources that use import("../Image").Image image
 * instances.
 * @param {import("../Image").default} image Image.
 * @param src Source.
 */
export function defaultImageLoadFunction(image: import("../Image").default, src: string) {
  /** @type {HTMLImageElement|HTMLVideoElement} */ (image.getImage()).src = src;
}

/**
 * Adjusts the extent so it aligns with pixel boundaries.
 * @param {Extent} extent Extent.
 * @param resolution Reolution.
 * @param pixelRatio Pixel ratio.
 * @param ratio Ratio between request size and view size.
 * @return {Extent} Request extent.
 */
export function getRequestExtent(extent: Extent, resolution: number, pixelRatio: number, ratio: number): Extent {
    const imageResolution = resolution / pixelRatio;
    const center = getCenter(extent);
    const viewWidth = ceil(getWidth(extent) / imageResolution, DECIMALS);
    const viewHeight = ceil(getHeight(extent) / imageResolution, DECIMALS);
    const marginWidth = ceil(((ratio - 1) * viewWidth) / 2, DECIMALS);
    const requestWidth = viewWidth + 2 * marginWidth;
    const marginHeight = ceil(((ratio - 1) * viewHeight) / 2, DECIMALS);
    const requestHeight = viewHeight + 2 * marginHeight;
    return getForViewAndSize(center, imageResolution, 0, [
        requestWidth,
        requestHeight,
    ]);
}

export default ImageSource;
