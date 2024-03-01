export { Circle, closestOnCircle } from './circle';

export { GeometryCollection } from './collection';

export type { GeometryLayout, Type as GeometryType } from './geometry';
export { Geometry } from './geometry';

export { LineString } from './line-string';

export { LinearRing } from './linear-ring';

export { MultiPoint } from './multi-point';

export { MultiPolygon } from './multi-polygon';

export { MultiLineString } from './multiline-string';

export { Point } from './point';

export {
    Polygon,
    fromCircle as polygonFromCircle,
    makeRegular,
    fromExtent as polygonFromExtent,
} from './polygon';

export { SimpleGeometry, transformGeom2D } from './simple-geometry';

export {
    getArea as getAreaOnSphere,
    getDistance as getDistanceOnSphere,
    getLength as getLengthOnSphere,
    offset as offsetOnSphere,
 } from './sphere';
