import { Coordinate } from '@olts/core/coordinate';
import { toRadians } from '@olts/core/math';

import { DEFAULT_RADIUS } from './defs';



/**
 * Get the great circle distance (in meters) between two geographic coordinates.
 *
 * @param c1 Starting coordinate.
 * @param c2 Ending coordinate.
 * @param radius The sphere radius to use.  Defaults to the Earth's
 *     mean radius using the WGS84 ellipsoid.
 * @return The great circle distance between the points (in meters).
 * @api
 */
export function getDistance(
    c1: Coordinate, c2: Coordinate, radius?: number
): number {
    radius = radius || DEFAULT_RADIUS;
    const lat1 = toRadians(c1[1]);
    const lat2 = toRadians(c2[1]);
    const deltaLatBy2 = (lat2 - lat1) / 2;
    const deltaLonBy2 = toRadians(c2[0] - c1[0]) / 2;
    const a =
        Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
        Math.sin(deltaLonBy2) *
        Math.sin(deltaLonBy2) *
        Math.cos(lat1) *
        Math.cos(lat2);
    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
