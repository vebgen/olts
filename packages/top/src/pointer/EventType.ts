import { ValueOf } from "@olts/core";

/**
 * Constants for event names.
 */
export const PointerEventTypes = {
  POINTERMOVE: 'pointermove',
  POINTERDOWN: 'pointerdown',
  POINTERUP: 'pointerup',
  POINTEROVER: 'pointerover',
  POINTEROUT: 'pointerout',
  POINTERENTER: 'pointerenter',
  POINTERLEAVE: 'pointerleave',
  POINTERCANCEL: 'pointercancel',
};


/**
 *
 */
export type PointerEventType = ValueOf<typeof PointerEventTypes>;
