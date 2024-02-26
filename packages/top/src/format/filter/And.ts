import LogicalNary from './LogicalNary';

/**
 * Represents a logical `<And>` operator between two or more filter conditions.
 *
 * @abstract
 */
export class And extends LogicalNary {
  /**
   * @param {...import("./Filter").default} conditions Conditions.
   */
  constructor(conditions) {
    super('And', Array.prototype.slice.call(arguments));
  }
}

export default And;
