import Comparison from './Comparison.js';

/**
 * Represents a `<During>` comparison operator.
 * @api
 */
export class During extends Comparison {
  /**
   * @param {!string} propertyName Name of the context property to compare.
   * @param {!string} begin The begin date in ISO-8601 format.
   * @param {!string} end The end date in ISO-8601 format.
   */
  constructor(propertyName, begin, end) {
    super('During', propertyName);

    /**
     * @type {!string}
     */
    this.begin = begin;

    /**
     * @type {!string}
     */
    this.end = end;
  }
}

export default During;
