import Spatial from './Spatial';

/**
 * Represents a `<Within>` operator to test whether a geometry-valued property
 * is within a given geometry.
 * @api
 */
export class Within extends Spatial {
  /**
   * @param {!string} geometryName Geometry name to use.
   * @param {!Geometry} geometry Geometry.
   * @param [srsName] SRS name. No srsName attribute will be
   *    set on geometries when this is not provided.
   */
  constructor(geometryName, geometry, srsName) {
    super('Within', geometryName, geometry, srsName);
  }
}

export default Within;
