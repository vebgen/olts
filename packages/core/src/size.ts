/**
 * An array of numbers representing a size: `[width, height]`.
 * @api
 */
export type Size = [number, number];


/**
 * Returns a buffered size.
 *
 * @param size Size.
 * @param num The amount by which to buffer.
 * @param dest Optional reusable size array. The result is stored in this array.
 * @return The buffered size.
 * @see `scale()` for a version that also changes the size by a ratio.`
 */
export function buffer(size: Size, num: number, dest?: Size): Size {
    if (dest === undefined) {
        dest = [0, 0];
    }
    dest[0] = size[0] + 2 * num;
    dest[1] = size[1] + 2 * num;
    return dest;
}


/**
 * Determines if a size has a positive area.
 *
 * @param size The size to test.
 * @return Wether size has a positive area.
 */
export function hasArea(size: Size): boolean {
    return size[0] > 0 && size[1] > 0;
}


/**
 * Returns a size scaled by a ratio.
 *
 * The result can be rounded to array of integers (added `0.5` to the result).
 *
 * @param size The box to scale.
 * @param ratio Scale ratio.
 * @param dest Optional reusable size array. The result is stored in this array.
 * @return The scaled size.
 * @see `buffer()` for a version that also changes the size by a ratio.`
 */
export function scale(size: Size, ratio: number, dest?: Size): Size {
    if (dest === undefined) {
        dest = [0, 0];
    }
    dest[0] = (size[0] * ratio + 0.5) | 0;
    dest[1] = (size[1] * ratio + 0.5) | 0;
    return dest;
}


/**
 * Returns a `Size` array for the passed in number (meaning: square) or
 * `Size` array.
 * (meaning: non-square),
 * @param size Width and height. Can be a `Size` array or a number.
 * @param dest Optional reusable size array. The result is stored in this array.
 * @return The original object of it is an array or a new array with two members.
 * @api
 */
export function toSize(size: number | Size, dest?: Size): Size {
    if (Array.isArray(size)) {
        return size;
    }
    if (dest === undefined) {
        dest = [size, size];
    } else {
        dest[0] = size;
        dest[1] = size;
    }
    return dest;
}
