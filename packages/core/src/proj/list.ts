import { Projection } from './projection';

let cache: Record<string, Projection> = {};


/**
 * Clear the projections cache.
 */
export function clear() {
    cache = {};
}


/**
 * Get a cached projection by code.
 *
 * @param code The code for the projection.
 * @return The projection (if cached).
 */
export function get(code: string): Projection {
    return (
        cache[code] ||
        cache[code.replace(
            /urn:(x-)?ogc:def:crs:EPSG:(.*:)?(\w+)$/, 'EPSG:$3'
        )] ||
        null
    );
}


/**
 * Add a projection to the cache.
 *
 * @param code The projection code.
 * @param projection The projection to cache.
 */
export function add(code: string, projection: Projection) {
    cache[code] = projection;
}
