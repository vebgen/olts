import { linearRing as linearRingArea } from './area';

/**
 * Check if the line-string is a boundary.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @return The line-string is a boundary.
 */
export function lineStringIsClosed(
    flatCoordinates: number[], offset: number, end: number, stride: number
): boolean {
    const lastCoord = end - stride;
    if (
        flatCoordinates[offset] === flatCoordinates[lastCoord] &&
        flatCoordinates[offset + 1] === flatCoordinates[lastCoord + 1] &&
        (end - offset) / stride > 3
    ) {
        return !!linearRingArea(flatCoordinates, offset, end, stride);
    }
    return false;
}
