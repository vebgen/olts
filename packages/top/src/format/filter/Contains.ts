import Spatial from './Spatial';

/**
 * Represents a `<Contains>` operator to test whether a geometry-valued property
 * contains a given geometry.
 * @api
 */
export class Contains extends Spatial {
  /**
   * @param {!string} geometryName Geometry name to use.
   * @param {!Geometry} geometry Geometry.
   * @param [srsName] SRS name. No srsName attribute will be
   *    set on geometries when this is not provided.
   */
  constructor(geometryName, geometry, srsName) {
    super('Contains', geometryName, geometry, srsName);
  }
}

export default Contains;
