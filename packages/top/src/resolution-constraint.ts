
import { clamp } from '@olts/core/math';
import { Extent, getHeight, getWidth } from '@olts/core/extent';
import { linearFindNearest } from '@olts/core/array';
import { Size } from '@olts/core/size';


/**
 * @param resolution Resolution.
 * @param direction Direction.
 * @param size Viewport size.
 * @param isMoving True if an interaction or animation is in progress.
 * @return Resolution.
 */
export type Type = (
    resolution: number | undefined,
    direction: number,
    size: Size,
    isMoving: boolean
) => (number | undefined);


/**
 * Returns a modified resolution taking into account the viewport size and maximum
 * allowed extent.
 * 
 * @param resolution Resolution
 * @param maxExtent Maximum allowed extent.
 * @param viewportSize Viewport size.
 * @param showFullExtent Whether to show the full extent.
 * @return Capped resolution.
 */
function getViewportClampedResolution(
    resolution: number,
    maxExtent: Extent,
    viewportSize: Size,
    showFullExtent?: boolean,
): number {
    const xResolution = getWidth(maxExtent) / viewportSize[0];
    const yResolution = getHeight(maxExtent) / viewportSize[1];

    if (showFullExtent) {
        return Math.min(resolution, Math.max(xResolution, yResolution));
    }
    return Math.min(resolution, Math.min(xResolution, yResolution));
}


/**
 * Returns a modified resolution to be between maxResolution and minResolution
 * while still allowing the value to be slightly out of bounds.
 *
 * Note: the computation is based on the logarithm function (ln):
 *  - at 1, ln(x) is 0
 *  - above 1, ln(x) keeps increasing but at a much slower pace than x The
 *    final result is clamped to prevent getting too far away from bounds.
 * 
 * @param resolution Resolution.
 * @param maxResolution Max resolution.
 * @param minResolution Min resolution.
 * @return Smoothed resolution.
 */
function getSmoothClampedResolution(
    resolution: number,
    maxResolution: number,
    minResolution: number
): number {
    let result = Math.min(resolution, maxResolution);
    const ratio = 50;

    result *= Math.log(
        1 + ratio * Math.max(0, resolution / maxResolution - 1)
    ) / ratio + 1;
    if (minResolution) {
        result = Math.max(result, minResolution);
        result /= Math.log(
            1 + ratio * Math.max(0, minResolution / resolution - 1)
        ) / ratio + 1;
    }
    return clamp(result, minResolution / 2, maxResolution * 2);
}


/**
 * @param resolutions Resolutions.
 * @param smooth If true, the view will be able to slightly exceed resolution
 *      limits. Default: true.
 * @param maxExtent Maximum allowed extent.
 * @param showFullExtent If true, allows us to show the full extent. Default:
 *      false.
 * @return Zoom function.
 */
export function createSnapToResolutions(
    resolutions: number[],
    smooth?: boolean,
    maxExtent?: Extent,
    showFullExtent?: boolean,
): Type {
    smooth = smooth !== undefined ? smooth : true;
    return (
        function (
            resolution: number | undefined,
            direction: number,
            size: Size,
            isMoving: boolean
        ): number | undefined {
            if (resolution !== undefined) {
                const maxResolution = resolutions[0];
                const minResolution = resolutions[resolutions.length - 1];
                const cappedMaxRes = maxExtent
                    ? getViewportClampedResolution(
                        maxResolution,
                        maxExtent,
                        size,
                        showFullExtent,
                    )
                    : maxResolution;

                // during interacting or animating, allow intermediary values
                if (isMoving) {
                    if (!smooth) {
                        return clamp(resolution, minResolution, cappedMaxRes);
                    }
                    return getSmoothClampedResolution(
                        resolution,
                        cappedMaxRes,
                        minResolution,
                    );
                }

                const capped = Math.min(cappedMaxRes, resolution);
                const z = Math.floor(
                    linearFindNearest(resolutions, capped, direction)
                );
                if (
                    resolutions[z] > cappedMaxRes &&
                    z < resolutions.length - 1
                ) {
                    return resolutions[z + 1];
                }
                return resolutions[z];
            }
            return undefined;
        }
    );
}


/**
 * @param power Power.
 * @param maxResolution Maximum resolution.
 * @param minResolution Minimum resolution.
 * @param smooth If true, the view will be able to slightly exceed resolution
 *      limits. Default: true.
 * @param maxExtent Maximum allowed extent.
 * @param showFullExtent If true, allows us to show the full extent. Default:
 *      false.
 * @return Zoom function.
 */
export function createSnapToPower(
    power: number,
    maxResolution?: number,
    minResolution?: number,
    smooth: boolean = true,
    maxExtent?: Extent,
    showFullExtent: boolean = false,
): Type {
    smooth = smooth !== undefined ? smooth : true;
    minResolution = minResolution !== undefined ? minResolution : 0;

    return (
        /**
         * @param resolution Resolution.
         * @param direction Direction.
         * @param size Viewport size.
         * @param True if an interaction or animation is in progress.
         * @return Resolution.
         */
        function (
            resolution: number | undefined,
            direction: number,
            size: Size,
            isMoving?: boolean
        ): number | undefined {
            if (resolution !== undefined) {
                const cappedMaxRes = maxExtent
                    ? getViewportClampedResolution(
                        maxResolution!,
                        maxExtent,
                        size,
                        showFullExtent,
                    )
                    : maxResolution;

                // during interacting or animating, allow intermediary values
                if (isMoving) {
                    if (!smooth) {
                        return clamp(
                            resolution, minResolution!, cappedMaxRes!
                        );
                    }
                    return getSmoothClampedResolution(
                        resolution,
                        cappedMaxRes!,
                        minResolution!,
                    );
                }

                const tolerance = 1e-9;
                const minZoomLevel = Math.ceil(
                    Math.log(
                        maxResolution! / cappedMaxRes!
                    ) / Math.log(power) - tolerance,
                );
                const offset = -direction * (0.5 - tolerance) + 0.5;
                const capped = Math.min(cappedMaxRes!, resolution);
                const cappedZoomLevel = Math.floor(
                    Math.log(maxResolution! / capped) /
                    Math.log(power) + offset,
                );
                const zoomLevel = Math.max(minZoomLevel, cappedZoomLevel);
                const newResolution = maxResolution! / Math.pow(
                    power, zoomLevel
                );
                return clamp(newResolution, minResolution!, cappedMaxRes!);
            }
            return undefined;
        }
    );
}


/**
 * @param maxResolution Max resolution.
 * @param minResolution Min resolution.
 * @param smooth If true, the view will be able to slightly exceed resolution limits. Default: true.
 * @param maxExtent Maximum allowed extent.
 * @param showFullExtent If true, allows us to show the full extent. Default: false.
 * @return Zoom function.
 */
export function createMinMaxResolution(
    maxResolution: number,
    minResolution: number,
    smooth: boolean = true,
    maxExtent?: Extent,
    showFullExtent: boolean = false,
): Type {
    smooth = smooth !== undefined ? smooth : true;

    return (
        /**
         * @param resolution Resolution.
         * @param direction Direction.
         * @param size Viewport size.
         * @param isMoving True if an interaction or animation is in progress.
         * @return Resolution.
         */
        function (
            resolution: number | undefined,
            direction: number,
            size: Size,
            isMoving?: boolean
        ): number | undefined {
            if (resolution !== undefined) {
                const cappedMaxRes = maxExtent
                    ? getViewportClampedResolution(
                        maxResolution,
                        maxExtent,
                        size,
                        showFullExtent,
                    )
                    : maxResolution;

                if (!smooth || !isMoving) {
                    return clamp(resolution, minResolution, cappedMaxRes);
                }
                return getSmoothClampedResolution(
                    resolution,
                    cappedMaxRes,
                    minResolution,
                );
            }
            return undefined;
        }
    );
}
