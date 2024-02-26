
import FeatureFormat from './Feature';
import {abstract} from '@olts/core/util';

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for JSON feature formats.
 *
 * @template {import('../Feature').FeatureClass} [T=typeof import('../Feature').default]
 * @extends {FeatureFormat<T>}
 * @abstract
 */
export class JSONFeature extends FeatureFormat {
  constructor() {
    super();
  }

  /**
   * @return {import("./Feature").Type} Format.
   */
  getType() {
    return 'json';
  }

  /**
   * Read a feature.  Only works for a single feature. Use `readFeatures` to
   * read a feature collection.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @return {import('./Feature').FeatureClassToFeature<T>} Feature.
   * @api
   */
  readFeature(source, options) {
    return /** @type {import('./Feature').FeatureClassToFeature<T>} */ (
      this.readFeatureFromObject(
        getObject(source),
        this.getReadOptions(source, options),
      )
    );
  }

  /**
   * Read all features.  Works with both a single feature and a feature
   * collection.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @return {Array<import('./Feature').FeatureClassToFeature<T>>} Features.
   * @api
   */
  readFeatures(source, options) {
    return /** @type {Array<import('./Feature').FeatureClassToFeature<T>>} */ (
      this.readFeaturesFromObject(
        getObject(source),
        this.getReadOptions(source, options),
      )
    );
  }

  /**
   * @abstract
   * @param {Object} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {import("../Feature").default|import("../render/Feature").default|Array<import("../render/Feature").default>} Feature.
   */
  readFeatureFromObject(object, options) {
    return abstract();
  }

  /**
   * @abstract
   * @param {Object} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Array<import("../Feature").default|import("../render/Feature").default>} Features.
   */
  readFeaturesFromObject(object, options) {
    return abstract();
  }

  /**
   * Read a geometry.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @return {Geometry} Geometry.
   * @api
   */
  readGeometry(source, options) {
    return this.readGeometryFromObject(
      getObject(source),
      this.getReadOptions(source, options),
    );
  }

  /**
   * @abstract
   * @param {Object} object Object.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Geometry} Geometry.
   */
  readGeometryFromObject(object, options) {
    return abstract();
  }

  /**
   * Read the projection.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @return {import("../proj/Projection").default} Projection.
   * @api
   */
  readProjection(source) {
    return this.readProjectionFromObject(getObject(source));
  }

  /**
   * @abstract
   * @param {Object} object Object.
   * @protected
   * @return {import("../proj/Projection").default} Projection.
   */
  readProjectionFromObject(object) {
    return abstract();
  }

  /**
   * Encode a feature as string.
   *
   * @param {import("../Feature").default} feature Feature.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {string} Encoded feature.
   * @api
   */
  writeFeature(feature, options) {
    return JSON.stringify(this.writeFeatureObject(feature, options));
  }

  /**
   * @abstract
   * @param {import("../Feature").default} feature Feature.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {Object} Object.
   */
  writeFeatureObject(feature, options) {
    return abstract();
  }

  /**
   * Encode an array of features as string.
   *
   * @param {Array<import("../Feature").default>} features Features.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {string} Encoded features.
   * @api
   */
  writeFeatures(features, options) {
    return JSON.stringify(this.writeFeaturesObject(features, options));
  }

  /**
   * @abstract
   * @param {Array<import("../Feature").default>} features Features.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {Object} Object.
   */
  writeFeaturesObject(features, options) {
    return abstract();
  }

  /**
   * Encode a geometry as string.
   *
   * @param {Geometry} geometry Geometry.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {string} Encoded geometry.
   * @api
   */
  writeGeometry(geometry, options) {
    return JSON.stringify(this.writeGeometryObject(geometry, options));
  }

  /**
   * @abstract
   * @param {Geometry} geometry Geometry.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return {Object} Object.
   */
  writeGeometryObject(geometry, options) {
    return abstract();
  }
}

/**
 * @param {Document|Element|Object|string} source Source.
 * @return {Object} Object.
 */
function getObject(source) {
  if (typeof source === 'string') {
    const object = JSON.parse(source);
    return object ? /** @type {Object} */ (object) : null;
  }
  if (source !== null) {
    return source;
  }
  return null;
}

export default JSONFeature;
