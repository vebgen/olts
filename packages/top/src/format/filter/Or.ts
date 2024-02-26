import LogicalNary from './LogicalNary.js';

/**
 * Represents a logical `<Or>` operator between two or more filter conditions.
 * @api
 */
export class Or extends LogicalNary {
  /**
   * @param {...import("./Filter.js").default} conditions Conditions.
   */
  constructor(conditions) {
    super('Or', Array.prototype.slice.call(arguments));
  }
}

export default Or;
