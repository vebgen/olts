
import { BaseEvent as Event } from '@olts/events';

export class RenderEvent extends Event {
  /**
   * @param {import("./EventType").default} type Type.
   * @param {import("../transform").Transform} [inversePixelTransform] Transform for
   *     CSS pixels to rendered pixels.
   * @param {import("../Map").FrameState} [frameState] Frame state.
   * @param {?(CanvasRenderingContext2D|WebGLRenderingContext)} [context] Context.
   */
  constructor(type: import("./EventType").default, inversePixelTransform: import("../transform").Transform, frameState: import("../Map").FrameState, context: (CanvasRenderingContext2D | WebGLRenderingContext) | null) {
    super(type);

    /**
     * Transform from CSS pixels (relative to the top-left corner of the map viewport)
     * to rendered pixels on this event's `context`. Only available when a Canvas renderer is used, null otherwise.
     * @type {import("../transform").Transform|undefined}
     * @api
     */
    this.inversePixelTransform = inversePixelTransform;

    /**
     * An object representing the current render frame state.
     * @type {import("../Map").FrameState|undefined}
     * @api
     */
    this.frameState = frameState;

    /**
     * Canvas context. Not available when the event is dispatched by the map. For Canvas 2D layers,
     * the context will be the 2D rendering context.  For WebGL layers, the context will be the WebGL
     * context.
     * @type {CanvasRenderingContext2D|WebGLRenderingContext|undefined}
     * @api
     */
    this.context = context;
  }
}

export default RenderEvent;
