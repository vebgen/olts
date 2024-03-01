import { Geometry, SimpleGeometry } from '@olts/geometry';
import { TRUE } from '@olts/core/functions';
import { Disposable } from '@olts/core/disposable';
import { compose as composeTransform, makeInverse } from '@olts/core/transform';
import { Extent, getWidth, wrapX } from '@olts/core/extent';
import { sharedIconImageCache as iconImageCache } from '@olts/style';
import { Coordinate } from '@olts/core/coordinate';
import { EventType } from '@olts/events';

import { Layer, inView } from '../layer/Layer';
import { FeatureCallback } from '../render/canvas/executor';
import { FeatureLike } from '../Feature';
import { FrameState, Map } from '../Map';
import { RenderEventType } from '../render/event-type';


/**
 *
 */
export interface HitMatch<T> {
    /**
     * Feature.
     */
    feature: FeatureLike;

    /**
     * Layer.
     */
    layer: Layer;

    /**
     * Geometry.
     */
    geometry: SimpleGeometry;

    /**
     * Squared distance.
     */
    distanceSq: number;

    /**
     * Callback.
     */
    callback: FeatureCallback<T>;
}



/**
 *
 */
export abstract class MapRenderer extends Disposable {
    /**
     *
     */
    private map_: Map;

    /**
     * @param map Map.
     */
    constructor(map: Map) {
        super();
        this.map_ = map;
    }

    /**
     * @param type Event type.
     * @param frameState Frame state.
     */
    abstract dispatchRenderEvent(
        type: EventType | RenderEventType,
        frameState: FrameState
    ): void;

    /**
     * @param frameState FrameState.
     * @
     */
    protected calculateMatrices2D(frameState: FrameState) {
        const viewState = frameState.viewState;
        const coordinateToPixelTransform = frameState.coordinateToPixelTransform;
        const pixelToCoordinateTransform = frameState.pixelToCoordinateTransform;

        composeTransform(
            coordinateToPixelTransform,
            frameState.size[0] / 2,
            frameState.size[1] / 2,
            1 / viewState.resolution,
            -1 / viewState.resolution,
            -viewState.rotation,
            -viewState.center[0],
            -viewState.center[1],
        );

        makeInverse(pixelToCoordinateTransform, coordinateToPixelTransform);
    }

    /**
     * @param coordinate Coordinate.
     * @param frameState FrameState.
     * @param hitTolerance Hit tolerance in pixels.
     * @param checkWrapped Check for wrapped geometries.
     * @param {import("./vector").FeatureCallback<T>} callback Feature callback.
     * @param {S} thisArg Value to use as `this` when executing `callback`.
     * @param {function(this: U, Layer): boolean} layerFilter Layer filter
     *     function, only layers which are visible and for which this function
     *     returns `true` will be tested for features.  By default, all visible
     *     layers will be tested.
     * @param {U} thisArg2 Value to use as `this` when executing `layerFilter`.
     * @return {T|undefined} Callback result.
     * @template S,T,U
     */
    forEachFeatureAtCoordinate<S, T, U>(
        coordinate: Coordinate,
        frameState: FrameState,
        hitTolerance: number,
        checkWrapped: boolean,
        callback: FeatureCallback<T>,
        thisArg: S,
        layerFilter: (this: U, arg1: Layer) => boolean,
        thisArg2: U,
    ): T | undefined {
        let result;
        const viewState = frameState.viewState;

        /**
         * @param managed Managed layer.
         * @param feature Feature.
         * @param layer Layer.
         * @param geometry Geometry.
         * @return Callback result.
         */
        function forEachFeatureAtCoordinate(
            managed: boolean,
            feature: FeatureLike,
            layer: Layer,
            geometry: Geometry
        ): T | undefined {
            // TODO something is wrong here. See usage.
            // The original definition does not have the layer parameter.
            return callback.call(
                thisArg, feature, managed ? layer : null, geometry
            );
        }

        const projection = viewState.projection;


        // TODO: see if viewState.projection can be string.
        // It can according to the type.
        const translatedCoordinate = wrapX(
            coordinate.slice() as Extent, projection
        );
        const offsets = [[0, 0]];
        if (projection.canWrapX() && checkWrapped) {
            const projectionExtent = projection.getExtent();
            const worldWidth = getWidth(projectionExtent);
            offsets.push([-worldWidth, 0], [worldWidth, 0]);
        }

        const layerStates = frameState.layerStatesArray;
        const numLayers = layerStates.length;

        const matches: HitMatch<T>[] = [];
        const tmpCoord = [];
        for (let i = 0; i < offsets.length; i++) {
            for (let j = numLayers - 1; j >= 0; --j) {
                const layerState = layerStates[j];
                const layer = layerState.layer;
                if (
                    layer.hasRenderer() &&
                    inView(layerState, viewState) &&
                    layerFilter.call(thisArg2, layer)
                ) {
                    const layerRenderer = layer.getRenderer();
                    const source = layer.getSource();
                    if (layerRenderer && source) {
                        const coordinates = source.getWrapX()
                            ? translatedCoordinate
                            : coordinate;
                        const callback = forEachFeatureAtCoordinate.bind(
                            null,
                            layerState.managed,
                        );
                        tmpCoord[0] = coordinates[0] + offsets[i][0];
                        tmpCoord[1] = coordinates[1] + offsets[i][1];
                        result = layerRenderer.forEachFeatureAtCoordinate(
                            tmpCoord,
                            frameState,
                            hitTolerance,
                            callback,
                            matches,
                        );
                    }
                    if (result) {
                        return result;
                    }
                }
            }
        }
        if (matches.length === 0) {
            return undefined;
        }
        const order = 1 / matches.length;
        matches.forEach((m, i) => (m.distanceSq += i * order));
        matches.sort((a, b) => a.distanceSq - b.distanceSq);
        matches.some((m) => {
            // TODO something is wrong here. See usage.
            // The original definition does not have the layer parameter.
            return (result = m.callback(m.feature, m.layer, m.geometry));
        });
        return result;
    }

    /**
     * @param coordinate Coordinate.
     * @param frameState FrameState.
     * @param hitTolerance Hit tolerance in pixels.
     * @param checkWrapped Check for wrapped geometries.
     * @param layerFilter Layer filter function, only layers which are visible
     *     and for which this function returns `true` will be tested for
     *     features.  By default, all visible layers will be tested.
     * @param thisArg Value to use as `this` when executing `layerFilter`.
     * @return Is there a feature at the given coordinate?
     */
    hasFeatureAtCoordinate<U>(
        coordinate: Coordinate,
        frameState: FrameState,
        hitTolerance: number,
        checkWrapped: boolean,
        layerFilter: (this: U, arg1: Layer) => boolean,
        thisArg: U,
    ): boolean {
        const hasFeature = this.forEachFeatureAtCoordinate(
            coordinate,
            frameState,
            hitTolerance,
            checkWrapped,
            TRUE,
            this,
            layerFilter,
            thisArg,
        );

        return hasFeature !== undefined;
    }

    /**
     * @return Map.
     */
    getMap(): Map {
        return this.map_;
    }

    /**
     * Render.
     *
     * @param frameState Frame state.
     */
    abstract renderFrame(frameState: FrameState | null): void;

    /**
     * @param frameState Frame state.
     */
    flushDeclutterItems(frameState: FrameState) { }

    /**
     * @param frameState Frame state.
     */
    protected scheduleExpireIconCache(frameState: FrameState) {
        if (iconImageCache.canExpireCache()) {
            frameState.postRenderFunctions.push(expireIconCache);
        }
    }
}


/**
 * @param map Map.
 * @param frameState Frame state.
 */
function expireIconCache(map: Map, frameState?: FrameState) {
    iconImageCache.expire();
}


export default MapRenderer;
