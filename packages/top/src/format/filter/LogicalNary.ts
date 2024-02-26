
import Filter from './Filter';
import {assert} from '@olts/core/asserts';

/**
 * Abstract class; normally only used for creating subclasses and not instantiated in apps.
 * Base class for WFS GetFeature n-ary logical filters.
 *
 * @abstract
 */
export class LogicalNary extends Filter {
  /**
   * @param {!string} tagName The XML tag name for this filter.
   * @param {Array<import("./Filter").default>} conditions Conditions.
   */
  constructor(tagName, conditions) {
    super(tagName);

    /**
     * @type {Array<import("./Filter").default>}
     */
    this.conditions = conditions;
    assert(this.conditions.length >= 2, 'At least 2 conditions are required');
  }
}

export default LogicalNary;
