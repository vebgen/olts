import { squaredSegmentDistance, toDegrees, toRadians } from '@olts/core/math';
import {
    Projection, TransformFunction, getProjection, getTransform
} from '@olts/core/proj';
import { Coordinate } from '@olts/core/coordinate';


export type InterpolateFunction = (arg0: number) => Coordinate;


/**
 * @param interpolate Interpolate function.
 * @param transform Transform from longitude/latitude to projected coordinates.
 * @param squaredTolerance Squared tolerance.
 * @return Flat coordinates.
 */
export function line(
    interpolate: InterpolateFunction,
    transform: TransformFunction,
    squaredTolerance: number
): number[] {
    // FIXME reduce garbage generation
    // FIXME optimize stack operations

    const flatCoordinates: number[] = [];

    let geoA = interpolate(0);
    let geoB = interpolate(1);

    let a = transform(geoA);
    let b = transform(geoB);

    const geoStack: Coordinate[] = [geoB, geoA];
    const stack: Coordinate[] = [b, a];
    const fractionStack: number[] = [1, 0];
    const fractions: Record<string, boolean> = {};

    let maxIterations = 1e5;
    let geoM, m, fracA, fracB, fracM, key;

    while (--maxIterations > 0 && fractionStack.length > 0) {
        // Pop the a coordinate off the stack
        fracA = fractionStack.pop()!;
        geoA = geoStack.pop()!;
        a = stack.pop()!;

        // Add the a coordinate if it has not been added yet
        key = fracA.toString();
        if (!(key in fractions)) {
            flatCoordinates.push(a[0], a[1]);
            fractions[key] = true;
        }

        // Pop the b coordinate off the stack
        fracB = fractionStack.pop()!;
        geoB = geoStack.pop()!;
        b = stack.pop()!;

        // Find the m point between the a and b coordinates
        fracM = (fracA + fracB) / 2;
        geoM = interpolate(fracM);
        m = transform(geoM);
        if (
            squaredSegmentDistance(m[0], m[1], a[0], a[1], b[0], b[1]) <
            squaredTolerance
        ) {
            // If the m point is sufficiently close to the straight line, then
            // we discard it.  Just use the b coordinate and move on to the next
            // line segment.
            flatCoordinates.push(b[0], b[1]);
            key = fracB.toString();
            fractions[key] = true;
        } else {
            // Otherwise, we need to subdivide the current line segment.  Split
            // it into two and push the two line segments onto the stack.
            fractionStack.push(fracB, fracM, fracM, fracA);
            stack.push(b, m, m, a);
            geoStack.push(geoB, geoM, geoM, geoA);
        }
    }

    return flatCoordinates;
}


/**
 * Generate a great-circle arcs between two lat/lon points.
 * @param lon1 Longitude 1 in degrees.
 * @param lat1 Latitude 1 in degrees.
 * @param lon2 Longitude 2 in degrees.
 * @param lat2 Latitude 2 in degrees.
 * @param projection Projection.
 * @param squaredTolerance Squared tolerance.
 * @return Flat coordinates.
 */
export function greatCircleArc(
    lon1: number,
    lat1: number,
    lon2: number,
    lat2: number,
    projection: Projection,
    squaredTolerance: number,
): number[] {
    const geoProjection = getProjection('EPSG:4326')!;

    const cosLat1 = Math.cos(toRadians(lat1));
    const sinLat1 = Math.sin(toRadians(lat1));
    const cosLat2 = Math.cos(toRadians(lat2));
    const sinLat2 = Math.sin(toRadians(lat2));
    const cosDeltaLon = Math.cos(toRadians(lon2 - lon1));
    const sinDeltaLon = Math.sin(toRadians(lon2 - lon1));
    const d = sinLat1 * sinLat2 + cosLat1 * cosLat2 * cosDeltaLon;

    return line(
        /**
         * @param frac Fraction.
         * @return Coordinate.
         */
        function (frac: number): Coordinate {
            if (1 <= d) {
                return [lon2, lat2];
            }
            const D = frac * Math.acos(d);
            const cosD = Math.cos(D);
            const sinD = Math.sin(D);
            const y = sinDeltaLon * cosLat2;
            const x = cosLat1 * sinLat2 - sinLat1 * cosLat2 * cosDeltaLon;
            const theta = Math.atan2(y, x);
            const lat = Math.asin(
                sinLat1 * cosD + cosLat1 * sinD * Math.cos(theta)
            );
            const lon =
                toRadians(lon1) +
                Math.atan2(
                    Math.sin(theta) * sinD * cosLat1,
                    cosD - sinLat1 * Math.sin(lat),
                );
            return [toDegrees(lon), toDegrees(lat)];
        },
        getTransform(geoProjection, projection)!,
        squaredTolerance,
    );
}


/**
 * Generate a meridian (line at constant longitude).
 * @param lon Longitude.
 * @param lat1 Latitude 1.
 * @param lat2 Latitude 2.
 * @param projection Projection.
 * @param squaredTolerance Squared tolerance.
 * @return Flat coordinates.
 */
export function meridian(
    lon: number, lat1: number, lat2: number,
    projection: Projection, squaredTolerance: number
): number[] {
    const epsg4326Projection = getProjection('EPSG:4326');
    return line(
        /**
         * @param frac Fraction.
         * @return Coordinate.
         */
        function (frac: number): Coordinate {
            return [lon, lat1 + (lat2 - lat1) * frac];
        },
        // Wrong types. Maybe wrong get?
        getTransform(epsg4326Projection, projection)!,
        squaredTolerance,
    );
}


/**
 * Generate a parallel (line at constant latitude).
 * @param lat Latitude.
 * @param lon1 Longitude 1.
 * @param lon2 Longitude 2.
 * @param projection Projection.
 * @param squaredTolerance Squared tolerance.
 * @return Flat coordinates.
 */
export function parallel(lat: number, lon1: number, lon2: number, projection: Projection, squaredTolerance: number): number[] {
    const epsg4326Projection = getProjection('EPSG:4326');
    return line(
        /**
         * @param frac Fraction.
         * @return Coordinate.
         */
        function (frac: number): Coordinate {
            return [lon1 + (lon2 - lon1) * frac, lat];
        },
        // Wrong types. Maybe wrong get?
        getTransform(epsg4326Projection, projection)!,
        squaredTolerance,
    );
}
