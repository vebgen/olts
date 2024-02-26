import { METERS_PER_UNIT, Units } from './units';
import { Extent } from '@olts/core/extent';


/**
 * Function to determine resolution at a point.
 *
 * The function is called with a `number` view resolution and a
 * {@link Coordinate} as arguments, and returns the `number` resolution in
 * projection units at the passed coordinate. If this is `undefined`, the
 * default {@link getPointResolution} function will be used.
 */
export type GetPointResolution = (
    resolution: number, point: number[]
) => number;


/**
 * Options expected by the Projection constructor.
 */
export interface Options {
    /**
     * The SRS identifier code, e.g. `EPSG:4326`.
     */
    code: string;

    /**
     * Units. Required unless a proj4 projection is defined for `code`.
     */
    units?: Units;

    /**
     * The validity extent for the SRS.
     */
    extent?: Extent;

    /**
     * The axis orientation as specified in Proj4.
     *
     * @see https://proj.org/en/9.3/usage/projections.html#axis-orientation
     */
    axisOrientation?: string;

    /**
     * Whether the projection is valid for the whole globe.
     *
     * Set to `true` to use the global extent for the SRS.
     */
    global?: boolean;

    /**
     * The meters per unit for the SRS.
     *
     * If not provided, the `units` are used to get the meters per unit from the
     * {@link METERS_PER_UNIT} lookup table.
     */
    metersPerUnit?: number;

    /**
     * The world extent for the SRS.
     */
    worldExtent?: Extent;

    /**
     * Function to determine resolution at a point.
     */
    getPointResolution?: GetPointResolution;
}


/**
 * Projection definition class.
 *
 * One of these is created for each projection supported in the application and
 * stored in the {@link module:ol/proj} namespace. You can use these in
 * applications, but this is not required, as API params and options use
 * {@link ProjectionLike} which means the simple string code will suffice.
 *
 * You can use {@link proj.get} to retrieve the object for a particular
 * projection.
 *
 * The library includes definitions for `EPSG:4326` and `EPSG:3857`, together
 * with the following aliases:
 *
 * * `EPSG:4326`: CRS:84, urn:ogc:def:crs:EPSG:6.6:4326,
 *     urn:ogc:def:crs:OGC:1.3:CRS84, urn:ogc:def:crs:OGC:2:84,
 *     http://www.opengis.net/gml/srs/epsg.xml#4326,
 *     urn:x-ogc:def:crs:EPSG:4326
 * * `EPSG:3857`: EPSG:102100, EPSG:102113, EPSG:900913,
 *     urn:ogc:def:crs:EPSG:6.18:3:3857,
 *     http://www.opengis.net/gml/srs/epsg.xml#3857
 *
 * If you use [proj4js](https://github.com/proj4js/proj4js), aliases can
 * be added using `proj4.defs()`. After all required projection definitions are
 * added, call the {@link proj4.register} function.
 *
 * @api
 */
export class Projection {

    code_: Options['code'];
    /**
     * Units of projected coordinates. When set to `TILE_PIXELS`, a
     * `this.extent_` and `this.worldExtent_` must be configured properly for
     * each tile.
     */
    private units_?: Units;

    /**
     * Validity extent of the projection in projected coordinates.
     *
     * For projections with `TILE_PIXELS` units, this is the extent of the tile
     * in tile pixel space.
     */
    private extent_: Extent | null;

    /**
     * Extent of the world in EPSG:4326.
     *
     * For projections with `TILE_PIXELS` units, this is the extent of the tile
     * in projected coordinate space.
     */
    private worldExtent_: Extent | null;

    /**
     * The axis orientation as specified in Proj4.
     */
    private axisOrientation_: Options['axisOrientation'];

    private global_: boolean;

    private canWrapX_: boolean;

    private getPointResolutionFunc_: GetPointResolution | undefined;

    private defaultTileGrid_: TileGrid | null;

    private metersPerUnit_: number | undefined;

    constructor(options: Options) {
        this.code_ = options.code;
        this.units_ = options.units;
        this.extent_ = options.extent !== undefined ? options.extent : null;
        this.worldExtent_ = options.worldExtent !== undefined
            ? options.worldExtent
            : null;
        this.axisOrientation_ = options.axisOrientation !== undefined
            ? options.axisOrientation
            : 'enu';
        this.global_ = options.global !== undefined ? options.global : false;
        this.canWrapX_ = !!(this.global_ && this.extent_);
        this.getPointResolutionFunc_ = options.getPointResolution;
        this.defaultTileGrid_ = null;
        this.metersPerUnit_ = options.metersPerUnit;
    }

    /**
     * Tell whether this projection is suitable for wrapping the x-axis.
     *
     * @return The projection is suitable for wrapping the x-axis
     */
    canWrapX(): boolean {
        return this.canWrapX_;
    }

    /**
     * Get the code for this projection, e.g. 'EPSG:4326'.
     *
     * @return Code.
     * @api
     */
    getCode(): string {
        return this.code_;
    }

    /**
     * Get the validity extent for this projection.
     * @return Extent.
     * @api
     */
    getExtent(): Extent | null {
        return this.extent_;
    }

    /**
     * Get the units of this projection.
     *
     * @return Units.
     * @api
     */
    getUnits(): Units | undefined {
        return this.units_;
    }

    /**
     * Get the amount of meters per unit of this projection.
     *
     * If the projection is not configured with `metersPerUnit` or a units
     * identifier, the return is `undefined`.
     * @return Meters.
     * @api
     */
    getMetersPerUnit(): number | undefined {
        if (this.metersPerUnit_) {
            return this.metersPerUnit_;
        }
        if (this.units_ === undefined) {
            return undefined;
        } else {
            return (METERS_PER_UNIT as any)[this.units_ as any];
        }
    }

    /**
     * Get the world extent for this projection.
     *
     * @return Extent.
     * @api
     */
    getWorldExtent(): Extent | null {
        return this.worldExtent_;
    }

    /**
     * Get the axis orientation of this projection.
     *
     * Example values are:
     * * enu - the default easting, northing, elevation.
     * * neu - northing, easting, up - useful for "lat/long"
     *         geographic coordinates, or south orientated transverse mercator.
     * * wnu - westing, northing, up - some planetary coordinate systems have
     *         "west positive" coordinate systems
     * @return Axis orientation.
     * @api
     */
    getAxisOrientation(): string | undefined {
        return this.axisOrientation_;
    }

    /**
     * Is this projection a global projection which spans the whole world?
     *
     * @return Whether the projection is global.
     * @api
     */
    isGlobal(): boolean {
        return this.global_;
    }

    /**
     * Set if the projection is a global projection which spans the whole world
     *
     * @param global Whether the projection is global.
     * @api
     */
    setGlobal(global: boolean) {
        this.global_ = global;
        this.canWrapX_ = !!(global && this.extent_);
    }

    /**
     * @return The default tile grid.
     */
    getDefaultTileGrid(): TileGrid | null {
        return this.defaultTileGrid_;
    }

    /**
     * @param tileGrid The default tile grid.
     */
    setDefaultTileGrid(tileGrid: TileGrid) {
        this.defaultTileGrid_ = tileGrid;
    }

    /**
     * Set the validity extent for this projection.
     * @param extent Extent.
     * @api
     */
    setExtent(extent: Extent) {
        this.extent_ = extent;
        this.canWrapX_ = !!(this.global_ && extent);
    }

    /**
     * Set the world extent for this projection.
     *
     * @param worldExtent World extent as [minLon, minLat, maxLon, maxLat].
     * @api
     */
    setWorldExtent(worldExtent: Extent) {
        this.worldExtent_ = worldExtent;
    }

    /**
     * Set the getPointResolution function (see {@link getPointResolution}
     * for this projection.
     *
     * @param func Function
     * @api
     */
    setGetPointResolution(func: GetPointResolution | undefined) {
        this.getPointResolutionFunc_ = func;
    }

    /**
     * Get the custom point resolution function for this projection (if set).
     *
     * @return The custom point resolution function (if set).
     */
    getPointResolutionFunc(): GetPointResolution | undefined {
        return this.getPointResolutionFunc_;
    }
}

export default Projection;
