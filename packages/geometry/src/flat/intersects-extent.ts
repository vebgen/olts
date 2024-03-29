import {
    containsExtent,
    createEmpty,
    extendFlatCoordinates,
    intersects,
    intersectsSegment,
    Extent
} from '@olts/core/extent';
import { Coordinate } from '@olts/core/coordinate';

import { forEach as forEachSegment } from './segments';
import { linearRingContainsExtent, linearRingContainsXY } from './contains';


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param extent Extent.
 * @return True if the geometry and the extent intersect.
 */
export function intersectsLineString(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    extent: Extent,
): boolean {
    const coordinatesExtent = extendFlatCoordinates(
        createEmpty(),
        flatCoordinates,
        offset,
        end,
        stride,
    );
    if (!intersects(extent, coordinatesExtent)) {
        return false;
    }
    if (containsExtent(extent, coordinatesExtent)) {
        return true;
    }
    if (coordinatesExtent[0] >= extent[0] && coordinatesExtent[2] <= extent[2]) {
        return true;
    }
    if (coordinatesExtent[1] >= extent[1] && coordinatesExtent[3] <= extent[3]) {
        return true;
    }
    return forEachSegment(
        flatCoordinates,
        offset,
        end,
        stride,
        /**
         * @param point1 Start point.
         * @param point2 End point.
         * @return `true` if the segment and the extent intersect,
         *     `false` otherwise.
         */
        function (point1: Coordinate, point2: Coordinate): boolean {
            return intersectsSegment(extent, point1, point2);
        },
    );
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param extent Extent.
 * @return True if the geometry and the extent intersect.
 */
export function intersectsLineStringArray(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    extent: Extent,
): boolean {
    for (let i = 0, ii = ends.length; i < ii; ++i) {
        if (
            intersectsLineString(flatCoordinates, offset, ends[i], stride, extent)
        ) {
            return true;
        }
        offset = ends[i];
    }
    return false;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param extent Extent.
 * @return True if the geometry and the extent intersect.
 */
export function intersectsLinearRing(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    extent: Extent,
): boolean {
    if (intersectsLineString(flatCoordinates, offset, end, stride, extent)) {
        return true;
    }
    if (
        linearRingContainsXY(
            flatCoordinates,
            offset,
            end,
            stride,
            extent[0],
            extent[1],
        )
    ) {
        return true;
    }
    if (
        linearRingContainsXY(
            flatCoordinates,
            offset,
            end,
            stride,
            extent[0],
            extent[3],
        )
    ) {
        return true;
    }
    if (
        linearRingContainsXY(
            flatCoordinates,
            offset,
            end,
            stride,
            extent[2],
            extent[1],
        )
    ) {
        return true;
    }
    if (
        linearRingContainsXY(
            flatCoordinates,
            offset,
            end,
            stride,
            extent[2],
            extent[3],
        )
    ) {
        return true;
    }
    return false;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param extent Extent.
 * @return True if the geometry and the extent intersect.
 */
export function intersectsLinearRingArray(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    extent: Extent,
): boolean {
    if (!intersectsLinearRing(
        flatCoordinates, offset, ends[0], stride, extent
    )) {
        return false;
    }
    if (ends.length === 1) {
        return true;
    }
    for (let i = 1, ii = ends.length; i < ii; ++i) {
        if (
            linearRingContainsExtent(
                flatCoordinates,
                ends[i - 1],
                ends[i],
                stride,
                extent,
            )
        ) {
            if (
                !intersectsLineString(
                    flatCoordinates,
                    ends[i - 1],
                    ends[i],
                    stride,
                    extent,
                )
            ) {
                return false;
            }
        }
    }
    return true;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @param extent Extent.
 * @return True if the geometry and the extent intersect.
 */
export function intersectsLinearRingMultiArray(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number,
    extent: Extent,
): boolean {
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        if (
            intersectsLinearRingArray(
                flatCoordinates, offset, ends, stride, extent)
        ) {
            return true;
        }
        offset = ends[ends.length - 1];
    }
    return false;
}
