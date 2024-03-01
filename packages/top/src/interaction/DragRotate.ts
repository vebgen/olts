import PointerInteraction from './Pointer';
import {FALSE} from '@olts/core/functions';
import {
  altShiftKeysOnly,
  mouseActionButton,
  mouseOnly,
} from '../events/condition';
import {disable} from '../rotation-constraint';

/**
 * @typedef {Object} Options
 * @property {import("../events/condition").Condition} [condition] A function that takes an
 * {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a boolean
 * to indicate whether that event should be handled.
 * Default is {@link module:ol/events/condition.altShiftKeysOnly}.
 * @property [duration=250] Animation duration in milliseconds.
 */

/**
 * Allows the user to rotate the map by clicking and dragging on the map,
 * normally combined with an {@link module:ol/events/condition} that limits
 * it to when the alt and shift keys are held down.
 *
 * This interaction is only supported for mouse devices.
 * @api
 */
export class DragRotate extends PointerInteraction {
  /**
   * @param {Options} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};

    super({
      stopDown: FALSE,
    });

    /**
     * @private
     * @type {import("../events/condition").Condition}
     */
    this.condition_ = options.condition ? options.condition : altShiftKeysOnly;

    /**
     * @private
     * @type {number|undefined}
     */
    this.lastAngle_ = undefined;

    /**
     * @private
     * @type {number}
     */
    this.duration_ = options.duration !== undefined ? options.duration : 250;
  }

  /**
   * Handle pointer drag events.
   * @param {import("../MapBrowserEvent").default} mapBrowserEvent Event.
   */
  handleDragEvent(mapBrowserEvent) {
    if (!mouseOnly(mapBrowserEvent)) {
      return;
    }

    const map = mapBrowserEvent.map;
    const view = map.getView();
    if (view.getConstraints().rotation === disable) {
      return;
    }
    const size = map.getSize();
    const offset = mapBrowserEvent.pixel;
    const theta = Math.atan2(size[1] / 2 - offset[1], offset[0] - size[0] / 2);
    if (this.lastAngle_ !== undefined) {
      const delta = theta - this.lastAngle_;
      view.adjustRotationInternal(-delta);
    }
    this.lastAngle_ = theta;
  }

  /**
   * Handle pointer up events.
   * @param {import("../MapBrowserEvent").default} mapBrowserEvent Event.
   * @return {boolean} If the event was consumed.
   */
  handleUpEvent(mapBrowserEvent) {
    if (!mouseOnly(mapBrowserEvent)) {
      return true;
    }

    const map = mapBrowserEvent.map;
    const view = map.getView();
    view.endInteraction(this.duration_);
    return false;
  }

  /**
   * Handle pointer down events.
   * @param {import("../MapBrowserEvent").default} mapBrowserEvent Event.
   * @return {boolean} If the event was consumed.
   */
  handleDownEvent(mapBrowserEvent) {
    if (!mouseOnly(mapBrowserEvent)) {
      return false;
    }

    if (
      mouseActionButton(mapBrowserEvent) &&
      this.condition_(mapBrowserEvent)
    ) {
      const map = mapBrowserEvent.map;
      map.getView().beginInteraction();
      this.lastAngle_ = undefined;
      return true;
    }
    return false;
  }
}

export default DragRotate;
