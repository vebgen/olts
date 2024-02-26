import { assert } from '@olts/core/asserts';
import {
    BaseEvent, BaseObject, CombinedOnSignature,
    EventTargetLike, EventType, EventTypes, EventsKey,
    ObjectEvent, ObjectEventType, OnSignature, listen,
    unlistenByKey
} from '@olts/events';
import { Geometry } from '@olts/geometry';
import { StyleFunction, StyleLike } from '@olts/style';


/**
 *
 */
export type FeatureClass = typeof Feature | typeof RenderFeature;


/**
 *
 */
export type FeatureLike = Feature | RenderFeature;


/***
 *
 */
export type FeatureOnSignature<Return> =
    & OnSignature<EventTypes, BaseEvent, Return>
    & OnSignature<ObjectEventType | 'change:geometry', ObjectEvent, Return>
    & CombinedOnSignature<EventTypes | ObjectEventType | 'change:geometry', Return>;


/***
 *
 */
export interface ObjectWithGeometry<G = Geometry> {
    geometry?: G;
    [key: string]: any;
}


/**
 * A vector object for geographic features with a geometry and other attribute
 * properties, similar to the features in vector file formats like GeoJSON.
 *
 * Features can be styled individually with `setStyle`; otherwise they use the
 * style of their vector layer.
 *
 * Note that attribute properties are set as {@link BaseObject} properties on
 * the feature object, so they are observable, and have get/set accessors.
 *
 * Typically, a feature has a single geometry property. You can set the
 * geometry using the `setGeometry` method and get it with `getGeometry`. It is
 * possible to store more than one geometry on a feature using attribute
 * properties. By default, the geometry used for rendering is identified by the
 * property name `geometry`. If you want to use another geometry property for
 * rendering, use the `setGeometryName` method to change the attribute property
 * associated with the geometry for the feature.  For example:
 *
 * ```js
 *
 * import Feature from 'ol/Feature';
 * import { Polygon } from '@olts/geometry';
 * import { Point } from '@olts/geometry';
 *
 * const feature = new Feature({
 *   geometry: new Polygon(polyCoords),
 *   labelPoint: new Point(labelCoords),
 *   name: 'My Polygon',
 * });
 *
 * // get the polygon geometry
 * const poly = feature.getGeometry();
 *
 * // Render the feature as a point using the coordinates from labelPoint
 * feature.setGeometryName('labelPoint');
 *
 * // get the point geometry
 * const point = feature.getGeometry();
 *```
 *
 * @api
 */
export class Feature<G extends Geometry = Geometry> extends BaseObject {
    override on: FeatureOnSignature<EventsKey>;
    override once: FeatureOnSignature<EventsKey>;
    override un: FeatureOnSignature<void>;

    /**
     *
     */
    private id_: number | string | undefined = undefined;

    /**
     *
     */
    private geometryName_: string = 'geometry';

    /**
     * User provided style.
     */
    private style_: StyleLike | undefined = undefined;

    /**
     *
     */
    private styleFunction_: StyleFunction | undefined = undefined;

    /**
     *
     */
    geometryChangeKey_?: EventsKey | null = null;

    /**
     * @param geometryOrProperties
     *     You may pass a Geometry object directly, or an object literal containing
     *     properties. If you pass an object literal, you may include a Geometry
     *     associated with a `geometry` key.
     */
    constructor(geometryOrProperties?: G | ObjectWithGeometry<G>) {
        super();

        this.on = this.onInternal as FeatureOnSignature<EventsKey>;
        this.once = this.onceInternal as FeatureOnSignature<EventsKey>;
        this.un = this.unInternal as FeatureOnSignature<void>;

        this.addChangeListener(this.geometryName_, this.handleGeometryChanged_);

        if (geometryOrProperties) {
            if (typeof (
                (geometryOrProperties as any).getSimplifiedGeometry
            ) === 'function') {
                const geometry = (geometryOrProperties as G);
                this.setGeometry(geometry);
            } else {
                const properties: Record<string, any> = geometryOrProperties;
                this.setProperties(properties);
            }
        }
    }

    /**
     * Clone this feature. If the original feature has a geometry it
     * is also cloned.
     *
     * The feature id is not set in the clone.
     *
     * @return The clone.
     * @api
     */
    clone(): Feature<G> {
        const clone = (
            new Feature(
                this.hasProperties()
                    ? this.getProperties()
                    : {}
            )
        );
        clone.setGeometryName(this.getGeometryName());
        const geometry = this.getGeometry();
        if (geometry) {
            clone.setGeometry(geometry.clone() as G);
        }
        const style = this.getStyle();
        if (style) {
            clone.setStyle(style);
        }
        return clone as Feature<G>;
    }

    /**
     * Get the feature's default geometry.
     *
     * A feature may have any number of named geometries.
     *
     * The "default" geometry (the one that is rendered by default) is set when
     * calling {@link Feature#setGeometry}.
     *
     * @return The default geometry for the feature.
     * @api
     * @observable
     */
    getGeometry(): G | undefined {
        return this.get(this.geometryName_) as G | undefined;
    }

    /**
     * Get the feature identifier.
     *
     * This is a stable identifier for the feature and is either set when
     * reading data from a remote source or set explicitly by calling
     * {@link Feature#setId}.
     *
     * @return Id.
     * @api
     */
    getId(): number | string | undefined {
        return this.id_;
    }

    /**
     * Get the name of the feature's default geometry.
     *
     * By default, the default geometry is named `geometry`.
     *
     * @return Get the property name associated with the default geometry for
     *     this feature.
     * @api
     */
    getGeometryName(): string {
        return this.geometryName_;
    }

    /**
     * Get the feature's style. Will return what was provided to the
     * {@link Feature#setStyle} method.
     *
     * @return The feature style.
     * @api
     */
    getStyle(): StyleLike | undefined {
        return this.style_;
    }

    /**
     * Get the feature's style function.
     *
     * @return Return a function representing the current style of this
     *      feature.
     * @api
     */
    getStyleFunction(): StyleFunction | undefined {
        return this.styleFunction_;
    }

    /**
     *
     */
    private handleGeometryChange_() {
        this.changed();
    }

    /**
     *
     */
    private handleGeometryChanged_() {
        if (this.geometryChangeKey_) {
            unlistenByKey(this.geometryChangeKey_);
            this.geometryChangeKey_ = null;
        }
        const geometry = this.getGeometry() as EventTargetLike;
        if (geometry) {
            this.geometryChangeKey_ = listen(
                geometry,
                EventType.CHANGE,
                this.handleGeometryChange_,
                this,
            );
        }
        this.changed();
    }

    /**
     * Set the default geometry for the feature.
     *
     * This will update the property with the name returned by
     * {@link Feature#getGeometryName}.
     *
     * @param geometry The new geometry.
     * @api
     * @observable
     */
    setGeometry(geometry: G | undefined) {
        this.set(this.geometryName_, geometry);
    }

    /**
     * Set the style for the feature to override the layer style.
     *
     * This can be a single style object, an array of styles, or a function
     * that takes a resolution and returns an array of styles. To unset the
     * feature style, call `setStyle()` without arguments or a falsy value.
     *
     * @param style Style for this feature.
     * @api
     * @fires BaseEvent#event:change
     */
    setStyle(style?: StyleLike) {
        this.style_ = style;
        this.styleFunction_ = !style ? undefined : createStyleFunction(style);
        this.changed();
    }

    /**
     * Set the feature id.
     *
     * The feature id is considered stable and may be used when requesting
     * features or comparing identifiers returned from a remote source.
     *
     * The feature id can be used with the {@link VectorSource#getFeatureById}
     * method.
     *
     * @param {number|string|undefined} id The feature id.
     * @api
     * @fires BaseEvent#event:change
     */
    setId(id: number | string | undefined) {
        this.id_ = id;
        this.changed();
    }

    /**
     * Set the property name to be used when getting the feature's default
     * geometry.
     *
     * When calling {@link Feature#getGeometry}, the value of the property with
     * this name will be returned.
     *
     * @param {string} name The property name of the default geometry.
     * @api
     */
    setGeometryName(name: string) {
        this.removeChangeListener(this.geometryName_, this.handleGeometryChanged_);
        this.geometryName_ = name;
        this.addChangeListener(this.geometryName_, this.handleGeometryChanged_);
        this.handleGeometryChanged_();
    }
}


/**
 * Convert the provided object into a feature style function.
 *
 * Functions passed through unchanged.
 *
 * Arrays of Style or single style objects wrapped in a new feature style
 * function.
 *
 * @param obj A feature style function, a single style, or an array of styles.
 * @return {StyleFunction} A style function.
 */
export function createStyleFunction(
    obj: StyleFunction |any[] | any
): StyleFunction {
    if (typeof obj === 'function') {
        return obj;
    }
    let styles:any[];
    if (Array.isArray(obj)) {
        styles = obj;
    } else {
        assert(
            typeof (obj.getZIndex) === 'function',
            'Expected an `ol/style/Style` or an array of `ol/style/Style.js`',
        );
        const style = obj;
        styles = [style];
    }
    return function () {
        return styles;
    };
}
export default Feature;
