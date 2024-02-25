import Feature from '../feature';
import {
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
} from '@olts/geometry';
import {
    Transform,
    compose as composeTransform,
    create as createTransform,
} from '@olts/core/transform';
import { memoizeOne } from '@olts/core/functions';
import {
    Extent,
    createOrUpdateFromCoordinate,
    createOrUpdateFromFlatCoordinates,
    getCenter,
    getHeight,
} from '@olts/core/extent';
import {
    Projection, ProjectionLike, TransformFunction, getProjection
} from '@olts/core/proj';
import { extend } from '@olts/core/array';
import {
    douglasPeucker,
    douglasPeuckerArray,
    quantizeArray,
    inflateEnds,
    interpolatePoint,
    centerLinearRingss as linearRingssCenter,
    transform2D,
    getInteriorPointOfArray,
    getInteriorPointsOfMultiArray,
} from '@olts/geometry/flat';
import { StyleFunction } from '@olts/style';


/**
 * The geometry type.  One of `'Point'`, `'LineString'`, `'LinearRing'`,
 * `'Polygon'`, `'MultiPoint'` or 'MultiLineString'`.
 */
export type Type =
    | 'Point'
    | 'LineString'
    | 'LinearRing'
    | 'Polygon'
    | 'MultiPoint'
    | 'MultiLineString';


/**
 *
 */
const tmpTransform: Transform = createTransform();


/**
 * Lightweight, read-only, {@link Feature} and {@link Geometry} like structure,
 * optimized for vector tile rendering and styling.
 *
 * Geometry access through the API is limited to getting the type and extent of
 * the geometry.
 */
class RenderFeature {
    /**
     *
     */
    private styleFunction: StyleFunction | undefined;

    /**
     *
     */
    private extent_: Extent | undefined;

    /**
     *
     */
    private id_: number | string | undefined;

    /**
     *
     */
    private type_: Type;

    /**
     *
     */
    private flatCoordinates_: number[];

    /**
     *
     */
    private flatInteriorPoints_: number[] | null = null;

    /**
     *
     */
    private flatMidpoints_: number[] | null = null;

    /**
     *
     */
    private ends_: number[] | null = null;

    /**
     *
     */
    private properties_: Record<string, any>;

    /**
     *
     */
    squaredTolerance_: number | undefined;

    /**
     *
     */
    stride_: number;

    /**
     *
     */
    private simplifiedGeometry_: RenderFeature | undefined;

    /**
     * @param type Geometry type.
     * @param flatCoordinates Flat coordinates. These always need to be
     *     right-handed for polygons.
     * @param ends Ends.
     * @param stride Stride.
     * @param properties Properties.
     * @param id Feature id.
     */
    constructor(
        type: Type,
        flatCoordinates: number[],
        ends: number[],
        stride: number,
        properties: Record<string, any>,
        id: number | string | undefined
    ) {
        this.type_ = type;
        this.flatCoordinates_ = flatCoordinates;
        this.ends_ = ends || null;
        this.properties_ = properties;
        this.stride_ = stride;
    }

    /**
     * Get a feature property by its key.
     *
     * @param key Key
     * @return Value for the requested key.
     * @api
     */
    get(key: string): any {
        return this.properties_[key];
    }

    /**
     * Get the extent of this feature's geometry.
     *
     * @return Extent.
     * @api
     */
    getExtent(): Extent {
        if (!this.extent_) {
            this.extent_ =
                this.type_ === 'Point'
                    ? createOrUpdateFromCoordinate(this.flatCoordinates_)
                    : createOrUpdateFromFlatCoordinates(
                        this.flatCoordinates_,
                        0,
                        this.flatCoordinates_.length,
                        2,
                    );
        }
        return this.extent_;
    }

    /**
     * @return Flat interior points.
     */
    getFlatInteriorPoint(): number[] {
        if (!this.flatInteriorPoints_) {
            const flatCenter = getCenter(this.getExtent());
            this.flatInteriorPoints_ = getInteriorPointOfArray(
                this.flatCoordinates_,
                0,
                this.ends_!,
                2,
                flatCenter,
                0,
            );
        }
        return this.flatInteriorPoints_;
    }

    /**
     * @return Flat interior points.
     */
    getFlatInteriorPoints(): number[] {
        if (!this.flatInteriorPoints_) {
            const ends = inflateEnds(this.flatCoordinates_, this.ends_!);
            const flatCenters = linearRingssCenter(this.flatCoordinates_, 0, ends, 2);
            this.flatInteriorPoints_ = getInteriorPointsOfMultiArray(
                this.flatCoordinates_,
                0,
                ends,
                2,
                flatCenters,
            );
        }
        return this.flatInteriorPoints_;
    }

    /**
     * @return Flat midpoint.
     */
    getFlatMidpoint(): number[] {
        if (!this.flatMidpoints_) {
            this.flatMidpoints_ = interpolatePoint(
                this.flatCoordinates_,
                0,
                this.flatCoordinates_.length,
                2,
                0.5,
            );
        }
        return this.flatMidpoints_;
    }

    /**
     * @return Flat midpoints.
     */
    getFlatMidpoints(): number[] {
        if (!this.flatMidpoints_) {
            this.flatMidpoints_ = [];
            const flatCoordinates = this.flatCoordinates_;
            let offset = 0;
            const ends = /** @type */ (this.ends_);
            for (let i = 0, ii = ends!.length; i < ii; ++i) {
                const end = ends![i];
                const midpoint = interpolatePoint(
                    flatCoordinates, offset, end, 2, 0.5
                );
                extend(this.flatMidpoints_, midpoint);
                offset = end;
            }
        }
        return this.flatMidpoints_;
    }

    /**
     * Get the feature identifier.
     *
     * This is a stable identifier for the feature and is set when reading data
     * from a remote source.
     *
     * @return Id.
     * @api
     */
    getId(): number | string | undefined {
        return this.id_;
    }

    /**
     * @return Flat coordinates.
     */
    getOrientedFlatCoordinates(): number[] {
        return this.flatCoordinates_;
    }

    /**
     * For API compatibility with {@link Feature}, this method is useful when
     * determining the geometry type in style function (see {@link #getType}).
     * @return Feature.
     * @api
     */
    getGeometry(): RenderFeature {
        return this;
    }

    /**
     * @param squaredTolerance Squared tolerance.
     * @return Simplified geometry.
     */
    getSimplifiedGeometry(squaredTolerance: number): RenderFeature {
        return this;
    }

    /**
     * Get a transformed and simplified version of the geometry.
     * @param squaredTolerance Squared tolerance.
     * @param [transform] Optional transform function.
     * @return Simplified geometry.
     */
    simplifyTransformed(
        squaredTolerance: number,
        transform?: TransformFunction
    ): RenderFeature {
        return this;
    }

    /**
     * Get the feature properties.
     * @return Feature properties.
     * @api
     */
    getProperties(): Record<string, any> {
        return this.properties_;
    }

    /**
     * Get an object of all property names and values.
     *
     * This has the same behavior as getProperties, but is here to conform with
     * the {@link Feature} interface.
     *
     * @return Object.
     */
    getPropertiesInternal(): Record<string, any> | null {
        return this.properties_;
    }

    /**
     * @return Stride.
     */
    getStride(): number {
        return this.stride_;
    }

    /**
     * @return Style
     */
    getStyleFunction(): StyleFunction | undefined {
        return this.styleFunction;
    }

    /**
     * Get the type of this feature's geometry.
     *
     * @return Geometry type.
     * @api
     */
    getType(): Type {
        return this.type_;
    }

    /**
     * Transform geometry coordinates from tile pixel space to projected.
     *
     * @param projection The data projection
     */
    transform(projection: ProjectionLike) {
        const proj: Projection = getProjection(projection)!;
        const pixelExtent = proj.getExtent();
        const projectedExtent = proj.getWorldExtent();
        if (pixelExtent && projectedExtent) {
            const scale = getHeight(projectedExtent) / getHeight(pixelExtent);
            composeTransform(
                tmpTransform,
                projectedExtent[0],
                projectedExtent[3],
                scale,
                -scale,
                0,
                0,
                0,
            );
            transform2D(
                this.flatCoordinates_,
                0,
                this.flatCoordinates_.length,
                2,
                tmpTransform,
                this.flatCoordinates_,
            );
        }
    }

    /**
     * Apply a transform function to the coordinates of the geometry.
     * The geometry is modified in place.
     *
     * If you do not want the geometry modified in place, first `clone()` it and
     * then use this function on the clone.
     *
     * @param transformFn Transform function.
     */
    applyTransform(transformFn: TransformFunction) {
        transformFn(this.flatCoordinates_, this.flatCoordinates_, this.stride_);
    }

    /**
     * @return A cloned render feature.
     */
    clone(): RenderFeature {
        return new RenderFeature(
            this.type_,
            this.flatCoordinates_.slice(),
            this.ends_?.slice()!,
            this.stride_,
            Object.assign({}, this.properties_),
            this.id_,
        );
    }

    /**
     * @return {number[]|null} Ends.
     */
    getEnds(): number[] | null {
        return this.ends_;
    }

    /**
     * Add transform and resolution based geometry simplification to this instance.
     * @return This render feature.
     */
    enableSimplifyTransformed(): RenderFeature {
        this.simplifyTransformed = memoizeOne((squaredTolerance, transform) => {
            if (squaredTolerance === this.squaredTolerance_) {
                return this.simplifiedGeometry_;
            }
            this.simplifiedGeometry_ = this.clone();
            if (transform) {
                this.simplifiedGeometry_.applyTransform(transform);
            }
            const simplifiedFlatCoordinates =
                this.simplifiedGeometry_.getFlatCoordinates();
            let simplifiedEnds;
            switch (this.type_) {
                case 'LineString':
                    simplifiedFlatCoordinates.length = douglasPeucker(
                        simplifiedFlatCoordinates,
                        0,
                        this.simplifiedGeometry_.flatCoordinates_.length,
                        this.simplifiedGeometry_.stride_,
                        squaredTolerance,
                        simplifiedFlatCoordinates,
                        0,
                    );
                    simplifiedEnds = [simplifiedFlatCoordinates.length];
                    break;
                case 'MultiLineString':
                    simplifiedEnds = [];
                    simplifiedFlatCoordinates.length = douglasPeuckerArray(
                        simplifiedFlatCoordinates,
                        0,
                        this.simplifiedGeometry_.ends_!,
                        this.simplifiedGeometry_.stride_,
                        squaredTolerance,
                        simplifiedFlatCoordinates,
                        0,
                        simplifiedEnds,
                    );
                    break;
                case 'Polygon':
                    simplifiedEnds = [];
                    simplifiedFlatCoordinates.length = quantizeArray(
                        simplifiedFlatCoordinates,
                        0,
                        this.simplifiedGeometry_.ends_,
                        this.simplifiedGeometry_.stride_,
                        Math.sqrt(squaredTolerance),
                        simplifiedFlatCoordinates,
                        0,
                        simplifiedEnds,
                    );
                    break;
                default:
            }
            if (simplifiedEnds) {
                this.simplifiedGeometry_ = new RenderFeature(
                    this.type_,
                    simplifiedFlatCoordinates,
                    simplifiedEnds,
                    2,
                    this.properties_,
                    this.id_,
                );
            }
            this.squaredTolerance_ = squaredTolerance;
            return this.simplifiedGeometry_;
        });
        return this;
    }
}


/**
 * @return Flat coordinates.
 */
RenderFeature.prototype.getFlatCoordinates =
    RenderFeature.prototype.getOrientedFlatCoordinates;


/**
 * Create a geometry from an `ol/render/Feature`
 * @param renderFeature Render Feature
 * @return {Point|MultiPoint|LineString|MultiLineString|Polygon|MultiPolygon}
 * New geometry instance.
 * @api
 */
export function toGeometry(
    renderFeature: RenderFeature
): Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon {
    const geometryType = renderFeature.getType();
    switch (geometryType) {
        case 'Point':
            return new Point(renderFeature.getFlatCoordinates());
        case 'MultiPoint':
            return new MultiPoint(renderFeature.getFlatCoordinates(), 'XY');
        case 'LineString':
            return new LineString(renderFeature.getFlatCoordinates(), 'XY');
        case 'MultiLineString':
            return new MultiLineString(
                renderFeature.getFlatCoordinates(),
                'XY',
        /** @type */(renderFeature.getEnds()),
            );
        case 'Polygon':
            const flatCoordinates = renderFeature.getFlatCoordinates();
            const ends = renderFeature.getEnds();
            const endss = inflateEnds(flatCoordinates, ends);
            return endss.length > 1
                ? new MultiPolygon(flatCoordinates, 'XY', endss)
                : new Polygon(flatCoordinates, 'XY', ends);
        default:
            throw new Error('Invalid geometry type:' + geometryType);
    }
}


/**
 * Create an `ol/Feature` from an `ol/render/Feature`.
 *
 * @param renderFeature RenderFeature
 * @param geometryName Geometry name to use when creating the Feature.
 * @return Newly constructed `ol/Feature` with properties, geometry,
 *      and id copied over.
 * @api
 */
export function toFeature(
    renderFeature: RenderFeature,
    geometryName: string = 'geometry'
): Feature {
    const id = renderFeature.getId();
    const geometry = toGeometry(renderFeature);
    const properties = renderFeature.getProperties();
    const feature = new Feature();
    if (geometryName !== undefined) {
        feature.setGeometryName(geometryName);
    }
    feature.setGeometry(geometry);
    if (id !== undefined) {
        feature.setId(id);
    }
    feature.setProperties(properties, true);
    return feature;
}


export default RenderFeature;
