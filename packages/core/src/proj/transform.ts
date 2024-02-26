import { isEmpty } from '../js-obj';
import { Transform } from '@olts/core/transform';
import { Projection } from './projection';
import { TransformFunction } from './support';


let transforms: Record<string, Record<string, TransformFunction>> = {};


/**
 * Clear the transform cache.
 */
export function clear() {
    transforms = {};
}


/**
 * Registers a conversion function to convert coordinates from the source
 * projection to the destination projection.
 *
 * @param source Source.
 * @param destination Destination.
 * @param transformFn Transform.
 */
export function add(
    source: Projection, destination: Projection, transformFn: TransformFunction
) {
    const sourceCode = source.getCode();
    const destinationCode = destination.getCode();
    if (!(sourceCode in transforms)) {
        transforms[sourceCode] = {};
    }
    transforms[sourceCode][destinationCode] = transformFn;
}


/**
 * Un-registers the conversion function to convert coordinates from the source
 * projection to the destination projection.
 *
 * This method is used to clean up cached transforms during testing.
 *
 * @param source Source projection.
 * @param destination Destination projection.
 * @return transformFn The unregistered transform.
 */
export function remove(
    source: Projection, destination: Projection
): TransformFunction {
    const sourceCode = source.getCode();
    const destinationCode = destination.getCode();
    const transform = transforms[sourceCode][destinationCode];
    delete transforms[sourceCode][destinationCode];
    if (isEmpty(transforms[sourceCode])) {
        delete transforms[sourceCode];
    }
    return transform;
}


/**
 * Get a transform given a source code and a destination code.
 *
 * @param sourceCode The code for the source projection.
 * @param destinationCode The code for the destination projection.
 * @return The transform function (if found).
 */
export function get(
    sourceCode: string, destinationCode: string
): TransformFunction | undefined {
    let transform;
    if (sourceCode in transforms && destinationCode in transforms[sourceCode]) {
        transform = transforms[sourceCode][destinationCode];
    }
    return transform;
}

/**
 * @return 4x4 matrix representing a 3D identity transform.
 */
export function createMat4(): number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}


/**
 * @param mat4 Flattened 4x4 matrix receiving the result.
 * @param transform Transformation matrix.
 * @return 2D transformation matrix as flattened 4x4 matrix.
 */
export function mat4FromTransform(
    mat4: number[], transform: Transform
): number[] {
    mat4[0] = transform[0];
    mat4[1] = transform[1];
    mat4[4] = transform[2];
    mat4[5] = transform[3];
    mat4[12] = transform[4];
    mat4[13] = transform[5];
    return mat4;
}
