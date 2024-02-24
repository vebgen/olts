
import Projection from './projection';
import {
    PROJECTIONS as EPSG3857_PROJECTIONS,
    fromEPSG4326,
    toEPSG4326,
} from './epsg3857';
import { PROJECTIONS as EPSG4326_PROJECTIONS } from './epsg4326';
import { Units, getMPU } from './units';
import {
    add as addProj,
    clear as clearProj,
    get as getProj,
} from './list';
import {
    add as addTransformFunc,
    clear as clearTransformFuncs,
    get as getTransformFunc,
} from './transform';
import { Extent, applyTransform, getWidth } from '../extent';
import { clamp, modulo } from '../math';
import { Coordinate, equals, getWorldsAway } from '../coordinate';
import { getDistance } from './sphere';
import { warn } from '../console';
import { assert } from '../asserts';


/**
 * A projection as an {@link Projection} instance, SRS identifier string or
 * `undefined`.
 *
 * @api
 */
export type ProjectionLike = Projection | string | undefined;


/**
 * A transform function accepts an array of input coordinate values, an optional
 * output array, and an optional dimension (default should be 2).  The function
 * transforms the input coordinate values, populates the output array, and
 * returns the output array.
 * @api
 *
 * @param input Input coordinate array.
 * @param output Output array of coordinate values.
 * @param dimension Dimension.
 * @return Output coordinate array (new array, same coordinate values).
 */
export type TransformFunction = (
    input: number[],
    output?: number[],
    dimension?: number
) => number[];


// Disable console info about `useGeographic()`.
let showCoordinateWarning = true;


/**
 * Disable console info about `useGeographic()`.
 *
 * @param disable Disable or enable the warning message.
 */
export function disableCoordinateWarning(disable: boolean = true) {
    const hide = disable === undefined ? true : disable;
    showCoordinateWarning = !hide;
}


/**
 * Clones an array of coordinates. If no output array is provided, a new array
 * will be created from `input`.
 *
 * @param input Input coordinate array.
 * @param output Output array of coordinate values.
 * @return Output coordinate array (new array, same coordinate values).
 */
export function cloneTransform(input: number[], output: number[]): number[] {
    if (output !== undefined) {
        for (let i = 0, ii = input.length; i < ii; ++i) {
            output[i] = input[i];
        }
    } else {
        output = input.slice();
    }
    return output;
}


/**
 * Clones an array of coordinates. If no output array is provided, `input`
 * will be returned.
 *
 * @param input Input coordinate array.
 * @param output Output array of coordinate values.
 * @return Input coordinate array (same array as input).
 */
export function identityTransform(input: number[], output: number[]): number[] {
    if (output !== undefined && input !== output) {
        for (let i = 0, ii = input.length; i < ii; ++i) {
            output[i] = input[i];
        }
        input = output;
    }
    return input;
}


/**
 * Add a `Projection` object to the list of supported projections that can be
 * looked up by their code.
 *
 * @param projection Projection instance.
 * @api
 */
export function addProjection(projection: Projection) {
    addProj(projection.getCode(), projection);
    addTransformFunc(projection, projection, cloneTransform);
}


/**
 * Add a list of projections to the list of supported projections that can be
 * looked up by their code.
 *
 * @param projections Projections.
 */
export function addProjections(projections: Projection[]) {
    projections.forEach(addProjection);
}


/**
 * Fetches a Projection object for the code specified.
 *
 * @param projectionLike Either a code string which is a combination of
 *   authority and identifier such as "EPSG:4326", or an existing projection
 *   object, or undefined.
 * @return Projection object, or null if not in list.
 * @api
 */
export function get(projectionLike: ProjectionLike): Projection | null {
    return typeof projectionLike === 'string'
        ? getProj(projectionLike as string)
        : (projectionLike as Projection)
        || null;
}


/**
 * Get the resolution of the point in degrees or distance units.
 *
 * For projections with degrees as the unit this will simply return the
 * provided resolution.
 *
 * For other projections the point resolution is by default estimated by
 * transforming the `point` pixel to EPSG:4326, measuring its width and height
 * on the normal sphere, and taking the average of the width and height.
 *
 * A custom function can be provided for a specific projection, either
 * by setting the `getPointResolution` option in the
 * {@link Projection} constructor or by using
 * {@link Projection#setGetPointResolution} to change an existing
 * projection object.
 *
 * @param projection The projection.
 * @param resolution Nominal resolution in projection units.
 * @param point Point to find adjusted resolution at.
 * @param units Units to get the point resolution in. Default is the
 *   projection's units.
 * @return Point resolution.
 * @api
 */
export function getPointResolution(
    projection: ProjectionLike, resolution: number,
    point: Coordinate, units: Units
): number {
    const resolvedProj = get(projection);
    if (!resolvedProj) {
        return resolution;
    }

    let pointResolution;
    const getter = resolvedProj.getPointResolutionFunc();
    if (getter) {
        pointResolution = getter(resolution, point);
        if (units && units !== resolvedProj.getUnits()) {
            const metersPerUnit = resolvedProj.getMetersPerUnit();
            if (metersPerUnit) {
                pointResolution =
                    (pointResolution * metersPerUnit) / getMPU(units);
            }
        }
    } else {
        const projUnits = resolvedProj.getUnits();
        if ((projUnits == 'degrees' && !units) || units == 'degrees') {
            pointResolution = resolution;
        } else {
            // Estimate point resolution by transforming the center pixel to
            // EPSG:4326, measuring its width and height on the normal sphere,
            // and taking the average of the width and height.
            const toEPSG4326 = getTransformFromProjections(
                resolvedProj,
                get('EPSG:4326')!,
            );
            if (toEPSG4326 === identityTransform && projUnits !== 'degrees') {
                // no transform is available
                pointResolution = resolution * resolvedProj.getMetersPerUnit()!;
            } else {
                let vertices = [
                    point[0] - resolution / 2,
                    point[1],
                    point[0] + resolution / 2,
                    point[1],
                    point[0],
                    point[1] - resolution / 2,
                    point[0],
                    point[1] + resolution / 2,
                ];
                vertices = toEPSG4326(vertices, vertices, 2);
                const width = getDistance(
                    vertices.slice(0, 2), vertices.slice(2, 4)
                );
                const height = getDistance(
                    vertices.slice(4, 6), vertices.slice(6, 8)
                );
                pointResolution = (width + height) / 2;
            }
            const metersPerUnit = units
                ? getMPU(units)
                : resolvedProj.getMetersPerUnit();
            if (metersPerUnit !== undefined) {
                pointResolution /= metersPerUnit;
            }
        }
    }
    return pointResolution;
}


/**
 * Registers transformation functions that don't alter coordinates.
 *
 * Those allow to transform between projections with equal meaning.
 *
 * @param projections Projections.
 * @api
 */
export function addEquivalentProjections(projections: Projection[]) {
    addProjections(projections);
    projections.forEach(function (source) {
        projections.forEach(function (destination) {
            if (source !== destination) {
                addTransformFunc(source, destination, cloneTransform);
            }
        });
    });
}


/**
 * Registers transformation functions to convert coordinates in any projection
 * in `projection1` to any projection in `projection2`.
 *
 * @param projections1 Projections with equal meaning.
 * @param projections2 Projections with equal meaning.
 * @param forwardTransform Transformation from any projection in `projection1`
 *   to any projection in `projection2`.
 * @param inverseTransform Transform from any projection in `projection2` to
 *   any projection in `projection1`.
 */
export function addEquivalentTransforms(
    projections1: Projection[],
    projections2: Projection[],
    forwardTransform: TransformFunction,
    inverseTransform: TransformFunction,
) {
    projections1.forEach(function (projection1) {
        projections2.forEach(function (projection2) {
            addTransformFunc(projection1, projection2, forwardTransform);
            addTransformFunc(projection2, projection1, inverseTransform);
        });
    });
}


/**
 * Clear all cached projections and transforms.
 */
export function clearAllProjections() {
    clearProj();
    clearTransformFuncs();
}


/**
 * Create a projection from a code, like 'EPSG:4326'.
 *
 * @param projection Projection.
 * @param defaultCode Default code.
 * @return Projection.
 */
export function createProjection(
    projection: ProjectionLike, defaultCode: string
): Projection | null {
    if (!projection) {
        return get(defaultCode);
    }
    if (typeof projection === 'string') {
        return get(projection);
    }
    return projection;
}


/**
 * Create a safe coordinate transform function from a coordinate transform
 * function.
 */
export type CoordTransform = (coord: Coordinate) => Coordinate;


/**
 * Creates a {@link TransformFunction} from a simple 2D coordinate transform
 * function.
 *
 * @param coordTransform Coordinate transform.
 * @return Transform function.
 */
export function createTransformFromCoordinateTransform(
    coordTransform: CoordTransform
): TransformFunction {
    return (
        function (
            input: number[], output?: number[], dimension?: number
        ): number[] {
            const length = input.length;
            dimension = dimension !== undefined ? dimension : 2;
            output = output !== undefined ? output : new Array(length);
            for (let i = 0; i < length; i += dimension) {
                const point = coordTransform(input.slice(i, i + dimension));
                const pointLength = point.length;
                for (let j = 0, jj = dimension; j < jj; ++j) {
                    output[i + j] = j >= pointLength ? input[i + j] : point[j];
                }
            }
            return output;
        }
    );
}


/**
 * Registers coordinate transform functions to convert coordinates between the
 * source projection and the destination projection.
 *
 * The forward and inverse functions convert coordinate pairs; this function
 * converts these into the functions used internally which also handle
 * extents and coordinate arrays.
 *
 * @param source Source projection.
 * @param destination Destination projection.
 * @param forward The forward transform function (that is, from the source
 *     projection to the destination projection) that takes a {@linkCoordinate}
 *     as argument and returns the transformed {@linkCoordinate}.
 * @param inverse The inverse transform function (that is, from the destination
 *     projection to the source projection) that takes a {@linkCoordinate} as
 *     argument and returns the transformed {@linkCoordinate}. If the transform
 *     function can only transform less dimensions than the input coordinate, it
 *     is supposed to return a coordinate with only the length it can transform.
 *     The other dimensions will be taken unchanged from the source.
 * @api
 */
export function addCoordinateTransforms(
    source: ProjectionLike,
    destination: ProjectionLike,
    forward: CoordTransform,
    inverse: CoordTransform
) {
    const sourceProj = get(source);
    const destProj = get(destination);
    addTransformFunc(
        sourceProj,
        destProj,
        createTransformFromCoordinateTransform(forward),
    );
    addTransformFunc(
        destProj,
        sourceProj,
        createTransformFromCoordinateTransform(inverse),
    );
}


/**
 * Transforms a coordinate from longitude/latitude to a different projection.
 *
 * @param coordinate Coordinate as longitude and latitude, i.e. an array with
 *     longitude as 1st and latitude as 2nd element.
 * @param [projection] Target projection. The default is Web
 *     Mercator, i.e. 'EPSG:3857'.
 * @return Coordinate projected to the target projection.
 * @api
 */
export function fromLonLat(
    coordinate: Coordinate, projection: ProjectionLike
): Coordinate {
    disableCoordinateWarning();
    return transform(
        coordinate,
        'EPSG:4326',
        projection !== undefined ? projection : 'EPSG:3857',
    );
}


/**
 * Transforms a coordinate to longitude/latitude.
 *
 * @param coordinate Projected coordinate.
 * @param projection Projection of the coordinate.
 *     The default is Web Mercator, i.e. 'EPSG:3857'.
 * @return Coordinate as longitude and latitude, i.e. an array
 *     with longitude as 1st and latitude as 2nd element.
 * @api
 */
export function toLonLat(
    coordinate: Coordinate, projection?: ProjectionLike
): Coordinate {
    const lonLat = transform(
        coordinate,
        projection !== undefined ? projection : 'EPSG:3857',
        'EPSG:4326',
    );
    const lon = lonLat[0];
    if (lon < -180 || lon > 180) {
        lonLat[0] = modulo(lon + 180, 360) - 180;
    }
    return lonLat;
}


/**
 * Checks if two projections are the same, that is every coordinate in one
 * projection does represent the same geographic point as the same coordinate in
 * the other projection.
 *
 * @param projection1 Projection 1.
 * @param projection2 Projection 2.
 * @return Wether the projections are the same.
 * @api
 */
export function equivalent(
    projection1: Projection, projection2: Projection
): boolean {
    if (projection1 === projection2) {
        return true;
    }
    const equalUnits = projection1.getUnits() === projection2.getUnits();
    if (projection1.getCode() === projection2.getCode()) {
        return equalUnits;
    }
    const transformFunc = getTransformFromProjections(projection1, projection2);
    return transformFunc === cloneTransform && equalUnits;
}


/**
 * Searches in the list of transform functions for the function for converting
 * coordinates from the source projection to the destination projection.
 *
 * @param sourceProjection Source `Projection` object.
 * @param destinationProjection Destination `Projection` object.
 * @return Transform function.
 */
export function getTransformFromProjections(
    sourceProjection: Projection,
    destinationProjection: Projection,
): TransformFunction {
    const sourceCode = sourceProjection.getCode();
    const destinationCode = destinationProjection.getCode();
    let transformFunc = getTransformFunc(sourceCode, destinationCode);
    if (!transformFunc) {
        transformFunc = identityTransform;
    }
    return transformFunc;
}


/**
 * Given the projection-like objects, searches for a transformation
 * function to convert a coordinates array from the source projection to the
 * destination projection.
 *
 * @param source Source.
 * @param destination Destination.
 * @return Transform function.
 * @api
 */
export function getTransform(
    source: ProjectionLike, destination: ProjectionLike
): TransformFunction {
    const sourceProjection = get(source);
    const destinationProjection = get(destination);
    assert(
        sourceProjection && destinationProjection,
        "getTransform failed to resolve source or destination projection"
    );
    return getTransformFromProjections(
        sourceProjection!, destinationProjection!
    );
}


/**
 * Transforms a coordinate from source projection to destination projection.
 * This returns a new coordinate (and does not modify the original).
 *
 * See {@link transformExtent} for extent transformation. See the transform
 * method of {@link Geometry~Geometry} and its subclasses for geometry
 * transforms.
 *
 * @param coordinate Coordinate.
 * @param source Source projection-like.
 * @param destination Destination projection-like.
 * @return Coordinate.
 * @api
 */
export function transform(
    coordinate: Coordinate, source: ProjectionLike, destination: ProjectionLike
): Coordinate {
    const transformFunc = getTransform(source, destination);
    return transformFunc(coordinate, undefined, coordinate.length);
}


/**
 * Transforms an extent from source projection to destination projection.
 *
 * This returns a new extent (and does not modify the original).
 *
 * @param extent The extent to transform.
 * @param source Source projection-like.
 * @param destination Destination projection-like.
 * @param stops Number of stops per side used for the transform.
 *      By default only the corners are used.
 * @return The transformed extent.
 * @api
 */
export function transformExtent(
    extent: Extent, source: ProjectionLike,
    destination: ProjectionLike, stops?: number
): Extent {
    const transformFunc = getTransform(source, destination);
    return applyTransform(extent, transformFunc, undefined, stops);
}


/**
 * Transforms the given point to the destination projection.
 *
 * @param point Point.
 * @param sourceProjection Source projection.
 * @param destinationProjection Destination projection.
 * @return Point.
 */
export function transformWithProjections(
    point: Coordinate,
    sourceProjection: Projection,
    destinationProjection: Projection,
): Coordinate {
    const transformFunc = getTransformFromProjections(
        sourceProjection,
        destinationProjection,
    );
    return transformFunc(point);
}


let userProjection: Projection | null = null;


/**
 * Set the projection for coordinates supplied from and returned by API methods.
 *
 * This includes all API methods except for those interacting with tile grids,
 * plus {@link FrameState} and {@link ViewState}.
 *
 * @param projection The user projection.
 * @api
 */
export function setUserProjection(projection: ProjectionLike) {
    userProjection = get(projection);
}


/**
 * Clear the user projection if set.
 *
 * @api
 */
export function clearUserProjection() {
    userProjection = null;
}


/**
 * Get the projection for coordinates supplied from and returned by API methods.
 *
 * @return The user projection (or null if not set).
 * @api
 */
export function getUserProjection(): Projection | null {
    return userProjection;
}


/**
 * Use geographic coordinates (WGS-84 datum) in API methods.
 *
 * This includes all API methods except for those interacting with tile grids,
 * plus {@link FrameState} and {@link ViewState}.
 *
 * @api
 */
export function useGeographic() {
    setUserProjection('EPSG:4326');
}


/**
 * Return a coordinate transformed into the user projection.
 *
 * If no user projection is set, the original coordinate is returned.
 *
 * @param coordinate Input coordinate.
 * @param sourceProjection The input coordinate projection.
 * @return The input coordinate in the user projection.
 */
export function toUserCoordinate(
    coordinate: number[], sourceProjection: ProjectionLike
): number[] {
    if (!userProjection) {
        return coordinate;
    }
    return transform(coordinate, sourceProjection, userProjection);
}


/**
 * Return a coordinate transformed from the user projection.
 *
 * If no user projection is set, the original coordinate is returned.
 *
 * @param coordinate Input coordinate.
 * @param destProjection The destination projection.
 * @return The input coordinate transformed.
 */
export function fromUserCoordinate(
    coordinate: number[], destProjection: ProjectionLike
): number[] {
    if (!userProjection) {
        if (
            showCoordinateWarning &&
            !equals(coordinate, [0, 0]) &&
            coordinate[0] >= -180 &&
            coordinate[0] <= 180 &&
            coordinate[1] >= -90 &&
            coordinate[1] <= 90
        ) {
            showCoordinateWarning = false;
            warn(
                'Call useGeographic() from ol/proj once to work with ' +
                '[longitude, latitude] coordinates.',
            );
        }
        return coordinate;
    }
    return transform(coordinate, userProjection, destProjection);
}


/**
 * Return an extent transformed into the user projection.
 *
 * If no user projection is set, the original extent is returned.
 *
 * @param extent Input extent.
 * @param sourceProjection The input extent projection.
 * @return The input extent in the user projection.
 */
export function toUserExtent(
    extent: Extent, sourceProjection: ProjectionLike
): Extent {
    if (!userProjection) {
        return extent;
    }
    return transformExtent(extent, sourceProjection, userProjection);
}


/**
 * Return an extent transformed from the user projection.
 *
 * If no user projection is set, the original extent is returned.
 *
 * @param extent Input extent.
 * @param destProjection The destination projection.
 * @return The input extent transformed.
 */
export function fromUserExtent(
    extent: Extent, destProjection: ProjectionLike
): Extent {
    if (!userProjection) {
        return extent;
    }
    return transformExtent(extent, userProjection, destProjection);
}


/**
 * Return the resolution in user projection units per pixel.
 *
 * If no user projection is set, or source or user projection are missing units,
 * the original resolution is returned.
 *
 * @param resolution Resolution in input projection units per pixel.
 * @param sourceProjection The input projection.
 * @return Resolution in user projection units per pixel.
 */
export function toUserResolution(
    resolution: number, sourceProjection: ProjectionLike
): number {
    if (!userProjection) {
        return resolution;
    }
    const resolved = get(sourceProjection);
    assert(resolved, "toUserResolution failed to resolve source projection");
    const sourceMetersPerUnit = resolved!.getMetersPerUnit();
    const userMetersPerUnit = userProjection.getMetersPerUnit();
    return sourceMetersPerUnit && userMetersPerUnit
        ? (resolution * sourceMetersPerUnit) / userMetersPerUnit
        : resolution;
}


/**
 * Return the resolution in user projection units per pixel. If no user projection
 * is set, or source or user projection are missing units, the original resolution
 * is returned.
 * @param resolution Resolution in user projection units per pixel.
 * @param destProjection The destination projection.
 * @return Resolution in destination projection units per pixel.
 */
export function fromUserResolution(
    resolution: number, destProjection: ProjectionLike
): number {
    if (!userProjection) {
        return resolution;
    }
    const resolved = get(destProjection);
    assert(resolved, "toUserResolution failed to resolve source projection");

    const destMetersPerUnit = resolved!.getMetersPerUnit();
    const userMetersPerUnit = userProjection.getMetersPerUnit();
    return destMetersPerUnit && userMetersPerUnit
        ? (resolution * userMetersPerUnit) / destMetersPerUnit
        : resolution;
}


/**
 * Creates a safe coordinate transform function from a coordinate transform
 * function.
 *
 * "Safe" means that it can handle wrapping of x-coordinates for global
 * projections, and that coordinates exceeding the source projection validity
 * extent's range will be clamped to the validity range.
 *
 * @param sourceProj Source projection.
 * @param destProj Destination projection.
 * @param transform Transform function (source to destination).
 * @return Safe transform function (source to destination).
 */
export function createSafeCoordinateTransform(
    sourceProj: Projection, destProj: Projection,
    transform: CoordTransform
): CoordTransform {
    return function (coord) {
        let transformed, worldsAway;
        if (sourceProj.canWrapX()) {
            const sourceExtent = sourceProj.getExtent();
            assert(sourceExtent, "sourceProj must have an extent");
            const sourceExtentWidth = getWidth(sourceExtent!);
            coord = coord.slice(0);
            worldsAway = getWorldsAway(coord, sourceProj, sourceExtentWidth);
            if (worldsAway) {
                // Move x to the real world
                coord[0] = coord[0] - worldsAway * sourceExtentWidth;
            }
            coord[0] = clamp(coord[0], sourceExtent![0], sourceExtent![2]);
            coord[1] = clamp(coord[1], sourceExtent![1], sourceExtent![3]);
            transformed = transform(coord);
        } else {
            transformed = transform(coord);
        }
        if (worldsAway && destProj.canWrapX()) {
            // Move transformed coordinate back to the offset world
            const destExtent = destProj.getExtent();
            assert(destExtent, "destProj must have an extent");
            transformed[0] += worldsAway * getWidth(destExtent!);
        }
        return transformed;
    };
}


/**
 * Add transforms to and from EPSG:4326 and EPSG:3857.
 *
 * This function is called by when this module is executed and should only need
 * to be called again after `clearAllProjections()` is called (e.g. in tests).
 */
export function addCommon() {
    // Add transformations that don't alter coordinates to convert within set of
    // projections with equal meaning.
    addEquivalentProjections(EPSG3857_PROJECTIONS);
    addEquivalentProjections(EPSG4326_PROJECTIONS);
    // Add transformations to convert EPSG:4326 like coordinates to EPSG:3857 like
    // coordinates and back.
    addEquivalentTransforms(
        EPSG4326_PROJECTIONS,
        EPSG3857_PROJECTIONS,
        fromEPSG4326,
        toEPSG4326,
    );
}


addCommon();
