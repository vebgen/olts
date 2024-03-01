
import { toRadians } from '@olts/core/math';


/**
 * @param rotation Rotation.
 * @param isMoving True if an interaction or animation is in progress.
 * @return Rotation.
 */
export type Type = (
    rotation: (number | undefined),
    isMoving?: boolean
) => (number | undefined);


/**
 * @param rotation Rotation.
 * @return Rotation.
 */
export function disable(rotation: number | undefined): number | undefined {
    if (rotation !== undefined) {
        return 0;
    }
    return undefined;
}


/**
 * @param rotation Rotation.
 * @return Rotation.
 */
export function none(rotation: number | undefined): number | undefined {
    if (rotation !== undefined) {
        return rotation;
    }
    return undefined;
}


/**
 * @param n N.
 * @return Rotation constraint.
 */
export function createSnapToN(n: number): Type {
    const theta = (2 * Math.PI) / n;
    return (
        /**
         * @param rotation Rotation.
         * @param isMoving True if an interaction or animation is in progress.
         * @return Rotation.
         */
        function (
            rotation: number | undefined, isMoving?: boolean
        ): number | undefined {
            if (isMoving) {
                return rotation;
            }

            if (rotation !== undefined) {
                rotation = Math.floor(rotation / theta + 0.5) * theta;
                return rotation;
            }
            return undefined;
        }
    );
}


/**
 * @param tolerance Tolerance.
 * @return Rotation constraint.
 */
export function createSnapToZero(tolerance?: number): Type {
    const t = tolerance === undefined ? toRadians(5) : tolerance;
    return (
        function (
            rotation: number | undefined,
            isMoving?: boolean
        ): number | undefined {
            if (isMoving || rotation === undefined) {
                return rotation;
            }

            if (Math.abs(rotation) <= t) {
                return 0;
            }
            return rotation;
        }
    );
}
