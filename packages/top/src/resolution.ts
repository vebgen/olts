

/**
 * @typedef {number|number[]} ResolutionLike
 */

/**
 * @param {ResolutionLike} resolution Resolution.
 * @return Resolution.
 */
export function fromResolutionLike(resolution: ResolutionLike): number {
    if (Array.isArray(resolution)) {
        return Math.min(...resolution);
    }
    return resolution;
}
