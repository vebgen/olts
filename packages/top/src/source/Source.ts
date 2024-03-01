import { BaseObject  } from '@olts/events';
import {get as getProjection} from '../proj';

/**
 * @typedef {'undefined' | 'loading' | 'ready' | 'error'} State
 * State of the source, one of 'undefined', 'loading', 'ready' or 'error'.
 */

/**
 * A function that takes a {@link import("../View").ViewStateLayerStateExtent} and returns a string or
 * an array of strings representing source attributions.
 *
 * @typedef {function(import("../View").ViewStateLayerStateExtent): (string|string[])} Attribution
 */

/**
 * A type that can be used to provide attribution information for data sources.
 *
 * It represents either
 * * a simple string (e.g. `'© Acme Inc.'`)
 * * an array of simple strings (e.g. `['© Acme Inc.', '© Bacme Inc.']`)
 * * a function that returns a string or array of strings ({@link module:ol/source/Source~Attribution})
 *
 * @typedef {string|string[]|Attribution} AttributionLike
 */

/**
 * @typedef {Object} Options
 * @property {AttributionLike} [attributions] Attributions.
 * @property {boolean} [attributionsCollapsible=true] Attributions are collapsible.
 * @property {ProjectionLike} [projection] Projection. Default is the view projection.
 * @property {import("./Source").State} [state='ready'] State.
 * @property {boolean} [wrapX=false] WrapX.
 * @property {boolean} [interpolate=false] Use interpolated values when resampling.  By default,
 * the nearest neighbor is used when resampling.
 */

/**
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for {@link module:ol/layer/Layer~Layer} sources.
 *
 * A generic `change` event is triggered when the state of the source changes.
 * @api
 */
export abstract class Source extends BaseObject {
  /**
   * @param {Options} options Source options.
   */
  constructor(options: Options) {
    super();

    /**
     * @protected
     * @type {import("../proj/Projection").default|null}
     */
    this.projection = getProjection(options.projection);

    /**
     * @private
     * @type {?Attribution}
     */
    this.attributions_ = adaptAttributions(options.attributions);

    /**
     * @private
     * @type {boolean}
     */
    this.attributionsCollapsible_ =
      options.attributionsCollapsible !== undefined
        ? options.attributionsCollapsible
        : true;

    /**
     * This source is currently loading data. Sources that defer loading to the
     * map's tile queue never set this to `true`.
     * @type {boolean}
     */
    this.loading = false;

    /**
     * @private
     * @type {import("./Source").State}
     */
    this.state_ = options.state !== undefined ? options.state : 'ready';

    /**
     * @private
     * @type {boolean}
     */
    this.wrapX_ = options.wrapX !== undefined ? options.wrapX : false;

    /**
     * @private
     * @type {boolean}
     */
    this.interpolate_ = !!options.interpolate;

    /**
     * @protected
     * @type {function(import("../View").ViewOptions):void}
     */
    this.viewResolver = null;

    /**
     * @protected
     * @type {function(Error):void}
     */
    this.viewRejector = null;

    const self = this;
    /**
     * @private
     * @type {Promise<import("../View").ViewOptions>}
     */
    this.viewPromise_ = new Promise(function (resolve, reject) {
      self.viewResolver = resolve;
      self.viewRejector = reject;
    });
  }

  /**
   * Get the attribution function for the source.
   * @return {?Attribution} Attribution function.
   * @api
   */
  getAttributions(): Attribution | null {
    return this.attributions_;
  }

  /**
   * @return {boolean} Attributions are collapsible.
   * @api
   */
  getAttributionsCollapsible(): boolean {
    return this.attributionsCollapsible_;
  }

  /**
   * Get the projection of the source.
   * @return {import("../proj/Projection").default|null} Projection.
   * @api
   */
  getProjection(): import("../proj/Projection").default | null {
    return this.projection;
  }

  /**
   * @param {import("../proj/Projection").default} [projection] Projection.
   * @return {number[]|null} Resolutions.
   */
  getResolutions(projection: import("../proj/Projection").default): number[] | null {
    return null;
  }

  /**
   * @return {Promise<import("../View").ViewOptions>} A promise for view-related properties.
   */
  getView(): Promise<import("../View").ViewOptions> {
    return this.viewPromise_;
  }

  /**
   * Get the state of the source, see {@link import("./Source").State} for possible states.
   * @return {import("./Source").State} State.
   * @api
   */
  getState(): import("./Source").State {
    return this.state_;
  }

  /**
   * @return {boolean|undefined} Wrap X.
   */
  getWrapX(): boolean | undefined {
    return this.wrapX_;
  }

  /**
   * @return {boolean} Use linear interpolation when resampling.
   */
  getInterpolate(): boolean {
    return this.interpolate_;
  }

  /**
   * Refreshes the source. The source will be cleared, and data from the server will be reloaded.
   * @api
   */
  refresh() {
    this.changed();
  }

  /**
   * Set the attributions of the source.
   * @param {AttributionLike|undefined} attributions Attributions.
   *     Can be passed as `string`, `string[]`, {@link module:ol/source/Source~Attribution},
   *     or `undefined`.
   * @api
   */
  setAttributions(attributions: AttributionLike | undefined) {
    this.attributions_ = adaptAttributions(attributions);
    this.changed();
  }

  /**
   * Set the state of the source.
   * @param {import("./Source").State} state State.
   */
  setState(state: import("./Source").State) {
    this.state_ = state;
    this.changed();
  }
}

/**
 * Turns the attributions option into an attributions function.
 * @param {AttributionLike|undefined} attributionLike The attribution option.
 * @return {Attribution|null} An attribution function (or null).
 */
function adaptAttributions(attributionLike: AttributionLike | undefined): Attribution | null {
  if (!attributionLike) {
    return null;
  }
  if (Array.isArray(attributionLike)) {
    return function (frameState) {
      return attributionLike;
    };
  }

  if (typeof attributionLike === 'function') {
    return attributionLike;
  }

  return function (frameState) {
    return [attributionLike];
  };
}

export default Source;
