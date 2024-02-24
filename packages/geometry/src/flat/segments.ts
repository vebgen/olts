import { Coordinate } from "@olts/core/coordinate";

export type ForEach<T> = (
    pt1: Coordinate,
    pt2: Coordinate
) => T;


/**
 * This function calls `callback` for each segment of the flat coordinates
 * array. If the callback returns a truthy value the function returns that
 * value immediately. Otherwise the function returns `false`.
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param callback Function called for each segment.
 * @return Value.
 */
export function forEach<T>(
    flatCoordinates: number[],
    offset: number, end: number, stride: number,
    callback: ForEach<T>
): T | boolean {
    let ret;
    offset += stride;
    for (; offset < end; offset += stride) {
        ret = callback(
            flatCoordinates.slice(offset - stride, offset),
            flatCoordinates.slice(offset, offset + stride),
        );
        if (ret) {
            return ret;
        }
    }
    return false;
}
