
import { BaseObject, EventTypes, EventsKey, Listener, ObjectEventTypes } from '@olts/events';
import { Collection, CollectionEvent, CollectionEventTypes } from '../Collection';
import CompositeMapRenderer from '../renderer/Composite';
import LayerGroup, { GroupEvent } from '../layer/Group';
import MapBrowserEventHandler from './browser-event-handler';
import { MapBrowserEventTypes } from './browser-event-types';
import MapEvent from './events';
import { MapEventTypes } from './events';
import { PointerEventTypes } from '../pointer/EventType';
import TileQueue, { getTilePriority } from '../TileQueue';
import { View, ViewHints, ViewOptions } from '../view';
import { DEVICE_PIXEL_RATIO, PASSIVE_EVENT_LISTENERS } from '@olts/core/has';
import { TRUE } from '@olts/core/functions';
import {
    Transform,
    apply as applyTransform,
    create as createTransform,
} from '@olts/core/transform';
import {
    Extent,
    clone,
    createOrUpdateEmpty,
    equals as equalsExtent,
    getForViewAndSize,
    isEmpty,
} from '@olts/core/extent';
import { defaults as defaultControls } from '../control/defaults';
import { defaults as defaultInteractions } from '../interaction/defaults';
import { equals } from '@olts/core/array';
import { fromUserCoordinate, toUserCoordinate } from '@olts/core/proj';
import { getUid } from '@olts/core/util';
import { Size, hasArea } from '@olts/core/size';
import { listen, unlistenByKey } from '@olts/events';
import { removeNode } from '@olts/core/dom';
import { warn } from '@olts/core/console';
import { Layer } from '../layer/Layer';
import { AtPixelOptions, ClientPos, MapEventHandler } from './other-defs';
import { MapOptions, createOptionsInternal } from './options';
import { FrameState, PostRenderFunction } from './frame-state';
import { Control } from '../control/Control';
import { Interaction } from '../interaction/Interaction';
import { Overlay } from '../Overlay';
import { MapRenderer } from '../renderer/Map';
import { BaseLayer } from '../layer/Base';
import { MapProperties, removeLayerMapProperty, setLayerMapProperty } from './properties';
import { Coordinate, Pixel } from '@olts/core/coordinate';
import { FeatureLike } from '../Feature';
import { Source } from '../source';
import { SimpleGeometry } from '@olts/geometry';
import { Tile } from '../tile';
import { RenderEventTypes } from '../render/event-type';
import { MapBrowserEvent } from 'packages/top/src/Map/browser-event';
import { FeatureCallback } from '../render/canvas/executor';


/**
 * The map is the core component of OpenLayers. For a map to render, a view,
 * one or more layers, and a target container are needed:
 *
 *     import Map from 'ol/Map';
 *     import View from 'ol/View';
 *     import TileLayer from 'ol/layer/Tile';
 *     import OSM from 'ol/source/OSM';
 *
 *     const map = new Map({
 *       view: new View({
 *         center: [0, 0],
 *         zoom: 1,
 *       }),
 *       layers: [
 *         new TileLayer({
 *           source: new OSM(),
 *         }),
 *       ],
 *       target: 'map',
 *     });
 *
 * The above snippet creates a map using a {@link module:ol/layer/Tile~TileLayer} to
 * display {@link module:ol/source/OSM~OSM} OSM data and render it to a DOM
 * element with the id `map`.
 *
 * The constructor places a viewport container (with CSS class name
 * `ol-viewport`) in the target element (see `getViewport()`), and then two
 * further elements within the viewport: one with CSS class name
 * `ol-overlaycontainer-stopevent` for controls and some overlays, and one with
 * CSS class name `ol-overlaycontainer` for other overlays (see the `stopEvent`
 * option of {@link module:ol/Overlay~Overlay} for the difference). The map
 * itself is placed in a further element within the viewport.
 *
 * Layers are stored as a {@link Collection} in
 * layerGroups. A top-level group is provided by the library. This is what is
 * accessed by `getLayerGroup` and `setLayerGroup`. Layers entered in the
 * options are added to this group, and `addLayer` and `removeLayer` change the
 * layer collection in the group. `getLayers` is a convenience function for
 * `getLayerGroup().getLayers()`. Note that {@link module:ol/layer/Group~LayerGroup}
 * is a subclass of {@link module:ol/layer/Base~BaseLayer}, so layers entered in the
 * options or added with `addLayer` can be groups, which can contain further
 * groups, and so on.
 *
 * @fires MapBrowserEvent
 * @fires MapEvent
 * @fires RenderEvent#precompose
 * @fires RenderEvent#postcompose
 * @fires RenderEvent#rendercomplete
 * @api
 */
export class Map extends BaseObject {

    /**
     *
     */
    protected controls: Collection<Control>;

    /**
     *
     */
    protected interactions: Collection<Interaction>;

    /**
     *
     */
    private renderComplete_: boolean | undefined;

    /**
     *
     */
    private loaded_: boolean = true;

    /**
     *
     */
    private boundHandleBrowserEvent_: (
        browserEvent: UIEvent, type: string
    ) => void;

    /**
     *
     */
    private maxTilesLoading_: number;

    /**
     *
     */
    private pixelRatio_: number;

    /**
     *
     */
    private postRenderTimeoutHandle_: ReturnType<typeof setTimeout> | undefined;

    /**
     *
     */
    private animationDelayKey_: number | undefined;

    /**
     *
     */
    private coordinateToPixelTransform_: Transform;

    /**
     *
     */
    private pixelToCoordinateTransform_: Transform;

    /**
     *
     */
    private frameIndex_: number = 0;

    /**
     *
     */
    private frameState_: FrameState | null = null;

    /**
     * The extent at the previous 'moveend' event.
     */
    private previousExtent_: Extent | null = null;

    /**
     *
     */
    private viewPropertyListenerKey_: EventsKey | null = null;

    /**
     *
     */
    private viewChangeListenerKey_: EventsKey | null = null;

    /**
     *
     */
    private layerGroupPropertyListenerKeys_: EventsKey[] | null = null;

    /**
     *
     */
    private viewport_: HTMLElement;

    /**
     *
     */
    private overlayContainer_: HTMLElement;

    /**
     *
     */
    private overlayContainerStopEvent_: HTMLElement;

    /**
     *
     */
    private mapBrowserEventHandler_: MapBrowserEventHandler | null = null;

    /**
     *
     */
    private moveTolerance_: number;

    /**
     *
     */
    private keyboardEventTarget_: HTMLElement | Document | null;

    /**
     *
     */
    private targetChangeHandlerKeys_: EventsKey[] | null = null;

    /**
     *
     */
    private targetElement_: HTMLElement | null = null;

    /**
     *
     */
    private resizeObserver_: ResizeObserver;

    /**
     *
     */
    private overlays_: Collection<Overlay>;

    /**
     * A lookup of overlays by id.
     */
    private overlayIdIndex_: Record<string, Overlay> = {};

    /**
     *
     */
    private renderer_: MapRenderer | null = null;

    /**
     *
     */
    private postRenderFunctions_: PostRenderFunction[] = [];

    /**
     *
     */
    private tileQueue_: TileQueue;


    /**
     *
     */
    override on: MapEventHandler<EventsKey>;

    /**
     *
     */
    override once: MapEventHandler<EventsKey>;

    /**
     *
     */
    override un: MapEventHandler<void>;

    /**
     * @param {MapOptions} [options] Map options.
     */
    constructor(options: MapOptions) {
        super();
        this.on = this.onInternal as MapEventHandler<EventsKey>;
        this.once = this.onceInternal as MapEventHandler<EventsKey>;
        this.un = this.unInternal as MapEventHandler<void>;

        options = options || {};

        const optionsInternal = createOptionsInternal(options);
        this.boundHandleBrowserEvent_ = this.handleBrowserEvent.bind(this);
        this.maxTilesLoading_ =
            options.maxTilesLoading !== undefined ? options.maxTilesLoading : 16;
        this.pixelRatio_ = options.pixelRatio !== undefined
            ? options.pixelRatio
            : DEVICE_PIXEL_RATIO;
        this.animationDelay_ = this.animationDelay_.bind(this);
        this.coordinateToPixelTransform_ = createTransform();
        this.pixelToCoordinateTransform_ = createTransform();

        this.viewport_ = document.createElement('div');
        this.viewport_.className =
            'ol-viewport' + ('ontouchstart' in window ? ' ol-touch' : '');
        this.viewport_.style.position = 'relative';
        this.viewport_.style.overflow = 'hidden';
        this.viewport_.style.width = '100%';
        this.viewport_.style.height = '100%';

        this.overlayContainer_ = document.createElement('div');
        this.overlayContainer_.style.position = 'absolute';
        this.overlayContainer_.style.zIndex = '0';
        this.overlayContainer_.style.width = '100%';
        this.overlayContainer_.style.height = '100%';
        this.overlayContainer_.style.pointerEvents = 'none';
        this.overlayContainer_.className = 'ol-overlaycontainer';
        this.viewport_.appendChild(this.overlayContainer_);

        this.overlayContainerStopEvent_ = document.createElement('div');
        this.overlayContainerStopEvent_.style.position = 'absolute';
        this.overlayContainerStopEvent_.style.zIndex = '0';
        this.overlayContainerStopEvent_.style.width = '100%';
        this.overlayContainerStopEvent_.style.height = '100%';
        this.overlayContainerStopEvent_.style.pointerEvents = 'none';
        this.overlayContainerStopEvent_.className = 'ol-overlaycontainer-stopevent';
        this.viewport_.appendChild(this.overlayContainerStopEvent_);

        this.moveTolerance_ = options.moveTolerance || 1;
        this.keyboardEventTarget_ = optionsInternal.keyboardEventTarget;

        this.resizeObserver_ = new ResizeObserver(() => this.updateSize());

        this.controls = optionsInternal.controls || defaultControls();
        this.interactions =
            optionsInternal.interactions ||
            defaultInteractions({
                onFocusOnly: true,
            });
        this.overlays_ = optionsInternal.overlays;

        this.tileQueue_ = new TileQueue(
            this.getTilePriority.bind(this),
            this.handleTileChange_.bind(this),
        );

        this.addChangeListener(
            MapProperties.LAYERGROUP,
            this.handleLayerGroupChanged_,
        );
        this.addChangeListener(MapProperties.VIEW, this.handleViewChanged_);
        this.addChangeListener(MapProperties.SIZE, this.handleSizeChanged_);
        this.addChangeListener(MapProperties.TARGET, this.handleTargetChanged_);

        // setProperties will trigger the rendering of the map if the map
        // is "defined" already.
        this.setProperties(optionsInternal.values);

        const map = this;
        if (options.view && !(options.view instanceof View)) {
            options.view.then(function (viewOptions) {
                map.setView(new View(viewOptions));
            });
        }

        this.controls.addEventListener(
            CollectionEventTypes.ADD,
            ((event: CollectionEvent<Control>) => {
                event.element.setMap(this);
            }) as Listener,
        );

        this.controls.addEventListener(
            CollectionEventTypes.REMOVE,
            ((event: CollectionEvent<Control>) => {
                event.element.setMap(null);
            }) as Listener,
        );

        this.interactions.addEventListener(
            CollectionEventTypes.ADD,
            ((event: CollectionEvent<Interaction>) => {
                event.element.setMap(this);
            }) as Listener,
        );

        this.interactions.addEventListener(
            CollectionEventTypes.REMOVE,
            ((event: CollectionEvent<Interaction>) => {
                event.element.setMap(null);
            }) as Listener,
        );

        this.overlays_.addEventListener(
            CollectionEventTypes.ADD,
            ((event: CollectionEvent<Overlay>) => {
                this.addOverlayInternal_(event.element);
            }) as Listener,
        );

        this.overlays_.addEventListener(
            CollectionEventTypes.REMOVE,
            ((event: CollectionEvent<Overlay>) => {
                const id = event.element.getId();
                if (id !== undefined) {
                    delete this.overlayIdIndex_[id.toString()];
                }
                event.element.setMap(null);
            }) as Listener,
        );

        this.controls.forEach((control: Control) => {
            control.setMap(this);
        });

        this.interactions.forEach((interaction: Interaction) => {
            interaction.setMap(this);
        });

        this.overlays_.forEach(this.addOverlayInternal_.bind(this));
    }

    /**
     * Add the given control to the map.
     *
     * @param control Control.
     * @api
     */
    addControl(control: Control) {
        this.getControls().push(control);
    }

    /**
     * Add the given interaction to the map.
     *
     * If you want to add an interaction at another point of the collection use
     * `getInteractions()` and the methods available on {@link Collection}.
     * This can be used to stop the event propagation from the handleEvent
     * function. The interactions get to handle the events in the reverse order
     * of this collection.
     *
     * @param interaction Interaction to add.
     * @api
     */
    addInteraction(interaction: Interaction) {
        this.getInteractions().push(interaction);
    }

    /**
     * Adds the given layer to the top of this map.
     *
     * If you want to add a layer elsewhere in the stack, use `getLayers()` and
     * the methods available on {@link Collection}.
     *
     * @param layer Layer.
     * @api
     */
    addLayer(layer: BaseLayer) {
        const layers = this.getLayerGroup().getLayers();
        layers.push(layer);
    }

    /**
     * @param event The layer add event.
     * @private
     */
    handleLayerAdd_(event: GroupEvent) {
        setLayerMapProperty(event.layer, this);
    }

    /**
     * Add the given overlay to the map.
     *
     * @param overlay Overlay.
     * @api
     */
    addOverlay(overlay: Overlay) {
        this.getOverlays().push(overlay);
    }

    /**
     * This deals with map's overlay collection changes.
     *
     * @param overlay Overlay.
     * @private
     */
    addOverlayInternal_(overlay: Overlay) {
        const id = overlay.getId();
        if (id !== undefined) {
            this.overlayIdIndex_[id.toString()] = overlay;
        }
        overlay.setMap(this);
    }

    /**
     *
     * Clean up.
     */
    override disposeInternal() {
        this.controls.clear();
        this.interactions.clear();
        this.overlays_.clear();
        this.resizeObserver_.disconnect();
        this.setTarget(null);
        super.disposeInternal();
    }

    /**
     * Detect features that intersect a pixel on the viewport, and execute a
     * callback with each intersecting feature.
     *
     * Layers included in the detection can be configured through the
     * `layerFilter` option in `options`.
     *
     * @param pixel Pixel.
     * @param callback Feature callback. The callback will be called with two
     *     arguments. The first argument is one {@link LayerFeature feature} or
     *     {@link LayerRenderFeature render feature} at the pixel, the second
     *     is the {@link LayerLayer layer} of the feature and will be null for
     *     unmanaged layers. To stop detection, callback functions can return a
     *     truthy value.
     * @param options Optional options.
     * @return Callback result, i.e. the return value of last callback
     *      execution, or the first truthy callback return value.
     * @api
     */
    forEachFeatureAtPixel<T>(
        pixel: Pixel,
        callback: FeatureCallback<T>,
        options?: AtPixelOptions
    ): T | undefined {
        if (!this.frameState_ || !this.renderer_) {
            return;
        }
        const coordinate = this.getCoordinateFromPixelInternal(pixel);
        options = options !== undefined ? options : {};
        const hitTolerance =
            options.hitTolerance !== undefined ? options.hitTolerance : 0;
        const layerFilter =
            options.layerFilter !== undefined ? options.layerFilter : TRUE;
        const checkWrapped = options.checkWrapped !== false;
        if (coordinate) {
            return this.renderer_.forEachFeatureAtCoordinate(
                coordinate,
                this.frameState_,
                hitTolerance,
                checkWrapped,
                callback,
                null,
                layerFilter,
                null,
            );
        }
        return undefined;
    }

    /**
     * Get all features that intersect a pixel on the viewport.
     *
     * @param pixel Pixel.
     * @param options Optional options.
     * @return The detected features or an empty array if none were found.
     * @api
     */
    getFeaturesAtPixel(pixel: Pixel, options?: AtPixelOptions): FeatureLike[] {
        const features: FeatureLike[] = [];
        this.forEachFeatureAtPixel(
            pixel,
            function (feature) {
                features.push(feature);
            },
            options,
        );
        return features;
    }

    /**
     * Get all layers from all layer groups.
     *
     * @return Layers.
     * @api
     */
    getAllLayers(): Layer[] {
        const layers: Layer[] = [];
        function addLayersFrom(layerGroup: Collection<BaseLayer>) {
            layerGroup.forEach(function (layer) {
                if (layer instanceof LayerGroup) {
                    addLayersFrom(layer.getLayers());
                } else {
                    layers.push(layer as Layer);
                }
            });
        }
        addLayersFrom(this.getLayers());
        return layers;
    }

    /**
     * Detect if features intersect a pixel on the viewport.
     *
     * Layers included in the detection can be configured through the
     * `layerFilter` option.
     *
     * @param pixel Pixel.
     * @param options Optional options.
     * @return Is there a feature at the given pixel?
     * @api
     */
    hasFeatureAtPixel(pixel: Pixel, options?: AtPixelOptions): boolean {
        if (!this.frameState_ || !this.renderer_) {
            return false;
        }
        const coordinate = this.getCoordinateFromPixelInternal(pixel);
        if (!coordinate) {
            return false;
        }
        options = options !== undefined ? options : {};
        const layerFilter =
            options.layerFilter !== undefined ? options.layerFilter : TRUE;
        const hitTolerance =
            options.hitTolerance !== undefined ? options.hitTolerance : 0;
        const checkWrapped = options.checkWrapped !== false;
        return this.renderer_.hasFeatureAtCoordinate(
            coordinate,
            this.frameState_,
            hitTolerance,
            checkWrapped,
            layerFilter,
            null,
        );
    }

    /**
     * Returns the coordinate in user projection for a browser event.
     *
     * @param event Event.
     * @return Coordinate.
     * @api
     */
    getEventCoordinate(event: MouseEvent): Coordinate | null {
        return this.getCoordinateFromPixel(this.getEventPixel(event));
    }

    /**
     * Returns the coordinate in view projection for a browser event.
     *
     * @param event Event.
     * @return Coordinate.
     */
    getEventCoordinateInternal(event: MouseEvent): Coordinate | null {
        return this.getCoordinateFromPixelInternal(this.getEventPixel(event));
    }

    /**
     * Returns the map pixel position for a browser event relative to the
     * viewport.
     *
     * @param event Event.
     * @return Pixel.
     * @api
     */
    getEventPixel(
        event: UIEvent | ClientPos
    ): Pixel {
        const viewport = this.viewport_;
        const viewportPosition = viewport.getBoundingClientRect();
        const viewportSize = this.getSize()!;
        const scaleX = viewportPosition.width / viewportSize[0];
        const scaleY = viewportPosition.height / viewportSize[1];
        const eventPosition =
            //FIXME Are we really calling this with a TouchEvent anywhere?
            'changedTouches' in event
                ? (event as TouchEvent).changedTouches[0]
                : event;

        return [
            (
                (eventPosition as ClientPos).clientX - viewportPosition.left
            ) / scaleX,
            (
                (eventPosition as ClientPos).clientY - viewportPosition.top
            ) / scaleY,
        ];
    }

    /**
     * Get the target in which this map is rendered.
     *
     * Note that this returns what is entered as an option or in setTarget: if
     * that was an element, it returns an element; if a string, it returns
     * that.
     *
     * @return The Element or id of the Element that the map is rendered in.
     * @observable
     * @api
     */
    getTarget(): HTMLElement | string | undefined {
        return this.get(MapProperties.TARGET);
    }

    /**
     * Get the DOM element into which this map is rendered.
     *
     * In contrast to `getTarget` this method always return an `Element`, or
     * `null` if the map has no target.
     *
     * @return The element that the map is rendered in.
     * @api
     */
    getTargetElement(): HTMLElement | null {
        return this.targetElement_;
    }

    /**
     * Get the coordinate for a given pixel.
     *
     * This returns a coordinate in the user projection.
     *
     * @param pixel Pixel position in the map viewport.
     * @return The coordinate for the pixel position.
     * @api
     */
    getCoordinateFromPixel(pixel: Pixel): Coordinate | null {
        const coord = this.getCoordinateFromPixelInternal(pixel);
        if (!coord) {
            return null;
        }
        return toUserCoordinate(
            coord,
            this.getView().getProjection(),
        );
    }

    /**
     * Get the coordinate for a given pixel.
     *
     * This returns a coordinate in the map view projection.
     *
     * @param pixel Pixel position in the map viewport.
     * @return The coordinate for the pixel position.
     */
    getCoordinateFromPixelInternal(pixel: Pixel): Coordinate | null {
        const frameState = this.frameState_;
        if (!frameState) {
            return null;
        }
        return applyTransform(
            frameState.pixelToCoordinateTransform,
            pixel.slice() as Pixel
        );
    }

    /**
     * Get the map controls.
     *
     * Modifying this collection changes the controls associated with the map.
     *
     * @return Controls.
     * @api
     */
    getControls(): Collection<Control> {
        return this.controls;
    }

    /**
     * Get the map overlays.
     *
     * Modifying this collection changes the overlays associated with the map.
     *
     * @return Overlays.
     * @api
     */
    getOverlays(): Collection<Overlay> {
        return this.overlays_;
    }

    /**
     * Get an overlay by its identifier (the value returned by
     * `overlay.getId()`).
     *
     * Note that the index treats string and numeric identifiers as the same.
     * So `map.getOverlayById(2)` will return an overlay with id `'2'` or `2`.
     *
     * @param id Overlay identifier.
     * @return Overlay.
     * @api
     */
    getOverlayById(id: string | number): Overlay | null {
        const overlay = this.overlayIdIndex_[id.toString()];
        return overlay !== undefined ? overlay : null;
    }

    /**
     * Get the map interactions.
     *
     * Modifying this collection changes the interactions associated with the
     * map.
     *
     * Interactions are used for e.g. pan, zoom and rotate.
     *
     * @return Interactions.
     * @api
     */
    getInteractions(): Collection<Interaction> {
        return this.interactions;
    }

    /**
     * Get the layergroup associated with this map.
     *
     * @return A layer group containing the layers in this map.
     * @observable
     * @api
     */
    getLayerGroup(): LayerGroup {
        return this.get(MapProperties.LAYERGROUP);
    }

    /**
     * Clear any existing layers and add layers to the map.
     *
     * @param layers The layers to be added to the map.
     * @api
     */
    setLayers(layers: BaseLayer[] | Collection<BaseLayer>) {
        const group = this.getLayerGroup();
        if (layers instanceof Collection) {
            group.setLayers(layers);
            return;
        }

        const collection = group.getLayers();
        collection.clear();
        collection.extend(layers);
    }

    /**
     * Get the collection of layers associated with this map.
     *
     * @return Layers.
     * @api
     */
    getLayers(): Collection<BaseLayer> {
        const layers = this.getLayerGroup().getLayers();
        return layers;
    }

    /**
     * @return Layers have sources that are still loading.
     */
    getLoadingOrNotReady(): boolean {
        const layerStatesArray = this.getLayerGroup().getLayerStatesArray();
        for (let i = 0, ii = layerStatesArray.length; i < ii; ++i) {
            const state = layerStatesArray[i];
            if (!state.visible) {
                continue;
            }
            const renderer = state.layer.getRenderer();
            if (renderer && !renderer.ready) {
                return true;
            }
            const source = state.layer.getSource();
            if (source && source.loading) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the pixel for a coordinate.
     *
     * This takes a coordinate in the user projection and returns the
     * corresponding pixel.
     *
     * @param coordinate A map coordinate.
     * @return A pixel position in the map viewport.
     * @api
     */
    getPixelFromCoordinate(coordinate: Coordinate): Pixel | null {
        const viewCoordinate = fromUserCoordinate(
            coordinate,
            this.getView().getProjection(),
        );
        return this.getPixelFromCoordinateInternal(viewCoordinate);
    }

    /**
     * Get the pixel for a coordinate.
     *
     * This takes a coordinate in the map view projection and returns the
     * corresponding pixel.
     *
     * @param coordinate A map coordinate.
     * @return A pixel position in the map viewport.
     */
    getPixelFromCoordinateInternal(coordinate: Coordinate): Pixel | null {
        const frameState = this.frameState_;
        if (!frameState) {
            return null;
        }
        return applyTransform(
            frameState.coordinateToPixelTransform,
            coordinate.slice(0, 2) as Pixel,
        );
    }

    /**
     * Get the map renderer.
     *
     * @return Renderer
     */
    getRenderer(): MapRenderer | null {
        return this.renderer_;
    }

    /**
     * Get the size of this map.
     *
     * @return The size in pixels of the map in the DOM.
     * @observable
     * @api
     */
    getSize(): Size | undefined {
        return this.get(MapProperties.SIZE);
    }

    /**
     * Get the view associated with this map.
     *
     * A view manages properties such as center and resolution.
     *
     * @return The view that controls this map.
     * @observable
     * @api
     */
    getView(): View {
        return this.get(MapProperties.VIEW);
    }

    /**
     * Get the element that serves as the map viewport.
     *
     * @return Viewport.
     * @api
     */
    getViewport(): HTMLElement {
        return this.viewport_;
    }

    /**
     * Get the element that serves as the container for overlays.
     *
     * Elements added to this container will let mousedown and touchstart
     * events through to the map, so clicks and gestures on an overlay will
     * trigger {@link MapBrowserEvent} events.
     *
     * @return The map's overlay container.
     */
    getOverlayContainer(): HTMLElement {
        return this.overlayContainer_;
    }

    /**
     * Get the element that serves as a container for overlays that don't allow
     * event propagation.
     *
     * Elements added to this container won't let mousedown and touchstart
     * events through to the map, so clicks and gestures on an overlay don't
     * trigger any {@link MapBrowserEvent}.
     *
     * @return The map's overlay container that stops events.
     */
    getOverlayContainerStopEvent(): HTMLElement {
        return this.overlayContainerStopEvent_;
    }

    /**
     * @return The document where the map is displayed.
     */
    getOwnerDocument(): Document {
        const targetElement = this.getTargetElement();
        return targetElement ? targetElement.ownerDocument : document;
    }

    /**
     * @param tile Tile.
     * @param tileSourceKey Tile source key.
     * @param tileCenter Tile center.
     * @param tileResolution Tile resolution.
     * @return Tile priority.
     */
    getTilePriority(
        tile: Tile,
        tileSourceKey: string,
        tileCenter: Coordinate,
        tileResolution: number
    ): number {
        return getTilePriority(
            this.frameState_!,
            tile,
            tileSourceKey,
            tileCenter,
            tileResolution,
        );
    }

    /**
     * @param browserEvent Browser event.
     * @param type Type.
     */
    handleBrowserEvent(browserEvent: UIEvent, type?: string) {
        type = type || browserEvent.type;
        const mapBrowserEvent = new MapBrowserEvent(type, this, browserEvent);
        this.handleMapBrowserEvent(mapBrowserEvent);
    }

    /**
     * @param mapBrowserEvent The event to handle.
     */
    handleMapBrowserEvent(mapBrowserEvent: MapBrowserEvent) {
        if (!this.frameState_) {
            // With no view defined, we cannot translate pixels into geographical
            // coordinates so interactions cannot be used.
            return;
        }
        const originalEvent = mapBrowserEvent.originalEvent as PointerEvent;
        const eventType = originalEvent.type;
        if (
            eventType === PointerEventTypes.POINTERDOWN ||
            eventType === EventTypes.WHEEL ||
            eventType === EventTypes.KEYDOWN
        ) {
            const doc = this.getOwnerDocument();
            const rootNode = this.viewport_.getRootNode
                ? this.viewport_.getRootNode()
                : doc;
            const target = originalEvent.target as Node;
            if (
                // Abort if the target is a child of the container for elements
                // whose events are not meant to be handled by map
                // interactions.
                this.overlayContainerStopEvent_.contains(target) ||
                // Abort if the event target is a child of the container that
                // is no longer in the page. It's possible for the target to no
                // longer be in the page if it has been removed in an event
                // listener, this might happen in a Control that recreates it's
                // content based on user interaction either manually or via a
                // render in something like https://reactjs.org/
                !(rootNode === doc
                    ? doc.documentElement
                    : rootNode
                ).contains(target)
            ) {
                return;
            }
        }
        mapBrowserEvent.frameState = this.frameState_;
        if (this.dispatchEvent(mapBrowserEvent) !== false) {
            const interactionsArray = this.getInteractions().getArray().slice();
            for (let i = interactionsArray.length - 1; i >= 0; i--) {
                const interaction = interactionsArray[i];
                if (
                    interaction.getMap() !== this ||
                    !interaction.getActive() ||
                    !this.getTargetElement()
                ) {
                    continue;
                }
                const cont = interaction.handleEvent(mapBrowserEvent);
                if (!cont || mapBrowserEvent.propagationStopped) {
                    break;
                }
            }
        }
    }

    /**
     *
     */
    protected handlePostRender() {
        const frameState = this.frameState_;

        // Manage the tile queue Image loads are expensive and a limited
        // resource, so try to use them efficiently:
        // * When the view is static we allow a large number of parallel tile
        //   loads to complete the frame as quickly as possible.
        // * When animating or interacting, image loads can cause janks, so we
        //   reduce the maximum number of loads per frame and limit the number
        //   of parallel tile loads to remain reactive to view changes and to
        //   reduce the chance of loading tiles that will quickly disappear
        //   from view.
        const tileQueue = this.tileQueue_;
        if (!tileQueue.isEmpty()) {
            let maxTotalLoading = this.maxTilesLoading_;
            let maxNewLoads = maxTotalLoading;
            if (frameState) {
                const hints = frameState.viewHints;
                if (hints[ViewHints.ANIMATING] || hints[ViewHints.INTERACTING]) {
                    const lowOnFrameBudget = Date.now() - frameState.time > 8;
                    maxTotalLoading = lowOnFrameBudget ? 0 : 8;
                    maxNewLoads = lowOnFrameBudget ? 0 : 2;
                }
            }
            if (tileQueue.getTilesLoading() < maxTotalLoading) {
                tileQueue.reprioritize(); // FIXME only call if view has changed
                tileQueue.loadMoreTiles(maxTotalLoading, maxNewLoads);
            }
        }

        if (frameState && this.renderer_ && !frameState.animate) {
            if (this.renderComplete_ === true) {
                if (this.hasListener(RenderEventTypes.RENDERCOMPLETE)) {
                    this.renderer_.dispatchRenderEvent(
                        RenderEventTypes.RENDERCOMPLETE,
                        frameState,
                    );
                }
                if (this.loaded_ === false) {
                    this.loaded_ = true;
                    this.dispatchEvent(
                        new MapEvent(MapEventTypes.LOADEND, this, frameState),
                    );
                }
            } else if (this.loaded_ === true) {
                this.loaded_ = false;
                this.dispatchEvent(
                    new MapEvent(MapEventTypes.LOADSTART, this, frameState),
                );
            }
        }

        const postRenderFunctions = this.postRenderFunctions_;
        for (let i = 0, ii = postRenderFunctions.length; i < ii; ++i) {
            postRenderFunctions[i](this, frameState!);
        }
        postRenderFunctions.length = 0;
    }

    /**
     *
     */
    private handleSizeChanged_() {
        if (this.getView() && !this.getView().getAnimating()) {
            this.getView().resolveConstraints(0);
        }

        this.render();
    }

    /**
     *
     */
    private handleTargetChanged_() {
        if (this.mapBrowserEventHandler_) {
            if (this.targetChangeHandlerKeys_) {
                for (
                    let i = 0,
                    ii = this.targetChangeHandlerKeys_.length; i < ii;
                    ++i
                ) {
                    unlistenByKey(this.targetChangeHandlerKeys_[i]);
                }
            }
            this.targetChangeHandlerKeys_ = null;
            this.viewport_.removeEventListener(
                EventTypes.CONTEXTMENU,
                this.boundHandleBrowserEvent_ as any,
            );
            this.viewport_.removeEventListener(
                EventTypes.WHEEL,
                this.boundHandleBrowserEvent_ as any,
            );
            this.mapBrowserEventHandler_.dispose();
            this.mapBrowserEventHandler_ = null;
            removeNode(this.viewport_);
        }

        if (this.targetElement_) {
            this.resizeObserver_.unobserve(this.targetElement_);
            const rootNode = this.targetElement_.getRootNode();
            if (rootNode instanceof ShadowRoot) {
                this.resizeObserver_.unobserve(rootNode.host);
            }
            this.setSize(undefined);
        }

        // target may be undefined, null, a string or an Element.
        // If it's a string we convert it to an Element before proceeding.
        // If it's not now an Element we remove the viewport from the DOM.
        // If it's an Element we append the viewport element to it.

        const target = this.getTarget();
        const targetElement = typeof target === 'string'
            ? document.getElementById(target)
            : target;
        this.targetElement_ = targetElement || null;
        if (!targetElement) {
            if (this.renderer_) {
                clearTimeout(this.postRenderTimeoutHandle_);
                this.postRenderTimeoutHandle_ = undefined;
                this.postRenderFunctions_.length = 0;
                this.renderer_.dispose();
                this.renderer_ = null;
            }
            if (this.animationDelayKey_) {
                cancelAnimationFrame(this.animationDelayKey_);
                this.animationDelayKey_ = undefined;
            }
        } else {
            targetElement.appendChild(this.viewport_);
            if (!this.renderer_) {
                this.renderer_ = new CompositeMapRenderer(this);
            }

            this.mapBrowserEventHandler_ = new MapBrowserEventHandler(
                this,
                this.moveTolerance_,
            );
            for (const key in MapBrowserEventTypes) {
                this.mapBrowserEventHandler_.addEventListener(
                    MapBrowserEventTypes[
                    key as keyof typeof MapBrowserEventTypes
                    ],
                    this.handleMapBrowserEvent.bind(this) as any,
                );
            }
            this.viewport_.addEventListener(
                EventTypes.CONTEXTMENU,
                this.boundHandleBrowserEvent_ as any,
                false,
            );
            this.viewport_.addEventListener(
                EventTypes.WHEEL,
                this.boundHandleBrowserEvent_ as any,
                PASSIVE_EVENT_LISTENERS ? { passive: false } : false,
            );

            const keyboardEventTarget = !this.keyboardEventTarget_
                ? targetElement
                : this.keyboardEventTarget_;
            this.targetChangeHandlerKeys_ = [
                listen(
                    keyboardEventTarget,
                    EventTypes.KEYDOWN,
                    this.handleBrowserEvent as any,
                    this,
                ),
                listen(
                    keyboardEventTarget,
                    EventTypes.KEYPRESS,
                    this.handleBrowserEvent as any,
                    this,
                ),
            ];
            const rootNode = targetElement.getRootNode();
            if (rootNode instanceof ShadowRoot) {
                this.resizeObserver_.observe(rootNode.host);
            }
            this.resizeObserver_.observe(targetElement);
        }

        this.updateSize();
        // updateSize calls setSize, so no need to call this.render
        // ourselves here.
    }

    /**
     *
     */
    private handleTileChange_() {
        this.render();
    }

    /**
     *
     */
    private handleViewPropertyChanged_() {
        this.render();
    }

    /**
     *
     */
    private handleViewChanged_() {
        if (this.viewPropertyListenerKey_) {
            unlistenByKey(this.viewPropertyListenerKey_);
            this.viewPropertyListenerKey_ = null;
        }
        if (this.viewChangeListenerKey_) {
            unlistenByKey(this.viewChangeListenerKey_);
            this.viewChangeListenerKey_ = null;
        }
        const view = this.getView();
        if (view) {
            this.updateViewportSize_(this.getSize());

            this.viewPropertyListenerKey_ = listen(
                view,
                ObjectEventTypes.PROPERTYCHANGE,
                this.handleViewPropertyChanged_,
                this,
            );
            this.viewChangeListenerKey_ = listen(
                view,
                EventTypes.CHANGE,
                this.handleViewPropertyChanged_,
                this,
            );

            view.resolveConstraints(0);
        }
        this.render();
    }

    /**
     *
     */
    private handleLayerGroupChanged_() {
        if (this.layerGroupPropertyListenerKeys_) {
            this.layerGroupPropertyListenerKeys_.forEach(unlistenByKey);
            this.layerGroupPropertyListenerKeys_ = null;
        }
        const layerGroup = this.getLayerGroup();
        if (layerGroup) {
            this.handleLayerAdd_(new GroupEvent('addlayer', layerGroup));
            this.layerGroupPropertyListenerKeys_ = [
                listen(
                    layerGroup, ObjectEventTypes.PROPERTYCHANGE,
                    this.render, this
                ),
                listen(
                    layerGroup, EventTypes.CHANGE,
                    this.render, this
                ),
                listen(
                    layerGroup, 'addlayer',
                    this.handleLayerAdd_ as any, this
                ),
                listen(
                    layerGroup, 'removelayer',
                    this.handleLayerRemove_ as any, this
                ),
            ];
        }
        this.render();
    }

    /**
     * @return Is rendered.
     */
    isRendered(): boolean {
        return !!this.frameState_;
    }

    /**
     *
     */
    private animationDelay_() {
        this.animationDelayKey_ = undefined;
        this.renderFrame_(Date.now());
    }

    /**
     * Requests an immediate render in a synchronous manner.
     * @api
     */
    renderSync() {
        if (this.animationDelayKey_) {
            cancelAnimationFrame(this.animationDelayKey_);
        }
        this.animationDelay_();
    }

    /**
     * Redraws all text after new fonts have loaded.
     */
    redrawText() {
        const layerStates = this.getLayerGroup().getLayerStatesArray();
        for (let i = 0, ii = layerStates.length; i < ii; ++i) {
            const layer = layerStates[i].layer;
            if (layer.hasRenderer()) {
                layer.getRenderer().handleFontsChanged();
            }
        }
    }

    /**
     * Request a map rendering (at the next animation frame).
     * @api
     */
    render() {
        if (this.renderer_ && this.animationDelayKey_ === undefined) {
            this.animationDelayKey_ = requestAnimationFrame(
                this.animationDelay_
            );
        }
    }

    /**
     * This method is meant to be called in a layer's `prerender` listener.
     *
     * It causes all collected declutter items to be de-cluttered and rendered
     * on the map immediately. This is useful for layers that need to appear
     * entirely above the de-cluttered items of layers lower in the layer
     * stack.
     * @api
     */
    flushDeclutterItems() {
        const frameState = this.frameState_;
        if (!frameState || !this.renderer_) {
            return;
        }
        this.renderer_.flushDeclutterItems(frameState);
    }

    /**
     * Remove the given control from the map.
     *
     * @param control Control.
     * @return The removed control (or undefined if the control was not found).
     * @api
     */
    removeControl(control: Control): Control | undefined {
        return this.getControls().remove(control);
    }

    /**
     * Remove the given interaction from the map.
     *
     * @param interaction Interaction to remove.
     * @return The removed interaction (or undefined if the interaction was not
     *     found).
     * @api
     */
    removeInteraction(interaction: Interaction): Interaction | undefined {
        return this.getInteractions().remove(interaction);
    }

    /**
     * Removes the given layer from the map.
     *
     * @param layer Layer.
     * @return The removed layer (or undefined if the layer was not found).
     * @api
     */
    removeLayer(layer: BaseLayer): BaseLayer | undefined {
        const layers = this.getLayerGroup().getLayers();
        return layers.remove(layer);
    }

    /**
     * @param event The layer remove event.
     * @private
     */
    handleLayerRemove_(event: GroupEvent) {
        removeLayerMapProperty(event.layer);
    }

    /**
     * Remove the given overlay from the map.
     *
     * @param overlay Overlay.
     * @return The removed overlay (or undefined if the overlay was not found).
     * @api
     */
    removeOverlay(overlay: Overlay): Overlay | undefined {
        return this.getOverlays().remove(overlay);
    }

    /**
     * @param time Time.
     * @private
     */
    renderFrame_(time: number) {
        const size = this.getSize();
        const view = this.getView();
        const previousFrameState = this.frameState_;
        /** @type {?FrameState} */
        let frameState: FrameState | null = null;
        if (size !== undefined && hasArea(size) && view && view.isDef()) {
            const viewHints = view.getHints(
                this.frameState_ ? this.frameState_.viewHints : undefined,
            );
            const viewState = view.getState();
            frameState = {
                animate: false,
                coordinateToPixelTransform: this.coordinateToPixelTransform_,
                declutterTree: null,
                extent: getForViewAndSize(
                    viewState.center,
                    viewState.resolution,
                    viewState.rotation,
                    size,
                ),
                index: this.frameIndex_++,
                layerIndex: 0,
                layerStatesArray: this.getLayerGroup().getLayerStatesArray(),
                pixelRatio: this.pixelRatio_,
                pixelToCoordinateTransform: this.pixelToCoordinateTransform_,
                postRenderFunctions: [],
                size: size,
                tileQueue: this.tileQueue_,
                time: time,
                usedTiles: {},
                viewState: viewState,
                viewHints: viewHints,
                wantedTiles: {},
                mapId: getUid(this),
                renderTargets: {},
            };
            if (viewState.nextCenter && viewState.nextResolution) {
                const rotation = isNaN(viewState.nextRotation!)
                    ? viewState.rotation
                    : viewState.nextRotation;

                frameState.nextExtent = getForViewAndSize(
                    viewState.nextCenter,
                    viewState.nextResolution,
                    rotation!,
                    size,
                );
            }
        }

        this.frameState_ = frameState;
        this.renderer_!.renderFrame(frameState);

        if (frameState) {
            if (frameState.animate) {
                this.render();
            }
            Array.prototype.push.apply(
                this.postRenderFunctions_,
                frameState.postRenderFunctions,
            );

            if (previousFrameState) {
                const moveStart =
                    !this.previousExtent_ ||
                    (!isEmpty(this.previousExtent_) &&
                        !equalsExtent(frameState.extent!, this.previousExtent_));
                if (moveStart) {
                    this.dispatchEvent(
                        new MapEvent(MapEventTypes.MOVESTART, this, previousFrameState),
                    );
                    this.previousExtent_ = createOrUpdateEmpty(this.previousExtent_!);
                }
            }

            const idle =
                this.previousExtent_ &&
                !frameState.viewHints[ViewHints.ANIMATING] &&
                !frameState.viewHints[ViewHints.INTERACTING] &&
                !equalsExtent(frameState.extent!, this.previousExtent_);

            if (idle) {
                this.dispatchEvent(
                    new MapEvent(MapEventTypes.MOVEEND, this, frameState),
                );
                clone(frameState.extent!, this.previousExtent_!);
            }
        }

        this.dispatchEvent(new MapEvent(MapEventTypes.POSTRENDER, this, frameState));

        this.renderComplete_ =
            this.hasListener(MapEventTypes.LOADSTART) ||
                this.hasListener(MapEventTypes.LOADEND) ||
                this.hasListener(RenderEventTypes.RENDERCOMPLETE)
                ? !this.tileQueue_.getTilesLoading() &&
                !this.tileQueue_.getCount() &&
                !this.getLoadingOrNotReady()
                : undefined;

        if (!this.postRenderTimeoutHandle_) {
            this.postRenderTimeoutHandle_ = setTimeout(() => {
                this.postRenderTimeoutHandle_ = undefined;
                this.handlePostRender();
            }, 0);
        }
    }

    /**
     * Sets the layergroup of this map.
     *
     * @param layerGroup A layer group containing the layers in this map.
     * @observable
     * @api
     */
    setLayerGroup(layerGroup: LayerGroup) {
        const oldLayerGroup = this.getLayerGroup();
        if (oldLayerGroup) {
            this.handleLayerRemove_(
                new GroupEvent('removelayer', oldLayerGroup)
            );
        }
        this.set(MapProperties.LAYERGROUP, layerGroup);
    }

    /**
     * Set the size of this map.
     *
     * @param size The size in pixels of the map in the DOM.
     * @observable
     * @api
     */
    setSize(size: Size | undefined) {
        this.set(MapProperties.SIZE, size);
    }

    /**
     * Set the target element to render this map into.
     *
     * @param target The Element or id of the Element
     *     that the map is rendered in.
     * @observable
     * @api
     */
    setTarget(target?: HTMLElement | string | null) {
        this.set(MapProperties.TARGET, target);
    }

    /**
     * Set the view for this map.
     *
     * @param view The view that controls this map. It is also possible to pass
     *      a promise that resolves to options for constructing a view.  This
     *      alternative allows view properties to be resolved by sources or
     *      other components that load view-related metadata.
     * @observable
     * @api
     */
    setView(view: View | Promise<ViewOptions>) {
        if (!view || view instanceof View) {
            this.set(MapProperties.VIEW, view);
            return;
        }
        this.set(MapProperties.VIEW, new View());

        const map = this;
        view.then(function (viewOptions) {
            map.setView(new View(viewOptions));
        });
    }

    /**
     * Force a recalculation of the map viewport size.
     *
     * This should be called when third-party code changes the size of the map
     * viewport.
     * @api
     */
    updateSize() {
        const targetElement = this.getTargetElement();

        let size: Size | undefined = undefined;
        if (targetElement) {
            const computedStyle = getComputedStyle(targetElement);
            const width =
                targetElement.offsetWidth -
                parseFloat(computedStyle['borderLeftWidth']) -
                parseFloat(computedStyle['paddingLeft']) -
                parseFloat(computedStyle['paddingRight']) -
                parseFloat(computedStyle['borderRightWidth']);
            const height =
                targetElement.offsetHeight -
                parseFloat(computedStyle['borderTopWidth']) -
                parseFloat(computedStyle['paddingTop']) -
                parseFloat(computedStyle['paddingBottom']) -
                parseFloat(computedStyle['borderBottomWidth']);
            if (!isNaN(width) && !isNaN(height)) {
                size = [width, height];
                if (
                    !hasArea(size) &&
                    !!(
                        targetElement.offsetWidth ||
                        targetElement.offsetHeight ||
                        targetElement.getClientRects().length
                    )
                ) {
                    warn(
                        "No map visible because the map container's width " +
                        "or height are 0.",
                    );
                }
            }
        }

        const oldSize = this.getSize();
        if (size && (!oldSize || !equals(size, oldSize))) {
            this.setSize(size as Size);
            this.updateViewportSize_(size);
        }
    }

    /**
     * Recomputes the viewport size and save it on the view object (if any).
     *
     * @param size The size.
     * @private
     */
    updateViewportSize_(size: Size | undefined) {
        const view = this.getView();
        if (view) {
            view.setViewportSize(size);
        }
    }
}


export default Map;
