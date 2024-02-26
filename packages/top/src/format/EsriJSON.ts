
import Feature from '../Feature';
import JSONFeature from './JSONFeature';
import { LineString } from '@olts/geometry';
import { LinearRing } from '@olts/geometry';
import { MultiLineString } from '@olts/geometry';
import { MultiPoint } from '@olts/geometry';
import { MultiPolygon } from '@olts/geometry';
import { Point } from '@olts/geometry';
import { Polygon } from '@olts/geometry';
import {containsExtent} from '@olts/core/extent';
import {deflateCoordinates} from '@olts/geometry/flat';
import {get as getProjection} from '../proj';
import {isEmpty} from '../obj';
import {linearRingIsClockwise} from '@olts/geometry/flat';
import {transformGeometryWithOptions} from './Feature';

/**
 * @typedef {import("arcgis-rest-api").Feature} EsriJSONFeature
 * @typedef {import("arcgis-rest-api").FeatureSet} EsriJSONFeatureSet
 * @typedef {import("arcgis-rest-api").Geometry} EsriJSONGeometry
 * @typedef {import("arcgis-rest-api").Point} EsriJSONPoint
 * @typedef {import("arcgis-rest-api").Polyline} EsriJSONPolyline
 * @typedef {import("arcgis-rest-api").Polygon} EsriJSONPolygon
 * @typedef {import("arcgis-rest-api").Multipoint} EsriJSONMultipoint
 * @typedef {import("arcgis-rest-api").HasZM} EsriJSONHasZM
 * @typedef {import("arcgis-rest-api").Position} EsriJSONPosition
 * @typedef {import("arcgis-rest-api").SpatialReferenceWkid} EsriJSONSpatialReferenceWkid
 */

/**
 * @typedef {Object} EsriJSONMultiPolygon
 * @property {Array<Array<Array<number[]>>>} rings Rings for the MultiPolygon.
 * @property {boolean} [hasM] If the polygon coordinates have an M value.
 * @property {boolean} [hasZ] If the polygon coordinates have a Z value.
 * @property {EsriJSONSpatialReferenceWkid} [spatialReference] The coordinate reference system.
 */

/**
 * @const
 * @type {Record<GeometryType, function(EsriJSONGeometry): Geometry>}
 */
const GEOMETRY_READERS = {
  Point: readPointGeometry,
  LineString: readLineStringGeometry,
  Polygon: readPolygonGeometry,
  MultiPoint: readMultiPointGeometry,
  MultiLineString: readMultiLineStringGeometry,
  MultiPolygon: readMultiPolygonGeometry,
};

/**
 * @const
 * @type {Record<GeometryType, function(Geometry, import("./Feature").WriteOptions=): (EsriJSONGeometry)>}
 */
const GEOMETRY_WRITERS = {
  Point: writePointGeometry,
  LineString: writeLineStringGeometry,
  Polygon: writePolygonGeometry,
  MultiPoint: writeMultiPointGeometry,
  MultiLineString: writeMultiLineStringGeometry,
  MultiPolygon: writeMultiPolygonGeometry,
};

/**
 * @typedef {Object} Options
 * @property {string} [geometryName] Geometry name to use when creating features.
 */

/**
 * Feature format for reading and writing data in the EsriJSON format.
 *
 * @api
 */
export class EsriJSON extends JSONFeature {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};

    super();

    /**
     * Name of the geometry attribute for features.
     * @type {string|undefined}
     * @private
     */
    this.geometryName_ = options.geometryName;
  }

  /**
   * @param {Object} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @param {string} [idField] Name of the field where to get the id from.
   * @protected
   * @return {import("../Feature").default} Feature.
   */
  readFeatureFromObject(object, options, idField) {
    const esriJSONFeature = /** @type {EsriJSONFeature} */ (object);
    const geometry = readGeometry(esriJSONFeature.geometry, options);
    const feature = new Feature();
    if (this.geometryName_) {
      feature.setGeometryName(this.geometryName_);
    }
    feature.setGeometry(geometry);
    if (esriJSONFeature.attributes) {
      feature.setProperties(esriJSONFeature.attributes, true);
      const id = esriJSONFeature.attributes[idField];
      if (id !== undefined) {
        feature.setId(/** @type {number} */ (id));
      }
    }
    return feature;
  }

  /**
   * @param {Object} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Array<Feature>} Features.
   */
  readFeaturesFromObject(object, options) {
    options = options ? options : {};
    if (object['features']) {
      const esriJSONFeatureSet = /** @type {EsriJSONFeatureSet} */ (object);
      /** @type {Array<import("../Feature").default>} */
      const features = [];
      const esriJSONFeatures = esriJSONFeatureSet.features;
      for (let i = 0, ii = esriJSONFeatures.length; i < ii; ++i) {
        features.push(
          this.readFeatureFromObject(
            esriJSONFeatures[i],
            options,
            object.objectIdFieldName,
          ),
        );
      }
      return features;
    }
    return [this.readFeatureFromObject(object, options)];
  }

  /**
   * @param {EsriJSONGeometry} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Geometry} Geometry.
   */
  readGeometryFromObject(object, options) {
    return readGeometry(object, options);
  }

  /**
   * @param {Object} object Object.
   * @protected
   * @return {import("../proj/Projection").default} Projection.
   */
  readProjectionFromObject(object) {
    if (
      object['spatialReference'] &&
      object['spatialReference']['wkid'] !== undefined
    ) {
      const spatialReference = /** @type {EsriJSONSpatialReferenceWkid} */ (
        object['spatialReference']
      );
      const crs = spatialReference.wkid;
      return getProjection('EPSG:' + crs);
    }
    return null;
  }

  /**
   * Encode a geometry as a EsriJSON object.
   *
   * @param {Geometry} geometry Geometry.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {EsriJSONGeometry} Object.
   * @api
   */
  writeGeometryObject(geometry, options) {
    return writeGeometry(geometry, this.adaptOptions(options));
  }

  /**
   * Encode a feature as a esriJSON Feature object.
   *
   * @param {import("../Feature").default} feature Feature.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {Object} Object.
   * @api
   */
  writeFeatureObject(feature, options) {
    options = this.adaptOptions(options);
    const object = {};
    if (!feature.hasProperties()) {
      object['attributes'] = {};
      return object;
    }
    const properties = feature.getProperties();
    const geometry = feature.getGeometry();
    if (geometry) {
      object['geometry'] = writeGeometry(geometry, options);
      const projection =
        options && (options.dataProjection || options.featureProjection);
      if (projection) {
        object['geometry']['spatialReference'] =
          /** @type {EsriJSONSpatialReferenceWkid} */ ({
            wkid: Number(getProjection(projection).getCode().split(':').pop()),
          });
      }
      delete properties[feature.getGeometryName()];
    }
    if (!isEmpty(properties)) {
      object['attributes'] = properties;
    } else {
      object['attributes'] = {};
    }
    return object;
  }

  /**
   * Encode an array of features as a EsriJSON object.
   *
   * @param {Array<import("../Feature").default>} features Features.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {EsriJSONFeatureSet} EsriJSON Object.
   * @api
   */
  writeFeaturesObject(features, options) {
    options = this.adaptOptions(options);
    const objects = [];
    for (let i = 0, ii = features.length; i < ii; ++i) {
      objects.push(this.writeFeatureObject(features[i], options));
    }
    return {
      'features': objects,
    };
  }
}

/**
 * @param {EsriJSONGeometry} object Object.
 * @param {import("./Feature").ReadOptions} [options] Read options.
 * @return {Geometry} Geometry.
 */
function readGeometry(object, options) {
  if (!object) {
    return null;
  }
  /** @type {GeometryType} */
  let type;
  if (typeof object['x'] === 'number' && typeof object['y'] === 'number') {
    type = 'Point';
  } else if (object['points']) {
    type = 'MultiPoint';
  } else if (object['paths']) {
    const esriJSONPolyline = /** @type {EsriJSONPolyline} */ (object);
    if (esriJSONPolyline.paths.length === 1) {
      type = 'LineString';
    } else {
      type = 'MultiLineString';
    }
  } else if (object['rings']) {
    const esriJSONPolygon = /** @type {EsriJSONPolygon} */ (object);
    const layout = getGeometryLayout(esriJSONPolygon);
    const rings = convertRings(esriJSONPolygon.rings, layout);
    if (rings.length === 1) {
      type = 'Polygon';
      object = Object.assign({}, object, {['rings']: rings[0]});
    } else {
      type = 'MultiPolygon';
      object = Object.assign({}, object, {['rings']: rings});
    }
  }
  const geometryReader = GEOMETRY_READERS[type];
  return transformGeometryWithOptions(geometryReader(object), false, options);
}

/**
 * Determines inner and outer rings.
 * Checks if any polygons in this array contain any other polygons in this
 * array. It is used for checking for holes.
 * Logic inspired by: https://github.com/Esri/terraformer-arcgis-parser
 * @param {Array<!Array<!number[]>>} rings Rings.
 * @param {GeometryLayout} layout Geometry layout.
 * @return {Array<!Array<!Array<!number[]>>>} Transformed rings.
 */
function convertRings(rings, layout) {
  const flatRing = [];
  const outerRings = [];
  const holes = [];
  let i, ii;
  for (i = 0, ii = rings.length; i < ii; ++i) {
    flatRing.length = 0;
    deflateCoordinates(flatRing, 0, rings[i], layout.length);
    // is this ring an outer ring? is it clockwise?
    const clockwise = linearRingIsClockwise(
      flatRing,
      0,
      flatRing.length,
      layout.length,
    );
    if (clockwise) {
      outerRings.push([rings[i]]);
    } else {
      holes.push(rings[i]);
    }
  }
  while (holes.length) {
    const hole = holes.shift();
    let matched = false;
    // loop over all outer rings and see if they contain our hole.
    for (i = outerRings.length - 1; i >= 0; i--) {
      const outerRing = outerRings[i][0];
      const containsHole = containsExtent(
        new LinearRing(outerRing).getExtent(),
        new LinearRing(hole).getExtent(),
      );
      if (containsHole) {
        // the hole is contained push it into our polygon
        outerRings[i].push(hole);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // no outer rings contain this hole turn it into and outer
      // ring (reverse it)
      outerRings.push([hole.reverse()]);
    }
  }
  return outerRings;
}

/**
 * @param {EsriJSONPoint} object Object.
 * @return {Geometry} Point.
 */
function readPointGeometry(object) {
  let point;
  if (object.m !== undefined && object.z !== undefined) {
    point = new Point([object.x, object.y, object.z, object.m], 'XYZM');
  } else if (object.z !== undefined) {
    point = new Point([object.x, object.y, object.z], 'XYZ');
  } else if (object.m !== undefined) {
    point = new Point([object.x, object.y, object.m], 'XYM');
  } else {
    point = new Point([object.x, object.y]);
  }
  return point;
}

/**
 * @param {EsriJSONPolyline} object Object.
 * @return {Geometry} LineString.
 */
function readLineStringGeometry(object) {
  const layout = getGeometryLayout(object);
  return new LineString(object.paths[0], layout);
}

/**
 * @param {EsriJSONPolyline} object Object.
 * @return {Geometry} MultiLineString.
 */
function readMultiLineStringGeometry(object) {
  const layout = getGeometryLayout(object);
  return new MultiLineString(object.paths, layout);
}

/**
 * @param {EsriJSONHasZM} object Object.
 * @return {GeometryLayout} The geometry layout to use.
 */
function getGeometryLayout(object) {
  /** @type {GeometryLayout} */
  let layout = 'XY';
  if (object.hasZ === true && object.hasM === true) {
    layout = 'XYZM';
  } else if (object.hasZ === true) {
    layout = 'XYZ';
  } else if (object.hasM === true) {
    layout = 'XYM';
  }
  return layout;
}

/**
 * @param {EsriJSONMultipoint} object Object.
 * @return {Geometry} MultiPoint.
 */
function readMultiPointGeometry(object) {
  const layout = getGeometryLayout(object);
  return new MultiPoint(object.points, layout);
}

/**
 * @param {EsriJSONMultiPolygon} object Object.
 * @return {Geometry} MultiPolygon.
 */
function readMultiPolygonGeometry(object) {
  const layout = getGeometryLayout(object);
  return new MultiPolygon(object.rings, layout);
}

/**
 * @param {EsriJSONPolygon} object Object.
 * @return {Geometry} Polygon.
 */
function readPolygonGeometry(object) {
  const layout = getGeometryLayout(object);
  return new Polygon(object.rings, layout);
}

/**
 * @param {Point} geometry Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONPoint} EsriJSON geometry.
 */
function writePointGeometry(geometry, options) {
  const coordinates = geometry.getCoordinates();
  /** @type {EsriJSONPoint} */
  let esriJSON;
  const layout = geometry.getLayout();
  if (layout === 'XYZ') {
    esriJSON = {
      x: coordinates[0],
      y: coordinates[1],
      z: coordinates[2],
    };
  } else if (layout === 'XYM') {
    esriJSON = {
      x: coordinates[0],
      y: coordinates[1],
      m: coordinates[2],
    };
  } else if (layout === 'XYZM') {
    esriJSON = {
      x: coordinates[0],
      y: coordinates[1],
      z: coordinates[2],
      m: coordinates[3],
    };
  } else if (layout === 'XY') {
    esriJSON = {
      x: coordinates[0],
      y: coordinates[1],
    };
  } else {
    throw new Error('Invalid geometry layout');
  }
  return esriJSON;
}

/**
 * @param {SimpleGeometry} geometry Geometry.
 * @return {Object} Object with boolean hasZ and hasM keys.
 */
function getHasZM(geometry) {
  const layout = geometry.getLayout();
  return {
    hasZ: layout === 'XYZ' || layout === 'XYZM',
    hasM: layout === 'XYM' || layout === 'XYZM',
  };
}

/**
 * @param {LineString} lineString Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONPolyline} EsriJSON geometry.
 */
function writeLineStringGeometry(lineString, options) {
  const hasZM = getHasZM(lineString);
  return {
    hasZ: hasZM.hasZ,
    hasM: hasZM.hasM,
    paths: [
      /** @type {Array<EsriJSONPosition>} */ (lineString.getCoordinates()),
    ],
  };
}

/**
 * @param {Polygon} polygon Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONPolygon} EsriJSON geometry.
 */
function writePolygonGeometry(polygon, options) {
  // Esri geometries use the left-hand rule
  const hasZM = getHasZM(polygon);
  return {
    hasZ: hasZM.hasZ,
    hasM: hasZM.hasM,
    rings: /** @type {Array<Array<EsriJSONPosition>>} */ (
      polygon.getCoordinates(false)
    ),
  };
}

/**
 * @param {MultiLineString} multiLineString Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONPolyline} EsriJSON geometry.
 */
function writeMultiLineStringGeometry(multiLineString, options) {
  const hasZM = getHasZM(multiLineString);
  return {
    hasZ: hasZM.hasZ,
    hasM: hasZM.hasM,
    paths: /** @type {Array<Array<EsriJSONPosition>>} */ (
      multiLineString.getCoordinates()
    ),
  };
}

/**
 * @param {MultiPoint} multiPoint Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONMultipoint} EsriJSON geometry.
 */
function writeMultiPointGeometry(multiPoint, options) {
  const hasZM = getHasZM(multiPoint);
  return {
    hasZ: hasZM.hasZ,
    hasM: hasZM.hasM,
    points: /** @type {Array<EsriJSONPosition>} */ (
      multiPoint.getCoordinates()
    ),
  };
}

/**
 * @param {MultiPolygon} geometry Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONPolygon} EsriJSON geometry.
 */
function writeMultiPolygonGeometry(geometry, options) {
  const hasZM = getHasZM(geometry);
  const coordinates = geometry.getCoordinates(false);
  const output = [];
  for (let i = 0; i < coordinates.length; i++) {
    for (let x = coordinates[i].length - 1; x >= 0; x--) {
      output.push(coordinates[i][x]);
    }
  }
  return {
    hasZ: hasZM.hasZ,
    hasM: hasZM.hasM,
    rings: /** @type {Array<Array<EsriJSONPosition>>} */ (output),
  };
}

/**
 * @param {Geometry} geometry Geometry.
 * @param {import("./Feature").WriteOptions} [options] Write options.
 * @return {EsriJSONGeometry} EsriJSON geometry.
 */
function writeGeometry(geometry, options) {
  const geometryWriter = GEOMETRY_WRITERS[geometry.getType()];
  return geometryWriter(
    transformGeometryWithOptions(geometry, true, options),
    options,
  );
}

export default EsriJSON;
