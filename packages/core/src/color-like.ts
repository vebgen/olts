import { ImageState } from './image-state';
import { createCanvasContext2D } from '@olts/core/dom';
import { get as getIconImage } from './style/icon-image';
import { shared as iconCache } from './style/icon-image-cache';
import { Color, toString } from './color';
import { Size } from './size';


export interface PatternDescriptor {
    /**
     * Pattern image URL
     */
    src: string;

    /**
     * Color to tint the pattern with.
     */
    color: Color | string | null;

    /**
     * Size of the desired slice from the pattern image.
     *
     * Use this together with `offset` when the pattern image is a sprite
     * sheet.
     */
    size?: Size;

    /**
     * Offset of the desired slice from the pattern image.
     *
     * Use this together with `size` when the pattern image is a sprite sheet.
     */
    offset?: Size;
}


/**
 * A type accepted by CanvasRenderingContext2D.fillStyle or
 * CanvasRenderingContext2D.strokeStyle. Represents a color,
 * [CanvasPattern](https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern),
 * or
 * [CanvasGradient](https://developer.mozilla.org/en-US/docs/Web/API/CanvasGradient).
 * The origin for patterns and gradients as fill style is an increment of 512
 * css pixels from map coordinate `[0, 0]`. For seamless repeat patterns, width
 * and height of the pattern image must be a factor of two (2, 4, 8, ..., 512).
 *
 * @api
 */
export type ColorLike = string | CanvasPattern | CanvasGradient;


/**
 * @param color Color.
 * @return The color as an {@link ColorLike}.
 * @api
 */
export function asColorLike(
    color: Color | ColorLike | PatternDescriptor | null
): ColorLike | null {
    if (!color) {
        return null;
    }
    if (Array.isArray(color)) {
        return toString(color);
    }
    if (typeof color === 'object' && 'src' in color) {
        return asCanvasPattern(color);
    }
    return color;
}


/**
 * @param pattern Pattern descriptor.
 * @return Canvas pattern or null if the pattern referenced in the
 *    PatternDescriptor was not found in the icon image cache.
 */
function asCanvasPattern(pattern: PatternDescriptor): CanvasPattern | null {
    if (!pattern.offset || !pattern.size) {
        return iconCache.getPattern(pattern.src, 'anonymous', pattern.color);
    }

    const cacheKey = pattern.src + ':' + pattern.offset;

    const canvasPattern = iconCache.getPattern(
        cacheKey,
        undefined,
        pattern.color,
    );
    if (canvasPattern) {
        return canvasPattern;
    }

    const iconImage = iconCache.get(pattern.src, 'anonymous', null);
    if (iconImage.getImageState() !== ImageState.LOADED) {
        return null;
    }
    const patternCanvasContext = createCanvasContext2D(
        pattern.size[0],
        pattern.size[1],
    );
    patternCanvasContext.drawImage(
        iconImage.getImage(1),
        pattern.offset[0],
        pattern.offset[1],
        pattern.size[0],
        pattern.size[1],
        0,
        0,
        pattern.size[0],
        pattern.size[1],
    );
    getIconImage(
        patternCanvasContext.canvas,
        cacheKey,
        null,
        ImageState.LOADED,
        pattern.color,
        true,
    );
    return iconCache.getPattern(cacheKey, undefined, pattern.color);
}
