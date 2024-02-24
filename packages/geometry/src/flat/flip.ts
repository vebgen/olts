/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param dest Destination.
 * @param destOffset Destination offset.
 * @return Flat coordinates.
 */
export function flipXY(
    flatCoordinates: number[],
    offset: number, end: number, stride: number,
    dest?: number[], destOffset?: number
): number[] {
    if (dest !== undefined) {
        destOffset = destOffset !== undefined ? destOffset : 0;
    } else {
        dest = [];
        destOffset = 0;
    }
    let j = offset;
    while (j < end) {
        const x = flatCoordinates[j++];
        dest[destOffset++] = flatCoordinates[j++];
        dest[destOffset++] = x;
        for (let k = 2; k < stride; ++k) {
            dest[destOffset++] = flatCoordinates[j++];
        }
    }
    dest.length = destOffset;
    return dest;
}
