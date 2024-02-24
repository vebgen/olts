import { Transform } from "@olts/core/transform";

/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param transform Transform.
 * @param dest Destination.
 * @return Transformed coordinates.
 */
export function transform2D(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    transform: Transform,
    dest?: number[],
): number[] {
    dest = dest ? dest : [];
    let i = 0;
    for (let j = offset; j < end; j += stride) {
        const x = flatCoordinates[j];
        const y = flatCoordinates[j + 1];
        dest[i++] = transform[0] * x + transform[2] * y + transform[4];
        dest[i++] = transform[1] * x + transform[3] * y + transform[5];
    }
    if (dest && dest.length != i) {
        dest.length = i;
    }
    return dest;
}


/**
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param angle Angle.
 * @param anchor Rotation anchor point.
 * @param dest Destination.
 * @return Transformed coordinates.
 */
export function rotate(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    angle: number,
    anchor: number[],
    dest?: number[],
): number[] {
    dest = dest ? dest : [];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const anchorX = anchor[0];
    const anchorY = anchor[1];
    let i = 0;
    for (let j = offset; j < end; j += stride) {
        const deltaX = flatCoordinates[j] - anchorX;
        const deltaY = flatCoordinates[j + 1] - anchorY;
        dest[i++] = anchorX + deltaX * cos - deltaY * sin;
        dest[i++] = anchorY + deltaX * sin + deltaY * cos;
        for (let k = j + 2; k < j + stride; ++k) {
            dest[i++] = flatCoordinates[k];
        }
    }
    if (dest && dest.length != i) {
        dest.length = i;
    }
    return dest;
}


/**
 * Scale the coordinates.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param sx Scale factor in the x-direction.
 * @param sy Scale factor in the y-direction.
 * @param anchor Scale anchor point.
 * @param dest Destination.
 * @return Transformed coordinates.
 */
export function scale(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    sx: number,
    sy: number,
    anchor: number[],
    dest?: number[],
): number[] {
    dest = dest ? dest : [];
    const anchorX = anchor[0];
    const anchorY = anchor[1];
    let i = 0;
    for (let j = offset; j < end; j += stride) {
        const deltaX = flatCoordinates[j] - anchorX;
        const deltaY = flatCoordinates[j + 1] - anchorY;
        dest[i++] = anchorX + sx * deltaX;
        dest[i++] = anchorY + sy * deltaY;
        for (let k = j + 2; k < j + stride; ++k) {
            dest[i++] = flatCoordinates[k];
        }
    }
    if (dest && dest.length != i) {
        dest.length = i;
    }
    return dest;
}


/**
 * Translates the coordinates by the given delta.
 *
 * @param flatCoordinates Flat coordinates.
 * @param offset Offset.
 * @param end End.
 * @param stride Stride.
 * @param deltaX Delta X.
 * @param deltaY Delta Y.
 * @param dest Destination.
 * @return Transformed coordinates.
 */
export function translate(
    flatCoordinates: number[],
    offset: number,
    end: number,
    stride: number,
    deltaX: number,
    deltaY: number,
    dest?: number[],
): number[] {
    dest = dest ? dest : [];
    let i = 0;
    for (let j = offset; j < end; j += stride) {
        dest[i++] = flatCoordinates[j] + deltaX;
        dest[i++] = flatCoordinates[j + 1] + deltaY;
        for (let k = j + 2; k < j + stride; ++k) {
            dest[i++] = flatCoordinates[k];
        }
    }
    if (dest && dest.length != i) {
        dest.length = i;
    }
    return dest;
}
