import ComparisonBinary from './ComparisonBinary';

/**
 * Represents a `<PropertyIsLessThan>` comparison operator.
 * @api
 */
export class LessThan extends ComparisonBinary {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!number} expression The value to compare.
   */
  constructor(propertyName, expression) {
    super('PropertyIsLessThan', propertyName, expression);
  }
}

export default LessThan;
