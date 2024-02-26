/**
 * @api
 * @fileoverview Vector layers can be styled with an object literal containing
 * properties for stroke, fill, image, and text styles.
 *
 * The types below can be composed into a single object.
 *
 * For example, a style with both stroke and fill properties could look like
 * this:
 *
 * ```js
 *     const style = {
 *       'stroke-color': 'yellow',
 *       'stroke-width': 1.5,
 *       'fill-color': 'orange',
 *     };
 * ```
 *
 * See details about the available properties depending on what type of
 * symbolizer should be applied:
 *  * {@link FlatStroke Stroke} - properties for applying a stroke to
 *      lines and polygons
 *  * {@link FlatFill Fill} - properties for filling polygons
 *  * {@link FlatText Text} - properties for labeling points, lines, and
 *      polygons
 *  * {@link FlatIcon Icon} - properties for rendering points with an icon
 *  * {@link FlatCircle Circle} - properties for rendering points with a circle
 *  * {@link FlatShape Shape} - properties for rendering points with a regular
 *      shape
 *
 * To conditionally apply styles based on a filter, a list of
 * {@link Rule rules} can be used. For example, to style points with a big
 * orange circle if the population is greater than 1 million and a smaller blue
 * circle otherwise:
 *
 * ```js
 *     const rules = [
 *       {
 *         filter: ['>', ['get', 'population'], 1_000_000],
 *         style: {
 *           'circle-radius': 10,
 *           'circle-fill-color': 'red',
 *         }
 *       },
 *       {
 *         else: true,
 *         style: {
 *           'circle-radius': 5,
 *           'circle-fill-color': 'blue',
 *         },
 *       },
 *     ];
 * ```
 */

import { Color } from "@olts/core/color";
import { IconAnchorUnits, IconOrigin } from "./icon";
import { Size } from "@olts/core/size";
import { DeclutterMode } from "./image";
import { EncodedExpression } from "./defs";


/**
 * A literal boolean (e.g. `true`) or an expression that evaluates to a
 * boolean (e.g. `['>', ['get', 'population'], 1_000_000]`).
 */
export type BooleanExpression = boolean | any[];


/**
 * A literal string (e.g. `'hello'`) or an expression that evaluates to a
 * string (e.g. `['get', 'greeting']`).
 */
export type StringExpression = string | any[];


/**
 * A literal number (e.g. `42`) or an expression that evaluates to a number
 * (e.g. `['+', 40, 2]`).
 */
export type NumberExpression = number | any[];


/**
 * A CSS named color (e.g. `'blue'`), an array of 3 RGB values (e.g. `[0, 255,
 * 0]`), an array of 4 RGBA values (e.g. `[0, 255, 0, 0.5]`), or an expression
 * that evaluates to one of these color types (e.g. `['get', 'color']`).
 */
export type ColorExpression = Color | string | any[];


/**
 * An array of numbers (e.g. `[1, 2, 3]`) or an expression that evaluates to
 * the same (e.g. `['get', 'values']`).
 */
export type NumberArrayExpression = number[] | any[];


/**
 * An array of two numbers (e.g. `[10, 20]`) or an expression that evaluates to
 * the same (e.g. `['get', 'size']`).
 */
export type SizeExpression = number | number[] | any[];


/**
 * For static styling, the [layer.setStyle()]{@link VectorLayer#setStyle}
 * method can be called with an object literal that has fill, stroke, text,
 * icon, regular shape, and/or circle properties.
 * @api
 */
export type FlatStyle =
    & FlatFill
    & FlatStroke
    & FlatText
    & FlatIcon
    & FlatShape
    & FlatCircle;


/**
 * A flat style literal or an array of the same.
 */
export type FlatStyleLike = FlatStyle |FlatStyle[] | Rule[];


/**
 * Fill style properties applied to polygon features.
 */
export interface FlatFill {
    /**
     * The fill color.
     */
    'fill-color'?: ColorExpression;

    /**
     * Fill pattern image URL.
     */
    'fill-pattern-src'?: StringExpression;

    /**
     * Fill pattern image size in pixels.
     *
     * Can be used together with `fill-pattern-offset` to define the
     * sub-rectangle to use from a fill pattern image sprite sheet.
     */
    'fill-pattern-size'?: SizeExpression;

    /**
     * Fill pattern image offset in pixels.
     */
    'fill-pattern-offset'?: SizeExpression;
}


/**
 * Stroke style properties applied to line strings and polygon boundaries.
 *
 * To apply a stroke, at least one of `stroke-color` or `stroke-width` must be
 * provided.
 */
export interface FlatStroke {
    /**
     * The stroke color.
     */
    'stroke-color'?: ColorExpression;

    /**
     * Stroke pixel width.
     */
    'stroke-width'?: NumberExpression;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     */
    'stroke-line-cap'?: StringExpression;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     */
    'stroke-line-join'?: StringExpression;

    /**
     * Line dash pattern.
     */
    'stroke-line-dash'?: NumberArrayExpression;

    /**
     * Line dash offset.
     */
    'stroke-line-dash-offset'?: NumberExpression;

    /**
     * Miter limit.
     */
    'stroke-miter-limit'?: NumberExpression;

    /**
     * The zIndex of the style.
     */
    'z-index'?: NumberExpression;
}


/**
 * Label style properties applied to all features.
 *
 * At a minimum, a `text-value` must be provided.
 */
export interface FlatText {
    /**
     * Text content (with `\n` for line breaks).
     */
    'text-value'?: StringExpression;

    /**
     * Font style as [CSS `font`](
     * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font
     * ) value.
     *
     * @default '10px sans-serif'
     */
    'text-font'?: StringExpression;

    /**
     * When `text-placement` is set to `'line'`, allow a maximum angle between
     * adjacent characters.
     *
     * The expected value is in radians.
     *
     * @default 45° (`Math.PI / 4`).
     */
    'text-max-angle'?: NumberExpression;

    /**
     * Horizontal text offset in pixels.
     *
     * A positive will shift the text right.
     *
     * @default 0
     */
    'text-offset-x'?: NumberExpression;

    /**
     * Vertical text offset in pixels.
     *
     * A positive will shift the text down.
     *
     * @default 0
     */
    'text-offset-y'?: NumberExpression;

    /**
     * For polygon labels or when `placement` is set to `'line'`, allow text to
     * exceed the width of the polygon at the label position or the length of the
     * path that it follows.
     *
     * @default false
     */
    'text-overflow'?: BooleanExpression;

    /**
     * Text placement.
     *
     * @default 'point'
     */
    'text-placement'?: StringExpression;

    /**
     * Repeat interval in pixels. When set, the text will be repeated at this
     * interval. Only available when `text-placement` is set to `'line'`.
     *
     * Overrides `text-align`.
     */
    'text-repeat'?: NumberExpression;

    /**
     * Scale.
     */
    'text-scale'?: SizeExpression;

    /**
     * Whether to rotate the text with the view.
     *
     * @default false
     */
    'text-rotate-with-view'?: BooleanExpression;

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    'text-rotation'?: NumberExpression;

    /**
     * Text alignment.
     *
     * Possible values: `'left'`, `'right'`, `'center'`, `'end'` or `'start'`.
     *
     * Default is `'center'` for `'text-placement': 'point'`. For
     * `'text-placement': 'line'`, the default is to let the renderer choose a
     * placement where `text-max-angle` is not exceeded.
     */
    'text-align'?: StringExpression;

    /**
     * Text justification within the text box.
     *
     * If not set, text is justified towards the `textAlign` anchor.
     * Otherwise, use options `'left'`, `'center'`, or `'right'` to justify the
     * text within the text box.
     *
     * @note `text-justify` is ignored for immediate rendering and also for
     * `'text-placement': 'line'`.
     */
    'text-justify'?: StringExpression;

    /**
     * Text baseline.
     *
     * Possible values: `'bottom'`, `'top'`, `'middle'`, `'alphabetic'`,
     * `'hanging'`, `'ideographic'`.
     *
     * @default 'middle'
     */
    'text-baseline'?: StringExpression;

    /**
     * Padding in pixels around the text for de-cluttering and background.
     *
     * The order of values in the array is `[top, right, bottom, left]`.
     *
     * @default [0, 0, 0, 0]
     */
    'text-padding'?: NumberArrayExpression;

    /**
     * Text background fill color.
     *
     * Specify `'none'` to avoid hit detection on the fill.
     */
    'text-fill-color'?: ColorExpression;

    /**
     * The fill color.
     */
    'text-background-fill-color'?: ColorExpression;

    /**
     * The stroke color.
     */
    'text-stroke-color'?: ColorExpression;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     *
     * @default 'round'
     */
    'text-stroke-line-cap'?: StringExpression;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     *
     * @default 'round'
     */
    'text-stroke-line-join'?: StringExpression;

    /**
     * Line dash pattern.
     */
    'text-stroke-line-dash'?: NumberArrayExpression;

    /**
     * Line dash offset.
     *
     * @default 0
     */
    'text-stroke-line-dash-offset'?: NumberExpression;

    /**
     * Miter limit.
     *
     * @default 10
     */
    'text-stroke-miter-limit'?: NumberExpression;

    /**
     * Stroke pixel width.
     */
    'text-stroke-width'?: NumberExpression;

    /**
     * The stroke color.
     */
    'text-background-stroke-color'?: ColorExpression;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     *
     * @default 'round'
     */
    'text-background-stroke-line-cap'?: StringExpression;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     *
     * @default 'round'
     */
    'text-background-stroke-line-join'?: StringExpression;

    /**
     * Line dash pattern.
     */
    'text-background-stroke-line-dash'?: NumberArrayExpression;

    /**
     * Line dash offset.
     *
     * @default 0
     */
    'text-background-stroke-line-dash-offset'?: NumberExpression;

    /**
     * Miter limit.
     *
     * @default 10
     */
    'text-background-stroke-miter-limit'?: NumberExpression;

    /**
     * Stroke pixel width.
     */
    'text-background-stroke-width'?: NumberExpression;

    /**
     * The zIndex of the style.
     */
    'z-index'?: NumberExpression;
}


/**
 * Icon style properties applied to point features. `icon-src` must be provided to render
 * points with an icon.
 *
 * @property {"declutter"|"obstacle"|"none"|undefined} [icon-declutter-mode] Declutter mode
 * @property {NumberExpression} [z-index] The zIndex of the style.
*/
export interface FlatIcon {
    /**
     * The URI source of the icon.
     */
    'icon-src'?: string;

    /**
     * The anchor point of the icon.
     *
     * Default value is the icon center.
     *
     * @default [0.5, 0.5]
     */
    'icon-anchor'?: NumberArrayExpression;

    /**
     * The origin of the anchor point.
     *
     * @default 'top-left'
     */
    'icon-anchor-origin'?: IconOrigin;

    /**
     * Units in which the anchor x value is specified.
     *
     * A value of `'fraction'` indicates the x value is a fraction of the icon.
     * A value of `'pixels'` indicates the x value in pixels.
     *
     * @default 'fraction'
     */
    'icon-anchor-x-units'?: IconAnchorUnits;

    /**
     * Units in which the anchor y value is specified.
     *
     * A value of `'fraction'` indicates the y value is a fraction of the icon.
     * A value of `'pixels'` indicates the y value in pixels.
     *
     * @default 'fraction'
     */
    'icon-anchor-y-units'?: 'fraction' | 'pixels';

    /**
     * Color to tint the icon.
     *
     * If not specified, the icon will be left as is.
     */
    'icon-color'?: Color | string;

    /**
     * The cross-origin attribute of the loaded images.
     *
     * Note that you must provide a `icon-cross-origin` value if you want to
     * access pixel data with the Canvas renderer.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
     * for more detail.
     */
    'icon-cross-origin'?: null | string;

    /**
     * Offset, which, together with the size and the offset origin, define the
     * sub-rectangle to use from the original icon image.
     *
     * @default [0, 0]
     */
    'icon-offset'?: number[];

    /**
     * The displacement of the icon.
     *
     * @default [0, 0]
     */
    'icon-displacement'?: NumberArrayExpression;

    /**
     * The origin of the offset.
     *
     * @default 'top-left'
     */
    'icon-offset-origin'?: IconOrigin;

    /**
     * The opacity of the icon.
     *
     * @default 1
     */
    'icon-opacity'?: NumberExpression;

    /**
     * The scale of the icon.
     *
     * @default 1
     */
    'icon-scale'?: SizeExpression;

    /**
     * The width of the icon.
     *
     * If not specified, the actual image width will be used.
     * Cannot be combined with `scale`.
     */
    'icon-width'?: number;

    /**
     * The height of the icon.
     *
     * If not specified, the actual image height will be used.
     * Cannot be combined with `scale`.
     */
    'icon-height'?: number;

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    'icon-rotation'?: NumberExpression;

    /**
     * Whether the icon should rotate with the view.
     *
     * @default false
     */
    'icon-rotate-with-view'?: BooleanExpression;

    /**
     * The size of the icon in pixels.
     *
     * Can be used together with `icon-offset` to define the sub-rectangle to
     * use from the origin (sprite) icon image.
     */
    'icon-size'?: Size;

    /**
     * The declutter mode of the icon.
     */
    'icon-declutter-mode'?: DeclutterMode | undefined;

    /**
     * The zIndex of the style (icon).
     */
    'z-index'?: NumberExpression;
}


/**
 * Regular shape style properties for rendering point features.
 *
 * At least `shape-points` must be provided.
 */
export interface FlatShape {
    /**
     * Number of points for stars and regular polygons.
     *
     * In case of a polygon, the number of points is the number of sides.
     */
    'shape-points'?: number;

    /**
     * The fill color.
     */
    'shape-fill-color'?: ColorExpression;

    /**
     * The stroke color.
     */
    'shape-stroke-color'?: ColorExpression;

    /**
     * Stroke pixel width.
     */
    'shape-stroke-width'?: NumberExpression;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     *
     * @default 'round'
     */
    'shape-stroke-line-cap'?: StringExpression;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     *
     * @default 'round'
     */
    'shape-stroke-line-join'?: StringExpression;

    /**
     * Line dash pattern.
     */
    'shape-stroke-line-dash'?: NumberArrayExpression;

    /**
     * Line dash offset.
     *
     * @default 0
     */
    'shape-stroke-line-dash-offset'?: NumberExpression;

    /**
     * Miter limit.
     *
     * @default 10
     */
    'shape-stroke-miter-limit'?: NumberExpression;

    /**
     * Radius of a regular polygon.
     */
    'shape-radius'?: number;

    /**
     * Second radius to make a star instead of a regular polygon.
     */
    'shape-radius2'?: number;

    /**
     * Shape's angle in radians.
     *
     * A value of 0 will have one of the shape's point facing up.
     *
     * @default 0
     */
    'shape-angle'?: NumberExpression;

    /**
     * The displacement of the shape.
     *
     * @default [0, 0]
     */
    'shape-displacement'?: NumberArrayExpression;

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    'shape-rotation'?: NumberExpression;

    /**
     * Whether to rotate the shape with the view.
     *
     * @default false
     */
    'shape-rotate-with-view'?: BooleanExpression;

    /**
     * Scale. Unless two dimensional scaling is required a better
     * result may be obtained with appropriate settings for `shape-radius` and
     * `shape-radius2`.
     *
     * @default 1
     */
    'shape-scale'?: SizeExpression;

    /**
     * The declutter mode of the shape.
     */
    'shape-declutter-mode'?: DeclutterMode | undefined;

    /**
     * The zIndex of the style (shape).
     */
    'z-index'?: NumberExpression;
}


/**
 * Circle style properties for rendering point features.
 *
 * At least `circle-radius` must be provided.
 */
export interface FlatCircle {
    /**
     * Circle radius.
     */
    'circle-radius'?: number;

    /**
     * The fill color.
     */
    'circle-fill-color'?: ColorExpression;

    /**
     * The stroke color.
     */
    'circle-stroke-color'?: ColorExpression;

    /**
     * Stroke pixel width.
     */
    'circle-stroke-width'?: NumberExpression;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     *
     * @default 'round'
     */
    'circle-stroke-line-cap'?: StringExpression;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     *
     * @default 'round'
     */
    'circle-stroke-line-join'?: StringExpression;

    /**
     * Line dash pattern.
     */
    'circle-stroke-line-dash'?: NumberArrayExpression;

    /**
     * Line dash offset.
     *
     * @default 0
     */
    'circle-stroke-line-dash-offset'?: NumberExpression;

    /**
     * Miter limit.
     *
     * @default 10
     */
    'circle-stroke-miter-limit'?: NumberExpression;

    /**
     * The displacement of the circle.
     *
     * @default [0, 0]
     */
    'circle-displacement'?: NumberArrayExpression;

    /**
     * Scale. A two dimensional scale will produce an ellipse.
     *
     * Unless two dimensional scaling is required a better result may be
     * obtained with an appropriate setting for `circle-radius`.
     *
     * @default 1
     */
    'circle-scale'?: SizeExpression;

    /**
     * Rotation in radians.
     *
     * Positive rotation is clockwise; meaningful only when used in conjunction
     * with a two dimensional scale.
     *
     * @default 0
     */
    'circle-rotation'?: NumberExpression;

    /**
     * Whether to rotate the shape with the view.
     *
     * Meaningful only when used in conjunction with a two dimensional scale
     *
     * @default false
     */
    'circle-rotate-with-view'?: BooleanExpression;

    /**
     * The declutter mode of the circle.
     */
    'circle-declutter-mode'?: DeclutterMode | undefined;

    /**
     * The zIndex of the style (circle).
     */
    'z-index'?: NumberExpression;
}


/**
 * These default style properties are applied when no other style is given.
 */
export interface DefaultStyle {

    /**
     * The fill color.
     */
    'fill-color': string;

    /**
     * The stroke color.
     */
    'stroke-color': string;

    /**
     * Stroke pixel width.
     */
    'stroke-width': number;

    /**
     * Circle radius.
     */
    'circle-radius': number;

    /**
     * The fill color.
     */
    'circle-fill-color': string;

    /**
     * Stroke pixel width.
     */
    'circle-stroke-width': number;

    /**
     * The stroke color.
     */
    'circle-stroke-color': string;
}


/**
 * @return The default flat style.
 */
export function createDefaultStyle(): DefaultStyle {
    return {
        'fill-color': 'rgba(255,255,255,0.4)',
        'stroke-color': '#3399CC',
        'stroke-width': 1.25,
        'circle-radius': 5,
        'circle-fill-color': 'rgba(255,255,255,0.4)',
        'circle-stroke-width': 1.25,
        'circle-stroke-color': '#3399CC',
    };
}


/**
 * A rule is used to conditionally apply a style.
 *
 * If the rule's filter evaluates to true, the style will be applied.
 */
export interface Rule {
    /**
     * The style to be applied if the filter matches.
     */
    style: FlatStyle | FlatStyle[];

    /**
     * The filter used to determine if a style applies.
     *
     * If no filter is included, the rule always applies (unless it is an else
     * rule).
     */
    filter?: EncodedExpression;

    /**
     * If true, the rule applies only if no other previous rule applies.
     *
     * If the else rule also has a filter, the rule will not apply if the
     * filter does not match.
     */
    else?: boolean;
}
