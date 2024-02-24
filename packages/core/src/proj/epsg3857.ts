import { Extent } from '../extent';
import { Projection } from './projection';


/**
 * Radius of WGS84 sphere
 */
export const RADIUS = 6378137;


/**
 * Half size of the world in EPSG:3857 projection.
 */
export const HALF_SIZE: number = Math.PI * RADIUS;


/**
 * Extent of the EPSG:3857 projection which is the whole world.
 */
export const EXTENT: Extent = [-HALF_SIZE, -HALF_SIZE, HALF_SIZE, HALF_SIZE];


/**
 * The extent of the world in EPSG:4326.
 */
export const WORLD_EXTENT: Extent = [-180, -85, 180, 85];


/**
 * Maximum safe value in y direction.
 */
export const MAX_SAFE_Y: number = RADIUS * Math.log(Math.tan(Math.PI / 2));


/**
 * Projection object for web/spherical Mercator (EPSG:3857).
 */
class EPSG3857Projection extends Projection {
    /**
     * Constructor.
     *
     * @param code Code.
     */
    constructor(code: string) {
        super({
            code: code,
            units: 'm',
            extent: EXTENT,
            global: true,
            worldExtent: WORLD_EXTENT,
            getPointResolution: function (resolution, point) {
                return resolution / Math.cosh(point[1] / RADIUS);
            },
        });
    }
}


/**
 * Projections equal to EPSG:3857.
 */
export const PROJECTIONS: Projection[] = [
    new EPSG3857Projection('EPSG:3857'),
    new EPSG3857Projection('EPSG:102100'),
    new EPSG3857Projection('EPSG:102113'),
    new EPSG3857Projection('EPSG:900913'),
    new EPSG3857Projection('http://www.opengis.net/def/crs/EPSG/0/3857'),
    new EPSG3857Projection('http://www.opengis.net/gml/srs/epsg.xml#3857'),
];


/**
 * Transformation from EPSG:4326 to EPSG:3857.
 *
 * @param input Input array of coordinate values.
 * @param output Output array of coordinate values.
 * @param dimension Dimension (default is `2`).
 * @return Output array of coordinate values.
 */
export function fromEPSG4326(
    input: number[], output?: number[], dimension: number = 2
): number[] {
    const length = input.length;
    dimension = dimension > 1 ? dimension : 2;
    if (output === undefined) {
        if (dimension > 2) {
            // preserve values beyond second dimension
            output = input.slice();
        } else {
            output = new Array(length);
        }
    }
    for (let i = 0; i < length; i += dimension) {
        output[i] = (HALF_SIZE * input[i]) / 180;
        let y = RADIUS * Math.log(
            Math.tan((Math.PI * (+input[i + 1] + 90)) / 360)
        );
        if (y > MAX_SAFE_Y) {
            y = MAX_SAFE_Y;
        } else if (y < -MAX_SAFE_Y) {
            y = -MAX_SAFE_Y;
        }
        output[i + 1] = y;
    }
    return output;
}


/**
 * Transformation from EPSG:3857 to EPSG:4326.
 *
 * @param input Input array of coordinate values.
 * @param output Output array of coordinate values.
 * @param dimension Dimension (default is `2`).
 * @return Output array of coordinate values.
 */
export function toEPSG4326(
    input: number[], output?: number[], dimension: number = 2
): number[] {
    const length = input.length;
    dimension = dimension > 1 ? dimension : 2;
    if (output === undefined) {
        if (dimension > 2) {
            // preserve values beyond second dimension
            output = input.slice();
        } else {
            output = new Array(length);
        }
    }
    for (let i = 0; i < length; i += dimension) {
        output[i] = (180 * input[i]) / HALF_SIZE;
        output[i + 1] =
            (360 * Math.atan(Math.exp(input[i + 1] / RADIUS))) / Math.PI - 90;
    }
    return output;
}
