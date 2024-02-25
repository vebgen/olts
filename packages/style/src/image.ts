import { Size, toSize } from '@olts/core/size';
import { ImageStateType } from '@olts/core/image-state';
import { BaseEvent } from '@olts/events';


export type ListenImageChange = (event: BaseEvent) => void;


export type DeclutterMode = "declutter" | "obstacle" | "none";


export type ImageLike =
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap;


/**
 *
 */
export interface Options {
    /**
     * Opacity.
     */
    opacity: number;

    /**
     * If the image should get rotated with the view.
     */
    rotateWithView: boolean;

    /**
     * Rotation in radians (positive rotation clockwise).
     */
    rotation: number;

    /**
     * Scale. A two dimensional scale will produce an ellipse.
     *
     * Unless two dimensional scaling is required a better result may be
     * obtained with an appropriate setting for `radius`.
     */
    scale: number | Size;

    /**
     * Displacement of the shape
     */
    displacement: [number, number];

    /**
     * Declutter mode.
     */
    declutterMode: DeclutterMode | undefined;
}



/**
 * A base class used for creating subclasses and not instantiated in
 * apps.
 *
 * Base class for {@link Icon}, {@link CircleStyle} and {@link RegularShape}.
 *
 * @api
 */
export abstract class ImageStyle {

    /**
     * The symbolizer opacity.
     */
    private opacity_: number;

    /**
     * Whether the symbolizer rotates with the map.
     */
    private rotateWithView_: boolean;

    /**
     * The symoblizer rotation.
     */
    private rotation_: number;

    /**
     * The symbolizer scale.
     */
    private scale_: number | Size;

    /**
     * The symbolizer scale array.
     */
    private scaleArray_: Size;

    /**
     * The displacement of the shape.
     */
    private displacement_: [number, number];

    /**
     * The declutter mode of the shape.
     */
    private declutterMode_: DeclutterMode | undefined;

    /**
     * The constructor for the image style.
     *
     * @param options Options.
     */
    constructor(options: Options) {
        this.opacity_ = options.opacity;
        this.rotateWithView_ = options.rotateWithView;
        this.rotation_ = options.rotation;
        this.scale_ = options.scale;
        this.scaleArray_ = toSize(options.scale);
        this.displacement_ = options.displacement;
        this.declutterMode_ = options.declutterMode;
    }

    /**
     * Clones the style.
     *
     * @return The cloned style.
     * @api
     */
    clone(): ImageStyle {
        const scale = this.getScale();
        return Reflect.construct(this.constructor, [{
            opacity: this.getOpacity(),
            scale: (Array.isArray(scale) ? scale.slice() : scale) as Size,
            rotation: this.getRotation(),
            rotateWithView: this.getRotateWithView(),
            displacement: this.getDisplacement().slice() as [number, number],
            declutterMode: this.getDeclutterMode(),

        }], this.constructor);
    }

    /**
     * Get the symbolizer opacity.
     *
     * @return Opacity.
     * @api
     */
    getOpacity(): number {
        return this.opacity_;
    }

    /**
     * Determine whether the symbolizer rotates with the map.
     *
     * @return Rotate with map.
     * @api
     */
    getRotateWithView(): boolean {
        return this.rotateWithView_;
    }

    /**
     * Get the symoblizer rotation.
     *
     * @return Rotation.
     * @api
     */
    getRotation(): number {
        return this.rotation_;
    }

    /**
     * Get the symbolizer scale.
     *
     * @return Scale.
     * @api
     */
    getScale(): number | Size {
        return this.scale_;
    }

    /**
     * Get the symbolizer scale array.
     *
     * @return Scale array.
     */
    getScaleArray(): Size {
        return this.scaleArray_;
    }

    /**
     * Get the displacement of the shape.
     *
     * @return Shape's center displacement
     * @api
     */
    getDisplacement(): [number, number] {
        return this.displacement_;
    }

    /**
     * Get the declutter mode of the shape.
     *
     * @return Shape's declutter mode
     * @api
     */
    getDeclutterMode(): DeclutterMode | undefined {
        return this.declutterMode_;
    }

    /**
     * Get the anchor point in pixels.
     *
     * The anchor determines the center point for the symbolizer.
     *
     * @return Anchor.
     */
    abstract getAnchor(): [number, number];

    /**
     * Get the image element for the symbolizer.
     *
     * @param pixelRatio Pixel ratio.
     * @return Image element.
     */
    abstract getImage(pixelRatio: number): ImageLike;

    /**
     *
     * @return Image element.
     */
    abstract getHitDetectionImage(): ImageLike;

    /**
     * Get the image pixel ratio.
     *
     * @param pixelRatio Pixel ratio.
     * @return Pixel ratio.
     */
    getPixelRatio(pixelRatio: number): number {
        return 1;
    }

    /**
     *
     * @return Image state.
     */
    abstract getImageState(): ImageStateType;

    /**
     *
     * @return Image size.
     */
    abstract getImageSize(): Size;

    /**
     * Get the origin of the symbolizer.
     *
     * @return Origin.
     */
    abstract getOrigin(): [number, number];

    /**
     * Get the size of the symbolizer (in pixels).
     *
     * @return Size.
     */
    abstract getSize(): Size;

    /**
     * Set the displacement.
     *
     * @param displacement Displacement.
     * @api
     */
    setDisplacement(displacement: [number, number]) {
        this.displacement_ = displacement;
    }

    /**
     * Set the opacity.
     *
     * @param opacity Opacity.
     * @api
     */
    setOpacity(opacity: number) {
        this.opacity_ = opacity;
    }

    /**
     * Set whether to rotate the style with the view.
     *
     * @param rotateWithView Rotate with map.
     * @api
     */
    setRotateWithView(rotateWithView: boolean) {
        this.rotateWithView_ = rotateWithView;
    }

    /**
     * Set the rotation.
     *
     * @param rotation Rotation.
     * @api
     */
    setRotation(rotation: number) {
        this.rotation_ = rotation;
    }

    /**
     * Set the scale.
     *
     * @param scale Scale.
     * @api
     */
    setScale(scale: number | Size) {
        this.scale_ = scale;
        this.scaleArray_ = toSize(scale);
    }

    /**
     *
     * @param listener Listener function.
     */
    abstract listenImageChange(listener: ListenImageChange): void;

    /**
     * Load not yet loaded URI.
     */
    abstract load(): void;

    /**
     *
     * @param listener Listener function.
     */
    abstract unlistenImageChange(listener: ListenImageChange): void;

    /**
     * @return `false` or Promise that resolves when the style is ready to use.
     */
    ready(): Promise<void> {
        return Promise.resolve();
    }
}


export default ImageStyle;
