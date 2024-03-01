import { assert } from "@olts/core/asserts";

import { Collection } from "../Collection";
import { Overlay } from "../Overlay";
import { View, ViewOptions } from "../view";
import { Control } from "../control/Control";
import { Interaction } from "../interaction/Interaction";
import { LayerGroup } from "../layer/Group";
import { BaseLayer } from "../layer/Base";
import { MapOptionsInternal } from "./other-defs";
import { MapProperties } from "./properties";


/**
 * Object literal with config options for the map.
 */
export interface MapOptions {
    /**
     * Controls initially added to the map.
     *
     * If not specified, the default list is used.
     */
    controls?: Collection<Control> | Control[];

    /**
     * The ratio between physical pixels and device-independent pixels (dips)
     * on the device.
     */
    pixelRatio?: number;

    /**
     * Interactions that are initially added to the map.
     *
     * If not specified, the default list is used.
     */
    interactions?: Collection<Interaction> | Interaction[];

    /**
     * The element to listen to keyboard events on.
     *
     * This determines when the `KeyboardPan` and `KeyboardZoom` interactions
     * trigger. For example, if this option is set to `document` the keyboard
     * interactions will always trigger. If this option is not specified, the
     * element the library listens to keyboard events on is the map target
     * (i.e. the user-provided div for the map). If this is not `document`, the
     * target element needs to be focused for key events to be emitted,
     * requiring that the target element has a `tabindex` attribute.
     */
    keyboardEventTarget?: HTMLElement | Document | string;

    /**
     * Layers.
     *
     * If this is not defined, a map with no layers will be rendered. Note that
     * layers are rendered in the order supplied, so if you want, for example, a
     * vector layer to appear on top of a tile layer, it must come after the tile
     * layer.
     */
    layers?: BaseLayer[] | Collection<BaseLayer> | LayerGroup;

    /**
     * Maximum number tiles to load simultaneously.
     *
     * @default 16
     */
    maxTilesLoading?: number;

    /**
     * The minimum distance in pixels the cursor must move to be detected as a
     * map move event instead of a click.
     *
     * Increasing this value can make it easier to click on the map.
     *
     * @default 1
     */
    moveTolerance?: number;

    /**
     * Overlays initially added to the map.
     *
     * By default, no overlays are added.
     */
    overlays?: Collection<Overlay> | Overlay[];

    /**
     * The container for the map, either the element itself or the `id` of the
     * element.
     *
     * If not specified at construction time, {@link Map#setTarget} must be
     * called for the map to be rendered. If passed by element, the container
     * can be in a secondary document.
     *
     * **Note:** CSS `transform` support for the target element is limited to
     * `scale`.
     */
    target?: HTMLElement | string;

    /**
     * The map's view.
     *
     * No layer sources will be fetched unless this is specified at
     * construction time or through {@link Map#setView}.
     */
    view?: View | Promise<ViewOptions>;
}


/**
 * @param options Map options.
 * @return Internal map options.
 */
export function createOptionsInternal(options: MapOptions): MapOptionsInternal {
    let keyboardEventTarget: HTMLElement | Document | null = null;
    if (options.keyboardEventTarget !== undefined) {
        keyboardEventTarget =
            typeof options.keyboardEventTarget === 'string'
                ? document.getElementById(options.keyboardEventTarget)
                : options.keyboardEventTarget;
    }

    const values: Record<string, any> = {};

    const layerGroup =
        options.layers &&
            typeof (options.layers as any).getLayers === 'function'
            ? options.layers as LayerGroup
            : new LayerGroup({
                layers: options.layers as Collection<BaseLayer> | BaseLayer[],
            });
    values[MapProperties.LAYERGROUP] = layerGroup;
    values[MapProperties.TARGET] = options.target;
    values[MapProperties.VIEW] = options.view instanceof View
        ? options.view
        : new View();

    let controls: Collection<Control> | undefined = undefined;
    if (options.controls !== undefined) {
        if (Array.isArray(options.controls)) {
            controls = new Collection(options.controls.slice());
        } else {
            assert(
                typeof ((options.controls).getArray) === 'function',
                'Expected `controls` to be an array or an `ol/Collection`',
            );
            controls = options.controls;
        }
    }

    let interactions: Collection<Interaction> | undefined = undefined;
    if (options.interactions !== undefined) {
        if (Array.isArray(options.interactions)) {
            interactions = new Collection(options.interactions.slice());
        } else {
            assert(
                typeof ((options.interactions).getArray) ===
                'function',
                'Expected `interactions` to be an array or an `ol/Collection`',
            );
            interactions = options.interactions;
        }
    }

    let overlays: Collection<Overlay> | undefined = undefined;
    if (options.overlays !== undefined) {
        if (Array.isArray(options.overlays)) {
            overlays = new Collection(options.overlays.slice());
        } else {
            assert(
                typeof ((options.overlays).getArray) === 'function',
                'Expected `overlays` to be an array or an `ol/Collection`',
            );
            overlays = options.overlays;
        }
    } else {
        overlays = new Collection();
    }

    return {
        controls,
        interactions,
        keyboardEventTarget,
        overlays,
        values,
    };
}
