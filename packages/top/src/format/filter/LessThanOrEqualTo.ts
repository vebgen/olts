import ComparisonBinary from './ComparisonBinary';

/**
 * Represents a `<PropertyIsLessThanOrEqualTo>` comparison operator.
 * @api
 */
export class LessThanOrEqualTo extends ComparisonBinary {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!number} expression The value to compare.
   */
  constructor(propertyName, expression) {
    super('PropertyIsLessThanOrEqualTo', propertyName, expression);
  }
}

export default LessThanOrEqualTo;
