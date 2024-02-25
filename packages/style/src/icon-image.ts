import { Target as EventTarget, EventType } from '@olts/events';
import { ImageState, ImageStateType } from '@olts/core/image-state';
import { Size } from '@olts/core/size';
import { Color, asString } from '@olts/core/color';
import { createCanvasContext2D } from '@olts/core/dom';

import { decodeFallback } from '../Image';
import { shared as iconImageCache } from './icon-image-cache';


export type SrcImage =
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap;


let taintedTestContext: CanvasRenderingContext2D | null = null;


export class IconImage extends EventTarget {
    /**
     *
     */
    private hitDetectionImage_: SrcImage | null = null;

    /**
     *
     */
    private image_: SrcImage | null;

    /**
     *
     */
    private crossOrigin_: string | null;

    /**
     *
     */
    private canvas_: Record<number, HTMLCanvasElement> = {};

    /**
     *
     */
    private color_: Color | string | null;

    /**
     *
     */
    private imageState_: ImageStateType | undefined;

    /**
     *
     */
    private size_: Size | null;

    /**
     *
     */
    private src_: string | undefined;

    /**
     *
     */
    private tainted_: boolean | undefined;

    /**
     *
     */
    private ready_: Promise<void> | null = null;

    /**
     * @param image Image.
     * @param src Src.
     * @param crossOrigin Cross origin.
     * @param imageState Image state.
     * @param color Color.
     */
    constructor(
        image: SrcImage | null,
        src: string | undefined,
        crossOrigin: string | null,
        imageState: ImageStateType | undefined,
        color: Color | string | null
    ) {
        super();
        this.hitDetectionImage_ = null;
        this.image_ = image;
        this.crossOrigin_ = crossOrigin;
        this.color_ = color;
        this.imageState_ = imageState === undefined
            ? ImageState.IDLE
            : imageState;
        this.size_ = (image && image.width && image.height)
            ? [image.width, image.height] :
            null;
        this.src_ = src;
    }

    /**
     *
     */
    private initializeImage_() {
        this.image_ = new Image();
        if (this.crossOrigin_ !== null) {
            this.image_.crossOrigin = this.crossOrigin_;
        }
    }

    /**
     *
     * @return The image canvas is tainted.
     */
    private isTainted_(): boolean {
        if (this.tainted_ === undefined && this.imageState_ === ImageState.LOADED) {
            if (!taintedTestContext) {
                taintedTestContext = createCanvasContext2D(1, 1, undefined, {
                    willReadFrequently: true,
                });
            }
            if (!this.image_) {
                return false;
            }
            taintedTestContext.drawImage(this.image_, 0, 0);
            try {
                taintedTestContext.getImageData(0, 0, 1, 1);
                this.tainted_ = false;
            } catch (e) {
                taintedTestContext = null;
                this.tainted_ = true;
            }
        }
        return this.tainted_ === true;
    }

    /**
     *
     */
    private dispatchChangeEvent_() {
        this.dispatchEvent(EventType.CHANGE);
    }

    /**
     *
     */
    private handleImageError_() {
        this.imageState_ = ImageState.ERROR;
        this.dispatchChangeEvent_();
    }

    /**
     *
     */
    private handleImageLoad_() {
        this.imageState_ = ImageState.LOADED;
        this.size_ = [this.image_!.width, this.image_!.height];
        this.dispatchChangeEvent_();
    }

    /**
     * @todo the base class does not expect a `null` return value
     * but this implementation returns `null` if the image is not yet loaded.
     *
     * @param pixelRatio Pixel ratio.
     * @return Image or Canvas element or image bitmap.
     */
    getImage(
        pixelRatio: number
    ): SrcImage {
        if (!this.image_) {
            this.initializeImage_();
        }
        this.replaceColor_(pixelRatio);
        const pr = this.canvas_[pixelRatio]
        return pr ? pr : this.image_!;
    }

    /**
     * @param pixelRatio Pixel ratio.
     * @return Image or Canvas element.
     */
    getPixelRatio(pixelRatio: number): number {
        this.replaceColor_(pixelRatio);
        return this.canvas_[pixelRatio] ? pixelRatio : 1;
    }

    /**
     * @todo the base class does not expect a `undefined` return value
     * but this implementation can return `undefined`.
     *
     * @return Image state.
     */
    getImageState(): ImageStateType {
        return this.imageState_!;
    }

    /**
     *
     * @return Image element.
     */
    getHitDetectionImage(): SrcImage {
        if (!this.image_) {
            this.initializeImage_();
        }
        if (!this.hitDetectionImage_) {
            if (this.isTainted_()) {
                const width = this.size_![0];
                const height = this.size_![1];
                const context = createCanvasContext2D(width, height);
                context.fillRect(0, 0, width, height);
                this.hitDetectionImage_ = context.canvas;
            } else {
                this.hitDetectionImage_ = this.image_;
            }
        }
        return this.hitDetectionImage_!;
    }

    /**
     * Get the size of the icon (in pixels).
     *
     * @todo the base class does not expect a `null` return value
     * but this implementation returns `null` if the image is not yet loaded.
     *
     * @return Image size.
     */
    getSize(): Size {
        return this.size_!;
    }

    /**
     * @return Image src.
     */
    getSrc(): string | undefined {
        return this.src_;
    }

    /**
     * Load not yet loaded URI.
     */
    load() {
        if (this.imageState_ !== ImageState.IDLE) {
            return;
        }
        if (!this.image_) {
            this.initializeImage_();
        }

        this.imageState_ = ImageState.LOADING;
        try {
            if (this.src_ !== undefined) {
                (this.image_ as HTMLImageElement).src = this.src_;
            }
        } catch (e) {
            this.handleImageError_();
        }
        if (this.image_ instanceof HTMLImageElement) {
            decodeFallback(this.image_, this.src_)
                .then((image: SrcImage) => {
                    this.image_ = image;
                    this.handleImageLoad_();
                })
                .catch(this.handleImageError_.bind(this));
        }
    }

    /**
     * @param pixelRatio Pixel ratio.
     * @private
     */
    replaceColor_(pixelRatio: number) {
        if (
            !this.color_ ||
            this.canvas_[pixelRatio] ||
            this.imageState_ !== ImageState.LOADED
        ) {
            return;
        }

        const image = this.image_!;
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(image.width * pixelRatio);
        canvas.height = Math.ceil(image.height * pixelRatio);

        const ctx = canvas.getContext('2d')!;
        ctx.scale(pixelRatio, pixelRatio);
        ctx.drawImage(image, 0, 0);

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = asString(this.color_);
        ctx.fillRect(
            0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio
        );

        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(image, 0, 0);

        this.canvas_[pixelRatio] = canvas;
    }

    /**
     * @return Promise that resolves when the image is loaded.
     */
    ready(): Promise<void> {
        if (!this.ready_) {
            this.ready_ = new Promise((resolve) => {
                if (
                    this.imageState_ === ImageState.LOADED ||
                    this.imageState_ === ImageState.ERROR
                ) {
                    resolve();
                } else {
                    const self = this;
                    this.addEventListener(EventType.CHANGE, function onChange() {
                        if (
                            self.imageState_ === ImageState.LOADED ||
                            self.imageState_ === ImageState.ERROR
                        ) {
                            self.removeEventListener(EventType.CHANGE, onChange);
                            resolve();
                        }
                    });
                }
            });
        }
        return this.ready_;
    }
}


/**
 * @param image Image.
 * @param cacheKey Src.
 * @param crossOrigin Cross origin.
 * @param imageState Image state.
 * @param color Color.
 * @param pattern Also cache a `repeat` pattern with the icon image.
 * @return Icon image.
 */
export function get(
    image: SrcImage | null,
    cacheKey: string | undefined,
    crossOrigin: string | null,
    imageState: ImageStateType | undefined,
    color: Color | string | null,
    pattern?: boolean
): IconImage {
    let iconImage = cacheKey === undefined
        ? undefined
        : iconImageCache.get(cacheKey, crossOrigin, color);
    if (!iconImage) {
        iconImage = new IconImage(
            image,
            image instanceof HTMLImageElement
                ? image.src || undefined
                : cacheKey,
            crossOrigin,
            imageState,
            color,
        );
        iconImageCache.set(cacheKey!, crossOrigin, color, iconImage, pattern);
    }
    if (
        pattern &&
        iconImage &&
        !iconImageCache.getPattern(cacheKey!, crossOrigin, color)
    ) {
        iconImageCache.set(cacheKey!, crossOrigin, color, iconImage, pattern);
    }
    return iconImage;
}


export default IconImage;
