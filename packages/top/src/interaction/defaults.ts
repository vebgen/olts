
import Collection from '../Collection';
import DoubleClickZoom from './DoubleClickZoom';
import DragPan from './DragPan';
import DragRotate from './DragRotate';
import DragZoom from './DragZoom';
import KeyboardPan from './KeyboardPan';
import KeyboardZoom from './KeyboardZoom';
import Kinetic from '../Kinetic';
import MouseWheelZoom from './MouseWheelZoom';
import PinchRotate from './PinchRotate';
import PinchZoom from './PinchZoom';
import { Interaction } from './Interaction';

/**
 * @typedef {Object} DefaultsOptions
 * @property {boolean} [altShiftDragRotate=true] Whether Alt-Shift-drag rotate is
 * desired.
 * @property {boolean} [onFocusOnly=false] Interact only when the map has the
 * focus. This affects the `MouseWheelZoom` and `DragPan` interactions and is
 * useful when page scroll is desired for maps that do not have the browser's
 * focus.
 * @property {boolean} [doubleClickZoom=true] Whether double click zoom is
 * desired.
 * @property {boolean} [keyboard=true] Whether keyboard interaction is desired.
 * @property {boolean} [mouseWheelZoom=true] Whether mousewheel zoom is desired.
 * @property {boolean} [shiftDragZoom=true] Whether Shift-drag zoom is desired.
 * @property {boolean} [dragPan=true] Whether drag pan is desired.
 * @property {boolean} [pinchRotate=true] Whether pinch rotate is desired.
 * @property {boolean} [pinchZoom=true] Whether pinch zoom is desired.
 * @property [zoomDelta] Zoom level delta when using keyboard or double click zoom.
 * @property [zoomDuration] Duration of the zoom animation in
 * milliseconds.
 */
interface DefaultsOptions {
    altShiftDragRotate?: boolean;
    onFocusOnly?: boolean;
    doubleClickZoom?: boolean;
    keyboard?: boolean;
    mouseWheelZoom?: boolean;
    shiftDragZoom?: boolean;
    dragPan?: boolean;
    pinchRotate?: boolean;
    pinchZoom?: boolean;
    zoomDelta?: number;
    zoomDuration?: number;
}


/**
 * Set of interactions included in maps by default. Specific interactions can be
 * excluded by setting the appropriate option to false in the constructor
 * options, but the order of the interactions is fixed.  If you want to specify
 * a different order for interactions, you will need to create your own
 * {@link module:ol/interaction/Interaction~Interaction} instances and insert
 * them into a {@link Collection} in the order you want
 * before creating your {@link module:ol/Map~Map} instance. Changing the order can
 * be of interest if the event propagation needs to be stopped at a point.
 * The default set of interactions, in sequence, is:
 * * {@link module:ol/interaction/DragRotate~DragRotate}
 * * {@link module:ol/interaction/DoubleClickZoom~DoubleClickZoom}
 * * {@link module:ol/interaction/DragPan~DragPan}
 * * {@link module:ol/interaction/PinchRotate~PinchRotate}
 * * {@link module:ol/interaction/PinchZoom~PinchZoom}
 * * {@link module:ol/interaction/KeyboardPan~KeyboardPan}
 * * {@link module:ol/interaction/KeyboardZoom~KeyboardZoom}
 * * {@link module:ol/interaction/MouseWheelZoom~MouseWheelZoom}
 * * {@link module:ol/interaction/DragZoom~DragZoom}
 *
 * @param {DefaultsOptions} [options] Defaults options.
 * @return {Collection<Interaction>}
 * A collection of interactions to be used with the {@link module:ol/Map~Map}
 * constructor's `interactions` option.
 * @api
 */
export function defaults(options?: DefaultsOptions): Collection<Interaction> {
  options = options ? options : {};

  /** @type {Collection<Interaction>} */
  const interactions: Collection<Interaction> = new Collection();

  const kinetic = new Kinetic(-0.005, 0.05, 100);

  const altShiftDragRotate =
    options.altShiftDragRotate !== undefined
      ? options.altShiftDragRotate
      : true;
  if (altShiftDragRotate) {
    interactions.push(new DragRotate());
  }

  const doubleClickZoom =
    options.doubleClickZoom !== undefined ? options.doubleClickZoom : true;
  if (doubleClickZoom) {
    interactions.push(
      new DoubleClickZoom({
        delta: options.zoomDelta,
        duration: options.zoomDuration,
      }),
    );
  }

  const dragPan = options.dragPan !== undefined ? options.dragPan : true;
  if (dragPan) {
    interactions.push(
      new DragPan({
        onFocusOnly: options.onFocusOnly,
        kinetic: kinetic,
      }),
    );
  }

  const pinchRotate =
    options.pinchRotate !== undefined ? options.pinchRotate : true;
  if (pinchRotate) {
    interactions.push(new PinchRotate());
  }

  const pinchZoom = options.pinchZoom !== undefined ? options.pinchZoom : true;
  if (pinchZoom) {
    interactions.push(
      new PinchZoom({
        duration: options.zoomDuration,
      }),
    );
  }

  const keyboard = options.keyboard !== undefined ? options.keyboard : true;
  if (keyboard) {
    interactions.push(new KeyboardPan());
    interactions.push(
      new KeyboardZoom({
        delta: options.zoomDelta,
        duration: options.zoomDuration,
      }),
    );
  }

  const mouseWheelZoom =
    options.mouseWheelZoom !== undefined ? options.mouseWheelZoom : true;
  if (mouseWheelZoom) {
    interactions.push(
      new MouseWheelZoom({
        onFocusOnly: options.onFocusOnly,
        duration: options.zoomDuration,
      }),
    );
  }

  const shiftDragZoom =
    options.shiftDragZoom !== undefined ? options.shiftDragZoom : true;
  if (shiftDragZoom) {
    interactions.push(
      new DragZoom({
        duration: options.zoomDuration,
      }),
    );
  }

  return interactions;
}
