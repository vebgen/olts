import { Coordinate } from "@olts/core/coordinate";


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param coordinates Coordinates.
 * @return Coordinates.
 */
export function inflateCoordinates(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    coordinates?: Coordinate[],
): Coordinate[] {
    coordinates = coordinates !== undefined ? coordinates : [];
    let i = 0;
    for (let j = offset; j < end; j += stride) {
        coordinates[i++] = flatCoordinates.slice(j, j + stride);
    }
    coordinates.length = i;
    return coordinates;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param coordinatess Coordinatess.
 * @return Coordinatess.
 */
export function inflateCoordinatesArray(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    coordinatess?: Array<Coordinate[]>,
): Array<Coordinate[]> {
    coordinatess = coordinatess !== undefined ? coordinatess : [];
    let i = 0;
    for (let j = 0, jj = ends.length; j < jj; ++j) {
        const end = ends[j];
        coordinatess[i++] = inflateCoordinates(
            flatCoordinates,
            offset,
            end,
            stride,
            coordinatess[i],
        );
        offset = end;
    }
    coordinatess.length = i;
    return coordinatess;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param endss Endss.
 * @param stride Stride.
 * @param coordinatesss Coordinatesss.
 * @return Coordinatesss.
 */
export function inflateMultiCoordinatesArray(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number,
    coordinatesss?: Array<Array<Coordinate[]>>,
): Array<Array<Coordinate[]>> {
    coordinatesss = coordinatesss !== undefined ? coordinatesss : [];
    let i = 0;
    for (let j = 0, jj = endss.length; j < jj; ++j) {
        const ends = endss[j];
        coordinatesss[i++] =
            ends.length === 1 && ends[0] === offset
                ? []
                : inflateCoordinatesArray(
                    flatCoordinates,
                    offset,
                    ends,
                    stride,
                    coordinatesss[i],
                );
        offset = ends[ends.length - 1];
    }
    coordinatesss.length = i;
    return coordinatesss;
}
