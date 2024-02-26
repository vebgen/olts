import ComparisonBinary from './ComparisonBinary';

/**
 * Represents a `<PropertyIsEqualTo>` comparison operator.
 * @api
 */
export class EqualTo extends ComparisonBinary {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!(string|number)} expression The value to compare.
   * @param {boolean} [matchCase] Case-sensitive?
   */
  constructor(propertyName, expression, matchCase) {
    super('PropertyIsEqualTo', propertyName, expression, matchCase);
  }
}

export default EqualTo;
