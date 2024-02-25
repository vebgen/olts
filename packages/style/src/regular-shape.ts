
import { asArray } from '@olts/core/color';
import { ColorLike, asColorLike } from '@olts/core/color-like';
import { createCanvasContext2D } from '@olts/core/dom';
import { ImageState, ImageStateType } from '@olts/core/image-state';
import { Size } from '@olts/core/size';

import {
    defaultFillStyle,
    defaultLineCap,
    defaultLineJoin,
    defaultLineWidth,
    defaultMiterLimit,
    defaultStrokeStyle,
} from '@olts/core/canvas-defaults';
import { Fill } from './fill';
import { DeclutterMode, ImageStyle, ListenImageChange } from './image';
import { Stroke } from './stroke';


/**
 * Regular shape options.
 */
export interface Options {
    /**
     * Fill style.
     */
    fill?: Fill;

    /**
     * Number of points for stars and regular polygons.
     *
     * In case of a polygon, the number of points is the number of sides.
     */
    points: number;

    /**
     * Radius of a regular polygon.
     */
    radius: number;

    /**
     * Second radius to make a star instead of a regular polygon.
     */
    radius2?: number;

    /**
     * Shape's angle in radians.
     *
     * A value of 0 (default) will have one of the shape's points facing up.
     */
    angle?: number;

    /**
     * Displacement of the shape in pixels.
     *
     * Positive values will shift the shape right and up.
     *
     * @default [0, 0]
     */
    displacement?: Array<number>;

    /**
     * Stroke style.
     */
    stroke?: Stroke;

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    rotation?: number;

    /**
     * Whether to rotate the shape with the view.
     *
     * @default false
     */
    rotateWithView?: boolean;

    /**
     * Scale. A two dimensional scale will produce an ellipse.
     *
     * @default 1
     */
    scale?: number | Size;

    /**
     * Declutter mode.
     */
    declutterMode?: DeclutterMode | undefined;
}


/**
 *
 */
export interface RenderOptions {
    /**
     * Stroke Style.
     */
    strokeStyle: ColorLike | undefined;

    /**
     * Stroke Width.
     */
    strokeWidth: number;

    /**
     * Size.
     */
    size: number;

    /**
     * Line Cap.
     */
    lineCap: CanvasLineCap;

    /**
     * Line Dash.
     */
    lineDash: Array<number> | null;

    /**
     * Line Dash Offset.
     */
    lineDashOffset: number;

    /**
     * Line Join.
     */
    lineJoin: CanvasLineJoin;

    /**
     * Miter Limit.
     */
    miterLimit: number;
}


/**
 * Set regular shape style for vector features.
 *
 * The resulting shape will be a regular polygon when `radius` is provided, or
 * a star when both `radius` and `radius2` are provided.
 * @api
 */
export class RegularShape extends ImageStyle {

    /**
     *
     */
    private canvases_: Record<number, HTMLCanvasElement> = {};

    /**
     *
     */
    private hitDetectionCanvas_: HTMLCanvasElement | null = null;

    /**
     * The fill style for the shape.
     */
    private fill_: Fill | null;

    /**
     * The origin of the symbolizer.
     */
    private origin_: [number, number] = [0, 0];

    /**
     * Number of points for stars and regular polygons.
     */
    private points_: number;

    /**
     * The primary radius for the shape.
     */
    protected radius_: number;

    /**
     * The secondary radius for the shape.
     */
    private radius2_?: number;

    /**
     * Shape's rotation in radians.
     */
    private angle_: number;

    /**
     * The stroke style for the shape.
     */
    private stroke_: Stroke | null;

    /**
     * The size of the symbolizer (in pixels)
     */
    private size_: Size | undefined;

    /**
     *
     */
    private renderOptions_: RenderOptions | undefined;

    /**
     *
     */
    private imageState_: ImageStateType;

    /**
     * @param options Options for the constructor.
     */
    constructor(options: Options) {
        super({
            opacity: 1,
            rotateWithView: options.rotateWithView !== undefined
                ? options.rotateWithView
                : false,
            rotation: options.rotation !== undefined
                ? options.rotation
                : 0,
            scale: options.scale !== undefined
                ? options.scale
                : 1,
            displacement: options.displacement !== undefined
                ? options.displacement as [number, number]
                : [0, 0],
            declutterMode: options.declutterMode,
        });
        this.fill_ = options.fill !== undefined ? options.fill : null;
        this.points_ = options.points;
        this.radius_ = options.radius;
        this.radius2_ = options.radius2;
        this.angle_ = options.angle !== undefined ? options.angle : 0;
        this.stroke_ = options.stroke !== undefined ? options.stroke : null;
        this.imageState_ = (this.fill_ && this.fill_.loading())
            ? ImageState.LOADING
            : ImageState.LOADED;
        if (this.imageState_ === ImageState.LOADING) {
            this.ready().then(() => (this.imageState_ = ImageState.LOADED));
        }

        this.render();
    }

    /**
     * Clones the style.
     *
     * @return The cloned style.
     * @api
     */
    override clone(): RegularShape {
        const scale = this.getScale();
        const fill = this.getFill();
        const stroke = this.getStroke();
        const style = new RegularShape({
            fill: fill ? fill.clone() : undefined,
            points: this.getPoints(),
            radius: this.getRadius(),
            radius2: this.getRadius2(),
            angle: this.getAngle(),
            stroke: stroke ? stroke.clone() : undefined,
            rotation: this.getRotation(),
            rotateWithView: this.getRotateWithView(),
            scale: (Array.isArray(scale) ? scale.slice() : scale) as Size,
            displacement: this.getDisplacement().slice(),
            declutterMode: this.getDeclutterMode(),
        });
        style.setOpacity(this.getOpacity());
        return style;
    }

    /**
     * Get the anchor point in pixels.
     *
     * The anchor determines the center point for the symbolizer.
     * @return Anchor.
     * @api
     */
    override getAnchor(): [number, number] {
        const size = this.size_!;
        const displacement = this.getDisplacement();
        const scale = this.getScaleArray();

        // anchor is scaled by renderer but displacement should not be scaled
        // so divide by scale here
        return [
            size[0] / 2 - displacement[0] / scale[0],
            size[1] / 2 + displacement[1] / scale[1],
        ];
    }

    /**
     * Get the angle used in generating the shape.
     *
     * @return Shape's rotation in radians.
     * @api
     */
    getAngle(): number {
        return this.angle_;
    }

    /**
     * Get the fill style for the shape.
     *
     * @return Fill style.
     * @api
     */
    getFill(): Fill | null {
        return this.fill_;
    }

    /**
     * Set the fill style.
     *
     * @param fill Fill style.
     * @api
     */
    setFill(fill: Fill | null) {
        this.fill_ = fill;
        this.render();
    }

    /**
     * @return Image element.
     */
    override getHitDetectionImage(): HTMLCanvasElement {
        if (!this.hitDetectionCanvas_) {
            this.hitDetectionCanvas_ = this.createHitDetectionCanvas_(
                this.renderOptions_!,
            );
        }
        return this.hitDetectionCanvas_!;
    }

    /**
     * Get the image icon.
     *
     * @param pixelRatio Pixel ratio.
     * @return Image or Canvas element.
     * @api
     */
    override getImage(pixelRatio: number): HTMLCanvasElement {
        let image = this.canvases_[pixelRatio];
        if (!image) {
            const renderOptions = this.renderOptions_!;
            const context = createCanvasContext2D(
                renderOptions.size * pixelRatio,
                renderOptions.size * pixelRatio,
            );
            this.draw_(renderOptions, context, pixelRatio);

            image = context.canvas;
            this.canvases_[pixelRatio] = image;
        }
        return image;
    }

    /**
     * Get the image pixel ratio.
     *
     * @param pixelRatio Pixel ratio.
     * @return Pixel ratio.
     */
    override getPixelRatio(pixelRatio: number): number {
        return pixelRatio;
    }

    /**
     * @return Image size.
     */
    override getImageSize(): Size {
        return this.size_!;
    }

    /**
     * @return Image state.
     */
    override getImageState(): ImageStateType {
        return this.imageState_;
    }

    /**
     * Get the origin of the symbolizer.
     *
     * @return Origin.
     * @api
     */
    override getOrigin(): [number, number] {
        return this.origin_;
    }

    /**
     * Get the number of points for generating the shape.
     *
     * @return Number of points for stars and regular polygons.
     * @api
     */
    getPoints(): number {
        return this.points_;
    }

    /**
     * Get the (primary) radius for the shape.
     *
     * @return Radius.
     * @api
     */
    getRadius(): number {
        return this.radius_;
    }

    /**
     * Get the secondary radius for the shape.
     *
     * @return Radius2.
     * @api
     */
    getRadius2(): number | undefined {
        return this.radius2_;
    }

    /**
     * Get the size of the symbolizer (in pixels).
     *
     * @return Size.
     * @api
     */
    override getSize(): Size {
        return this.size_!;
    }

    /**
     * Get the stroke style for the shape.
     *
     * @return Stroke style.
     * @api
     */
    getStroke(): Stroke | null {
        return this.stroke_;
    }

    /**
     * Set the stroke style.
     *
     * @param stroke Stroke style.
     * @api
     */
    setStroke(stroke: Stroke | null) {
        this.stroke_ = stroke;
        this.render();
    }

    /**
     * @param listener Listener function.
     */
    override listenImageChange(listener: ListenImageChange) { }

    /**
     * Load not yet loaded URI.
     */
    override load() { }

    /**
     * @param listener Listener function.
     */
    override unlistenImageChange(listener: ListenImageChange) { }

    /**
     * Calculate additional canvas size needed for the miter.
     *
     * @param lineJoin Line join
     * @param strokeWidth Stroke width
     * @param miterLimit Miter limit
     * @return Additional canvas size needed
     */
    private calculateLineJoinSize_(
        lineJoin: string,
        strokeWidth: number,
        miterLimit: number
    ): number {
        if (
            strokeWidth === 0 ||
            this.points_ === Infinity ||
            (lineJoin !== 'bevel' && lineJoin !== 'miter')
        ) {
            return strokeWidth;
        }
        // m  | ^
        // i  | |\                  .
        // t >|  #\
        // e  | |\ \              .
        // r      \s\
        //      |  \t\          .                 .
        //          \r\                      .   .
        //      |    \o\      .          .  . . .
        //          e \k\            .  .    . .
        //      |      \e\  .    .  .       . .
        //       d      \ \  .  .          . .
        //      | _ _a_ _\#  .            . .
        //   r1          / `             . .
        //      |                       . .
        //       b     /               . .
        //      |                     . .
        //           / r2            . .
        //      |                        .   .
        //         /                           .   .
        //      |α                                   .   .
        //       /                                         .   .
        //      ° center
        let r1 = this.radius_;
        let r2 = this.radius2_ === undefined ? r1 : this.radius2_;
        if (r1 < r2) {
            const tmp = r1;
            r1 = r2;
            r2 = tmp;
        }
        const points =
            this.radius2_ === undefined ? this.points_ : this.points_ * 2;
        const alpha = (2 * Math.PI) / points;
        const a = r2 * Math.sin(alpha);
        const b = Math.sqrt(r2 * r2 - a * a);
        const d = r1 - b;
        const e = Math.sqrt(a * a + d * d);
        const miterRatio = e / a;
        if (lineJoin === 'miter' && miterRatio <= miterLimit) {
            return miterRatio * strokeWidth;
        }
        // Calculate the distance from center to the stroke corner where
        // it was cut short because of the miter limit.
        //              l
        //        ----+---- <= distance from center to here is maxr
        //       /####|k ##\
        //      /#####^#####\
        //     /#### /+\# s #\
        //    /### h/+++\# t #\
        //   /### t/+++++\# r #\
        //  /### a/+++++++\# o #\
        // /### p/++ fill +\# k #\
        ///#### /+++++^+++++\# e #\
        //#####/+++++/+\+++++\#####\
        const k = strokeWidth / 2 / miterRatio;
        const l = (strokeWidth / 2) * (d / e);
        const maxr = Math.sqrt((r1 + k) * (r1 + k) + l * l);
        const bevelAdd = maxr - r1;
        if (this.radius2_ === undefined || lineJoin === 'bevel') {
            return bevelAdd * 2;
        }

        // If outer miter is over the miter limit the inner miter may reach
        // through the center and be longer than the bevel, same calculation as
        // above but swap r1 / r2.
        const aa = r1 * Math.sin(alpha);
        const bb = Math.sqrt(r1 * r1 - aa * aa);
        const dd = r2 - bb;
        const ee = Math.sqrt(aa * aa + dd * dd);
        const innerMiterRatio = ee / aa;
        if (innerMiterRatio <= miterLimit) {
            const innerLength = (innerMiterRatio * strokeWidth) / 2 - r2 - r1;
            return 2 * Math.max(bevelAdd, innerLength);
        }
        return bevelAdd * 2;
    }

    /**
     * @return The render options
     */
    protected createRenderOptions(): RenderOptions {
        let lineCap = defaultLineCap;
        let lineJoin = defaultLineJoin;
        let miterLimit = 0;
        let lineDash = null;
        let lineDashOffset = 0;
        let strokeStyle;
        let strokeWidth = 0;

        if (this.stroke_) {
            strokeStyle = asColorLike(
                this.stroke_.getColor() ?? defaultStrokeStyle
            );
            strokeWidth = this.stroke_.getWidth() ?? defaultLineWidth;
            lineDash = this.stroke_.getLineDash();
            lineDashOffset = this.stroke_.getLineDashOffset() ?? 0;
            lineJoin = this.stroke_.getLineJoin() ?? defaultLineJoin;
            lineCap = this.stroke_.getLineCap() ?? defaultLineCap;
            miterLimit = this.stroke_.getMiterLimit() ?? defaultMiterLimit;
        }

        const add = this.calculateLineJoinSize_(
            lineJoin, strokeWidth, miterLimit
        );
        const maxRadius = Math.max(this.radius_, this.radius2_ || 0);
        const size = Math.ceil(2 * maxRadius + add);

        return {
            strokeStyle: strokeStyle!,
            strokeWidth: strokeWidth,
            size: size,
            lineCap: lineCap,
            lineDash: lineDash,
            lineDashOffset: lineDashOffset,
            lineJoin: lineJoin,
            miterLimit: miterLimit,
        };
    }

    /**
     *
     */
    protected render() {
        this.renderOptions_ = this.createRenderOptions();
        const size = this.renderOptions_.size;
        this.canvases_ = {};
        this.hitDetectionCanvas_ = null;
        this.size_ = [size, size];
    }

    /**
     *
     * @param renderOptions Render options.
     * @param context The rendering context.
     * @param pixelRatio The pixel ratio.
     */
    private draw_(
        renderOptions: RenderOptions,
        context: CanvasRenderingContext2D,
        pixelRatio: number
    ) {
        context.scale(pixelRatio, pixelRatio);
        // set origin to canvas center
        context.translate(renderOptions.size / 2, renderOptions.size / 2);

        this.createPath_(context);

        if (this.fill_) {
            let color = this.fill_.getColor();
            if (color === null) {
                color = defaultFillStyle;
            }
            context.fillStyle = asColorLike(color)!;
            context.fill();
        }
        if (renderOptions.strokeStyle) {
            context.strokeStyle = renderOptions.strokeStyle;
            context.lineWidth = renderOptions.strokeWidth;
            if (renderOptions.lineDash) {
                context.setLineDash(renderOptions.lineDash);
                context.lineDashOffset = renderOptions.lineDashOffset;
            }
            context.lineCap = renderOptions.lineCap;
            context.lineJoin = renderOptions.lineJoin;
            context.miterLimit = renderOptions.miterLimit;
            context.stroke();
        }
    }

    /**
     *
     * @param renderOptions Render options.
     * @return Canvas containing the icon
     */
    private createHitDetectionCanvas_(
        renderOptions: RenderOptions
    ): HTMLCanvasElement {
        let context;
        if (this.fill_) {
            let color = this.fill_.getColor();

            // determine if fill is transparent (or pattern or gradient)
            let opacity = 0;
            if (typeof color === 'string') {
                color = asArray(color);
            }
            if (color === null) {
                opacity = 1;
            } else if (Array.isArray(color)) {
                opacity = color.length === 4 ? color[3] : 1;
            }
            if (opacity === 0) {
                // if a transparent fill style is set, create an extra
                // hit-detection image with a default fill style
                context = createCanvasContext2D(
                    renderOptions.size, renderOptions.size
                );
                this.drawHitDetectionCanvas_(renderOptions, context);
            }
        }
        return context ? context.canvas : this.getImage(1);
    }

    /**
     *
     * @param context The context to draw in.
     */
    private createPath_(context: CanvasRenderingContext2D) {
        let points = this.points_;
        const radius = this.radius_;
        if (points === Infinity) {
            context.arc(0, 0, radius, 0, 2 * Math.PI);
        } else {
            const radius2 = this.radius2_ === undefined
                ? radius
                : this.radius2_;
            if (this.radius2_ !== undefined) {
                points *= 2;
            }
            const startAngle = this.angle_ - Math.PI / 2;
            const step = (2 * Math.PI) / points;
            for (let i = 0; i < points; i++) {
                const angle0 = startAngle + i * step;
                const radiusC = i % 2 === 0 ? radius : radius2;
                context.lineTo(
                    radiusC * Math.cos(angle0), radiusC * Math.sin(angle0)
                );
            }
            context.closePath();
        }
    }

    /**
     *
     * @param renderOptions Render options.
     * @param context The context.
     */
    private drawHitDetectionCanvas_(
        renderOptions: RenderOptions,
        context: CanvasRenderingContext2D
    ) {
        // set origin to canvas center
        context.translate(renderOptions.size / 2, renderOptions.size / 2);

        this.createPath_(context);

        context.fillStyle = defaultFillStyle;
        context.fill();
        if (renderOptions.strokeStyle) {
            context.strokeStyle = renderOptions.strokeStyle;
            context.lineWidth = renderOptions.strokeWidth;
            if (renderOptions.lineDash) {
                context.setLineDash(renderOptions.lineDash);
                context.lineDashOffset = renderOptions.lineDashOffset;
            }
            context.lineJoin = renderOptions.lineJoin;
            context.miterLimit = renderOptions.miterLimit;
            context.stroke();
        }
    }

    override ready() {
        return this.fill_ ? this.fill_.ready() : Promise.resolve();
    }
}


export default RegularShape;
