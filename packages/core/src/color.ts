import lchuv from 'color-space/lchuv';
import parseRgba from 'color-rgba';
import rgb from 'color-space/rgb';
import xyz from 'color-space/xyz';

import { clamp } from './math';


/**
 * A color represented as a short array [red, green, blue, alpha].
 *
 * red, green, and blue should be integers in the range 0..255 inclusive.
 * alpha should be a float in the range 0..1 inclusive. If no alpha value is
 * given then `1` will be used.
 *
 * @api
 */
export type Color = [number, number, number, number];


/**
 * Return the color as an rgba string.
 *
 * @param color Color.
 * @return Rgba string.
 * @api
 */
export function asString(color: Color | string): string {
    if (typeof color === 'string') {
        return color;
    }
    return toString(color);
}


const MAX_CACHE_SIZE: number = 1024;


/**
 * We maintain a small cache of parsed strings.
 *
 * Whenever the cache grows too large, we delete an arbitrary set of the
 * entries.
 */
const cache: Record<string, Color> = {};
let cacheSize: number = 0;


/**
 * If the input color has an alpha channel, the input color will be returned
 * unchanged.  Otherwise, a new array will be returned with the input color and
 * an alpha channel of 1.
 *
 * @param color A color that may or may not have an alpha channel.
 * @return The input color with an alpha channel.
 */
export function withAlpha(color: Color): Color {
    if (color.length === 4) {
        return color;
    }
    const output = color.slice();
    output[3] = 1;
    return output as Color;
}


/**
 * @param color RGBA color.
 * @return LCHuv color with alpha.
 */
export function rgbaToLcha(color: Color): Color {
    const output = xyz.lchuv(rgb.xyz(color));
    output[3] = color[3];
    return output;
}


/**
 * @param color LCHuv color with alpha.
 * @return RGBA color.
 */
export function lchaToRgba(color: Color): Color {
    const output = xyz.rgb(lchuv.xyz(color));
    output[3] = color[3];
    return output;
}


/**
 * @param s String.
 * @return Color.
 */
export function fromString(s: string): Color {
    if (cache.hasOwnProperty(s)) {
        return cache[s];
    }
    if (cacheSize >= MAX_CACHE_SIZE) {
        let i = 0;
        for (const key in cache) {
            if ((i++ & 3) === 0) {
                delete cache[key];
                --cacheSize;
            }
        }
    }

    const color = parseRgba(s);
    if (!color || color.length !== 4) {
        throw new Error('Failed to parse "' + s + '" as color');
    }
    for (const c of color) {
        if (isNaN(c)) {
            throw new Error('Failed to parse "' + s + '" as color');
        }
    }
    normalize(color);
    cache[s] = color;
    ++cacheSize;
    return color;
}


/**
 * Return the color as an array.
 *
 * This function maintains a cache of calculated arrays which means the result
 * should not be modified.
 *
 * @param color Color.
 * @return Color.
 * @api
 */
export function asArray(color: Color | string): Color {
    if (Array.isArray(color)) {
        return color;
    }
    return fromString(color);
}


/**
 * Exported for the tests.
 *
 * @param color Color.
 * @return Clamped color.
 */
export function normalize(color: Color): Color {
    color[0] = clamp((color[0] + 0.5) | 0, 0, 255);
    color[1] = clamp((color[1] + 0.5) | 0, 0, 255);
    color[2] = clamp((color[2] + 0.5) | 0, 0, 255);
    color[3] = clamp(color[3], 0, 1);
    return color;
}


/**
 * @param color Color.
 * @return String.
 */
export function toString(color: Color): string {
    let r = color[0];
    if (r != (r | 0)) {
        r = (r + 0.5) | 0;
    }
    let g = color[1];
    if (g != (g | 0)) {
        g = (g + 0.5) | 0;
    }
    let b = color[2];
    if (b != (b | 0)) {
        b = (b + 0.5) | 0;
    }
    const a = color[3] === undefined ? 1 : Math.round(color[3] * 1000) / 1000;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}


/**
 * @param s String.
 * @return Whether the string is actually a valid color
 */
export function isStringColor(s: string): boolean {
    try {
        fromString(s);
        return true;
    } catch (_) {
        return false;
    }
}
