import { Coordinate, Pixel } from '@olts/core/coordinate';
import { MapEvent } from './events';
import { FrameState } from './frame-state';
import { Map } from './map';


/**
 * Events emitted as map browser events are instances of this type.
 *
 * See {@link Map} for which events trigger a map browser event.
 */
export class MapBrowserEvent<EVENT extends UIEvent = UIEvent> extends MapEvent {

    /**
     * The original browser event.
     * @api
     */
    originalEvent: EVENT;

    /**
     * The map pixel relative to the viewport corresponding to the original
     * browser event.
     */
    pixel_: Pixel | null = null;

    /**
     * The coordinate in the user projection corresponding to the original
     * browser event.
     */
    coordinate_: Coordinate | null = null;

    /**
     * Indicates if the map is currently being dragged.
     *
     * Only set for `POINTERDRAG` and `POINTERMOVE` events.
     *
     * @default false
     * @api
     */
    dragging: boolean;

    /**
     * The list of pointers that are active on the map.
     */
    activePointers: PointerEvent[] | undefined;

    /**
     * @param type Event type.
     * @param map Map.
     * @param originalEvent Original event.
     * @param dragging Is the map currently being dragged?
     * @param frameState Frame state.
     * @param activePointers Active pointers.
     */
    constructor(
        type: string,
        map: Map,
        originalEvent: EVENT,
        dragging?: boolean,
        frameState?: FrameState,
        activePointers?: PointerEvent[]
    ) {
        super(type, map, frameState);
        this.originalEvent = originalEvent;
        this.dragging = dragging !== undefined ? dragging : false;
        this.activePointers = activePointers;
    }

    /**
     * The map pixel relative to the viewport corresponding to the original
     * event.
     * @api
     */
    get pixel(): Pixel | null {
        if (!this.pixel_) {
            this.pixel_ = this.map.getEventPixel(this.originalEvent);
        }
        return this.pixel_;
    }
    set pixel(pixel) {
        this.pixel_ = pixel;
    }

    /**
     * The coordinate corresponding to the original browser event.
     *
     * This will be in the user projection if one is set.  Otherwise it will be
     * in the view projection.
     * @api
     */
    get coordinate(): Coordinate | null {
        if (!this.coordinate_) {
            const pixel = this.pixel;
            if (pixel === null) {
                return null;
            }
            this.coordinate_ = this.map.getCoordinateFromPixel(pixel);
        }
        return this.coordinate_;
    }
    set coordinate(coordinate) {
        this.coordinate_ = coordinate;
    }

    /**
     * Prevents the default browser action.
     * See https://developer.mozilla.org/en-US/docs/Web/API/event.preventDefault.
     * @api
     */
    override preventDefault() {
        super.preventDefault();
        if ('preventDefault' in this.originalEvent) {
            this.originalEvent.preventDefault();
        }
    }

    /**
     * Prevents further propagation of the current event.
     * See https://developer.mozilla.org/en-US/docs/Web/API/event.stopPropagation.
     * @api
     */
    override stopPropagation() {
        super.stopPropagation();
        if ('stopPropagation' in this.originalEvent) {
            this.originalEvent.stopPropagation();
        }
    }
}


export default MapBrowserEvent;
