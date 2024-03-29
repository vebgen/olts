import GML3 from './GML3.js';

/**
 * Feature format for reading and writing data in the GML format
 * version 3.1.1.
 * Currently only supports GML 3.1.1 Simple Features profile.
 *
 * @class
 * @param {import("./GMLBase").Options} [options]
 *     Optional configuration object.
 * @api
 */
const GML = GML3;

/**
 * Encode an array of features in GML 3.1.1 Simple Features.
 *
 * @function
 * @param {Array<import("../Feature").default>} features Features.
 * @param {import("./Feature").WriteOptions} [options] Options.
 * @return Result.
 * @api
 */
GML.prototype.writeFeatures;

/**
 * Encode an array of features in the GML 3.1.1 format as an XML node.
 *
 * @function
 * @param {Array<import("../Feature").default>} features Features.
 * @param {import("./Feature").WriteOptions} [options] Options.
 * @return {Node} Node.
 * @api
 */
GML.prototype.writeFeaturesNode;

export default GML;
