import { lerp } from '@olts/core/math';
import { rotate } from './transform';

export type MeasureAndCacheTextWidth = (
    font: string, text: string, cache: Record<string, number>
) => number;


/**
 * @param flatCoordinates Path to put text on.
 * @param offset Start offset of the `flatCoordinates`.
 * @param end End offset of the `flatCoordinates`.
 * @param stride Stride.
 * @param text Text to place on the path.
 * @param startM m along the path where the text starts.
 * @param maxAngle Max angle between adjacent chars in radians.
 * @param scale The product of the text scale and the device pixel ratio.
 * @param measureAndCacheTextWidth Measure and cache text width.
 * @param font The font.
 * @param cache A cache of measured widths.
 * @param rotation Rotation to apply to the flatCoordinates to determine whether
 *    text needs to be reversed.
 * @return The result array (or null if `maxAngle` was exceeded). Entries of the
 *    array are x, y, anchorX, angle, chunk.
 */
export function drawTextOnPath(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    text: string,
    startM: number,
    maxAngle: number,
    scale: number,
    measureAndCacheTextWidth: MeasureAndCacheTextWidth,
    font: string,
    cache: Record<string, number>,
    rotation: number,
): any[][] | null {
    let x2 = flatCoordinates[offset];
    let y2 = flatCoordinates[offset + 1];
    let x1 = 0;
    let y1 = 0;
    let segmentLength = 0;
    let segmentM = 0;

    function advance() {
        x1 = x2;
        y1 = y2;
        offset += stride;
        x2 = flatCoordinates[offset];
        y2 = flatCoordinates[offset + 1];
        segmentM += segmentLength;
        segmentLength = Math.sqrt(
            (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
        );
    }
    do {
        advance();
    } while (offset < end - stride && segmentM + segmentLength < startM);

    let interpolate =
        segmentLength === 0 ? 0 : (startM - segmentM) / segmentLength;
    const beginX = lerp(x1, x2, interpolate);
    const beginY = lerp(y1, y2, interpolate);

    const startOffset = offset - stride;
    const startLength = segmentM;
    const endM = startM + scale * measureAndCacheTextWidth(font, text, cache);
    while (offset < end - stride && segmentM + segmentLength < endM) {
        advance();
    }
    interpolate = segmentLength === 0 ? 0 : (endM - segmentM) / segmentLength;
    const endX = lerp(x1, x2, interpolate);
    const endY = lerp(y1, y2, interpolate);

    // Keep text upright
    let reverse;
    if (rotation) {
        const flat = [beginX, beginY, endX, endY];
        rotate(flat, 0, 4, 2, rotation, flat, flat);
        reverse = flat[0] > flat[2];
    } else {
        reverse = beginX > endX;
    }

    const PI = Math.PI;
    const result = [];
    const singleSegment = startOffset + stride === offset;

    offset = startOffset;
    segmentLength = 0;
    segmentM = startLength;
    x2 = flatCoordinates[offset];
    y2 = flatCoordinates[offset + 1];

    let previousAngle;
    // All on the same segment
    if (singleSegment) {
        advance();

        previousAngle = Math.atan2(y2 - y1, x2 - x1);
        if (reverse) {
            previousAngle += previousAngle > 0 ? -PI : PI;
        }
        const x = (endX + beginX) / 2;
        const y = (endY + beginY) / 2;
        result[0] = [x, y, (endM - startM) / 2, previousAngle, text];
        return result;
    }

    // rendering across line segments
    // ensure rendering in single-line as all calculations below don't handle
    // multi-lines
    text = text.replace(/\n/g, ' ');

    for (let i = 0, ii = text.length; i < ii;) {
        advance();
        let angle = Math.atan2(y2 - y1, x2 - x1);
        if (reverse) {
            angle += angle > 0 ? -PI : PI;
        }
        if (previousAngle !== undefined) {
            let delta = angle - previousAngle;
            delta += delta > PI ? -2 * PI : delta < -PI ? 2 * PI : 0;
            if (Math.abs(delta) > maxAngle) {
                return null;
            }
        }
        previousAngle = angle;

        const iStart = i;
        let charLength = 0;
        for (; i < ii; ++i) {
            const index = reverse ? ii - i - 1 : i;
            const len = scale * measureAndCacheTextWidth(
                font, text[index], cache
            );
            if (
                offset + stride < end &&
                segmentM + segmentLength < startM + charLength + len / 2
            ) {
                break;
            }
            charLength += len;
        }
        if (i === iStart) {
            continue;
        }
        const chars = reverse
            ? text.substring(ii - iStart, ii - i)
            : text.substring(iStart, i);
        interpolate =
            segmentLength === 0
                ? 0
                : (startM + charLength / 2 - segmentM) / segmentLength;
        const x = lerp(x1, x2, interpolate);
        const y = lerp(y1, y2, interpolate);
        result.push([x, y, charLength / 2, angle, chars]);
        startM += charLength;
    }
    return result;
}
