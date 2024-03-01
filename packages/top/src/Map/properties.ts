import { BaseLayer } from "../layer/Base";
import { LayerGroup } from "../layer/Group";
import { Layer } from "../layer/Layer";
import { Map } from './map';
import type { ValueOf } from "@olts/core";


/**
 * @param layer Layer.
 */
export function removeLayerMapProperty(layer: BaseLayer) {
    if (layer instanceof Layer) {
        layer.setMapInternal(null);
        return;
    }
    if (layer instanceof LayerGroup) {
        layer.getLayers().forEach(removeLayerMapProperty);
    }
}


/**
 * @param layer Layer.
 * @param map Map.
 */
export function setLayerMapProperty(layer: BaseLayer, map: Map) {
    if (layer instanceof Layer) {
        layer.setMapInternal(map);
        return;
    }
    if (layer instanceof LayerGroup) {
        const layers = layer.getLayers().getArray();
        for (let i = 0, ii = layers.length; i < ii; ++i) {
            setLayerMapProperty(layers[i], map);
        }
    }
}


/**
 *
 */
export const MapProperties =  {
    LAYERGROUP: 'layergroup',
    SIZE: 'size',
    TARGET: 'target',
    VIEW: 'view',
} as const;


/**
 *
 */
export type MapProperty = ValueOf<typeof MapProperties>;
