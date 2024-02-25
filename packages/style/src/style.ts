import { assert } from '@olts/core/asserts';
import { Coordinate } from '@olts/core/coordinate';
import { Color } from '@olts/core/color';

import { CircleStyle } from './circle';
import { Fill } from './fill';
import { ImageStyle } from './image';
import { Text } from './text';
import { Stroke } from './stroke';
import { Geometry, GeometryType } from '@olts/geometry';


/**
 * A function that takes an {@link Feature} and a `{number}`
 * representing the view's resolution.
 *
 * @param feature Feature to style.
 * @param resolution Resolution (map units per pixel).
 * @returns Style or array of styles for the feature. This way e.g. a
 * vector layer can be styled. If the function returns `undefined`, the
 * feature will not be rendered.
 */
export type StyleFunction = (
    feature: FeatureLike,
    resolution: number
) => (Style | Style[] | undefined);


/**
 * A {@link Style}, an array of {@link Style}, or a {@link StyleFunction}.
 */
export type StyleLike = Style | Style[] | StyleFunction;


/**
 * A function that takes an {@link Feature} as argument and returns an
 * {@link Geometry} that will be rendered and styled for the feature.
 */
export type GeometryFunction = (
    feature: FeatureLike
) => (Geometry | Feature | undefined);


/**
 * Custom renderer function. Takes two arguments:
 *
 * @param coordinates The pixel coordinates of the geometry in GeoJSON notation.
 * @param state The {@link State} of the layer renderer.
 */
export type RenderFunction = (
    coordinates: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][],
    state: State,
) => void;


/**
 * Options for a style.
 */
export interface Options {
    /**
     * Feature property or geometry or function returning a geometry to render
     * for this style.
     */
    geometry?: string | Geometry | GeometryFunction;

    /**
     * Fill style.
     */
    fill?: Fill;

    /**
     * Image style.
     */
    image?: ImageStyle;

    /**
     * Custom renderer.
     *
     * When configured, `fill`, `stroke` and `image` will be ignored, and the
     * provided function will be called with each render frame for each
     * geometry.
     */
    renderer?: RenderFunction;

    /**
     * Custom renderer for hit detection.
     *
     * If provided will be used in hit detection rendering.
     */
    hitDetectionRenderer?: RenderFunction;

    /**
     * Stroke style.
     */
    stroke?: Stroke;

    /**
     * Text style.
     */
    text?: Text;

    /**
     * Z index.
     */
    zIndex?: number;
}


/**
 * Container for vector feature rendering styles.
 *
 * Any changes made to the style or its children through `set*()` methods will
 * not take effect until the feature or layer that uses the style is
 * re-rendered.
 *
 * ## Feature styles
 *
 * If no style is defined, the following default style is used:
 * ```js
 *  import {Circle, Fill, Stroke, Style} from 'ol/style';
 *
 *  const fill = new Fill({
 *    color: 'rgba(255,255,255,0.4)',
 *  });
 *  const stroke = new Stroke({
 *    color: '#3399CC',
 *    width: 1.25,
 *  });
 *  const styles = [
 *    new Style({
 *      image: new Circle({
 *        fill: fill,
 *        stroke: stroke,
 *        radius: 5,
 *      }),
 *      fill: fill,
 *      stroke: stroke,
 *    }),
 *  ];
 * ```
 *
 * A separate editing style has the following defaults:
 * ```js
 *  import {Circle, Fill, Stroke, Style} from 'ol/style';
 *
 *  const styles = {};
 *  const white = [255, 255, 255, 1];
 *  const blue = [0, 153, 255, 1];
 *  const width = 3;
 *  styles['Polygon'] = [
 *    new Style({
 *      fill: new Fill({
 *        color: [255, 255, 255, 0.5],
 *      }),
 *    }),
 *  ];
 *  styles['MultiPolygon'] =
 *      styles['Polygon'];
 *  styles['LineString'] = [
 *    new Style({
 *      stroke: new Stroke({
 *        color: white,
 *        width: width + 2,
 *      }),
 *    }),
 *    new Style({
 *      stroke: new Stroke({
 *        color: blue,
 *        width: width,
 *      }),
 *    }),
 *  ];
 *  styles['MultiLineString'] = styles['LineString'];
 *
 *  styles['Circle'] = styles['Polygon'].concat(
 *    styles['LineString']
 *  );
 *
 *  styles['Point'] = [
 *    new Style({
 *      image: new Circle({
 *        radius: width * 2,
 *        fill: new Fill({
 *          color: blue,
 *        }),
 *        stroke: new Stroke({
 *          color: white,
 *          width: width / 2,
 *        }),
 *      }),
 *      zIndex: Infinity,
 *    }),
 *  ];
 *  styles['MultiPoint'] =
 *      styles['Point'];
 *  styles['GeometryCollection'] =
 *      styles['Polygon'].concat(
 *          styles['LineString'],
 *          styles['Point']
 *      );
 * ```
 *
 * @api
 */
export class Style {
    /**
     * Feature property or geometry or function returning a geometry to render
     * for this style.
     */
    private geometry_: string | Geometry | GeometryFunction | null = null;

    /**
     * Function that is called with a feature and returns the geometry to render
     * instead of the feature's geometry.
     */
    private geometryFunction_: GeometryFunction = defaultGeometryFunction;

    /**
     * Fill style.
     */
    private fill_: Fill | null;

    /**
     * Image style.
     */
    private image_: ImageStyle | null;

    /**
     * Custom renderer.
     *
     * When configured, `fill`, `stroke` and `image` will be ignored, and the
     * provided function will be called with each render frame for each
     * geometry.
     */
    private renderer_: RenderFunction | null;

    /**
     * Custom renderer for hit detection.
     *
     * If provided will be used in hit detection rendering.
     */
    private hitDetectionRenderer_: RenderFunction | null;

    /**
     * Stroke style.
     */
    private stroke_: Stroke | null;

    /**
     * Text style.
     */
    private text_: Text | null;

    /**
     * Z index.
     */
    private zIndex_: number | undefined;

    /**
     * @param options Style options.
     */
    constructor(options?: Options) {
        options = options || {};
        if (options.geometry !== undefined) {
            this.setGeometry(options.geometry);
        }
        this.fill_ = options.fill !== undefined ? options.fill : null;
        this.image_ = options.image !== undefined ? options.image : null;
        this.renderer_ = options.renderer !== undefined
            ? options.renderer
            : null;
        this.hitDetectionRenderer_ = options.hitDetectionRenderer !== undefined
            ? options.hitDetectionRenderer
            : null;
        this.stroke_ = options.stroke !== undefined ? options.stroke : null;
        this.text_ = options.text !== undefined ? options.text : null;
        this.zIndex_ = options.zIndex;
    }

    /**
     * Clones the style.
     *
     * @return The cloned style.
     * @api
     */
    clone(): Style {
        let geometry = this.getGeometry();
        if (geometry && typeof geometry === 'object') {
            geometry = (geometry as Geometry).clone();
        }
        const fill = this.getFill();
        const stroke = this.getStroke();
        const text = this.getText();
        const image = this.getImage();
        return new Style({
            geometry: geometry ?? undefined,
            fill: fill ? fill.clone() : undefined,
            image: image ? image.clone() : undefined,
            renderer: this.getRenderer() ?? undefined,
            stroke: stroke ? stroke.clone() : undefined,
            text: text ? text.clone() : undefined,
            zIndex: this.getZIndex(),
        });
    }

    /**
     * Get the custom renderer function that was configured with
     * {@link #setRenderer} or the `renderer` constructor option.
     *
     * @return Custom renderer function.
     * @api
     */
    getRenderer(): RenderFunction | null {
        return this.renderer_;
    }

    /**
     * Sets a custom renderer function for this style.
     *
     * When set, `fill`, `stroke` and `image` options of the style will be
     * ignored.
     *
     * @param renderer Custom renderer function.
     * @api
     */
    setRenderer(renderer: RenderFunction | null) {
        this.renderer_ = renderer;
    }

    /**
     * Sets a custom renderer function for this style used in hit detection.
     *
     * @param renderer Custom renderer function.
     * @api
     */
    setHitDetectionRenderer(renderer: RenderFunction | null) {
        this.hitDetectionRenderer_ = renderer;
    }

    /**
     * Get the custom renderer function that was configured with
     * {@link #setHitDetectionRenderer} or the `hitDetectionRenderer`
     * constructor option.
     *
     * @return Custom renderer function.
     * @api
     */
    getHitDetectionRenderer(): RenderFunction | null {
        return this.hitDetectionRenderer_;
    }

    /**
     * Get the geometry to be rendered.
     *
     * @return  Feature property or geometry or function that returns the
     * geometry that will be rendered with this style.
     * @api
     */
    getGeometry(): string | Geometry | GeometryFunction | null {
        return this.geometry_;
    }

    /**
     * Get the function used to generate a geometry for rendering.
     *
     * @return Function that is called with a feature and returns the geometry
     * to render instead of the feature's geometry.
     * @api
     */
    getGeometryFunction(): GeometryFunction {
        return this.geometryFunction_;
    }

    /**
     * Get the fill style.
     *
     * @return Fill style.
     * @api
     */
    getFill(): Fill | null {
        return this.fill_;
    }

    /**
     * Set the fill style.
     *
     * @param fill Fill style.
     * @api
     */
    setFill(fill: Fill | null) {
        this.fill_ = fill;
    }

    /**
     * Get the image style.
     *
     * @return Image style.
     * @api
     */
    getImage(): ImageStyle | null {
        return this.image_;
    }

    /**
     * Set the image style.
     * @param {Image} image Image style.
     * @api
     */
    setImage(image: ImageStyle) {
        this.image_ = image;
    }

    /**
     * Get the stroke style.
     *
     * @return Stroke style.
     * @api
     */
    getStroke(): Stroke | null {
        return this.stroke_;
    }

    /**
     * Set the stroke style.
     *
     * @param stroke Stroke style.
     * @api
     */
    setStroke(stroke: Stroke | null) {
        this.stroke_ = stroke;
    }

    /**
     * Get the text style.
     *
     * @return Text style.
     * @api
     */
    getText(): Text | null {
        return this.text_;
    }

    /**
     * Set the text style.
     *
     * @param text Text style.
     * @api
     */
    setText(text: Text) {
        this.text_ = text;
    }

    /**
     * Get the z-index for the style.
     *
     * @return ZIndex.
     * @api
     */
    getZIndex(): number | undefined {
        return this.zIndex_;
    }

    /**
     * Set a geometry that is rendered instead of the feature's geometry.
     *
     * @param geometry Feature property or geometry or function returning a
     *     geometry to render for this style.
     * @api
     */
    setGeometry(geometry: string | Geometry | GeometryFunction) {
        if (typeof geometry === 'function') {
            this.geometryFunction_ = geometry;
        } else if (typeof geometry === 'string') {
            this.geometryFunction_ = function (feature) {
                return feature.get(geometry) as Geometry;
            };
        } else if (!geometry) {
            this.geometryFunction_ = defaultGeometryFunction;
        } else if (geometry !== undefined) {
            this.geometryFunction_ = function () {
                return /** @type {Geometry} */ (geometry);
            };
        }
        this.geometry_ = geometry;
    }

    /**
     * Set the z-index.
     *
     * @param zIndex ZIndex.
     * @api
     */
    setZIndex(zIndex: number | undefined) {
        this.zIndex_ = zIndex;
    }
}


/**
 * Convert the provided object into a style function.
 *
 * Functions pass through unchanged. Arrays of Style or single style objects
 * are wrapped in a new style function.
 *
 * @param obj A style function, a single style, or an array of styles.
 * @return A style function.
 */
export function toFunction(
    obj: StyleFunction | Style[] | Style
): StyleFunction {
    let styleFunction;

    if (typeof obj === 'function') {
        styleFunction = obj;
    } else {
        /**
         * @type {Style[]}
         */
        let styles: Style[];
        if (Array.isArray(obj)) {
            styles = obj;
        } else {
            assert(
                typeof (obj.getZIndex) === 'function',
                'Expected an `Style` or an array of `Style`',
            );
            const style = obj;
            styles = [style];
        }
        styleFunction = function () {
            return styles;
        };
    }
    return styleFunction;
}


let defaultStyles: Style[] | null = null;


/**
 * @param feature Feature.
 * @param resolution Resolution.
 * @return Style.
 */
export function createDefaultStyle(
    feature: FeatureLike, resolution: number
): Style[] {
    // We don't use an immediately-invoked function and a closure so we don't
    // get an error at script evaluation time in browsers that do not support
    // Canvas.
    //
    // CircleStyle does canvas.getContext('2d') at construction time, which
    // will cause an error in such browsers.
    if (!defaultStyles) {
        const fill = new Fill({
            color: 'rgba(255,255,255,0.4)',
        });
        const stroke = new Stroke({
            color: '#3399CC',
            width: 1.25,
        });
        defaultStyles = [
            new Style({
                image: new CircleStyle({
                    fill: fill,
                    stroke: stroke,
                    radius: 5,
                }),
                fill: fill,
                stroke: stroke,
            }),
        ];
    }
    return defaultStyles;
}


/**
 * Default styles for editing features.
 *
 * @return Styles
 */
export function createEditingStyle(): Record<GeometryType, Style[]> {
    const styles = {} as Record<GeometryType, Style[]>;

    const white: Color = [255, 255, 255, 1];
    const blue: Color = [0, 153, 255, 1];
    const width = 3;
    styles['Polygon'] = [
        new Style({
            fill: new Fill({
                color: [255, 255, 255, 0.5],
            }),
        }),
    ];
    styles['MultiPolygon'] = styles['Polygon'];

    styles['LineString'] = [
        new Style({
            stroke: new Stroke({
                color: white,
                width: width + 2,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: blue,
                width: width,
            }),
        }),
    ];
    styles['MultiLineString'] = styles['LineString'];

    styles['Circle'] = styles['Polygon'].concat(styles['LineString']);

    styles['Point'] = [
        new Style({
            image: new CircleStyle({
                radius: width * 2,
                fill: new Fill({
                    color: blue,
                }),
                stroke: new Stroke({
                    color: white,
                    width: width / 2,
                }),
            }),
            zIndex: Infinity,
        }),
    ];
    styles['MultiPoint'] = styles['Point'];

    styles['GeometryCollection'] = styles['Polygon'].concat(
        styles['LineString'],
        styles['Point'],
    );

    return styles;
}


/**
 * Function that is called with a feature and returns its default geometry.
 *
 * @param feature Feature to get the geometry for.
 * @return Geometry to render.
 */
function defaultGeometryFunction(
    feature: FeatureLike
): Geometry | Feature | undefined {
    return feature.getGeometry();
}


export default Style;
