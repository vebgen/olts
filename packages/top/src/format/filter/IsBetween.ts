import Comparison from './Comparison';

/**
 * Represents a `<PropertyIsBetween>` comparison operator.
 * @api
 */
export class IsBetween extends Comparison {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!number} lowerBoundary The lower bound of the range.
   * @param {!number} upperBoundary The upper bound of the range.
   */
  constructor(propertyName, lowerBoundary, upperBoundary) {
    super('PropertyIsBetween', propertyName);

    /**
     * @type {!number}
     */
    this.lowerBoundary = lowerBoundary;

    /**
     * @type {!number}
     */
    this.upperBoundary = upperBoundary;
  }
}

export default IsBetween;
