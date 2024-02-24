import { ascending } from '@olts/core/array';

import { linearRingsContainsXY } from './contains';


/**
 * Calculates a point that is likely to lie in the interior of the linear rings.
 *
 * Inspired by JTS's com.vividsolutions.jts.geom.Geometry#getInteriorPoint.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param flatCenters Flat centers.
 * @param flatCentersOffset Flat center offset.
 * @param dest Destination.
 * @return Destination point as XYM coordinate, where M is the
 * length of the horizontal intersection that the point belongs to.
 */
export function getInteriorPointOfArray(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    flatCenters: number[],
    flatCentersOffset: number,
    dest?: number[],
): number[] {
    let i, ii, x, x1, x2, y1, y2;
    const y = flatCenters[flatCentersOffset + 1];
    /** @type */
    const intersections: number[] = [];
    // Calculate intersections with the horizontal line
    for (let r = 0, rr = ends.length; r < rr; ++r) {
        const end = ends[r];
        x1 = flatCoordinates[end - stride];
        y1 = flatCoordinates[end - stride + 1];
        for (i = offset; i < end; i += stride) {
            x2 = flatCoordinates[i];
            y2 = flatCoordinates[i + 1];
            if ((y <= y1 && y2 <= y) || (y1 <= y && y <= y2)) {
                x = ((y - y1) / (y2 - y1)) * (x2 - x1) + x1;
                intersections.push(x);
            }
            x1 = x2;
            y1 = y2;
        }
    }
    // Find the longest segment of the horizontal line that has its center
    // point inside the linear ring.
    let pointX = NaN;
    let maxSegmentLength = -Infinity;
    intersections.sort(ascending);
    x1 = intersections[0];
    for (i = 1, ii = intersections.length; i < ii; ++i) {
        x2 = intersections[i];
        const segmentLength = Math.abs(x2 - x1);
        if (segmentLength > maxSegmentLength) {
            x = (x1 + x2) / 2;
            if (linearRingsContainsXY(
                flatCoordinates, offset, ends, stride, x, y
            )) {
                pointX = x;
                maxSegmentLength = segmentLength;
            }
        }
        x1 = x2;
    }
    if (isNaN(pointX)) {
        // There is no horizontal line that has its center point inside the
        // linear ring.  Use the center of the the linear ring's extent.
        pointX = flatCenters[flatCentersOffset];
    }
    if (dest) {
        dest.push(pointX, y, maxSegmentLength);
        return dest;
    }
    return [pointX, y, maxSegmentLength];
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @param flatCenters Flat centers.
 * @return Interior points as XYM coordinates, where M is the
 * length of the horizontal intersection that the point belongs to.
 */
export function getInteriorPointsOfMultiArray(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number,
    flatCenters: number[],
): number[] {
    /** @type */
    let interiorPoints: number[] = [];
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        interiorPoints = getInteriorPointOfArray(
            flatCoordinates,
            offset,
            ends,
            stride,
            flatCenters,
            2 * i,
            interiorPoints,
        );
        offset = ends[ends.length - 1];
    }
    return interiorPoints;
}
