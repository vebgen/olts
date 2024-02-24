/**
 * @param maxAngle Maximum acceptable angle delta between segments.
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @return Start and end of the first suitable chunk of the given
 *   `flatCoordinates`.
 */
export function matchingChunk(
    maxAngle: number, flatCoordinates: number[],
    offset: number, end: number, stride: number
): number[] {
    let chunkStart = offset;
    let chunkEnd = offset;
    let chunkM = 0;
    let m = 0;
    let start = offset;
    let acos, i, m12, m23, x1, y1, x12, y12, x23, y23;
    for (i = offset; i < end; i += stride) {
        const x2 = flatCoordinates[i];
        const y2 = flatCoordinates[i + 1];
        if (x1 !== undefined) {
            x23 = x2 - x1;
            y23 = y2 - y1;
            m23 = Math.sqrt(x23 * x23 + y23 * y23);
            if (x12 !== undefined) {
                m += m12;
                acos = Math.acos((x12 * x23 + y12 * y23) / (m12 * m23));
                if (acos > maxAngle) {
                    if (m > chunkM) {
                        chunkM = m;
                        chunkStart = start;
                        chunkEnd = i;
                    }
                    m = 0;
                    start = i - stride;
                }
            }
            m12 = m23;
            x12 = x23;
            y12 = y23;
        }
        x1 = x2;
        y1 = y2;
    }
    m += m23;
    return m > chunkM ? [start, i] : [chunkStart, chunkEnd];
}
