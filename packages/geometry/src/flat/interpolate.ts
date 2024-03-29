import { binarySearch } from '@olts/core/array';
import { Coordinate } from '@olts/core/coordinate';
import { lerp } from '@olts/core/math';


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param fraction Fraction.
 * @param dest Destination.
 * @param dimension Destination dimension (default is `2`)
 * @return Destination.
 */
export function interpolatePoint(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    fraction: number,
    dest?: number[],
    dimension: number = 2,
): number[] {
    let o, t;
    const n = (end - offset) / stride;
    if (n === 1) {
        o = offset;
    } else if (n === 2) {
        o = offset;
        t = fraction;
    } else if (n !== 0) {
        let x1 = flatCoordinates[offset];
        let y1 = flatCoordinates[offset + 1];
        let length = 0;
        const cumulativeLengths = [0];
        for (let i = offset + stride; i < end; i += stride) {
            const x2 = flatCoordinates[i];
            const y2 = flatCoordinates[i + 1];
            length += Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            cumulativeLengths.push(length);
            x1 = x2;
            y1 = y2;
        }
        const target = fraction * length;
        const index = binarySearch(cumulativeLengths, target);
        if (index < 0) {
            t =
                (target - cumulativeLengths[-index - 2]) /
                (cumulativeLengths[-index - 1] - cumulativeLengths[-index - 2]);
            o = offset + (-index - 2) * stride;
        } else {
            o = offset + index * stride;
        }
    }
    dimension = dimension > 1 ? dimension : 2;
    dest = dest ? dest : new Array(dimension);
    for (let i = 0; i < dimension; ++i) {
        dest[i] =
            o === undefined
                ? NaN
                : t === undefined
                    ? flatCoordinates[o + i]
                    : lerp(
                        flatCoordinates[o + i],
                        flatCoordinates[o + stride + i],
                        t
                    );
    }
    return dest;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param m M.
 * @param extrapolate Extrapolate.
 * @return Coordinate.
 */
export function lineStringCoordinateAtM(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    m: number,
    extrapolate: boolean,
): Coordinate | null {
    if (end == offset) {
        return null;
    }
    let coordinate;
    if (m < flatCoordinates[offset + stride - 1]) {
        if (extrapolate) {
            coordinate = flatCoordinates.slice(offset, offset + stride);
            coordinate[stride - 1] = m;
            return coordinate;
        }
        return null;
    }
    if (flatCoordinates[end - 1] < m) {
        if (extrapolate) {
            coordinate = flatCoordinates.slice(end - stride, end);
            coordinate[stride - 1] = m;
            return coordinate;
        }
        return null;
    }
    // FIXME use O(1) search
    if (m == flatCoordinates[offset + stride - 1]) {
        return flatCoordinates.slice(offset, offset + stride);
    }
    let lo = offset / stride;
    let hi = end / stride;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (m < flatCoordinates[(mid + 1) * stride - 1]) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    const m0 = flatCoordinates[lo * stride - 1];
    if (m == m0) {
        return flatCoordinates.slice((lo - 1) * stride, (lo - 1) * stride + stride);
    }
    const m1 = flatCoordinates[(lo + 1) * stride - 1];
    const t = (m - m0) / (m1 - m0);
    coordinate = [];
    for (let i = 0; i < stride - 1; ++i) {
        coordinate.push(
            lerp(
                flatCoordinates[(lo - 1) * stride + i],
                flatCoordinates[lo * stride + i],
                t,
            ),
        );
    }
    coordinate.push(m);
    return coordinate;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param ends Ends.
 * @param stride Stride.
 * @param m M.
 * @param extrapolate Extrapolate.
 * @param interpolate Interpolate.
 * @return Coordinate.
 */
export function lineStringsCoordinateAtM(
    flatCoordinates: number[],
    offset: number,
    ends: number[],
    stride: number,
    m: number,
    extrapolate: boolean,
    interpolate: boolean,
): Coordinate | null {
    if (interpolate) {
        return lineStringCoordinateAtM(
            flatCoordinates,
            offset,
            ends[ends.length - 1],
            stride,
            m,
            extrapolate,
        );
    }
    let coordinate;
    if (m < flatCoordinates[stride - 1]) {
        if (extrapolate) {
            coordinate = flatCoordinates.slice(0, stride);
            coordinate[stride - 1] = m;
            return coordinate;
        }
        return null;
    }
    if (flatCoordinates[flatCoordinates.length - 1] < m) {
        if (extrapolate) {
            coordinate = flatCoordinates.slice(flatCoordinates.length - stride);
            coordinate[stride - 1] = m;
            return coordinate;
        }
        return null;
    }
    for (let i = 0, ii = ends.length; i < ii; ++i) {
        const end = ends[i];
        if (offset == end) {
            continue;
        }
        if (m < flatCoordinates[offset + stride - 1]) {
            return null;
        }
        if (m <= flatCoordinates[end - 1]) {
            return lineStringCoordinateAtM(
                flatCoordinates,
                offset,
                end,
                stride,
                m,
                false,
            );
        }
        offset = end;
    }
    return null;
}
