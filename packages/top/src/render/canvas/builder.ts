import CanvasInstruction from './Instruction';
import Relationship from '../../extent/Relationship';
import VectorContext from '../VectorContext';
import { asColorLike } from '../../colorlike';
import {
    buffer,
    clone,
    containsCoordinate,
    coordinateRelationship,
} from '@olts/core/extent';
import {
    defaultFillStyle,
    defaultLineCap,
    defaultLineDash,
    defaultLineDashOffset,
    defaultLineJoin,
    defaultLineWidth,
    defaultMiterLimit,
    defaultStrokeStyle,
} from '../canvas';
import { equals, reverseSubArray } from '@olts/core/array';
import {
    inflateCoordinates,
    inflateCoordinatesArray,
    inflateMultiCoordinatesArray,
} from '@olts/geometry/flat';
import { Extent } from '@olts/core/extent';

export class CanvasBuilder extends VectorContext {
    /**
     * @param tolerance Tolerance.
     * @param {Extent} maxExtent Maximum extent.
     * @param resolution Resolution.
     * @param pixelRatio Pixel ratio.
     */
    constructor(tolerance: number, maxExtent: Extent, resolution: number, pixelRatio: number) {
        super();

        /**
         * @protected
         * @type {number}
         */
        this.tolerance = tolerance;

        /**
         * @protected
         * @const
         * @type {Extent}
         */
        this.maxExtent = maxExtent;

        /**
         * @protected
         * @type {number}
         */
        this.pixelRatio = pixelRatio;

        /**
         * @protected
         * @type {number}
         */
        this.maxLineWidth = 0;

        /**
         * @protected
         * @const
         * @type {number}
         */
        this.resolution = resolution;

        /**
         * @private
         * @type {Array<*>}
         */
        this.beginGeometryInstruction1_ = null;

        /**
         * @private
         * @type {Array<*>}
         */
        this.beginGeometryInstruction2_ = null;

        /**
         * @private
         * @type {Extent}
         */
        this.bufferedMaxExtent_ = null;

        /**
         * @protected
         * @type {Array<*>}
         */
        this.instructions = [];

        /**
         * @protected
         * @type {number[]}
         */
        this.coordinates = [];

        /**
         * @private
         * @type {import("../../coordinate").Coordinate}
         */
        this.tmpCoordinate_ = [];

        /**
         * @protected
         * @type {Array<*>}
         */
        this.hitDetectionInstructions = [];

        /**
         * @protected
         * @type {import("../canvas").FillStrokeState}
         */
        this.state = /** @type {import("../canvas").FillStrokeState} */ ({});
    }

    /**
     * @protected
     * @param {number[]} dashArray Dash array.
     * @return {number[]} Dash array with pixel ratio applied
     */
    applyPixelRatio(dashArray: number[]): number[] {
        const pixelRatio = this.pixelRatio;
        return pixelRatio == 1
            ? dashArray
            : dashArray.map(function (dash) {
                return dash * pixelRatio;
            });
    }

    /**
     * @param {number[]} flatCoordinates Flat coordinates.
     * @param stride Stride.
     * @protected
     * @return My end
     */
    appendFlatPointCoordinates(flatCoordinates: number[], stride: number): number {
        const extent = this.getBufferedMaxExtent();
        const tmpCoord = this.tmpCoordinate_;
        const coordinates = this.coordinates;
        let myEnd = coordinates.length;
        for (let i = 0, ii = flatCoordinates.length; i < ii; i += stride) {
            tmpCoord[0] = flatCoordinates[i];
            tmpCoord[1] = flatCoordinates[i + 1];
            if (containsCoordinate(extent, tmpCoord)) {
                coordinates[myEnd++] = tmpCoord[0];
                coordinates[myEnd++] = tmpCoord[1];
            }
        }
        return myEnd;
    }

    /**
     * @param {number[]} flatCoordinates Flat coordinates.
     * @param offset Offset.
     * @param end End.
     * @param stride Stride.
     * @param {boolean} closed Last input coordinate equals first.
     * @param {boolean} skipFirst Skip first coordinate.
     * @protected
     * @return My end.
     */
    appendFlatLineCoordinates(
        flatCoordinates: number[],
        offset: number,
        end: number,
        stride: number,
        closed: boolean,
        skipFirst: boolean,
    ): number {
        const coordinates = this.coordinates;
        let myEnd = coordinates.length;
        const extent = this.getBufferedMaxExtent();
        if (skipFirst) {
            offset += stride;
        }
        let lastXCoord = flatCoordinates[offset];
        let lastYCoord = flatCoordinates[offset + 1];
        const nextCoord = this.tmpCoordinate_;
        let skipped = true;

        let i, lastRel, nextRel;
        for (i = offset + stride; i < end; i += stride) {
            nextCoord[0] = flatCoordinates[i];
            nextCoord[1] = flatCoordinates[i + 1];
            nextRel = coordinateRelationship(extent, nextCoord);
            if (nextRel !== lastRel) {
                if (skipped) {
                    coordinates[myEnd++] = lastXCoord;
                    coordinates[myEnd++] = lastYCoord;
                    skipped = false;
                }
                coordinates[myEnd++] = nextCoord[0];
                coordinates[myEnd++] = nextCoord[1];
            } else if (nextRel === Relationship.INTERSECTING) {
                coordinates[myEnd++] = nextCoord[0];
                coordinates[myEnd++] = nextCoord[1];
                skipped = false;
            } else {
                skipped = true;
            }
            lastXCoord = nextCoord[0];
            lastYCoord = nextCoord[1];
            lastRel = nextRel;
        }

        // Last coordinate equals first or only one point to append:
        if ((closed && skipped) || i === offset + stride) {
            coordinates[myEnd++] = lastXCoord;
            coordinates[myEnd++] = lastYCoord;
        }
        return myEnd;
    }

    /**
     * @param {number[]} flatCoordinates Flat coordinates.
     * @param offset Offset.
     * @param {number[]} ends Ends.
     * @param stride Stride.
     * @param {number[]} builderEnds Builder ends.
     * @return Offset.
     */
    drawCustomCoordinates_(flatCoordinates: number[], offset: number, ends: number[], stride: number, builderEnds: number[]): number {
        for (let i = 0, ii = ends.length; i < ii; ++i) {
            const end = ends[i];
            const builderEnd = this.appendFlatLineCoordinates(
                flatCoordinates,
                offset,
                end,
                stride,
                false,
                false,
            );
            builderEnds.push(builderEnd);
            offset = end;
        }
        return offset;
    }

    /**
     * @param {SimpleGeometry} geometry Geometry.
     * @param {FeatureLike} feature Feature.
     * @param {Function} renderer Renderer.
     * @param {Function} hitDetectionRenderer Renderer.
     */
    drawCustom(geometry: SimpleGeometry, feature: FeatureLike, renderer: Function, hitDetectionRenderer: Function) {
        this.beginGeometry(geometry, feature);

        const type = geometry.getType();
        const stride = geometry.getStride();
        const builderBegin = this.coordinates.length;

        let flatCoordinates, builderEnd, builderEnds, builderEndss;
        let offset;

        switch (type) {
            case 'MultiPolygon':
                flatCoordinates =
          /** @type {MultiPolygon} */ (
                        geometry
                    ).getOrientedFlatCoordinates();
                builderEndss = [];
                const endss =
          /** @type {MultiPolygon} */ (
                        geometry
                    ).getEndss();
                offset = 0;
                for (let i = 0, ii = endss.length; i < ii; ++i) {
                    const myEnds = [];
                    offset = this.drawCustomCoordinates_(
                        flatCoordinates,
                        offset,
                        endss[i],
                        stride,
                        myEnds,
                    );
                    builderEndss.push(myEnds);
                }
                this.instructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEndss,
                    geometry,
                    renderer,
                    inflateMultiCoordinatesArray,
                ]);
                this.hitDetectionInstructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEndss,
                    geometry,
                    hitDetectionRenderer || renderer,
                    inflateMultiCoordinatesArray,
                ]);
                break;
            case 'Polygon':
            case 'MultiLineString':
                builderEnds = [];
                flatCoordinates =
                    type == 'Polygon'
                        ? /** @type {Polygon} */ (
                            geometry
                        ).getOrientedFlatCoordinates()
                        : geometry.getFlatCoordinates();
                offset = this.drawCustomCoordinates_(
                    flatCoordinates,
                    0,
          /** @type {Polygon|MultiLineString} */(
                        geometry
                    ).getEnds(),
                    stride,
                    builderEnds,
                );
                this.instructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEnds,
                    geometry,
                    renderer,
                    inflateCoordinatesArray,
                ]);
                this.hitDetectionInstructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEnds,
                    geometry,
                    hitDetectionRenderer || renderer,
                    inflateCoordinatesArray,
                ]);
                break;
            case 'LineString':
            case 'Circle':
                flatCoordinates = geometry.getFlatCoordinates();
                builderEnd = this.appendFlatLineCoordinates(
                    flatCoordinates,
                    0,
                    flatCoordinates.length,
                    stride,
                    false,
                    false,
                );
                this.instructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEnd,
                    geometry,
                    renderer,
                    inflateCoordinates,
                ]);
                this.hitDetectionInstructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEnd,
                    geometry,
                    hitDetectionRenderer || renderer,
                    inflateCoordinates,
                ]);
                break;
            case 'MultiPoint':
                flatCoordinates = geometry.getFlatCoordinates();
                builderEnd = this.appendFlatPointCoordinates(flatCoordinates, stride);

                if (builderEnd > builderBegin) {
                    this.instructions.push([
                        CanvasInstruction.CUSTOM,
                        builderBegin,
                        builderEnd,
                        geometry,
                        renderer,
                        inflateCoordinates,
                    ]);
                    this.hitDetectionInstructions.push([
                        CanvasInstruction.CUSTOM,
                        builderBegin,
                        builderEnd,
                        geometry,
                        hitDetectionRenderer || renderer,
                        inflateCoordinates,
                    ]);
                }
                break;
            case 'Point':
                flatCoordinates = geometry.getFlatCoordinates();
                this.coordinates.push(flatCoordinates[0], flatCoordinates[1]);
                builderEnd = this.coordinates.length;

                this.instructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEnd,
                    geometry,
                    renderer,
                ]);
                this.hitDetectionInstructions.push([
                    CanvasInstruction.CUSTOM,
                    builderBegin,
                    builderEnd,
                    geometry,
                    hitDetectionRenderer || renderer,
                ]);
                break;
            default:
        }
        this.endGeometry(feature);
    }

    /**
     * @protected
     * @param {Geometry|import("../Feature").default} geometry The geometry.
     * @param {FeatureLike} feature Feature.
     */
    beginGeometry(geometry: Geometry | import("../Feature").default, feature: FeatureLike) {
        this.beginGeometryInstruction1_ = [
            CanvasInstruction.BEGIN_GEOMETRY,
            feature,
            0,
            geometry,
        ];
        this.instructions.push(this.beginGeometryInstruction1_);
        this.beginGeometryInstruction2_ = [
            CanvasInstruction.BEGIN_GEOMETRY,
            feature,
            0,
            geometry,
        ];
        this.hitDetectionInstructions.push(this.beginGeometryInstruction2_);
    }

    /**
     * @return {import("../canvas").SerializableInstructions} the serializable instructions.
     */
    finish(): import("../canvas").SerializableInstructions {
        return {
            instructions: this.instructions,
            hitDetectionInstructions: this.hitDetectionInstructions,
            coordinates: this.coordinates,
        };
    }

    /**
     * Reverse the hit detection instructions.
     */
    reverseHitDetectionInstructions() {
        const hitDetectionInstructions = this.hitDetectionInstructions;
        // step 1 - reverse array
        hitDetectionInstructions.reverse();
        // step 2 - reverse instructions within geometry blocks
        let i;
        const n = hitDetectionInstructions.length;
        let instruction;
        let type;
        let begin = -1;
        for (i = 0; i < n; ++i) {
            instruction = hitDetectionInstructions[i];
            type = /** @type {import("./Instruction").default} */ (instruction[0]);
            if (type == CanvasInstruction.END_GEOMETRY) {
                begin = i;
            } else if (type == CanvasInstruction.BEGIN_GEOMETRY) {
                instruction[2] = i;
                reverseSubArray(this.hitDetectionInstructions, begin, i);
                begin = -1;
            }
        }
    }

    /**
     * @param {import("../../style/Fill").default} fillStyle Fill style.
     * @param {import("../../style/Stroke").default} strokeStyle Stroke style.
     */
    setFillStrokeStyle(fillStyle: import("../../style/Fill").default, strokeStyle: import("../../style/Stroke").default) {
        const state = this.state;
        if (fillStyle) {
            const fillStyleColor = fillStyle.getColor();
            state.fillPatternScale =
                fillStyleColor &&
                    typeof fillStyleColor === 'object' &&
                    'src' in fillStyleColor
                    ? this.pixelRatio
                    : 1;
            state.fillStyle = asColorLike(
                fillStyleColor ? fillStyleColor : defaultFillStyle,
            );
        } else {
            state.fillStyle = undefined;
        }
        if (strokeStyle) {
            const strokeStyleColor = strokeStyle.getColor();
            state.strokeStyle = asColorLike(
                strokeStyleColor ? strokeStyleColor : defaultStrokeStyle,
            );
            const strokeStyleLineCap = strokeStyle.getLineCap();
            state.lineCap =
                strokeStyleLineCap !== undefined ? strokeStyleLineCap : defaultLineCap;
            const strokeStyleLineDash = strokeStyle.getLineDash();
            state.lineDash = strokeStyleLineDash
                ? strokeStyleLineDash.slice()
                : defaultLineDash;
            const strokeStyleLineDashOffset = strokeStyle.getLineDashOffset();
            state.lineDashOffset = strokeStyleLineDashOffset
                ? strokeStyleLineDashOffset
                : defaultLineDashOffset;
            const strokeStyleLineJoin = strokeStyle.getLineJoin();
            state.lineJoin =
                strokeStyleLineJoin !== undefined
                    ? strokeStyleLineJoin
                    : defaultLineJoin;
            const strokeStyleWidth = strokeStyle.getWidth();
            state.lineWidth =
                strokeStyleWidth !== undefined ? strokeStyleWidth : defaultLineWidth;
            const strokeStyleMiterLimit = strokeStyle.getMiterLimit();
            state.miterLimit =
                strokeStyleMiterLimit !== undefined
                    ? strokeStyleMiterLimit
                    : defaultMiterLimit;

            if (state.lineWidth > this.maxLineWidth) {
                this.maxLineWidth = state.lineWidth;
                // invalidate the buffered max extent cache
                this.bufferedMaxExtent_ = null;
            }
        } else {
            state.strokeStyle = undefined;
            state.lineCap = undefined;
            state.lineDash = null;
            state.lineDashOffset = undefined;
            state.lineJoin = undefined;
            state.lineWidth = undefined;
            state.miterLimit = undefined;
        }
    }

    /**
     * @param {import("../canvas").FillStrokeState} state State.
     * @return {Array<*>} Fill instruction.
     */
    createFill(state: import("../canvas").FillStrokeState):any[] {
        const fillStyle = state.fillStyle;
        /** @type {Array<*>} */
        const fillInstruction:any[] = [CanvasInstruction.SET_FILL_STYLE, fillStyle];
        if (typeof fillStyle !== 'string') {
            // Fill is a pattern or gradient - align and scale it!
            fillInstruction.push(state.fillPatternScale);
        }
        return fillInstruction;
    }

    /**
     * @param {import("../canvas").FillStrokeState} state State.
     */
    applyStroke(state: import("../canvas").FillStrokeState) {
        this.instructions.push(this.createStroke(state));
    }

    /**
     * @param {import("../canvas").FillStrokeState} state State.
     * @return {Array<*>} Stroke instruction.
     */
    createStroke(state: import("../canvas").FillStrokeState):any[] {
        return [
            CanvasInstruction.SET_STROKE_STYLE,
            state.strokeStyle,
            state.lineWidth * this.pixelRatio,
            state.lineCap,
            state.lineJoin,
            state.miterLimit,
            this.applyPixelRatio(state.lineDash),
            state.lineDashOffset * this.pixelRatio,
        ];
    }

    /**
     * @param {import("../canvas").FillStrokeState} state State.
     * @param {function(this:CanvasBuilder, import("../canvas").FillStrokeState):Array<*>} createFill Create fill.
     */
    updateFillStyle(state: import("../canvas").FillStrokeState, createFill: (this: CanvasBuilder, arg1: import("../canvas").FillStrokeState) => Array<*>) {
        const fillStyle = state.fillStyle;
        if (typeof fillStyle !== 'string' || state.currentFillStyle != fillStyle) {
            if (fillStyle !== undefined) {
                this.instructions.push(createFill.call(this, state));
            }
            state.currentFillStyle = fillStyle;
        }
    }

    /**
     * @param {import("../canvas").FillStrokeState} state State.
     * @param {function(this:CanvasBuilder, import("../canvas").FillStrokeState): void} applyStroke Apply stroke.
     */
    updateStrokeStyle(state: import("../canvas").FillStrokeState, applyStroke: (this: CanvasBuilder, arg1: import("../canvas").FillStrokeState) => void) {
        const strokeStyle = state.strokeStyle;
        const lineCap = state.lineCap;
        const lineDash = state.lineDash;
        const lineDashOffset = state.lineDashOffset;
        const lineJoin = state.lineJoin;
        const lineWidth = state.lineWidth;
        const miterLimit = state.miterLimit;
        if (
            state.currentStrokeStyle != strokeStyle ||
            state.currentLineCap != lineCap ||
            (lineDash != state.currentLineDash &&
                !equals(state.currentLineDash, lineDash)) ||
            state.currentLineDashOffset != lineDashOffset ||
            state.currentLineJoin != lineJoin ||
            state.currentLineWidth != lineWidth ||
            state.currentMiterLimit != miterLimit
        ) {
            if (strokeStyle !== undefined) {
                applyStroke.call(this, state);
            }
            state.currentStrokeStyle = strokeStyle;
            state.currentLineCap = lineCap;
            state.currentLineDash = lineDash;
            state.currentLineDashOffset = lineDashOffset;
            state.currentLineJoin = lineJoin;
            state.currentLineWidth = lineWidth;
            state.currentMiterLimit = miterLimit;
        }
    }

    /**
     * @param {FeatureLike} feature Feature.
     */
    endGeometry(feature: FeatureLike) {
        this.beginGeometryInstruction1_[2] = this.instructions.length;
        this.beginGeometryInstruction1_ = null;
        this.beginGeometryInstruction2_[2] = this.hitDetectionInstructions.length;
        this.beginGeometryInstruction2_ = null;
        const endGeometryInstruction = [CanvasInstruction.END_GEOMETRY, feature];
        this.instructions.push(endGeometryInstruction);
        this.hitDetectionInstructions.push(endGeometryInstruction);
    }

    /**
     * Get the buffered rendering extent.  Rendering will be clipped to the extent
     * provided to the constructor.  To account for symbolizers that may intersect
     * this extent, we calculate a buffered extent (e.g. based on stroke width).
     * @return {Extent} The buffered rendering extent.
     * @protected
     */
    getBufferedMaxExtent(): Extent {
        if (!this.bufferedMaxExtent_) {
            this.bufferedMaxExtent_ = clone(this.maxExtent);
            if (this.maxLineWidth > 0) {
                const width = (this.resolution * (this.maxLineWidth + 1)) / 2;
                buffer(this.bufferedMaxExtent_, width, this.bufferedMaxExtent_);
            }
        }
        return this.bufferedMaxExtent_;
    }
}

export default CanvasBuilder;
