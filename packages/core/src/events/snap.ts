import { Coordinate } from "../defs";
import BaseEvent from "./event";


/**
 * Predefined event types.
 */
export const SnapEventType = {
    /**
     * Triggered upon snapping to vertex or edge
     * @event SnapEvent#snap
     * @api
     */
    SNAP: 'snap',
};


/**
 * Options for the snap event.
 */
export interface Options {

    /**
     * The snapped vertex.
     */
    vertex: Coordinate;

    /**
     * The pixel of the snapped vertex.
     */
    vertexPixel: Coordinate;

    /**
     * The feature being snapped.
     */
    feature: Feature;

    /**
     * Segment, or `null` if snapped to a vertex.
     */
    segment: Coordinate[] | null;
}


/**
 * Events emitted by {@link module:olts/interaction/Snap~Snap} instances are
 * instances of this
 */
export class SnapEvent extends BaseEvent {

    /**
     * The snapped vertex.
     * @api
     */
    vertex: Coordinate;

    /**
     * The pixel of the snapped vertex.
     * @api
     */
    vertexPixel: Coordinate;

    /**
     * The feature being snapped.
     * @api
     */
    feature: Feature;

    /**
     * Segment, or `null` if snapped to a vertex.
     *
     * This is the segment closest to the snapped point, if snapped to
     * a segment.
     * @api
     */
    segment: Coordinate[] | null;

    /**
     * @param {SnapEventType} type Type.
     * @param {Object} options Options.
     */
    constructor(type: typeof SnapEventType, options: Options) {
        super(type);

        this.vertex = options.vertex;
        this.vertexPixel = options.vertexPixel;
        this.feature = options.feature;
        this.segment = options.segment;
    }
}
