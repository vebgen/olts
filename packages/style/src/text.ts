import { Fill } from './fill';
import { Size, toSize } from '@olts/core/size';
import { Stroke } from './stroke';


/**
 * Default text placement is `'point'`.
 *
 * Note that `'line'` requires the underlying geometry to be a
 * {@link LineString}, {@link Polygon}, {@link MultiLineString} or
 * {@link MultiPolygon}.
 */
export type TextPlacement = 'point' | 'line';


export type TextJustify = 'left' | 'center' | 'right';


/**
 * The default fill color to use if no fill was set at construction time; a
 * blackish `#333`.
 */
const DEFAULT_FILL_COLOR = '#333';


/**
 * Options for the text style.
 */
export interface Options {
    /**
     * Font style as CSS `font` value.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font.
     * @default `'10px sans-serif'`
     */
    font?: string;

    /**
     * When `placement` is set to `'line'`, allow a maximum angle between
     * adjacent characters.
     *
     * The expected value is in radians, and the default is 45°
     *  (`Math.PI / 4`).
     */
    maxAngle?: number;

    /**
     * Horizontal text offset in pixels.
     *
     * A positive will shift the text right.
     *
     * @default 0
     */
    offsetX?: number;

    /**
     * Vertical text offset in pixels.
     *
     * A positive will shift the text down.
     *
     * @default 0
     */
    offsetY?: number;

    /**
     * For polygon labels or when `placement` is set to `'line'`, allow text to
     * exceed the width of the polygon at the label position or the length of
     * the path that it follows.
     */
    overflow?: boolean;

    /**
     * Text placement.
     *
     * @default `'point'`
     */
    placement?: TextPlacement;

    /**
     * Repeat interval. When set, the text will be repeated at this interval,
     * which specifies the distance between two text anchors in pixels.
     *
     * Only available when `placement` is set to `'line'`.
     *
     * Overrides `textAlign`.
     */
    repeat?: number;

    /**
     * Scale.
     */
    scale?: number | Size;

    /**
     * Whether to rotate the text with the view.
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
     * Text content or rich text content.
     *
     * For plain text provide a string, which can
     * contain line breaks (`\n`).
     *
     * For rich text provide an array of text/font tuples. A tuple consists of
     * the text to render and the font to use (or `''` to use the text style's
     * font). A line break has to be a separate tuple (i.e. `'\n', ''`).
     *
     * @example
     * `[
     *     'foo',
     *     'bold 10px sans-serif',
     *     ' bar',
     *     'italic 10px sans-serif',
     *     ' baz',
     *     ''
     * ]`
     * will yield "**foo** *bar* baz".
     *
     * @note Rich text is not supported for `placement: 'line'` or
     * the immediate rendering API.
     */
    text?: string | Array<string>;

    /**
     * Text alignment.
     *
     * Possible values: `'left'`, `'right'`, `'center'`, `'end'` or `'start'`.
     *
     * Default is `'center'` for `placement: 'point'`.
     * For `placement: 'line'`, the default is to let the renderer choose a
     * placement where `maxAngle` is not exceeded.
     */
    textAlign?: CanvasTextAlign;

    /**
     * Text justification within the text box.
     *
     * If not set, text is justified towards the `textAlign` anchor.
     *
     * Otherwise, use options `'left'`, `'center'`, or `'right'` to justify
     * the text within the text box.
     *
     * @note `justify` is ignored for immediate rendering and also for
     * `placement: 'line'`.
     */
    justify?: TextJustify;

    /**
     * Text base line.
     *
     * Possible values: `'bottom'`, `'top'`, `'middle'`, `'alphabetic'`,
     * `'hanging'`, `'ideographic'`.
     *
     * @default `'middle'`
     */
    textBaseline?: CanvasTextBaseline;

    /**
     * Fill style.
     *
     * If none is provided, we'll use a dark fill-style (`#333`).
     *
     * Specify `null` for no fill.
     */
    fill?: Fill | null;

    /**
     * Stroke style.
     */
    stroke?: Stroke;

    /**
     * Fill style for the text background when `placement` is `'point'`.
     *
     * @default no fill
     */
    backgroundFill?: Fill;

    /**
     * Stroke style for the text background when `placement` is `'point'`.
     *
     * @default no stroke
     */
    backgroundStroke?: Stroke;

    /**
     * Padding in pixels around the text for de-cluttering and background.
     *
     * The order of values in the array is `[top, right, bottom, left]`.
     *
     * @default `[0, 0, 0, 0]`
     */
    padding?: Array<number>;
}


/**
 * Set text style for vector features.
 *
 * @api
 */
export class Text {
    /**
     * The font name.
     */
    private font_: string | undefined;

    /**
     * The rotation in radians (positive rotation clockwise).
     */
    private rotation_: number | undefined;

    /**
     * Whether to rotate the text with the view.
     */
    private rotateWithView_: boolean | undefined;

    /**
     * The scale.
     */
    private scale_: number | Size | undefined;

    /**
     * The symbolizer scale array.
     */
    private scaleArray_: Size;

    /**
     * The text to be rendered.
     */
    private text_: string | Array<string> | undefined;

    /**
     * The text alignment.
     */
    private textAlign_: CanvasTextAlign | undefined;

    /**
     * The justification.
     */
    private justify_: TextJustify | undefined;

    /**
     * The repeat interval of the text.
     */
    private repeat_: number | undefined;

    /**
     * The text baseline.
     */
    private textBaseline_: CanvasTextBaseline | undefined;

    /**
     * The fill style for the text.
     */
    private fill_: Fill | null;

    /**
     * The maximum angle between adjacent characters.
     */
    private maxAngle_: number;

    /**
     * The label placement.
     */
    private placement_: TextPlacement;

    /**
     * For polygon labels or when `placement` is set to `'line'`, allow text to
     * exceed the width of the polygon at the label position or the length of
     * the path that it follows.
     */
    private overflow_: boolean;

    /**
     * The stroke style for the text.
     */
    private stroke_: Stroke | null;

    /**
     * The x-offset for the text.
     */
    private offsetX_: number;

    /**
     * The y-offset for the text.
     */
    private offsetY_: number;

    /**
     * The background fill style for the text.
     */
    private backgroundFill_: Fill | null;

    /**
     * The background stroke style for the text.
     */
    private backgroundStroke_: Stroke | null;

    /**
     * The padding for the text.
     */
    private padding_: Array<number> | null;

    /**
     * @param options Options.
     */
    constructor(options?: Options) {
        options = options || {};
        this.font_ = options.font;
        this.rotation_ = options.rotation;
        this.rotateWithView_ = options.rotateWithView;
        this.scale_ = options.scale;
        this.scaleArray_ = toSize(
            options.scale !== undefined ? options.scale : 1
        );
        this.text_ = options.text;
        this.textAlign_ = options.textAlign;
        this.justify_ = options.justify;
        this.repeat_ = options.repeat;
        this.textBaseline_ = options.textBaseline;
        this.fill_ =
            options.fill !== undefined
                ? options.fill
                : new Fill({ color: DEFAULT_FILL_COLOR });
        this.maxAngle_ = options.maxAngle !== undefined
            ? options.maxAngle
            : Math.PI / 4;
        this.placement_ = options.placement !== undefined
            ? options.placement
            : 'point';
        this.overflow_ = !!options.overflow;
        this.stroke_ = options.stroke !== undefined ? options.stroke : null;
        this.offsetX_ = options.offsetX !== undefined ? options.offsetX : 0;
        this.offsetY_ = options.offsetY !== undefined ? options.offsetY : 0;
        this.backgroundFill_ = options.backgroundFill
            ? options.backgroundFill
            : null;
        this.backgroundStroke_ = options.backgroundStroke
            ? options.backgroundStroke
            : null;
        this.padding_ = options.padding === undefined ? null : options.padding;
    }

    /**
     * Clones the style.
     *
     * @return The cloned style.
     * @api
     */
    clone(): Text {
        const scale = this.getScale();
        const fill = this.getFill();
        const stroke = this.getStroke();
        const bkFill = this.getBackgroundFill();
        const bkStroke = this.getBackgroundStroke();
        return new Text({
            font: this.getFont(),
            placement: this.getPlacement(),
            repeat: this.getRepeat(),
            maxAngle: this.getMaxAngle(),
            overflow: this.getOverflow(),
            rotation: this.getRotation(),
            rotateWithView: this.getRotateWithView(),
            scale: (Array.isArray(scale) ? scale.slice() : scale) as Size,
            text: this.getText(),
            textAlign: this.getTextAlign(),
            justify: this.getJustify(),
            textBaseline: this.getTextBaseline(),
            fill: fill ? fill.clone() : undefined,
            stroke: stroke ? stroke.clone() : undefined,
            offsetX: this.getOffsetX(),
            offsetY: this.getOffsetY(),
            backgroundFill: bkFill ? bkFill.clone() : undefined,
            backgroundStroke: bkStroke ? bkStroke.clone() : undefined,
            padding: this.getPadding() || undefined,
        });
    }

    /**
     * Get the `overflow` configuration.
     *
     * @return Let text overflow the length of the path they follow.
     * @api
     */
    getOverflow(): boolean {
        return this.overflow_;
    }

    /**
     * Get the font name.
     *
     * @return Font.
     * @api
     */
    getFont(): string | undefined {
        return this.font_;
    }

    /**
     * Get the maximum angle between adjacent characters.
     *
     * @return Angle in radians.
     * @api
     */
    getMaxAngle(): number {
        return this.maxAngle_;
    }

    /**
     * Get the label placement.
     *
     * @return Text placement.
     * @api
     */
    getPlacement(): TextPlacement {
        return this.placement_;
    }

    /**
     * Get the repeat interval of the text.
     *
     * @return Repeat interval in pixels.
     * @api
     */
    getRepeat(): number | undefined {
        return this.repeat_;
    }

    /**
     * Get the x-offset for the text.
     *
     * @return Horizontal text offset.
     * @api
     */
    getOffsetX(): number {
        return this.offsetX_;
    }

    /**
     * Get the y-offset for the text.
     *
     * @return Vertical text offset.
     * @api
     */
    getOffsetY(): number {
        return this.offsetY_;
    }

    /**
     * Get the fill style for the text.
     *
     * @return Fill style.
     * @api
     */
    getFill(): Fill | null {
        return this.fill_;
    }

    /**
     * Determine whether the text rotates with the map.
     *
     * @return Rotate with map.
     * @api
     */
    getRotateWithView(): boolean | undefined {
        return this.rotateWithView_;
    }

    /**
     * Get the text rotation.
     *
     * @return Rotation.
     * @api
     */
    getRotation(): number | undefined {
        return this.rotation_;
    }

    /**
     * Get the text scale.
     *
     * @return Scale.
     * @api
     */
    getScale(): number | Size | undefined {
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
     * Get the stroke style for the text.
     *
     * @return Stroke style.
     * @api
     */
    getStroke(): Stroke | null {
        return this.stroke_;
    }

    /**
     * Get the text to be rendered.
     *
     * @return Text.
     * @api
     */
    getText(): string | string[] | undefined {
        return this.text_;
    }

    /**
     * Get the text alignment.
     *
     * @return Text align.
     * @api
     */
    getTextAlign(): CanvasTextAlign | undefined {
        return this.textAlign_;
    }

    /**
     * Get the justification.
     *
     * @return Justification.
     * @api
     */
    getJustify(): TextJustify | undefined {
        return this.justify_;
    }

    /**
     * Get the text baseline.
     *
     * @return Text baseline.
     * @api
     */
    getTextBaseline(): CanvasTextBaseline | undefined {
        return this.textBaseline_;
    }

    /**
     * Get the background fill style for the text.
     *
     * @return Fill style.
     * @api
     */
    getBackgroundFill(): Fill | null {
        return this.backgroundFill_;
    }

    /**
     * Get the background stroke style for the text.
     *
     * @return Stroke style.
     * @api
     */
    getBackgroundStroke(): Stroke | null {
        return this.backgroundStroke_;
    }

    /**
     * Get the padding for the text.
     *
     * @return Padding.
     * @api
     */
    getPadding(): number[] | null {
        return this.padding_;
    }

    /**
     * Set the `overflow` property.
     *
     * @param overflow Let text overflow the path that it follows.
     * @api
     */
    setOverflow(overflow: boolean) {
        this.overflow_ = overflow;
    }

    /**
     * Set the font.
     *
     * @param font Font.
     * @api
     */
    setFont(font: string | undefined) {
        this.font_ = font;
    }

    /**
     * Set the maximum angle between adjacent characters.
     *
     * @param maxAngle Angle in radians.
     * @api
     */
    setMaxAngle(maxAngle: number) {
        this.maxAngle_ = maxAngle;
    }

    /**
     * Set the x offset.
     *
     * @param offsetX Horizontal text offset.
     * @api
     */
    setOffsetX(offsetX: number) {
        this.offsetX_ = offsetX;
    }

    /**
     * Set the y offset.
     *
     * @param offsetY Vertical text offset.
     * @api
     */
    setOffsetY(offsetY: number) {
        this.offsetY_ = offsetY;
    }

    /**
     * Set the text placement.
     *
     * @param placement Placement.
     * @api
     */
    setPlacement(placement: TextPlacement) {
        this.placement_ = placement;
    }

    /**
     * Set the repeat interval of the text.
     * @param [repeat] Repeat interval in pixels.
     * @api
     */
    setRepeat(repeat: number | undefined) {
        this.repeat_ = repeat;
    }

    /**
     * Set whether to rotate the text with the view.
     *
     * @param rotateWithView Rotate with map.
     * @api
     */
    setRotateWithView(rotateWithView: boolean) {
        this.rotateWithView_ = rotateWithView;
    }

    /**
     * Set the fill.
     *
     * @param fill Fill style.
     * @api
     */
    setFill(fill: Fill | null) {
        this.fill_ = fill;
    }

    /**
     * Set the rotation.
     *
     * @param rotation Rotation.
     * @api
     */
    setRotation(rotation: number | undefined) {
        this.rotation_ = rotation;
    }

    /**
     * Set the scale.
     *
     * @param scale Scale.
     * @api
     */
    setScale(scale: number | Size | undefined) {
        this.scale_ = scale;
        this.scaleArray_ = toSize(scale !== undefined ? scale : 1);
    }

    /**
     * Set the stroke.
     *
     * @param stroke Stroke style.
     * @api
     */
    setStroke(stroke: Stroke | null) {
        this.stroke_ = stroke;
    }

    /**
     * Set the text.
     *
     * @param text Text.
     * @api
     */
    setText(text: string | string[] | undefined) {
        this.text_ = text;
    }

    /**
     * Set the text alignment.
     *
     * @param textAlign Text align.
     * @api
     */
    setTextAlign(textAlign: CanvasTextAlign | undefined) {
        this.textAlign_ = textAlign;
    }

    /**
     * Set the justification.
     *
     * @param justify Justification.
     * @api
     */
    setJustify(justify: TextJustify | undefined) {
        this.justify_ = justify;
    }

    /**
     * Set the text baseline.
     *
     * @param textBaseline Text baseline.
     * @api
     */
    setTextBaseline(textBaseline: CanvasTextBaseline | undefined) {
        this.textBaseline_ = textBaseline;
    }

    /**
     * Set the background fill.
     *
     * @param fill Fill style.
     * @api
     */
    setBackgroundFill(fill: Fill | null) {
        this.backgroundFill_ = fill;
    }

    /**
     * Set the background stroke.
     *
     * @param stroke Stroke style.
     * @api
     */
    setBackgroundStroke(stroke: Stroke | null) {
        this.backgroundStroke_ = stroke;
    }

    /**
     * Set the padding (`[top, right, bottom, left]`).
     *
     * @param padding Padding.
     * @api
     */
    setPadding(padding: number[] | null) {
        this.padding_ = padding;
    }
}


export default Text;
