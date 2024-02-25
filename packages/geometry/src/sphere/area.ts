import { Coordinate } from '@olts/core/coordinate';
import { toRadians } from '@olts/core/math';

import { Geometry } from '../geometry';
import { SimpleGeometry } from '../simple-geometry';
import { GeometryCollection } from '../collection';
import Polygon from '../polygon';
import { DEFAULT_RADIUS, SphereMetricOptions } from './defs';



/**
 * Returns the spherical area for a list of coordinates.
 *
 * [Reference](https://trs.jpl.nasa.gov/handle/2014/40409)
 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
 * Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
 * Laboratory, Pasadena, CA, June 2007
 *
 * @param coordinates List of coordinates of a linear
 * ring. If the ring is oriented clockwise, the area will be positive,
 * otherwise it will be negative.
 * @param radius The sphere radius.
 * @return Area (in square meters).
 */
function getAreaInternal(coordinates: Coordinate[], radius: number): number {
    let area = 0;
    const len = coordinates.length;
    let x1 = coordinates[len - 1][0];
    let y1 = coordinates[len - 1][1];
    for (let i = 0; i < len; i++) {
        const x2 = coordinates[i][0];
        const y2 = coordinates[i][1];
        area += toRadians(x2 - x1) * (
            2 + Math.sin(toRadians(y1)) + Math.sin(toRadians(y2))
        );
        x1 = x2;
        y1 = y2;
    }
    return (area * radius * radius) / 2.0;
}


/**
 * Get the spherical area of a geometry.
 *
 * This is the area (in meters) assuming that polygon edges are segments of
 * great circles on a sphere.
 *
 * @param geometry A geometry.
 * @param options Options for the area calculation.  By
 *     default, geometries are assumed to be in 'EPSG:3857'. You can change
 *     this by providing a `projection` option.
 * @return The spherical area (in square meters).
 * @api
 */
export function getArea(
    geometry: Geometry, options?: SphereMetricOptions
): number {
    options = options || {};
    const radius = options.radius || DEFAULT_RADIUS;
    const projection = options.projection || 'EPSG:3857';
    const type = geometry.getType();
    if (type !== 'GeometryCollection') {
        geometry = geometry.clone().transform(projection, 'EPSG:4326');
    }
    let area = 0;
    let coordinates, coords, i, ii, j, jj;
    switch (type) {
        case 'Point':
        case 'MultiPoint':
        case 'LineString':
        case 'MultiLineString':
        case 'LinearRing': {
            break;
        }
        case 'Polygon': {
            coordinates = (geometry as Polygon).getCoordinates();
            area = Math.abs(getAreaInternal(coordinates[0], radius));
            for (i = 1, ii = coordinates.length; i < ii; ++i) {
                area -= Math.abs(getAreaInternal(coordinates[i], radius));
            }
            break;
        }
        case 'MultiPolygon': {
            coordinates = (geometry as SimpleGeometry).getCoordinates()!;
            for (i = 0, ii = coordinates.length; i < ii; ++i) {
                coords = coordinates[i];
                area += Math.abs(getAreaInternal(coords[0], radius));
                for (j = 1, jj = coords.length; j < jj; ++j) {
                    area -= Math.abs(getAreaInternal(coords[j], radius));
                }
            }
            break;
        }
        case 'GeometryCollection': {
            const geometries = (geometry as GeometryCollection).getGeometries();
            for (i = 0, ii = geometries.length; i < ii; ++i) {
                area += getArea(geometries[i], options);
            }
            break;
        }
        default: {
            throw new Error('Unsupported geometry type: ' + type);
        }
    }
    return area;
}
