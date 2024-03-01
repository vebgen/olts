import {
    ObjectEventType, CombinedOnSignature,
    EventType, ObjectEvent, OnSignature, BaseEvent
} from '@olts/events';

import { Layer } from "../layer/Layer";
import { Source } from "../source/Source";
import { Collection } from '../Collection';
import { Control } from "../control/Control";
import { Interaction } from "../interaction/Interaction";
import { Overlay } from "../Overlay";
import { MapRenderEventTypes } from '../render/event-type';
import { RenderEvent } from '../render/Event';
import { MapEvent, MapEventType } from "./events";
import { MapBrowserEventType } from './browser-event-types';
import { MapBrowserEvent } from './browser-event';


/**
 *
 */
export interface AtPixelOptions {
    /**
     * Layer filter function.
     *
     * The filter function will receive one argument, the
     * {@link Layer layer-candidate} and it should return a boolean value. Only
     * layers which are visible and for which this function returns `true` will
     * be tested for features.
     *
     * By default, all visible layers will be tested.
     */
    layerFilter?: undefined | ((layer: Layer<Source>) => boolean);

    /**
     * Hit-detection tolerance in css pixels.
     *
     * Pixels inside the radius around the given position will be checked for
     * features.
     */
    hitTolerance?: number;

    /**
     * Check-Wrapped Will check for wrapped geometries inside the range of +/-
     * 1 world width.
     *
     * Works only if a projection is used that can be wrapped.
     */
    checkWrapped?: boolean;
}


/**
 *
 */
export interface MapOptionsInternal {
    /**
     * Controls.
     */
    controls?: Collection<Control>;

    /**
     * Interactions.
     */
    interactions?: Collection<Interaction>;

    /**
     * KeyboardEventTarget.
     */
    keyboardEventTarget: HTMLElement | Document | null;

    /**
     * Overlays.
     */
    overlays: Collection<Overlay>;

    /**
     * Values.
     */
    values: Record<string, any>;
}


/**
 *
 */
export type MapObjectEventTypes =
    | ObjectEventType
    | 'change:layergroup'
    | 'change:size'
    | 'change:target'
    | 'change:view';


/***
 *
 */
export type MapEventHandler<Return> =
    & OnSignature<EventType, BaseEvent, Return>
    & OnSignature<MapObjectEventTypes, ObjectEvent, Return>
    & OnSignature<MapBrowserEventType, MapBrowserEvent, Return>
    & OnSignature<MapEventType, MapEvent, Return>
    & OnSignature<MapRenderEventTypes, RenderEvent, Return>
    & CombinedOnSignature<
        EventType | MapObjectEventTypes |
        MapBrowserEventType | MapEventType |
        MapRenderEventTypes, Return
    >;


export interface ClientPos {
    clientX: number;
    clientY: number;
}
