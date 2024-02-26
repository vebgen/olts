import Filter from './Filter';

/**
 *
 * @abstract
 */
export class ResourceId extends Filter {
  /**
   * @param {!string} rid Resource ID.
   */
  constructor(rid) {
    super('ResourceId');

    /**
     * @type {!string}
     */
    this.rid = rid;
  }
}

export default ResourceId;
