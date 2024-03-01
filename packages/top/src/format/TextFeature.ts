
import FeatureFormat from '../format/Feature';
import {abstract} from '@olts/core/util';

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for text feature formats.
 *
 * @abstract
 */
export class TextFeature extends FeatureFormat {
  constructor() {
    super();
  }

  /**
   * @return {import("./Feature").Type} Format.
   */
  getType() {
    return 'text';
  }

  /**
   * Read the feature from the source.
   *
   * @param {Document|Element|Object|string} source Source.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @return {import("../Feature").default} Feature.
   * @api
   */
  readFeature(source, options) {
    return this.readFeatureFromText(
      getText(source),
      this.adaptOptions(options),
    );
  }

  /**
   * @abstract
   * @param text Text.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {import("../Feature").default} Feature.
   */
  readFeatureFromText(text, options) {
    return abstract();
  }

  /**
   * Read the features from the source.
   *
   * @param {Document|Element|Object|string} source Source.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @return {Array<import("../Feature").default>} Features.
   * @api
   */
  readFeatures(source, options) {
    return this.readFeaturesFromText(
      getText(source),
      this.adaptOptions(options),
    );
  }

  /**
   * @abstract
   * @param text Text.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Array<import("../Feature").default>} Features.
   */
  readFeaturesFromText(text, options) {
    return abstract();
  }

  /**
   * Read the geometry from the source.
   *
   * @param {Document|Element|Object|string} source Source.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @return {Geometry} Geometry.
   * @api
   */
  readGeometry(source, options) {
    return this.readGeometryFromText(
      getText(source),
      this.adaptOptions(options),
    );
  }

  /**
   * @abstract
   * @param text Text.
   * @param {import("./Feature").ReadOptions} [options] Read options.
   * @protected
   * @return {Geometry} Geometry.
   */
  readGeometryFromText(text, options) {
    return abstract();
  }

  /**
   * Read the projection from the source.
   *
   * @param {Document|Element|Object|string} source Source.
   * @return {import("../proj/Projection").default|undefined} Projection.
   * @api
   */
  readProjection(source) {
    return this.readProjectionFromText(getText(source));
  }

  /**
   * @param text Text.
   * @protected
   * @return {import("../proj/Projection").default|undefined} Projection.
   */
  readProjectionFromText(text) {
    return this.dataProjection;
  }

  /**
   * Encode a feature as a string.
   *
   * @param {import("../Feature").default} feature Feature.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return Encoded feature.
   * @api
   */
  writeFeature(feature, options) {
    return this.writeFeatureText(feature, this.adaptOptions(options));
  }

  /**
   * @abstract
   * @param {import("../Feature").default} feature Features.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @protected
   * @return Text.
   */
  writeFeatureText(feature, options) {
    return abstract();
  }

  /**
   * Encode an array of features as string.
   *
   * @param {Array<import("../Feature").default>} features Features.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return Encoded features.
   * @api
   */
  writeFeatures(features, options) {
    return this.writeFeaturesText(features, this.adaptOptions(options));
  }

  /**
   * @abstract
   * @param {Array<import("../Feature").default>} features Features.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @protected
   * @return Text.
   */
  writeFeaturesText(features, options) {
    return abstract();
  }

  /**
   * Write a single geometry.
   *
   * @param {Geometry} geometry Geometry.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @return Geometry.
   * @api
   */
  writeGeometry(geometry, options) {
    return this.writeGeometryText(geometry, this.adaptOptions(options));
  }

  /**
   * @abstract
   * @param {Geometry} geometry Geometry.
   * @param {import("./Feature").WriteOptions} [options] Write options.
   * @protected
   * @return Text.
   */
  writeGeometryText(geometry, options) {
    return abstract();
  }
}

/**
 * @param {Document|Element|Object|string} source Source.
 * @return Text.
 */
function getText(source) {
  if (typeof source === 'string') {
    return source;
  }
  return '';
}

export default TextFeature;
