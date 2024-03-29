import Spatial from './Spatial';

/**
 * Represents a `<Disjoint>` operator to test whether a geometry-valued property
 * is disjoint to a given geometry.
 * @api
 */
export class Disjoint extends Spatial {
  /**
   * @param {!string} geometryName Geometry name to use.
   * @param {!Geometry} geometry Geometry.
   * @param [srsName] SRS name. No srsName attribute will be
   *    set on geometries when this is not provided.
   */
  constructor(geometryName, geometry, srsName) {
    super('Disjoint', geometryName, geometry, srsName);
  }
}

export default Disjoint;
