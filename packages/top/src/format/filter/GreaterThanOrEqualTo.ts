import ComparisonBinary from './ComparisonBinary';

/**
 * Represents a `<PropertyIsGreaterThanOrEqualTo>` comparison operator.
 * @api
 */
export class GreaterThanOrEqualTo extends ComparisonBinary {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!number} expression The value to compare.
   */
  constructor(propertyName, expression) {
    super('PropertyIsGreaterThanOrEqualTo', propertyName, expression);
  }
}

export default GreaterThanOrEqualTo;
