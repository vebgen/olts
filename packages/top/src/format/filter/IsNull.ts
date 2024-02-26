import Comparison from './Comparison';

/**
 * Represents a `<PropertyIsNull>` comparison operator.
 * @api
 */
export class IsNull extends Comparison {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   */
  constructor(propertyName) {
    super('PropertyIsNull', propertyName);
  }
}

export default IsNull;
