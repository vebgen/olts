
import { lerp, squaredDistance as squaredDx } from '@olts/core/math';

/**
 * Returns the point on the 2D line segment flatCoordinates[offset1] to
 * flatCoordinates[offset2] that is closest to the point (x, y).  Extra
 * dimensions are linearly interpolated.
 * @param flatCoordinates Flat coordinates.
 * @param offset1 Offset 1.
 * @param offset2 Offset 2.
 * @param stride Stride.
 * @param x X.
 * @param y Y.
 * @param closestPoint Closest point.
 */
function assignClosest(
    flatCoordinates: number[],
    offset1: number,
    offset2: number,
    stride: number,
    x: number,
    y: number,
    closestPoint: number[],
) {
    const x1 = flatCoordinates[offset1];
    const y1 = flatCoordinates[offset1 + 1];
    const dx = flatCoordinates[offset2] - x1;
    const dy = flatCoordinates[offset2 + 1] - y1;
    let offset;
    if (dx === 0 && dy === 0) {
        offset = offset1;
    } else {
        const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            offset = offset2;
        } else if (t > 0) {
            for (let i = 0; i < stride; ++i) {
                closestPoint[i] = lerp(
                    flatCoordinates[offset1 + i],
                    flatCoordinates[offset2 + i],
                    t,
                );
            }
            closestPoint.length = stride;
            return;
        } else {
            offset = offset1;
        }
    }
    for (let i = 0; i < stride; ++i) {
        closestPoint[i] = flatCoordinates[offset + i];
    }
    closestPoint.length = stride;
}


/**
 * Return the squared of the largest distance between any pair of consecutive
 * coordinates.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param max Max squared delta.
 * @return Max squared delta.
 */
export function maxSquaredDelta(
    flatCoordinates: number[],
    offset: number, end: number,
    stride: number, max: number
): number {
    let x1 = flatCoordinates[offset];
    let y1 = flatCoordinates[offset + 1];
    for (offset += stride; offset < end; offset += stride) {
        const x2 = flatCoordinates[offset];
        const y2 = flatCoordinates[offset + 1];
        const squaredDelta = squaredDx(x1, y1, x2, y2);
        if (squaredDelta > max) {
            max = squaredDelta;
        }
        x1 = x2;
        y1 = y2;
    }
    return max;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param max Max squared delta.
 * @return Max squared delta.
 */
export function arrayMaxSquaredDelta(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    max: number,
): number {
    for (let i = 0, ii = ends.length; i < ii; ++i) {
        const end = ends[i];
        max = maxSquaredDelta(flatCoordinates, offset, end, stride, max);
        offset = end;
    }
    return max;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @param max Max squared delta.
 * @return Max squared delta.
 */
export function multiArrayMaxSquaredDelta(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number,
    max: number,
): number {
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        max = arrayMaxSquaredDelta(flatCoordinates, offset, ends, stride, max);
        offset = ends[ends.length - 1];
    }
    return max;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param maxDelta Max delta.
 * @param isRing Is ring.
 * @param x X.
 * @param y Y.
 * @param closestPoint Closest point.
 * @param minSquaredDistance Minimum squared distance.
 * @param tmpPoint Temporary point object.
 * @return Minimum squared distance.
 */
export function assignClosestPoint(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    maxDelta: number,
    isRing: boolean,
    x: number,
    y: number,
    closestPoint: number[],
    minSquaredDistance: number,
    tmpPoint?: number[],
): number {
    if (offset == end) {
        return minSquaredDistance;
    }
    let i, squaredDistance;
    if (maxDelta === 0) {
        // All points are identical, so just test the first point.
        squaredDistance = squaredDx(
            x,
            y,
            flatCoordinates[offset],
            flatCoordinates[offset + 1],
        );
        if (squaredDistance < minSquaredDistance) {
            for (i = 0; i < stride; ++i) {
                closestPoint[i] = flatCoordinates[offset + i];
            }
            closestPoint.length = stride;
            return squaredDistance;
        }
        return minSquaredDistance;
    }
    tmpPoint = tmpPoint ? tmpPoint : [NaN, NaN];
    let index = offset + stride;
    while (index < end) {
        assignClosest(
            flatCoordinates,
            index - stride,
            index,
            stride,
            x,
            y,
            tmpPoint,
        );
        squaredDistance = squaredDx(x, y, tmpPoint[0], tmpPoint[1]);
        if (squaredDistance < minSquaredDistance) {
            minSquaredDistance = squaredDistance;
            for (i = 0; i < stride; ++i) {
                closestPoint[i] = tmpPoint[i];
            }
            closestPoint.length = stride;
            index += stride;
        } else {
            // Skip ahead multiple points, because we know that all the skipped
            // points cannot be any closer than the closest point we have found so
            // far.  We know this because we know how close the current point is, how
            // close the closest point we have found so far is, and the maximum
            // distance between consecutive points.  For example, if we're currently
            // at distance 10, the best we've found so far is 3, and that the maximum
            // distance between consecutive points is 2, then we'll need to skip at
            // least (10 - 3) / 2 == 3 (rounded down) points to have any chance of
            // finding a closer point.  We use Math.max(..., 1) to ensure that we
            // always advance at least one point, to avoid an infinite loop.
            index +=
                stride *
                Math.max(
                    ((Math.sqrt(squaredDistance) - Math.sqrt(minSquaredDistance)) /
                        maxDelta) |
                    0,
                    1,
                );
        }
    }
    if (isRing) {
        // Check the closing segment.
        assignClosest(
            flatCoordinates,
            end - stride,
            offset,
            stride,
            x,
            y,
            tmpPoint,
        );
        squaredDistance = squaredDx(x, y, tmpPoint[0], tmpPoint[1]);
        if (squaredDistance < minSquaredDistance) {
            minSquaredDistance = squaredDistance;
            for (i = 0; i < stride; ++i) {
                closestPoint[i] = tmpPoint[i];
            }
            closestPoint.length = stride;
        }
    }
    return minSquaredDistance;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param maxDelta Max delta.
 * @param isRing Is ring.
 * @param x X.
 * @param y Y.
 * @param closestPoint Closest point.
 * @param minSquaredDistance Minimum squared distance.
 * @param tmpPoint Temporary point object.
 * @return Minimum squared distance.
 */
export function assignClosestArrayPoint(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    maxDelta: number,
    isRing: boolean,
    x: number,
    y: number,
    closestPoint: number[],
    minSquaredDistance: number,
    tmpPoint?: number[],
): number {
    tmpPoint = tmpPoint ? tmpPoint : [NaN, NaN];
    for (let i = 0, ii = ends.length; i < ii; ++i) {
        const end = ends[i];
        minSquaredDistance = assignClosestPoint(
            flatCoordinates,
            offset,
            end,
            stride,
            maxDelta,
            isRing,
            x,
            y,
            closestPoint,
            minSquaredDistance,
            tmpPoint,
        );
        offset = end;
    }
    return minSquaredDistance;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @param maxDelta Max delta.
 * @param isRing Is ring.
 * @param x X.
 * @param y Y.
 * @param closestPoint Closest point.
 * @param minSquaredDistance Minimum squared distance.
 * @param tmpPoint Temporary point object.
 * @return Minimum squared distance.
 */
export function assignClosestMultiArrayPoint(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number,
    maxDelta: number,
    isRing: boolean,
    x: number,
    y: number,
    closestPoint: number[],
    minSquaredDistance: number,
    tmpPoint?: number[],
): number {
    tmpPoint = tmpPoint ? tmpPoint : [NaN, NaN];
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        minSquaredDistance = assignClosestArrayPoint(
            flatCoordinates,
            offset,
            ends,
            stride,
            maxDelta,
            isRing,
            x,
            y,
            closestPoint,
            minSquaredDistance,
            tmpPoint,
        );
        offset = ends[ends.length - 1];
    }
    return minSquaredDistance;
}
