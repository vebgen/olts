import Filter from './Filter';

/**
 * Represents a logical `<Not>` operator for a filter condition.
 * @api
 */
export class Not extends Filter {
  /**
   * @param {!import("./Filter").default} condition Filter condition.
   */
  constructor(condition) {
    super('Not');

    /**
     * @type {!import("./Filter").default}
     */
    this.condition = condition;
  }
}

export default Not;
