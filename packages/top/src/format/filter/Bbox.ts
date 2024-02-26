
import Filter from './Filter.js';

/**
 * Represents a `<BBOX>` operator to test whether a geometry-valued property
 * intersects a fixed bounding box
 *
 * @api
 */
export class Bbox extends Filter {
  /**
   * @param {!string} geometryName Geometry name to use.
   * @param {!Extent} extent Extent.
   * @param {string} [srsName] SRS name. No srsName attribute will be set
   * on geometries when this is not provided.
   */
  constructor(geometryName, extent, srsName) {
    super('BBOX');

    /**
     * @type {!string}
     */
    this.geometryName = geometryName;

    /**
     * @type {Extent}
     */
    this.extent = extent;
    if (extent.length !== 4) {
      throw new Error(
        'Expected an extent with four values ([minX, minY, maxX, maxY])',
      );
    }

    /**
     * @type {string|undefined}
     */
    this.srsName = srsName;
  }
}

export default Bbox;
