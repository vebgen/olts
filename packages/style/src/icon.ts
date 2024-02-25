import { EventType, Listener } from '@olts/events';

import ImageStyle, { ListenImageChange } from './image';
import { Color, asArray } from '@olts/core/color';
import { assert } from '@olts/core/asserts';
import { IconImage, get as getIconImage } from './icon-image';
import { getUid } from '@olts/core/util';
import { Size } from '@olts/core/size';
import { ImageState, ImageStateType } from '@olts/core/image-state';


/**
 * Anchor unit can be either a fraction of the icon size or in pixels.
 */
export type IconAnchorUnits = 'fraction' | 'pixels';


/**
 * Icon origin. One of 'bottom-left', 'bottom-right', 'top-left', 'top-right'.
 */
export type IconOrigin =
    | 'bottom-left'
    | 'bottom-right'
    | 'top-left'
    | 'top-right';


/**
 * Options for the icon style.
 */
export interface Options {
    /**
     * Anchor.
     *
     * Default value is the icon center.
     *
     * @default [0.5, 0.5]
     */
    anchor?: [number, number];

    /**
     * Origin of the anchor: `bottom-left`, `bottom-right`, `top-left` or
     * `top-right`.
     *
     * @default 'top-left'
     */
    anchorOrigin?: IconOrigin;

    /**
     * Units in which the anchor x value is specified.
     *
     * A value of `'fraction'` indicates the x value is a fraction of the icon.
     * A value of `'pixels'` indicates the x value in pixels.
     *
     * @default 'fraction'
     */
    anchorXUnits?: IconAnchorUnits;

    /**
     * Units in which the anchor y value is specified.
     *
     * A value of `'fraction'` indicates the y value is a fraction of the icon.
     * A value of `'pixels'` indicates the y value in pixels.
     *
     * @default 'fraction'
     */
    anchorYUnits?: IconAnchorUnits;

    /**
     * Color to tint the icon.
     *
     * If not specified, the icon will be left as is.
     */
    color?: Color | string;

    /**
     * The `crossOrigin` attribute for loaded images.
     *
     * Note that you must provide a `crossOrigin` value if you want to access
     * pixel data with the Canvas renderer.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
     * for more detail.
     */
    crossOrigin?: null | string;

    /**
     * Image object for the icon.
     */
    img?: HTMLImageElement | HTMLCanvasElement | ImageBitmap;

    /**
     * Displacement of the icon in pixels.
     *
     * Positive values will shift the icon right and up.
     *
     * @default [0, 0]
     */
    displacement?: [number, number];

    /**
     * Opacity of the icon.
     *
     * @default 1
     */
    opacity?: number;

    /**
     * The width of the icon in pixels.
     *
     * This can't be used together with `scale`.
     */
    width?: number;

    /**
     * The height of the icon in pixels.
     *
     * This can't be used together with `scale`.
     */
    height?: number;

    /**
     * Scale.
     */
    scale?: number | Size;

    /**
     * Whether to rotate the icon with the view.
     *
     * @default false
     */
    rotateWithView?: boolean;

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    rotation?: number;

    /**
     * Offset, which together with the size and the offset origin, defines the
     * sub-rectangle to use from the original (sprite) image.
     *
     * @default [0, 0]
     */
    offset?: [number, number];

    /**
     * Origin of the offset: `'bottom-left'`, `'bottom-right'`, `'top-left'` or
     * `'top-right'`.
     *
     * @default 'top-left'
     */
    offsetOrigin?: IconOrigin;

    /**
     * Icon size in pixels. Only required if `offset` is specified.
     */
    size?: Size;

    /**
     * Image source URI.
     */
    src?: string;

    /**
     * Declutter mode.
     */
    declutterMode?: "declutter" | "obstacle" | "none" | undefined;
}


/**
 * @param width The width.
 * @param height The height.
 * @param wantedWidth The wanted width.
 * @param wantedHeight The wanted height.
 * @return The scale.
 */
export function calculateScale(
    width: number,
    height: number,
    wantedWidth: number | undefined,
    wantedHeight: number | undefined
): number | [number, number] {
    if (wantedWidth !== undefined && wantedHeight !== undefined) {
        return [wantedWidth / width, wantedHeight / height];
    }
    if (wantedWidth !== undefined) {
        return wantedWidth / width;
    }
    if (wantedHeight !== undefined) {
        return wantedHeight / height;
    }
    return 1;
}


/**
 * Set icon style for vector features.
 *
 * @api
 */
export class Icon extends ImageStyle {
    /**
     * The anchor point in pixels.
     *
     * The anchor determines the center point for the symbolizer.
     */
    private anchor_: [number, number];

    /**
     * The computed anchor point in pixels.
     */
    private normalizedAnchor_: null | [number, number];

    /**
     * Origin of the anchor: `bottom-left`, `bottom-right`, `top-left` or
     * `top-right`.
     */
    private anchorOrigin_: IconOrigin;

    /**
     * Units in which the anchor x value is specified.
     *
     * A value of `'fraction'` indicates the x value is a fraction of the icon.
     * A value of `'pixels'` indicates the x value in pixels.
     */
    private anchorXUnits_: IconAnchorUnits;

    /**
     * Units in which the anchor y value is specified.
     *
     * A value of `'fraction'` indicates the y value is a fraction of the icon.
     * A value of `'pixels'` indicates the y value in pixels.
     */
    private anchorYUnits_: IconAnchorUnits;

    /**
     * The `crossOrigin` attribute for loaded images.
     *
     * Note that you must provide a `crossOrigin` value if you want to access
     * pixel data with the Canvas renderer.
     */
    private crossOrigin_: null | string;

    /**
     * Color to tint the icon.
     *
     * If not specified, the icon will be left as is.
     */
    private color_: Color | null;

    /**
     *
     */
    private iconImage_: IconImage;

    /**
     *
     */
    private offset_: [number, number];

    /**
     *
     */
    private offsetOrigin_: IconOrigin;

    /**
     *
     */
    private origin_: null | [number, number];

    /**
     *
     */
    private size_: Size | null;

    /**
     *
     */
    private initialOptions_?: Options;

    /**
     * @param options Options.
     */
    constructor(options?: Options) {
        options = options || {};

        const opacity: number = options.opacity !== undefined
            ? options.opacity
            : 1;
        const rotation: number = options.rotation !== undefined
            ? options.rotation
            : 0;
        const scale: number | Size = options.scale !== undefined
            ? options.scale
            : 1;
        const rotateWithView: boolean = options.rotateWithView !== undefined
            ? options.rotateWithView
            : false;

        super({
            opacity: opacity,
            rotation: rotation,
            scale: scale,
            displacement: options.displacement !== undefined
                ? options.displacement
                : [0, 0],
            rotateWithView: rotateWithView,
            declutterMode: options.declutterMode,
        });

        this.anchor_ = options.anchor !== undefined
            ? options.anchor
            : [0.5, 0.5];
        this.normalizedAnchor_ = null;
        this.anchorOrigin_ = options.anchorOrigin !== undefined
            ? options.anchorOrigin
            : 'top-left';
        this.anchorXUnits_ = options.anchorXUnits !== undefined
            ? options.anchorXUnits
            : 'fraction';
        this.anchorYUnits_ = options.anchorYUnits !== undefined
            ? options.anchorYUnits
            : 'fraction';
        this.crossOrigin_ = options.crossOrigin !== undefined
            ? options.crossOrigin
            : null;

        const image = options.img !== undefined ? options.img : null;
        let cacheKey = options.src;
        assert(
            !(cacheKey !== undefined && image),
            '`image` and `src` cannot be provided at the same time',
        );

        if ((cacheKey === undefined || cacheKey.length === 0) && image) {
            cacheKey = (image as HTMLImageElement).src || getUid(image);
        }
        assert(
            cacheKey !== undefined && cacheKey.length > 0,
            'A defined and non-empty `src` or `image` must be provided',
        );

        assert(
            !(
                (
                    options.width !== undefined ||
                    options.height !== undefined
                ) &&
                options.scale !== undefined
            ),
            '`width` or `height` cannot be provided together with `scale`',
        );

        let imageState: ImageStateType;
        if (options.src !== undefined) {
            imageState = ImageState.IDLE;
        } else if (image !== undefined) {
            if (image instanceof HTMLImageElement) {
                if (image.complete) {
                    imageState = image.src
                        ? ImageState.LOADED
                        : ImageState.IDLE;
                } else {
                    imageState = ImageState.LOADING;
                }
            } else {
                imageState = ImageState.LOADED;
            }
        }
        this.color_ = options.color !== undefined
            ? asArray(options.color)
            : null;
        this.iconImage_ = getIconImage(
            image, (cacheKey as string),
            this.crossOrigin_,
            imageState!,
            this.color_,
        );
        this.offset_ = options.offset !== undefined ? options.offset : [0, 0];
        this.offsetOrigin_ = options.offsetOrigin !== undefined
            ? options.offsetOrigin
            : 'top-left';
        this.origin_ = null;
        this.size_ = options.size !== undefined ? options.size : null;

        // Calculate the scale if width or height were given.
        if (options.width !== undefined || options.height !== undefined) {
            let width, height;
            if (options.size) {
                [width, height] = options.size;
            } else {
                const image = this.getImage(1);
                if (image.width && image.height) {
                    width = image.width;
                    height = image.height;
                } else if (image instanceof HTMLImageElement) {
                    this.initialOptions_ = options;
                    const onload = () => {
                        this.unlistenImageChange(onload);
                        if (!this.initialOptions_) {
                            return;
                        }
                        const imageSize = this.iconImage_.getSize();
                        this.setScale(
                            calculateScale(
                                imageSize[0],
                                imageSize[1],
                                options!.width,
                                options!.height,
                            ),
                        );
                    };
                    this.listenImageChange(onload);
                    return;
                }
            }
            if (width !== undefined) {
                this.setScale(
                    calculateScale(
                        width, height!, options.width, options.height
                    ),
                );
            }
        }
    }

    /**
     * Clones the style.
     *
     * The underlying Image/HTMLCanvasElement is not cloned.
     *
     * @return The cloned style.
     * @api
     */
    override clone(): Icon {
        let scale, width, height;
        if (this.initialOptions_) {
            width = this.initialOptions_.width;
            height = this.initialOptions_.height;
        } else {
            scale = this.getScale();
            scale = Array.isArray(scale) ? scale.slice() : scale;
        }
        return new Icon({
            anchor: this.anchor_.slice() as [number, number],
            anchorOrigin: this.anchorOrigin_,
            anchorXUnits: this.anchorXUnits_,
            anchorYUnits: this.anchorYUnits_,
            color: (
                (this.color_ && this.color_.slice)
                    ? this.color_.slice() as Color
                    : this.color_
            ) || undefined,
            crossOrigin: this.crossOrigin_,
            offset: this.offset_.slice() as [number, number],
            offsetOrigin: this.offsetOrigin_,
            opacity: this.getOpacity(),
            rotateWithView: this.getRotateWithView(),
            rotation: this.getRotation(),
            scale: scale as Size,
            width,
            height,
            size: this.size_ !== null
                ? this.size_.slice() as [number, number]
                : undefined,
            src: this.getSrc(),
            displacement: this.getDisplacement().slice() as [number, number],
            declutterMode: this.getDeclutterMode(),
        });
    }

    /**
     * Get the anchor point in pixels.
     *
     * The anchor determines the center point for the symbolizer.
     *
     * @todo the base class does not expect null, but this implementation does.
     * @return Anchor.
     * @api
     */
    getAnchor(): [number, number] {
        let anchor = this.normalizedAnchor_;
        if (!anchor) {
            anchor = this.anchor_;
            const size = this.getSize();
            if (
                this.anchorXUnits_ == 'fraction' ||
                this.anchorYUnits_ == 'fraction'
            ) {
                if (!size) {
                    return null as unknown as [number, number];
                }
                anchor = this.anchor_.slice() as [number, number];
                if (this.anchorXUnits_ == 'fraction') {
                    anchor[0] *= size[0];
                }
                if (this.anchorYUnits_ == 'fraction') {
                    anchor[1] *= size[1];
                }
            }

            if (this.anchorOrigin_ != 'top-left') {
                if (!size) {
                    return null as unknown as [number, number];
                }
                if (anchor === this.anchor_) {
                    anchor = this.anchor_.slice() as [number, number];
                }
                if (
                    this.anchorOrigin_ == 'top-right' ||
                    this.anchorOrigin_ == 'bottom-right'
                ) {
                    anchor[0] = -anchor[0] + size[0];
                }
                if (
                    this.anchorOrigin_ == 'bottom-left' ||
                    this.anchorOrigin_ == 'bottom-right'
                ) {
                    anchor[1] = -anchor[1] + size[1];
                }
            }
            this.normalizedAnchor_ = anchor;
        }
        const displacement = this.getDisplacement();
        const scale = this.getScaleArray();

        // anchor is scaled by renderer but displacement should not be scaled
        // so divide by scale here
        return [
            anchor[0] - displacement[0] / scale[0],
            anchor[1] + displacement[1] / scale[1],
        ];
    }

    /**
     * Set the anchor point. The anchor determines the center point for the
     * symbolizer.
     *
     * @param anchor Anchor.
     * @api
     */
    setAnchor(anchor: [number, number]) {
        this.anchor_ = anchor;
        this.normalizedAnchor_ = null;
    }

    /**
     * Get the icon color.
     *
     * @todo the base class does not expect null, but this implementation does.
     * @return Color.
     * @api
     */
    getColor(): Color {
        return this.color_!;
    }

    /**
     * Get the image icon.
     *
     * @param pixelRatio Pixel ratio.
     * @return Image or Canvas element. If the Icon style was configured with
     * `src` or with a not let loaded `img`, an `ImageBitmap` will be returned.
     * @api
     */
    getImage(
        pixelRatio: number
    ): HTMLImageElement | HTMLCanvasElement | ImageBitmap {
        return this.iconImage_.getImage(pixelRatio);
    }

    /**
     * Get the pixel ratio.
     *
     * @param pixelRatio Pixel ratio.
     * @return The pixel ratio of the image.
     * @api
     */
    override getPixelRatio(pixelRatio: number): number {
        return this.iconImage_.getPixelRatio(pixelRatio);
    }

    /**
     * @return Image size.
     */
    getImageSize(): Size {
        return this.iconImage_.getSize();
    }

    /**
     * @return Image state.
     */
    getImageState(): ImageStateType {
        return this.iconImage_.getImageState();
    }

    /**
     * @return Image element.
     */
    getHitDetectionImage(): HTMLImageElement | HTMLCanvasElement | ImageBitmap {
        return this.iconImage_.getHitDetectionImage();
    }

    /**
     * Get the origin of the symbolizer.
     *
     * @todo the base class does not expect null, but this implementation does.
     * @return Origin.
     * @api
     */
    getOrigin(): [number, number] {
        if (this.origin_) {
            return this.origin_;
        }
        let offset: [number, number] = this.offset_;

        if (this.offsetOrigin_ != 'top-left') {
            const size = this.getSize();
            const iconImageSize = this.iconImage_.getSize();
            if (!size || !iconImageSize) {
                return null as unknown as [number, number];
            }
            offset = offset.slice() as [number, number];
            if (
                this.offsetOrigin_ == 'top-right' ||
                this.offsetOrigin_ == 'bottom-right'
            ) {
                offset[0] = iconImageSize[0] - size[0] - offset[0];
            }
            if (
                this.offsetOrigin_ == 'bottom-left' ||
                this.offsetOrigin_ == 'bottom-right'
            ) {
                offset[1] = iconImageSize[1] - size[1] - offset[1];
            }
        }
        this.origin_ = offset;
        return this.origin_;
    }

    /**
     * Get the image URL.
     *
     * @return Image src.
     * @api
     */
    getSrc(): string | undefined {
        return this.iconImage_.getSrc();
    }

    /**
     * Get the size of the icon (in pixels).
     *
     * @return Image size.
     * @api
     */
    getSize(): Size {
        return !this.size_ ? this.iconImage_.getSize() : this.size_;
    }

    /**
     * Get the width of the icon (in pixels).
     *
     * Will return undefined when the icon image is not yet loaded.
     *
     * @todo the base class does not expect undefined, but this implementation
     * does.
     * @return Icon width (in pixels).
     * @api
     */
    getWidth(): number {
        const scale = this.getScaleArray();
        if (this.size_) {
            return this.size_[0] * scale[0];
        }
        if (this.iconImage_.getImageState() == ImageState.LOADED) {
            return this.iconImage_.getSize()[0] * scale[0];
        }
        return undefined as unknown as number;
    }

    /**
     * Get the height of the icon (in pixels).
     *
     * Will return undefined when the icon image is not yet loaded.
     *
     * @todo the base class does not expect undefined, but this implementation
     * does.
     * @return Icon height (in pixels).
     * @api
     */
    getHeight(): number {
        const scale = this.getScaleArray();
        if (this.size_) {
            return this.size_[1] * scale[1];
        }
        if (this.iconImage_.getImageState() == ImageState.LOADED) {
            return this.iconImage_.getSize()[1] * scale[1];
        }
        return undefined as unknown as number;
    }

    /**
     * Set the scale.
     *
     * @param scale Scale.
     * @api
     */
    override setScale(scale: number | Size) {
        delete this.initialOptions_;
        super.setScale(scale);
    }

    /**
     * @param listener Listener function.
     */
    listenImageChange(listener: ListenImageChange) {
        this.iconImage_.addEventListener(
            EventType.CHANGE, listener as Listener
        );
    }

    /**
     * Load not yet loaded URI.
     * When rendering a feature with an icon style, the vector renderer will
     * automatically call this method. However, you might want to call this
     * method yourself for preloading or other purposes.
     * @api
     */
    load() {
        this.iconImage_.load();
    }

    /**
     * @param listener Listener function.
     */
    unlistenImageChange(listener: ListenImageChange) {
        this.iconImage_.removeEventListener(
            EventType.CHANGE, listener as Listener
        );
    }

    override ready() {
        return this.iconImage_.ready();
    }
}


export default Icon;
