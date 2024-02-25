import { Coordinate } from '@olts/core/coordinate';

import { Geometry } from '../geometry';
import { SimpleGeometry } from '../simple-geometry';
import { GeometryCollection } from '../collection';
import { getDistance } from './distance';
import { DEFAULT_RADIUS, SphereMetricOptions } from './defs';


/**
 * Get the cumulative great circle length of linestring coordinates
 * (geographic).
 *
 * @param coordinates Linestring coordinates.
 * @param radius The sphere radius to use.
 * @return The length (in meters).
 */
function getLengthInternal(coordinates: Coordinate[], radius: number): number {
    let length = 0;
    for (let i = 0, ii = coordinates.length; i < ii - 1; ++i) {
        length += getDistance(coordinates[i], coordinates[i + 1], radius);
    }
    return length;
}


/**
 * Get the spherical length of a geometry.
 *
 * This length is the sum of the great circle distances between coordinates.
 * For polygons, the length is the sum of all rings.  For points, the length is
 * zero.  For multi-part geometries, the length is the sum of the length of
 * each part.
 *
 * @param geometry A geometry.
 * @param options Options for the length calculation.
 * By default, geometries are assumed to be in 'EPSG:3857'. You can change this
 * by providing a `projection` option.
 * @return The spherical length (in meters).
 * @api
 */
export function getLength(
    geometry: Geometry, options?: SphereMetricOptions
): number {
    options = options || {};
    const radius = options.radius || DEFAULT_RADIUS;
    const projection = options.projection || 'EPSG:3857';
    const type = geometry.getType();
    if (type !== 'GeometryCollection') {
        geometry = geometry.clone().transform(projection, 'EPSG:4326');
    }
    let length = 0;
    let coordinates, coords, i, ii, j, jj;
    switch (type) {
        case 'Point':
        case 'MultiPoint': {
            break;
        }
        case 'LineString':
        case 'LinearRing': {
            coordinates = (geometry as SimpleGeometry).getCoordinates();
            length = getLengthInternal(coordinates!, radius);
            break;
        }
        case 'MultiLineString':
        case 'Polygon': {
            coordinates = (geometry as SimpleGeometry).getCoordinates();
            for (i = 0, ii = coordinates!.length; i < ii; ++i) {
                length += getLengthInternal(coordinates![i], radius);
            }
            break;
        }
        case 'MultiPolygon': {
            coordinates = (geometry as SimpleGeometry).getCoordinates();
            for (i = 0, ii = coordinates!.length; i < ii; ++i) {
                coords = coordinates![i];
                for (j = 0, jj = coords.length; j < jj; ++j) {
                    length += getLengthInternal(coords[j], radius);
                }
            }
            break;
        }
        case 'GeometryCollection': {
            const geometries = (
                geometry as GeometryCollection
            ).getGeometries();
            for (i = 0, ii = geometries.length; i < ii; ++i) {
                length += getLength(geometries[i], options);
            }
            break;
        }
        default: {
            throw new Error('Unsupported geometry type: ' + type);
        }
    }
    return length;
}
