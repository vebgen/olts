import Filter from './Filter';

/**
 * Abstract class; normally only used for creating subclasses and not instantiated in apps.
 * Represents a spatial operator to test whether a geometry-valued property
 * relates to a given geometry.
 *
 * @abstract
 */
export class Spatial extends Filter {
  /**
   * @param {!string} tagName The XML tag name for this filter.
   * @param {!string} geometryName Geometry name to use.
   * @param {!Geometry} geometry Geometry.
   * @param [srsName] SRS name. No srsName attribute will be
   *    set on geometries when this is not provided.
   */
  constructor(tagName, geometryName, geometry, srsName) {
    super(tagName);

    /**
     * @type {!string}
     */
    this.geometryName = geometryName || 'the_geom';

    /**
     * @type {Geometry}
     */
    this.geometry = geometry;

    /**
     * @type {string|undefined}
     */
    this.srsName = srsName;
  }
}

export default Spatial;
