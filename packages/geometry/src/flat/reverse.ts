/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 */
export function coordinates(
    flatCoordinates: number[], offset: number, end: number, stride: number
) {
    while (offset < end - stride) {
        for (let i = 0; i < stride; ++i) {
            const tmp = flatCoordinates[offset + i];
            flatCoordinates[offset + i] = flatCoordinates[end - stride + i];
            flatCoordinates[end - stride + i] = tmp;
        }
        offset += stride;
        end -= stride;
    }
}
