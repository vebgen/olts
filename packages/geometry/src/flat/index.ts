export {
    linearRing as areaLinearRing,
    linearRings as areaLinearRings,
    linearRingss as areaLinearRingss,
} from './area';

export {
    linearRingss as centerLinearRingss,
} from './center';


export {
    assignClosest,
    maxSquaredDelta,
    arrayMaxSquaredDelta,
    multiArrayMaxSquaredDelta,
    assignClosestPoint,
    assignClosestArrayPoint,
    assignClosestMultiArrayPoint,
} from './closest';


export {
    linearRingContainsExtent,
    linearRingContainsXY,
    linearRingsContainsXY,
    linearRingssContainsXY,
} from './contains';


export {
    deflateCoordinate,
    deflateCoordinates,
    deflateCoordinatesArray,
    deflateMultiCoordinatesArray,
} from './deflate';


export { flipXY } from './flip';


export {
    line as geodesicLine,
    greatCircleArc,
    meridian as geodesicMeridian,
    parallel as geodesicParallel,
} from './geodesic';


export {
    inflateCoordinates,
    inflateCoordinatesArray,
    inflateMultiCoordinatesArray,
} from './inflate';


export {
    getInteriorPointOfArray,
    getInteriorPointsOfMultiArray,
} from './interior-point';


export {
    interpolatePoint,
    lineStringCoordinateAtM,
    lineStringsCoordinateAtM,
} from './interpolate';


export {
    intersectsLineString,
    intersectsLineStringArray,
    intersectsLinearRing,
    intersectsLinearRingArray,
    intersectsLinearRingMultiArray,
} from './intersects-extent';


export {
    lineStringLength,
    linearRingLength,
} from './length';


export {
    lineChunk,
} from './line-chunk';


export {
    linearRingIsClockwise,
    linearRingsAreOriented,
    linearRingssAreOriented,
    orientLinearRings,
    orientLinearRingsArray,
    inflateEnds
} from './orient';


export { coordinates as reverseCoordinates } from './reverse';


export { forEach as forEachSegment } from './segments';


export {
    simplifyLineString,
    douglasPeucker,
    douglasPeuckerArray,
    douglasPeuckerMultiArray,
    radialDistance,
    snap,
    quantize,
    quantizeArray,
    quantizeMultiArray
} from './simplify';


export {
    matchingChunk,
} from './straight-chunk';


export {
    drawTextOnPath,
} from './textpath';


export {
    lineStringIsClosed
} from './topology';


export {
    transform2D,
    rotate,
    scale,
    translate,
} from '@olts/core/transform';
