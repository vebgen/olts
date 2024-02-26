
import { toRadians } from '@olts/core/math';

/**
 * @typedef {function((number|undefined), boolean=): (number|undefined)} Type
 */

/**
 * @param {number|undefined} rotation Rotation.
 * @return {number|undefined} Rotation.
 */
export function disable(rotation: number | undefined): number | undefined {
    if (rotation !== undefined) {
        return 0;
    }
    return undefined;
}

/**
 * @param {number|undefined} rotation Rotation.
 * @return {number|undefined} Rotation.
 */
export function none(rotation: number | undefined): number | undefined {
    if (rotation !== undefined) {
        return rotation;
    }
    return undefined;
}

/**
 * @param {number} n N.
 * @return {Type} Rotation constraint.
 */
export function createSnapToN(n: number): Type {
    const theta = (2 * Math.PI) / n;
    return (
        /**
         * @param {number|undefined} rotation Rotation.
         * @param {boolean} [isMoving] True if an interaction or animation is in progress.
         * @return {number|undefined} Rotation.
         */
        function (rotation: number | undefined, isMoving: boolean): number | undefined {
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
 * @param {number} [tolerance] Tolerance.
 * @return {Type} Rotation constraint.
 */
export function createSnapToZero(tolerance: number): Type {
    const t = tolerance === undefined ? toRadians(5) : tolerance;
    return (
        /**
         * @param {number|undefined} rotation Rotation.
         * @param {boolean} [isMoving] True if an interaction or animation is in progress.
         * @return {number|undefined} Rotation.
         */
        function (rotation: number | undefined, isMoving: boolean): number | undefined {
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
