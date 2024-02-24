
/**
 * The length units that may be specified in the units option.
 */
export type Units =
    | 'radians'
    | 'degrees'
    | 'ft'
    | 'm'
    | 'pixels'
    | 'tile-pixels'
    | 'us-ft';


/**
 * Codes used by the GeoTIFF Format Specification.
 *
 * @see http://duff.ess.washington.edu/data/raster/drg/docs/geotiff.txt
 */
const unitByCode: Record<number, Units> = {
    '9001': 'm',
    '9002': 'ft',
    '9003': 'us-ft',
    '9101': 'radians',
    '9102': 'degrees',
};


/**
 * Get the unit to use from the GeoTIFF code.
 *
 * @param code Unit code.
 * @return Units.
 */
export function fromCode(code: number): Units {
    return unitByCode[code];
}


/**
 * Convert between meter and other units.
 */
export interface MetersPerUnitLookup {
    /**
     * Radians
     */
    radians: number;

    /**
     * Degrees
     */
    degrees: number;

    /**
     * Feet
     */
    ft: number;

    /**
     * Meters
     */
    m: number;

    /**
     * US feet
     */
    'us-ft': number;
}


/**
 * Meters per unit lookup table.
 *
 * For conversion to/from specific units, the radius of the Normal sphere
 * is used.
 *
 * @api
 */
export const METERS_PER_UNIT: MetersPerUnitLookup = {
    radians: 6370997 / (2 * Math.PI),
    degrees: (2 * Math.PI * 6370997) / 360,
    ft: 0.3048,
    m: 1,
    'us-ft': 1200 / 3937,
};


/**
 * Get the meters per unit value.
 *
 * @param unit The unit to get the value for.
 * @return The factor to use for converting the unit to meters.
 */
export function getMPU(unit: Units): number {
    return METERS_PER_UNIT[unit as keyof MetersPerUnitLookup];
}
