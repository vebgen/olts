import LogicalNary from './LogicalNary';

/**
 * Represents a logical `<Or>` operator between two or more filter conditions.
 * @api
 */
export class Or extends LogicalNary {
  /**
   * @param {...import("./Filter").default} conditions Conditions.
   */
  constructor(conditions) {
    super('Or', Array.prototype.slice.call(arguments));
  }
}

export default Or;
