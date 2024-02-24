
import { Coordinate } from '@olts/core/coordinate';
import { Extent, forEachCorner } from '@olts/core/extent';

/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param extent Extent.
 * @return Contains extent.
 */
export function linearRingContainsExtent(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    extent: Extent,
): boolean {
    const outside = forEachCorner(
        extent,
        /**
         * @param coordinate Coordinate.
         * @return Contains (x, y).
         */
        function (coordinate: Coordinate): boolean {
            return !linearRingContainsXY(
                flatCoordinates,
                offset,
                end,
                stride,
                coordinate[0],
                coordinate[1],
            );
        },
    );
    return !outside;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param x X.
 * @param y Y.
 * @return Contains (x, y).
 */
export function linearRingContainsXY(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    x: number,
    y: number,
): boolean {
    // https://geomalgorithms.com/a03-_inclusion.html
    // Copyright 2000 softSurfer, 2012 Dan Sunday
    // This code may be freely used and modified for any purpose
    // providing that this copyright notice is included with it.
    // SoftSurfer makes no warranty for this code, and cannot be held
    // liable for any real or imagined damage resulting from its use.
    // Users of this code must verify correctness for their application.
    let wn = 0;
    let x1 = flatCoordinates[end - stride];
    let y1 = flatCoordinates[end - stride + 1];
    for (; offset < end; offset += stride) {
        const x2 = flatCoordinates[offset];
        const y2 = flatCoordinates[offset + 1];
        if (y1 <= y) {
            if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) {
                wn++;
            }
        } else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) {
            wn--;
        }
        x1 = x2;
        y1 = y2;
    }
    return wn !== 0;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param x X.
 * @param y Y.
 * @return Contains (x, y).
 */
export function linearRingsContainsXY(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    x: number,
    y: number,
): boolean {
    if (ends.length === 0) {
        return false;
    }
    if (!linearRingContainsXY(
        flatCoordinates, offset, ends[0], stride, x, y
    )) {
        return false;
    }
    for (let i = 1, ii = ends.length; i < ii; ++i) {
        if (
            linearRingContainsXY(
                flatCoordinates, ends[i - 1], ends[i], stride, x, y
            )
        ) {
            return false;
        }
    }
    return true;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @param x X.
 * @param y Y.
 * @return Contains (x, y).
 */
export function linearRingssContainsXY(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number,
    x: number,
    y: number,
): boolean {
    if (endss.length === 0) {
        return false;
    }
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        if (linearRingsContainsXY(
            flatCoordinates, offset, ends, stride, x, y
        )) {
            return true;
        }
        offset = ends[ends.length - 1];
    }
    return false;
}
