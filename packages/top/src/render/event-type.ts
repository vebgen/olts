import { ValueOf } from "@olts/core";

/**
 *
 */
export const RenderEventTypes = {
    /**
     * Triggered before a layer is rendered.
     *
     * @event RenderEvent#prerender
     * @api
     */
    PRERENDER: 'prerender',

    /**
     * Triggered after a layer is rendered.
     *
     * @event RenderEvent#postrender
     * @api
     */
    POSTRENDER: 'postrender',

    /**
     * Triggered before layers are composed.
     *
     * When dispatched by the map, the event object will not have a `context`
     * set. When dispatched by a layer, the event object will have a `context`
     * set. Only WebGL layers currently dispatch this event.
     * @event RenderEvent#precompose
     * @api
     */
    PRECOMPOSE: 'precompose',

    /**
     * Triggered after layers are composed.
     *
     * When dispatched by the map, the event object will not have a `context`
     * set.  When dispatched by a layer, the event object will have a `context`
     * set.  Only WebGL layers currently dispatch this event.
     * @event RenderEvent#postcompose
     * @api
     */
    POSTCOMPOSE: 'postcompose',

    /**
     * Triggered when rendering is complete, i.e. all sources and tiles have
     * finished loading for the current viewport, and all tiles are faded in.
     *
     * The event object will not have a `context` set.
     *
     * @event RenderEvent#rendercomplete
     * @api
     */
    RENDERCOMPLETE: 'rendercomplete',
};


export type RenderEventType = ValueOf<typeof RenderEventTypes>;


export type MapRenderEventTypes =
    | 'postrender'
    | 'precompose'
    | 'postcompose'
    | 'rendercomplete';


export type LayerRenderEventTypes = 'postrender' | 'prerender';
