import { Coordinate } from '@olts/core/coordinate';
import { toDegrees, toRadians } from '@olts/core/math';

import { DEFAULT_RADIUS } from './defs';


/**
 * Returns the coordinate at the given distance and bearing from `c1`.
 *
 * @param c1 The origin point (`[lon, lat]` in degrees).
 * @param distance The great-circle distance between the origin
 *     point and the target point.
 * @param bearing The bearing (in radians).
 * @param radius The sphere radius to use.  Defaults to the Earth's
 *     mean radius using the WGS84 ellipsoid.
 * @return The target point.
 */
export function offset(
    c1: Coordinate, distance: number, bearing: number, radius?: number
): Coordinate {
    radius = radius || DEFAULT_RADIUS;
    const lat1 = toRadians(c1[1]);
    const lon1 = toRadians(c1[0]);
    const dByR = distance / radius;
    const lat = Math.asin(
        Math.sin(lat1) * Math.cos(dByR) +
        Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing),
    );
    const lon =
        lon1 +
        Math.atan2(
            Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
            Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat),
        );
    return [toDegrees(lon), toDegrees(lat)];
}
