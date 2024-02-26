import ComparisonBinary from './ComparisonBinary';

/**
 * Represents a `<PropertyIsGreaterThan>` comparison operator.
 * @api
 */
export class GreaterThan extends ComparisonBinary {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!number} expression The value to compare.
   */
  constructor(propertyName, expression) {
    super('PropertyIsGreaterThan', propertyName, expression);
  }
}

export default GreaterThan;
