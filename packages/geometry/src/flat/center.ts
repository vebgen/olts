
import {
    createEmpty, createOrUpdateFromFlatCoordinates
} from '@olts/core/extent';


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @return Flat centers.
 */
export function linearRingss(
    flatCoordinates: number[], offset: number,
    endss: number[][], stride: number
): number[] {
    const flatCenters = [];
    let extent = createEmpty();
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        extent = createOrUpdateFromFlatCoordinates(
            flatCoordinates,
            offset,
            ends[0],
            stride,
        );

        flatCenters.push(
            (extent[0] + extent[2]) / 2,
            (extent[1] + extent[3]) / 2
        );
        offset = ends[ends.length - 1];
    }
    return flatCenters;
}
