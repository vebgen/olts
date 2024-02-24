import { Color } from "@olts/core/color";
import { ColorLike } from "@olts/core/color-like";


/**
 *
 */
export interface Options {
    /**
     * A color, gradient or pattern.
     */
    color?: Color | ColorLike;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     */
    lineCap?: CanvasLineCap;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     */
    lineJoin?: CanvasLineJoin;

    /**
     * Line dash pattern. Default is `null` (no dash).
     */
    lineDash?: number[];

    /**
     * Line dash offset.
     */
    lineDashOffset?: number;

    /**
     * Miter limit.
     *
     * @default 10
     */
    miterLimit?: number;

    /**
     * Width.
     */
    width?: number;
}



/**
 * Set stroke style for vector features.
 *
 * Note that the defaults given are the Canvas defaults, which will be used if
 * option is not defined. The `get` functions return whatever was entered in
 * the options; they will not return the default.
 *
 * @api
 */
export class Stroke {

    /**
     *
     */
    private color_: Color | ColorLike | null;

    /**
     *
     */
    private lineCap_: CanvasLineCap | undefined;

    /**
     *
     */
    private lineDash_: number[] | null;

    /**
     *
     */
    private lineDashOffset_: number | undefined;

    /**
     *
     */
    private lineJoin_: CanvasLineJoin | undefined;

    /**
     *
     */
    private miterLimit_: number | undefined;

    /**
     *
     */
    private width_: number | undefined;

    /**
     * @param options Options.
     */
    constructor(options?: Options) {
        options = options || {};
        this.color_ = options.color !== undefined ? options.color : null;
        this.lineCap_ = options.lineCap;
        this.lineDash_ = options.lineDash !== undefined
            ? options.lineDash
            : null;
        this.lineDashOffset_ = options.lineDashOffset;
        this.lineJoin_ = options.lineJoin;
        this.miterLimit_ = options.miterLimit;
        this.width_ = options.width;
    }

    /**
     * Clones the style.
     *
     * @return The cloned style.
     * @api
     */
    clone(): Stroke {
        const color = this.getColor();
        const lineDash = this.getLineDash();
        return new Stroke({
            color: (
                Array.isArray(color) ? color.slice() : color
            ) as Color || undefined,
            lineCap: this.getLineCap(),
            lineDash: lineDash ? lineDash.slice() : undefined,
            lineDashOffset: this.getLineDashOffset(),
            lineJoin: this.getLineJoin(),
            miterLimit: this.getMiterLimit(),
            width: this.getWidth(),
        });
    }

    /**
     * Get the stroke color.
     *
     * @return Color.
     * @api
     */
    getColor(): Color | ColorLike {
        return this.color_!;
    }

    /**
     * Get the line cap type for the stroke.
     *
     * @return Line cap.
     * @api
     */
    getLineCap(): CanvasLineCap | undefined {
        return this.lineCap_;
    }

    /**
     * Get the line dash style for the stroke.
     *
     * @return Line dash.
     * @api
     */
    getLineDash(): number[] | null {
        return this.lineDash_;
    }

    /**
     * Get the line dash offset for the stroke.
     *
     * @return Line dash offset.
     * @api
     */
    getLineDashOffset(): number | undefined {
        return this.lineDashOffset_;
    }

    /**
     * Get the line join type for the stroke.
     *
     * @return Line join.
     * @api
     */
    getLineJoin(): CanvasLineJoin | undefined {
        return this.lineJoin_;
    }

    /**
     * Get the miter limit for the stroke.
     *
     * @return Miter limit.
     * @api
     */
    getMiterLimit(): number | undefined {
        return this.miterLimit_;
    }

    /**
     * Get the stroke width.
     *
     * @return Width.
     * @api
     */
    getWidth(): number | undefined {
        return this.width_;
    }

    /**
     * Set the color.
     *
     * @param color Color.
     * @api
     */
    setColor(color: Color | ColorLike) {
        this.color_ = color;
    }

    /**
     * Set the line cap.
     *
     * @param lineCap Line cap.
     * @api
     */
    setLineCap(lineCap: CanvasLineCap | undefined) {
        this.lineCap_ = lineCap;
    }

    /**
     * Set the line dash.
     *
     * @param lineDash Line dash.
     * @api
     */
    setLineDash(lineDash: number[] | null) {
        this.lineDash_ = lineDash;
    }

    /**
     * Set the line dash offset.
     *
     * @param lineDashOffset Line dash offset.
     * @api
     */
    setLineDashOffset(lineDashOffset: number | undefined) {
        this.lineDashOffset_ = lineDashOffset;
    }

    /**
     * Set the line join.
     *
     * @param {CanvasLineJoin|undefined} lineJoin Line join.
     * @api
     */
    setLineJoin(lineJoin: CanvasLineJoin | undefined) {
        this.lineJoin_ = lineJoin;
    }

    /**
     * Set the miter limit.
     *
     * @param miterLimit Miter limit.
     * @api
     */
    setMiterLimit(miterLimit: number | undefined) {
        this.miterLimit_ = miterLimit;
    }

    /**
     * Set the width.
     *
     * @param width Width.
     * @api
     */
    setWidth(width: number | undefined) {
        this.width_ = width;
    }
}


export default Stroke;
