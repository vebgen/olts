import Filter from './Filter';

/**
 * Abstract class; normally only used for creating subclasses and not instantiated in apps.
 * Base class for WFS GetFeature property comparison filters.
 *
 * @abstract
 */
export class Comparison extends Filter {
  /**
   * @param {!string} tagName The XML tag name for this filter.
   * @param {!string} propertyName Name of the context property to compare.
   */
  constructor(tagName, propertyName) {
    super(tagName);

    /**
     * @type {!string}
     */
    this.propertyName = propertyName;
  }
}

export default Comparison;
