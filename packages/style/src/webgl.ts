/**
 * WebGL style objects slightly differ from standard flat styles for certain
 * properties.
 */
import { Color } from "@olts/core/color";
import { Size } from "@olts/core/size";

import type { ExpressionValue } from "./defs";
import { IconOrigin } from "./icon";


/**
 *
 */
export type ColorExpression = string | number[] | Color;


/**
 *
 */
export interface BaseProps {
    /**
     * Filter expression.
     *
     * If it resolves to a number strictly greater than 0, the point will be
     * displayed. If undefined, all points will show.
     */
    filter?: ExpressionValue;

    /**
     * Style variables; each variable must hold a number.
     *
     * Note: **this object is meant to be mutated**: changes to the values will
     * immediately be visible on the rendered features
     */
    variables?: Record<string, number | number[] | string | boolean>;
}


/**
 *
 */
export interface FillProps {
    /**
     * The fill color.
     */
    'fill-color'?: ColorExpression;

    /**
     * Fill pattern image source URI.
     *
     * If `fill-color` is defined as well, it will be used to tint this image.
     */
    'fill-pattern-src'?: string;

    /**
     * Offset, which, together with the size and the offset origin, define the
     * sub-rectangle to use from the original fill pattern image.
     *
     * @default [0, 0]
     */
    'fill-pattern-offset'?: ExpressionValue | [number, number];

    /**
     * Origin of the offset: `bottom-left`, `bottom-right`, `top-left` or
     * `top-right`.
     *
     * @default 'top-left'
     */
    'fill-pattern-offset-origin'?: IconOrigin;

    /**
     * Fill pattern image size in pixel.
     *
     * Can be used together with `fill-pattern-offset` to define the
     * sub-rectangle to use from the origin (sprite) fill pattern image.
     */
    'fill-pattern-size'?: ExpressionValue | Size;
}


/**
 *
 */
export interface StrokeProps {
    /**
     * The stroke color.
     */
    'stroke-color'?: ColorExpression;

    /**
     * Stroke pixel width.
     */
    'stroke-width'?: ExpressionValue | number;

    /**
     * Stroke offset in pixel.
     *
     * A positive value offsets the line to the right, relative to the direction
     * of the line.
     */
    'stroke-offset'?: ExpressionValue | number;

    /**
     * Line cap style: `butt`, `round`, or `square`.
     *
     * @default 'round'
     */
    'stroke-line-cap'?: ExpressionValue | CanvasLineCap;

    /**
     * Line join style: `bevel`, `round`, or `miter`.
     *
     * @default 'round'
     */
    'stroke-line-join'?: ExpressionValue | CanvasLineJoin;

    /**
     * Line dash pattern.
     */
    'stroke-line-dash'?: ExpressionValue[] | number[];

    /**
     * Line dash offset.
     *
     * @default 0
     */
    'stroke-line-dash-offset'?: ExpressionValue | number;

    /**
     * Miter limit.
     *
     * @default 10
     */
    'stroke-miter-limit'?: ExpressionValue | number;

    /**
     * Stroke pattern image source URI.
     *
     * If `stroke-color` is defined as well, it will be used to tint this image.
     */
    'stroke-pattern-src'?: string;

    /**
     * Offset, which, together with the size and the offset origin, define the
     * sub-rectangle to use from the original fill pattern image.
     *
     * @default [0, 0]
     */
    'stroke-pattern-offset'?: ExpressionValue | [number, number];

    /**
     * Origin of the offset: `bottom-left`, `bottom-right`, `top-left` or
     * `top-right`.
     *
     * @default 'top-left'
     */
    'stroke-pattern-offset-origin'?: IconOrigin;

    /**
     * Stroke pattern image size in pixel.
     *
     * Can be used together with `stroke-pattern-offset` to define the
     * sub-rectangle to use from the origin (sprite) fill pattern image.
     */
    'stroke-pattern-size'?: ExpressionValue | Size;

    /**
     * Spacing between each pattern occurrence in pixels; 0 if undefined.
     */
    'stroke-pattern-spacing'?: ExpressionValue | number;
}


/**
 *
 */
export interface IconProps {
    /**
     * Image source URI.
     */
    'icon-src'?: string;

    /**
     * Anchor.
     *
     * Default value is the icon center.
     *
     * @default [0.5, 0.5]
     */
    'icon-anchor'?: ExpressionValue | [number, number];

    /**
     * Origin of the anchor: `bottom-left`, `bottom-right`, `top-left` or
     * `top-right`.
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
    'icon-anchor-x-units'?: IconOrigin;

    /**
     * Units in which the anchor y value is specified.
     *
     * A value of `'fraction'` indicates the y value is a fraction of the icon.
     * A value of `'pixels'` indicates the y value in pixels.
     *
     * @default 'fraction'
     */
    'icon-anchor-y-units'?: IconOrigin;

    /**
     * Color to tint the icon.
     *
     * If not specified, the icon will be left as is.
     */
    'icon-color'?: ColorExpression;

    /**
     * Opacity of the icon.
     *
     * @default 1
     */
    'icon-opacity'?: ExpressionValue | number;

    /**
     * The `crossOrigin` attribute for loaded images.
     *
     * Note that you must provide a `icon-cross-origin` value if you want to
     * access pixel data with the Canvas renderer.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
     * for more detail.
     */
    'icon-cross-origin'?: null | string;

    /**
     * Displacement of the icon.
     *
     * @default [0, 0]
     */
    'icon-displacement'?: ExpressionValue | [number, number];

    /**
     * Scale.
     *
     * @default 1
     */
    'icon-scale'?: ExpressionValue | number | Size;

    /**
     * Width of the icon.
     *
     * If not specified, the actual image width will be used.
     *
     * Cannot be combined with `scale`.
     */
    'icon-width'?: ExpressionValue | number;

    /**
     * Height of the icon.
     *
     * If not specified, the actual image height will be used.
     *
     * Cannot be combined with `scale`.
     */
    'icon-height'?: ExpressionValue | number;

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    'icon-rotation'?: ExpressionValue | number;

    /**
     * Whether to rotate the icon with the view.
     *
     * @default false
     */
    'icon-rotate-with-view'?: boolean;

    /**
     * Offset, which, together with the size and the offset origin, define the
     * sub-rectangle to use from the original icon image.
     */
    'icon-offset'?: ExpressionValue | [number, number];

    /**
     * Origin of the offset: `bottom-left`, `bottom-right`, `top-left` or
     * `top-right`.
     *
     * @default 'top-left'
     */
    'icon-offset-origin'?: IconOrigin;

    /**
     * Size in pixel.
     *
     * Can be used together with `icon-offset` to define the sub-rectangle to
     * use from the origin (sprite) icon image.
     */
    'icon-size'?: ExpressionValue | Size;
}

/**
 *
 */
export interface ShapeProps {

    /**
     * Number of points for stars and regular polygons.
     *
     * In case of a polygon, the number of points is the number of sides.
     */
    'shape-points'?: ExpressionValue | number;

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
    'shape-stroke-width'?: ExpressionValue | number;

    /**
     * Shape opacity.
     */
    'shape-opacity'?: ExpressionValue | number;

    /**
     * Radius of a regular polygon.
     */
    'shape-radius'?: ExpressionValue | number;

    /**
     * Second radius to make a star instead of a regular polygon.
     */
    'shape-radius2'?: ExpressionValue | number;

    /**
     * Shape's angle in radians.
     *
     * A value of 0 will have one of the shape's point facing up.
     *
     * @default 0
     */
    'shape-angle'?: ExpressionValue | number;

    /**
     * Displacement of the shape.
     *
     * @default [0, 0]
     */
    'shape-displacement'?: ExpressionValue | [number, number];

    /**
     * Rotation in radians (positive rotation clockwise).
     *
     * @default 0
     */
    'shape-rotation'?: ExpressionValue | number;

    /**
     * Whether to rotate the shape with the view.
     *
     * @default false
     */
    'shape-rotate-with-view'?: boolean;

    /**
     * Scale.
     *
     * Unless two dimensional scaling is required a better result may be obtained
     * with appropriate settings for `shape-radius` and `shape-radius2`.
     *
     * @default 1
     */
    'shape-scale'?: ExpressionValue | number | Size;
}


/**
 *
 */
export interface CircleProps {
    /**
     * Circle radius.
     */
    'circle-radius'?: ExpressionValue | number;

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
    'circle-stroke-width'?: ExpressionValue | number;

    /**
     * Circle opacity.
     */
    'circle-opacity'?: ExpressionValue | number;

    /**
     * Displacement.
     *
     * @default [0, 0]
     */
    'circle-displacement'?: ExpressionValue | [number, number];

    /**
     * Scale.
     *
     * A two dimensional scale will produce an ellipse. Unless two
     * dimensional scaling is required a better result may be obtained with an
     * appropriate setting for `circle-radius`.
     *
     * @default 1
     */
    'circle-scale'?: ExpressionValue | number | Size;

    /**
     * Rotation in radians (positive rotation clockwise, meaningful only when
     * used in conjunction with a two dimensional scale).
     */
    'circle-rotation'?: ExpressionValue | number;

    /**
     * Whether to rotate the shape with the view (meaningful only when used in
     * conjunction with a two dimensional scale).
     */
    'circle-rotate-with-view'?: boolean;

}


// FIXME Present in flat style but not implemented in webgl style:
//  - icon declutter mode
//  - circle line cap/join/miter limit
//  - circle dash pattern/offset
//  - circle declutter mode
//  - shape line cap/join/miter limit
//  - shape dash pattern/offset
//  - shape declutter mode
//  - text style


export type WebGLStyle =
    & BaseProps
    & IconProps
    & StrokeProps
    & FillProps
    & CircleProps
    & ShapeProps;
