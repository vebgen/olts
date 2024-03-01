
import Feature from '../Feature';
import RenderFeature from '../render/Feature';
import {
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from '../geom';
import {abstract} from '@olts/core/util';
import {
  equivalent as equivalentProjection,
  get as getProjection,
  getTransform,
  transformExtent,
} from '../proj';
import {
  linearRingsAreOriented,
  linearRingssAreOriented,
  orientLinearRings,
  orientLinearRingsArray,
} from '@olts/geometry/flat';

/**
 * @typedef {Object} ReadOptions
 * @property {ProjectionLike} [dataProjection] Projection of the data we are reading.
 * If not provided, the projection will be derived from the data (where possible) or
 * the `dataProjection` of the format is assigned (where set). If the projection
 * can not be derived from the data and if no `dataProjection` is set for a format,
 * the features will not be reprojected.
 * @property {Extent} [extent] Tile extent in map units of the tile being read.
 * This is only required when reading data with tile pixels as geometry units. When configured,
 * a `dataProjection` with `TILE_PIXELS` as `units` and the tile's pixel extent as `extent` needs to be
 * provided.
 * @property {ProjectionLike} [featureProjection] Projection of the feature geometries
 * created by the format reader. If not provided, features will be returned in the
 * `dataProjection`.
 */

/**
 * @typedef {Object} WriteOptions
 * @property {ProjectionLike} [dataProjection] Projection of the data we are writing.
 * If not provided, the `dataProjection` of the format is assigned (where set).
 * If no `dataProjection` is set for a format, the features will be returned
 * in the `featureProjection`.
 * @property {ProjectionLike} [featureProjection] Projection of the feature geometries
 * that will be serialized by the format writer. If not provided, geometries are assumed
 * to be in the `dataProjection` if that is set; in other words, they are not transformed.
 * @property {boolean} [rightHanded] When writing geometries, follow the right-hand
 * rule for linear ring orientation.  This means that polygons will have counter-clockwise
 * exterior rings and clockwise interior rings.  By default, coordinates are serialized
 * as they are provided at construction.  If `true`, the right-hand rule will
 * be applied.  If `false`, the left-hand rule will be applied (clockwise for
 * exterior and counter-clockwise for interior rings).  Note that not all
 * formats support this.  The GeoJSON format does use this property when writing
 * geometries.
 * @property [decimals] Maximum number of decimal places for coordinates.
 * Coordinates are stored internally as floats, but floating-point arithmetic can create
 * coordinates with a large number of decimal places, not generally wanted on output.
 * Set a number here to round coordinates. Can also be used to ensure that
 * coordinates read in can be written back out with the same number of decimals.
 * Default is no rounding.
 */

/**
 * @typedef {'arraybuffer' | 'json' | 'text' | 'xml'} Type
 */

/**
 * @typedef {Object} SimpleGeometryObject
 * @property {GeometryType} type Type.
 * @property {number[]} flatCoordinates Flat coordinates.
 * @property {number[]|Array<number[]>} [ends] Ends or endss.
 * @property {import('@olts/geometry').GeometryLayout} [layout] Layout.
 */

/**
 * @typedef {GeometryObject[]} GeometryCollectionObject
 */

/**
 * @typedef {SimpleGeometryObject|GeometryCollectionObject} GeometryObject
 */

/**
 * @typedef {Object} FeatureObject
 * @property {string|number} [id] Id.
 * @property {GeometryObject} [geometry] Geometry.
 * @property {Record<string, *>} [properties] Properties.
 */

/***
 * @template {import("../Feature").FeatureLike} T
 * @typedef {T extends import("../render/Feature").default ? typeof import("../render/Feature").default : typeof import("../Feature").default} FeatureToFeatureClass<T>
 */

/***
 * @template {import("../Feature").FeatureClass} T
 * @typedef {T[keyof T] extends import("../render/Feature").default ? import("../render/Feature").default : import("../Feature").default} FeatureClassToFeature<T>
 */

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for feature formats.
 * {@link module:ol/format/Feature~FeatureFormat} subclasses provide the ability to decode and encode
 * {@link module:ol/Feature~Feature} objects from a variety of commonly used geospatial
 * file formats.  See the documentation for each format for more details.
 *
 * @template {import('../Feature').FeatureClass} [T=typeof import('../Feature').default]
 * @abstract
 * @api
 */
export class FeatureFormat {
  constructor() {
    /**
     * @protected
     * @type {import("../proj/Projection").default|undefined}
     */
    this.dataProjection = undefined;

    /**
     * @protected
     * @type {import("../proj/Projection").default|undefined}
     */
    this.defaultFeatureProjection = undefined;

    /**
     * @protected
     * @type {import("../Feature").FeatureClass}
     */
    this.featureClass = Feature;

    /**
     * A list media types supported by the format in descending order of preference.
     * @type {string[]}
     */
    this.supportedMediaTypes = null;
  }

  /**
   * Adds the data projection to the read options.
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Options.
   * @return {ReadOptions|undefined} Options.
   * @protected
   */
  getReadOptions(source, options) {
    if (options) {
      let dataProjection = options.dataProjection
        ? getProjection(options.dataProjection)
        : this.readProjection(source);
      if (
        options.extent &&
        dataProjection &&
        dataProjection.getUnits() === 'tile-pixels'
      ) {
        dataProjection = getProjection(dataProjection);
        dataProjection.setWorldExtent(options.extent);
      }
      options = {
        dataProjection: dataProjection,
        featureProjection: options.featureProjection,
      };
    }
    return this.adaptOptions(options);
  }

  /**
   * Sets the `dataProjection` on the options, if no `dataProjection`
   * is set.
   * @param {WriteOptions|ReadOptions|undefined} options
   *     Options.
   * @protected
   * @return {WriteOptions|ReadOptions|undefined}
   *     Updated options.
   */
  adaptOptions(options) {
    return Object.assign(
      {
        dataProjection: this.dataProjection,
        featureProjection: this.defaultFeatureProjection,
        featureClass: this.featureClass,
      },
      options,
    );
  }

  /**
   * @abstract
   * @return {Type} The format type.
   */
  getType() {
    return abstract();
  }

  /**
   * Read a single feature from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {import("../Feature").FeatureLike|Array<import("../render/Feature").default>} Feature.
   */
  readFeature(source, options) {
    return abstract();
  }

  /**
   * Read all features from a source.
   *
   * @abstract
   * @param {Document|Element|ArrayBuffer|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {Array<import('../Feature').FeatureLike|FeatureClassToFeature<T>>} Features.
   */
  readFeatures(source, options) {
    return abstract();
  }

  /**
   * Read a single geometry from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {Geometry} Geometry.
   */
  readGeometry(source, options) {
    return abstract();
  }

  /**
   * Read the projection from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @return {import("../proj/Projection").default|undefined} Projection.
   */
  readProjection(source) {
    return abstract();
  }

  /**
   * Encode a feature in this format.
   *
   * @abstract
   * @param {import("../Feature").default} feature Feature.
   * @param {WriteOptions} [options] Write options.
   * @return {string|ArrayBuffer} Result.
   */
  writeFeature(feature, options) {
    return abstract();
  }

  /**
   * Encode an array of features in this format.
   *
   * @abstract
   * @param {Array<import("../Feature").default>} features Features.
   * @param {WriteOptions} [options] Write options.
   * @return {string|ArrayBuffer} Result.
   */
  writeFeatures(features, options) {
    return abstract();
  }

  /**
   * Write a single geometry in this format.
   *
   * @abstract
   * @param {Geometry} geometry Geometry.
   * @param {WriteOptions} [options] Write options.
   * @return {string|ArrayBuffer} Result.
   */
  writeGeometry(geometry, options) {
    return abstract();
  }
}

export default FeatureFormat;

/**
 * @template {Geometry|RenderFeature} T
 * @param {T} geometry Geometry.
 * @param {boolean} write Set to true for writing, false for reading.
 * @param {WriteOptions|ReadOptions} [options] Options.
 * @return {T} Transformed geometry.
 */
export function transformGeometryWithOptions(geometry, write, options) {
  const featureProjection = options
    ? getProjection(options.featureProjection)
    : null;
  const dataProjection = options ? getProjection(options.dataProjection) : null;

  let transformed = geometry;
  if (
    featureProjection &&
    dataProjection &&
    !equivalentProjection(featureProjection, dataProjection)
  ) {
    if (write) {
      transformed = /** @type {T} */ (geometry.clone());
    }
    const fromProjection = write ? featureProjection : dataProjection;
    const toProjection = write ? dataProjection : featureProjection;
    if (fromProjection.getUnits() === 'tile-pixels') {
      transformed.transform(fromProjection, toProjection);
    } else {
      transformed.applyTransform(getTransform(fromProjection, toProjection));
    }
  }
  if (
    write &&
    options &&
    /** @type {WriteOptions} */ (options).decimals !== undefined
  ) {
    const power = Math.pow(10, /** @type {WriteOptions} */ (options).decimals);
    // if decimals option on write, round each coordinate appropriately
    /**
     * @param {number[]} coordinates Coordinates.
     * @return {number[]} Transformed coordinates.
     */
    const transform = function (coordinates) {
      for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        coordinates[i] = Math.round(coordinates[i] * power) / power;
      }
      return coordinates;
    };
    if (transformed === geometry) {
      transformed = /** @type {T} */ (geometry.clone());
    }
    transformed.applyTransform(transform);
  }
  return transformed;
}

/**
 * @param {Extent} extent Extent.
 * @param {ReadOptions} [options] Read options.
 * @return {Extent} Transformed extent.
 */
export function transformExtentWithOptions(extent, options) {
  const featureProjection = options
    ? getProjection(options.featureProjection)
    : null;
  const dataProjection = options ? getProjection(options.dataProjection) : null;

  if (
    featureProjection &&
    dataProjection &&
    !equivalentProjection(featureProjection, dataProjection)
  ) {
    return transformExtent(extent, dataProjection, featureProjection);
  }
  return extent;
}

const GeometryConstructor = {
  Point: Point,
  LineString: LineString,
  Polygon: Polygon,
  MultiPoint: MultiPoint,
  MultiLineString: MultiLineString,
  MultiPolygon: MultiPolygon,
};

function orientFlatCoordinates(flatCoordinates, ends, stride) {
  if (Array.isArray(ends[0])) {
    // MultiPolagon
    if (!linearRingssAreOriented(flatCoordinates, 0, ends, stride)) {
      flatCoordinates = flatCoordinates.slice();
      orientLinearRingsArray(flatCoordinates, 0, ends, stride);
    }
    return flatCoordinates;
  }
  if (!linearRingsAreOriented(flatCoordinates, 0, ends, stride)) {
    flatCoordinates = flatCoordinates.slice();
    orientLinearRings(flatCoordinates, 0, ends, stride);
  }
  return flatCoordinates;
}

/**
 * @param {FeatureObject} object Feature object.
 * @param {WriteOptions|ReadOptions} [options] Options.
 * @return {RenderFeature|RenderFeature[]} Render feature.
 */
export function createRenderFeature(object, options) {
  const geometry = object.geometry;
  if (!geometry) {
    return [];
  }
  if (Array.isArray(geometry)) {
    return geometry
      .map((geometry) => createRenderFeature({...object, geometry}))
      .flat();
  }

  const geometryType =
    geometry.type === 'MultiPolygon' ? 'Polygon' : geometry.type;
  if (geometryType === 'GeometryCollection' || geometryType === 'Circle') {
    throw new Error('Unsupported geometry type: ' + geometryType);
  }

  const stride = geometry.layout.length;
  return transformGeometryWithOptions(
    new RenderFeature(
      geometryType,
      geometryType === 'Polygon'
        ? orientFlatCoordinates(geometry.flatCoordinates, geometry.ends, stride)
        : geometry.flatCoordinates,
      geometry.ends?.flat(),
      stride,
      object.properties || {},
      object.id,
    ).enableSimplifyTransformed(),
    false,
    options,
  );
}

/**
 * @param {GeometryObject|null} object Geometry object.
 * @param {WriteOptions|ReadOptions} [options] Options.
 * @return {Geometry} Geometry.
 */
export function createGeometry(object, options) {
  if (!object) {
    return null;
  }
  if (Array.isArray(object)) {
    const geometries = object.map((geometry) =>
      createGeometry(geometry, options),
    );
    return new GeometryCollection(geometries);
  }
  const Geometry = GeometryConstructor[object.type];
  return transformGeometryWithOptions(
    new Geometry(object.flatCoordinates, object.layout, object.ends),
    false,
    options,
  );
}
