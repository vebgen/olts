
import Control from './Control';
import type { EventType } from '@olts/events';
import {CLASS_CONTROL, CLASS_UNSELECTABLE} from '@olts/core/css';
import {fromUserExtent} from '../proj';
import {fromExtent as polygonFromExtent} from '@olts/geometry';

/**
 * @typedef {Object} Options
 * @property {string} [className='ol-zoom-extent'] Class name.
 * @property {HTMLElement|string} [target] Specify a target if you want the control
 * to be rendered outside of the map's viewport.
 * @property {string|HTMLElement} [label='E'] Text label to use for the button.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property {string} [tipLabel='Fit to extent'] Text label to use for the button tip.
 * @property {Extent} [extent] The extent to zoom to. If undefined the validity
 * extent of the view projection is used.
 */

/**
 * A button control which, when pressed, changes the map view to a specific
 * extent. To style this control use the css selector `.ol-zoom-extent`.
 *
 * @api
 */
export class ZoomToExtent extends Control {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};

    super({
      element: document.createElement('div'),
      target: options.target,
    });

    /**
     * @type {?Extent|null}
     * @protected
     */
    this.extent = options.extent ? options.extent : null;

    const className =
      options.className !== undefined ? options.className : 'ol-zoom-extent';

    const label = options.label !== undefined ? options.label : 'E';
    const tipLabel =
      options.tipLabel !== undefined ? options.tipLabel : 'Fit to extent';
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.title = tipLabel;
    button.appendChild(
      typeof label === 'string' ? document.createTextNode(label) : label,
    );

    button.addEventListener(
      EventType.CLICK,
      this.handleClick_.bind(this),
      false,
    );

    const cssClasses =
      className + ' ' + CLASS_UNSELECTABLE + ' ' + CLASS_CONTROL;
    const element = this.element;
    element.className = cssClasses;
    element.appendChild(button);
  }

  /**
   * @param {MouseEvent} event The event to handle
   * @private
   */
  handleClick_(event) {
    event.preventDefault();
    this.handleZoomToExtent();
  }

  /**
   * @protected
   */
  handleZoomToExtent() {
    const map = this.getMap();
    const view = map.getView();
    const extent = !this.extent
      ? view.getProjection().getExtent()
      : fromUserExtent(this.extent, view.getProjection());
    view.fitInternal(polygonFromExtent(extent));
  }
}

export default ZoomToExtent;
