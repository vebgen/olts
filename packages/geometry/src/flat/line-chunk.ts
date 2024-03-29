import { lerp } from '@olts/core/math';


/**
 * Creates chunks of equal length from a line-string.
 *
 * @param chunkLength Length of each chunk.
 * @param flatCoordinates Flat coordinates.
 * @param offset Start offset of the `flatCoordinates`.
 * @param end End offset of the `flatCoordinates`.
 * @param stride Stride.
 * @return Chunks of line-strings with stride 2.
 */
export function lineChunk(
    chunkLength: number, flatCoordinates: number[],
    offset: number, end: number, stride: number
): number[][] {
    const chunks = [];
    let cursor = offset;
    let chunkM = 0;
    let currentChunk = flatCoordinates.slice(offset, 2);
    while (chunkM < chunkLength && cursor + stride < end) {
        const [x1, y1] = currentChunk.slice(-2);
        const x2 = flatCoordinates[cursor + stride];
        const y2 = flatCoordinates[cursor + stride + 1];
        const segmentLength = Math.sqrt(
            (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1),
        );
        chunkM += segmentLength;
        if (chunkM >= chunkLength) {
            const m = (chunkLength - chunkM + segmentLength) / segmentLength;
            const x = lerp(x1, x2, m);
            const y = lerp(y1, y2, m);
            currentChunk.push(x, y);
            chunks.push(currentChunk);
            currentChunk = [x, y];
            if (chunkM == chunkLength) {
                cursor += stride;
            }
            chunkM = 0;
        } else if (chunkM < chunkLength) {
            currentChunk.push(
                flatCoordinates[cursor + stride],
                flatCoordinates[cursor + stride + 1],
            );
            cursor += stride;
        } else {
            const missing = segmentLength - chunkM;
            const x = lerp(x1, x2, missing / segmentLength);
            const y = lerp(y1, y2, missing / segmentLength);
            currentChunk.push(x, y);
            chunks.push(currentChunk);
            currentChunk = [x, y];
            chunkM = 0;
            cursor += stride;
        }
    }
    if (chunkM > 0) {
        chunks.push(currentChunk);
    }
    return chunks;
}
