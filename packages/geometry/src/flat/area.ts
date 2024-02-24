
/**
 * Computes the area of a simple (i.e. non-self-intersecting) polygon.
 *
 * @param flatCoordinates Flat coordinates (i.e. [x1, y1, x2, y2, ...]).
 * @param offset The first coordinate to consider.
 * @param end The last coordinate to consider.
 * @param stride Number of components for each point (2 or 3).
 * @return Area.
 */
export function linearRing(
    flatCoordinates: number[], offset: number, end: number, stride: number
): number {
    let twiceArea = 0;
    let x1 = flatCoordinates[end - stride];
    let y1 = flatCoordinates[end - stride + 1];
    for (; offset < end; offset += stride) {
        const x2 = flatCoordinates[offset];
        const y2 = flatCoordinates[offset + 1];
        twiceArea += y1 * x2 - x1 * y2;
        x1 = x2;
        y1 = y2;
    }
    return twiceArea / 2;
}


/**
 * Compute the area of a polygon made up of an array of linear rings.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset The first coordinate to consider.
 * @param ends Array that holds the offset of the last coordinate of each ring.
 * @param stride Number of components for each point (2 or 3).
 * @return Area.
 */
export function linearRings(
    flatCoordinates: number[], offset: number, ends: number[], stride: number
): number {
    let area = 0;
    for (let i = 0, ii = ends.length; i < ii; ++i) {
        const end = ends[i];
        area += linearRing(flatCoordinates, offset, end, stride);
        offset = end;
    }
    return area;
}


/**
 * Compute the area of a polygon made up of an array of linear rings.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset The first coordinate to consider.
 * @param ends Array that holds the offset of the last coordinate of each ring.
 * @param stride Number of components for each point (2 or 3).
 * @return Area.
 */
export function linearRingss(
    flatCoordinates: number[],
    offset: number,
    endss: number[][],
    stride: number
): number {
    let area = 0;
    for (let i = 0, ii = endss.length; i < ii; ++i) {
        const ends = endss[i];
        area += linearRings(flatCoordinates, offset, ends, stride);
        offset = ends[ends.length - 1];
    }
    return area;
}
