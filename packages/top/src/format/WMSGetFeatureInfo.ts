
import GML2 from './GML2.js';
import XMLFeature from './XMLFeature';
import {extend} from '@olts/core/array';
import {makeArrayPusher, makeStructureNS, pushParseAndPop} from '../xml';

/**
 * @typedef {Object} Options
 * @property {string[]} [layers] If set, only features of the given layers will be returned by the format when read.
 */

/**
 * @const
 * @type {string}
 */
const featureIdentifier = '_feature';

/**
 * @const
 * @type {string}
 */
const layerIdentifier = '_layer';

/**
 * Format for reading WMSGetFeatureInfo format. It uses
 * {@link module:ol/format/GML2~GML2} to read features.
 *
 * @api
 */
export class WMSGetFeatureInfo extends XMLFeature {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    super();

    options = options ? options : {};

    /**
     * @private
     * @type {string}
     */
    this.featureNS_ = 'http://mapserver.gis.umn.edu/mapserver';

    /**
     * @private
     * @type {GML2}
     */
    this.gmlFormat_ = new GML2();

    /**
     * @private
     * @type {string[]|null}
     */
    this.layers_ = options.layers ? options.layers : null;
  }

  /**
   * @return {string[]|null} layers
   */
  getLayers() {
    return this.layers_;
  }

  /**
   * @param {string[]|null} layers Layers to parse.
   */
  setLayers(layers) {
    this.layers_ = layers;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<import("../Feature").default>} Features.
   * @private
   */
  readFeatures_(node, objectStack) {
    node.setAttribute('namespaceURI', this.featureNS_);
    const localName = node.localName;
    /** @type {Array<import("../Feature").default>} */
    let features = [];
    if (node.childNodes.length === 0) {
      return features;
    }
    if (localName == 'msGMLOutput') {
      for (let i = 0, ii = node.childNodes.length; i < ii; i++) {
        const layer = node.childNodes[i];
        if (layer.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        const layerElement = /** @type {Element} */ (layer);
        const context = objectStack[0];

        const toRemove = layerIdentifier;
        const layerName = layerElement.localName.replace(toRemove, '');

        if (this.layers_ && !this.layers_.includes(layerName)) {
          continue;
        }

        const featureType = layerName + featureIdentifier;

        context['featureType'] = featureType;
        context['featureNS'] = this.featureNS_;

        /** @type {Record<string, import("../xml").Parser>} */
        const parsers = {};
        parsers[featureType] = makeArrayPusher(
          this.gmlFormat_.readFeatureElement,
          this.gmlFormat_,
        );
        const parsersNS = makeStructureNS(
          [context['featureNS'], null],
          parsers,
        );
        layerElement.setAttribute('namespaceURI', this.featureNS_);
        const layerFeatures = pushParseAndPop(
          [],
          // @ts-ignore
          parsersNS,
          layerElement,
          objectStack,
          this.gmlFormat_,
        );
        if (layerFeatures) {
          extend(features, layerFeatures);
        }
      }
    }
    if (localName == 'FeatureCollection') {
      const gmlFeatures = pushParseAndPop(
        [],
        this.gmlFormat_.FEATURE_COLLECTION_PARSERS,
        node,
        [{}],
        this.gmlFormat_,
      );
      if (gmlFeatures) {
        features = gmlFeatures;
      }
    }
    return features;
  }

  /**
   * @protected
   * @param {Element} node Node.
   * @param {import("./Feature").ReadOptions} [options] Options.
   * @return {Array<import("../Feature").default>} Features.
   */
  readFeaturesFromNode(node, options) {
    const internalOptions = {};
    if (options) {
      Object.assign(internalOptions, this.getReadOptions(node, options));
    }
    return this.readFeatures_(node, [internalOptions]);
  }
}

export default WMSGetFeatureInfo;
