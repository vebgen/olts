
import Feature from '../Feature';
import JSONFeature from './JSONFeature';
import { LineString } from '@olts/geometry';
import { MultiLineString } from '@olts/geometry';
import { MultiPoint } from '@olts/geometry';
import { MultiPolygon } from '@olts/geometry';
import { Point } from '@olts/geometry';
import { Polygon } from '@olts/geometry';
import {get as getProjection} from '../proj';
import {transformGeometryWithOptions} from './Feature';

/**
 * @typedef {import("topojson-specification").Topology} TopoJSONTopology
 * @typedef {import("topojson-specification").GeometryCollection} TopoJSONGeometryCollection
 * @typedef {import("topojson-specification").GeometryObject} TopoJSONGeometry
 * @typedef {import("topojson-specification").Point} TopoJSONPoint
 * @typedef {import("topojson-specification").MultiPoint} TopoJSONMultiPoint
 * @typedef {import("topojson-specification").LineString} TopoJSONLineString
 * @typedef {import("topojson-specification").MultiLineString} TopoJSONMultiLineString
 * @typedef {import("topojson-specification").Polygon} TopoJSONPolygon
 * @typedef {import("topojson-specification").MultiPolygon} TopoJSONMultiPolygon
 */

/**
 * @typedef {Object} Options
 * @property {ProjectionLike} [dataProjection='EPSG:4326'] Default data projection.
 * @property [layerName] Set the name of the TopoJSON topology
 * `objects`'s children as feature property with the specified name. This means
 * that when set to `'layer'`, a topology like
 * ```
 * {
 *   "type": "Topology",
 *   "objects": {
 *     "example": {
 *       "type": "GeometryCollection",
 *       "geometries": []
 *     }
 *   }
 * }
 * ```
 * will result in features that have a property `'layer'` set to `'example'`.
 * When not set, no property will be added to features.
 * @property {string[]} [layers] Names of the TopoJSON topology's
 * `objects`'s children to read features from.  If not provided, features will
 * be read from all children.
 */

/**
 * Feature format for reading data in the TopoJSON format.
 *
 * @api
 */
export class TopoJSON extends JSONFeature {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    super();

    options = options ? options : {};

    /**
     * @private
     * @type {string|undefined}
     */
    this.layerName_ = options.layerName;

    /**
     * @private
     * @type {?string[]}
     */
    this.layers_ = options.layers ? options.layers : null;

    /**
     * @type {import("../proj/Projection").default}
     */
    this.dataProjection = getProjection(
      options.dataProjection ? options.dataProjection : 'EPSG:4326',
    );
  }

  /**
   * @param {Object} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Feature[]} Features.
   */
  readFeaturesFromObject(object, options) {
    if (object.type == 'Topology') {
      const topoJSONTopology = /** @type {TopoJSONTopology} */ (object);
      let transform,
        scale = null,
        translate = null;
      if (topoJSONTopology['transform']) {
        transform = topoJSONTopology['transform'];
        scale = transform['scale'];
        translate = transform['translate'];
      }
      const arcs = topoJSONTopology['arcs'];
      if (transform) {
        transformArcs(arcs, scale, translate);
      }
      /** @type {Feature[]} */
      const features = [];
      const topoJSONFeatures = topoJSONTopology['objects'];
      const property = this.layerName_;
      let feature;
      for (const objectName in topoJSONFeatures) {
        if (this.layers_ && !this.layers_.includes(objectName)) {
          continue;
        }
        if (topoJSONFeatures[objectName].type === 'GeometryCollection') {
          feature = /** @type {TopoJSONGeometryCollection} */ (
            topoJSONFeatures[objectName]
          );
          features.push.apply(
            features,
            readFeaturesFromGeometryCollection(
              feature,
              arcs,
              scale,
              translate,
              property,
              objectName,
              options,
            ),
          );
        } else {
          feature = /** @type {TopoJSONGeometry} */ (
            topoJSONFeatures[objectName]
          );
          features.push(
            readFeatureFromGeometry(
              feature,
              arcs,
              scale,
              translate,
              property,
              objectName,
              options,
            ),
          );
        }
      }
      return features;
    }
    return [];
  }

  /**
   * @param {Object} object Object.
   * @protected
   * @return {import("../proj/Projection").default} Projection.
   */
  readProjectionFromObject(object) {
    return this.dataProjection;
  }
}

/**
 * @const
 * @type {Record<string, function(TopoJSONGeometry, Array, ...Array=): Geometry>}
 */
const GEOMETRY_READERS = {
  'Point': readPointGeometry,
  'LineString': readLineStringGeometry,
  'Polygon': readPolygonGeometry,
  'MultiPoint': readMultiPointGeometry,
  'MultiLineString': readMultiLineStringGeometry,
  'MultiPolygon': readMultiPolygonGeometry,
};

/**
 * Concatenate arcs into a coordinate array.
 * @param {number[]} indices Indices of arcs to concatenate.  Negative
 *     values indicate arcs need to be reversed.
 * @param {Array<Coordinate[]>} arcs Array of arcs (already
 *     transformed).
 * @return {Coordinate[]} Coordinates array.
 */
function concatenateArcs(indices, arcs) {
  /** @type {Coordinate[]} */
  const coordinates = [];
  let index;
  for (let i = 0, ii = indices.length; i < ii; ++i) {
    index = indices[i];
    if (i > 0) {
      // splicing together arcs, discard last point
      coordinates.pop();
    }
    if (index >= 0) {
      // forward arc
      const arc = arcs[index];
      for (let j = 0, jj = arc.length; j < jj; ++j) {
        coordinates.push(arc[j].slice(0));
      }
    } else {
      // reverse arc
      const arc = arcs[~index];
      for (let j = arc.length - 1; j >= 0; --j) {
        coordinates.push(arc[j].slice(0));
      }
    }
  }
  return coordinates;
}

/**
 * Create a point from a TopoJSON geometry object.
 *
 * @param {TopoJSONPoint} object TopoJSON object.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 * @return {Point} Geometry.
 */
function readPointGeometry(object, scale, translate) {
  const coordinates = object['coordinates'];
  if (scale && translate) {
    transformVertex(coordinates, scale, translate);
  }
  return new Point(coordinates);
}

/**
 * Create a multi-point from a TopoJSON geometry object.
 *
 * @param {TopoJSONMultiPoint} object TopoJSON object.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 * @return {MultiPoint} Geometry.
 */
function readMultiPointGeometry(object, scale, translate) {
  const coordinates = object['coordinates'];
  if (scale && translate) {
    for (let i = 0, ii = coordinates.length; i < ii; ++i) {
      transformVertex(coordinates[i], scale, translate);
    }
  }
  return new MultiPoint(coordinates);
}

/**
 * Create a linestring from a TopoJSON geometry object.
 *
 * @param {TopoJSONLineString} object TopoJSON object.
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @return {LineString} Geometry.
 */
function readLineStringGeometry(object, arcs) {
  const coordinates = concatenateArcs(object['arcs'], arcs);
  return new LineString(coordinates);
}

/**
 * Create a multi-linestring from a TopoJSON geometry object.
 *
 * @param {TopoJSONMultiLineString} object TopoJSON object.
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @return {MultiLineString} Geometry.
 */
function readMultiLineStringGeometry(object, arcs) {
  const coordinates = [];
  for (let i = 0, ii = object['arcs'].length; i < ii; ++i) {
    coordinates[i] = concatenateArcs(object['arcs'][i], arcs);
  }
  return new MultiLineString(coordinates);
}

/**
 * Create a polygon from a TopoJSON geometry object.
 *
 * @param {TopoJSONPolygon} object TopoJSON object.
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @return {Polygon} Geometry.
 */
function readPolygonGeometry(object, arcs) {
  const coordinates = [];
  for (let i = 0, ii = object['arcs'].length; i < ii; ++i) {
    coordinates[i] = concatenateArcs(object['arcs'][i], arcs);
  }
  return new Polygon(coordinates);
}

/**
 * Create a multi-polygon from a TopoJSON geometry object.
 *
 * @param {TopoJSONMultiPolygon} object TopoJSON object.
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @return {MultiPolygon} Geometry.
 */
function readMultiPolygonGeometry(object, arcs) {
  const coordinates = [];
  for (let i = 0, ii = object['arcs'].length; i < ii; ++i) {
    // for each polygon
    const polyArray = object['arcs'][i];
    const ringCoords = [];
    for (let j = 0, jj = polyArray.length; j < jj; ++j) {
      // for each ring
      ringCoords[j] = concatenateArcs(polyArray[j], arcs);
    }
    coordinates[i] = ringCoords;
  }
  return new MultiPolygon(coordinates);
}

/**
 * Create features from a TopoJSON GeometryCollection object.
 *
 * @param {TopoJSONGeometryCollection} collection TopoJSON Geometry
 *     object.
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 * @param {string|undefined} property Property to set the `GeometryCollection`'s parent
 *     object to.
 * @param name Name of the `Topology`'s child object.
 * @param {import("./Feature").ReadOptions} [options] Read options.
 * @return {Feature[]} Array of features.
 */
function readFeaturesFromGeometryCollection(
  collection,
  arcs,
  scale,
  translate,
  property,
  name,
  options,
) {
  const geometries = collection['geometries'];
  const features = [];
  for (let i = 0, ii = geometries.length; i < ii; ++i) {
    features[i] = readFeatureFromGeometry(
      geometries[i],
      arcs,
      scale,
      translate,
      property,
      name,
      options,
    );
  }
  return features;
}

/**
 * Create a feature from a TopoJSON geometry object.
 *
 * @param {TopoJSONGeometry} object TopoJSON geometry object.
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 * @param {string|undefined} property Property to set the `GeometryCollection`'s parent
 *     object to.
 * @param name Name of the `Topology`'s child object.
 * @param {import("./Feature").ReadOptions} [options] Read options.
 * @return {Feature} Feature.
 */
function readFeatureFromGeometry(
  object,
  arcs,
  scale,
  translate,
  property,
  name,
  options,
) {
  let geometry = null;
  const type = object.type;
  if (type) {
    const geometryReader = GEOMETRY_READERS[type];
    if (type === 'Point' || type === 'MultiPoint') {
      geometry = geometryReader(object, scale, translate);
    } else {
      geometry = geometryReader(object, arcs);
    }
    geometry = transformGeometryWithOptions(geometry, false, options);
  }
  const feature = new Feature({geometry: geometry});
  if (object.id !== undefined) {
    feature.setId(object.id);
  }
  let properties = object.properties;
  if (property) {
    if (!properties) {
      properties = {};
    }
    properties[property] = name;
  }
  if (properties) {
    feature.setProperties(properties, true);
  }
  return feature;
}

/**
 * Apply a linear transform to array of arcs.  The provided array of arcs is
 * modified in place.
 *
 * @param {Array<Coordinate[]>} arcs Array of arcs.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 */
function transformArcs(arcs, scale, translate) {
  for (let i = 0, ii = arcs.length; i < ii; ++i) {
    transformArc(arcs[i], scale, translate);
  }
}

/**
 * Apply a linear transform to an arc.  The provided arc is modified in place.
 *
 * @param {Coordinate[]} arc Arc.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 */
function transformArc(arc, scale, translate) {
  let x = 0;
  let y = 0;
  for (let i = 0, ii = arc.length; i < ii; ++i) {
    const vertex = arc[i];
    x += vertex[0];
    y += vertex[1];
    vertex[0] = x;
    vertex[1] = y;
    transformVertex(vertex, scale, translate);
  }
}

/**
 * Apply a linear transform to a vertex.  The provided vertex is modified in
 * place.
 *
 * @param {Coordinate} vertex Vertex.
 * @param {number[]} scale Scale for each dimension.
 * @param {number[]} translate Translation for each dimension.
 */
function transformVertex(vertex, scale, translate) {
  vertex[0] = vertex[0] * scale[0] + translate[0];
  vertex[1] = vertex[1] * scale[1] + translate[1];
}

export default TopoJSON;
