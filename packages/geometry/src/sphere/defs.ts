import { ProjectionLike } from "@olts/core/proj";


/**
 * Options for the {@link getLength} or {@link getArea} functions.
 */
export interface SphereMetricOptions {

    /**
     * Projection of the  geometry.
     *
     * By default, the geometry is assumed to be in Web Mercator.
     *
     * @default 'EPSG:3857'
     */
    projection?: ProjectionLike;

    /**
     * Sphere radius.
     *
     * By default, the [mean Earth radius
     * ](https://en.wikipedia.org/wiki/Earth_radius#Mean_radius) for the WGS84
     * ellipsoid is used.
     *
     * @default 6371008.8
     */
    radius?: number;
}


/**
 * The mean Earth radius (1/3 * (2a + b)) for the WGS84 ellipsoid.
 * https://en.wikipedia.org/wiki/Earth_radius#Mean_radius
 */
export const DEFAULT_RADIUS: number = 6371008.8;
