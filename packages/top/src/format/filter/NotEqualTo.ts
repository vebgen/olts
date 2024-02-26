import ComparisonBinary from './ComparisonBinary';

/**
 * Represents a `<PropertyIsNotEqualTo>` comparison operator.
 * @api
 */
export class NotEqualTo extends ComparisonBinary {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!(string|number)} expression The value to compare.
   * @param {boolean} [matchCase] Case-sensitive?
   */
  constructor(propertyName, expression, matchCase) {
    super('PropertyIsNotEqualTo', propertyName, expression, matchCase);
  }
}

export default NotEqualTo;
