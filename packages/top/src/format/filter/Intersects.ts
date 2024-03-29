import Spatial from './Spatial';

/**
 * Represents a `<Intersects>` operator to test whether a geometry-valued property
 * intersects a given geometry.
 * @api
 */
export class Intersects extends Spatial {
  /**
   * @param {!string} geometryName Geometry name to use.
   * @param {!Geometry} geometry Geometry.
   * @param [srsName] SRS name. No srsName attribute will be
   *    set on geometries when this is not provided.
   */
  constructor(geometryName, geometry, srsName) {
    super('Intersects', geometryName, geometry, srsName);
  }
}

export default Intersects;
