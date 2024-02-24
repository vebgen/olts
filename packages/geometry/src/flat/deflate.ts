import { Coordinate } from "@olts/core/coordinate";

/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param coordinate Coordinate.
 * @param stride Stride.
 * @return offset Offset.
 */
export function deflateCoordinate(
    flatCoordinates: number[], offset: number,
    coordinate: Coordinate, stride: number
): number {
    for (let i = 0, ii = coordinate.length; i < ii; ++i) {
        flatCoordinates[offset++] = coordinate[i];
    }
    return offset;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param coordinates Coordinates.
 * @param stride Stride.
 * @return offset Offset.
 */
export function deflateCoordinates(
    flatCoordinates: number[],
    offset: number,
    coordinates: Coordinate[],
    stride: number,
): number {
    for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        const coordinate = coordinates[i];
        for (let j = 0; j < stride; ++j) {
            flatCoordinates[offset++] = coordinate[j];
        }
    }
    return offset;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param coordinatess Coordinatess.
 * @param stride Stride.
 * @param ends Ends.
 * @return Ends.
 */
export function deflateCoordinatesArray(
    flatCoordinates: number[],
    offset: number,
    coordinatess: Array<Coordinate[]>,
    stride: number,
    ends?: number[],
): number[] {
    ends = ends ? ends : [];
    let i = 0;
    for (let j = 0, jj = coordinatess.length; j < jj; ++j) {
        const end = deflateCoordinates(
            flatCoordinates,
            offset,
            coordinatess[j],
            stride,
        );
        ends[i++] = end;
        offset = end;
    }
    ends.length = i;
    return ends;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param coordinatesss Coordinatesss.
 * @param stride Stride.
 * @param endss Endss.
 * @return Endss.
 */
export function deflateMultiCoordinatesArray(
    flatCoordinates: number[],
    offset: number,
    coordinatesss: Coordinate[][][],
    stride: number,
    endss?: number[][],
): number[][] {
    endss = endss ? endss : [];
    let i = 0;
    for (let j = 0, jj = coordinatesss.length; j < jj; ++j) {
        const ends = deflateCoordinatesArray(
            flatCoordinates,
            offset,
            coordinatesss[j],
            stride,
            endss[i],
        );
        if (ends.length === 0) {
            ends[0] = offset;
        }
        endss[i++] = ends;
        offset = ends[ends.length - 1];
    }
    endss.length = i;
    return endss;
}
