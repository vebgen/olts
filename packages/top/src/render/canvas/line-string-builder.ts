
import CanvasBuilder from './Builder';
import CanvasInstruction, {
  beginPathInstruction,
  strokeInstruction,
} from './Instruction';
import {defaultLineDash, defaultLineDashOffset} from '../canvas';

export class CanvasLineStringBuilder extends CanvasBuilder {
  /**
   * @param {number} tolerance Tolerance.
   * @param {Extent} maxExtent Maximum extent.
   * @param {number} resolution Resolution.
   * @param {number} pixelRatio Pixel ratio.
   */
  constructor(tolerance: number, maxExtent: Extent, resolution: number, pixelRatio: number) {
    super(tolerance, maxExtent, resolution, pixelRatio);
  }

  /**
   * @param {number[]} flatCoordinates Flat coordinates.
   * @param {number} offset Offset.
   * @param {number} end End.
   * @param {number} stride Stride.
   * @private
   * @return {number} end.
   */
  drawFlatCoordinates_(flatCoordinates: number[], offset: number, end: number, stride: number): number {
    const myBegin = this.coordinates.length;
    const myEnd = this.appendFlatLineCoordinates(
      flatCoordinates,
      offset,
      end,
      stride,
      false,
      false,
    );
    const moveToLineToInstruction = [
      CanvasInstruction.MOVE_TO_LINE_TO,
      myBegin,
      myEnd,
    ];
    this.instructions.push(moveToLineToInstruction);
    this.hitDetectionInstructions.push(moveToLineToInstruction);
    return end;
  }

  /**
   * @param {LineString|import("../Feature").default} lineStringGeometry Line string geometry.
   * @param {FeatureLike} feature Feature.
   */
  drawLineString(lineStringGeometry: LineString | import("../Feature").default, feature: FeatureLike) {
    const state = this.state;
    const strokeStyle = state.strokeStyle;
    const lineWidth = state.lineWidth;
    if (strokeStyle === undefined || lineWidth === undefined) {
      return;
    }
    this.updateStrokeStyle(state, this.applyStroke);
    this.beginGeometry(lineStringGeometry, feature);
    this.hitDetectionInstructions.push(
      [
        CanvasInstruction.SET_STROKE_STYLE,
        state.strokeStyle,
        state.lineWidth,
        state.lineCap,
        state.lineJoin,
        state.miterLimit,
        defaultLineDash,
        defaultLineDashOffset,
      ],
      beginPathInstruction,
    );
    const flatCoordinates = lineStringGeometry.getFlatCoordinates();
    const stride = lineStringGeometry.getStride();
    this.drawFlatCoordinates_(
      flatCoordinates,
      0,
      flatCoordinates.length,
      stride,
    );
    this.hitDetectionInstructions.push(strokeInstruction);
    this.endGeometry(feature);
  }

  /**
   * @param {MultiLineString|import("../Feature").default} multiLineStringGeometry MultiLineString geometry.
   * @param {FeatureLike} feature Feature.
   */
  drawMultiLineString(multiLineStringGeometry: MultiLineString | import("../Feature").default, feature: FeatureLike) {
    const state = this.state;
    const strokeStyle = state.strokeStyle;
    const lineWidth = state.lineWidth;
    if (strokeStyle === undefined || lineWidth === undefined) {
      return;
    }
    this.updateStrokeStyle(state, this.applyStroke);
    this.beginGeometry(multiLineStringGeometry, feature);
    this.hitDetectionInstructions.push(
      [
        CanvasInstruction.SET_STROKE_STYLE,
        state.strokeStyle,
        state.lineWidth,
        state.lineCap,
        state.lineJoin,
        state.miterLimit,
        defaultLineDash,
        defaultLineDashOffset,
      ],
      beginPathInstruction,
    );
    const ends = multiLineStringGeometry.getEnds();
    const flatCoordinates = multiLineStringGeometry.getFlatCoordinates();
    const stride = multiLineStringGeometry.getStride();
    let offset = 0;
    for (let i = 0, ii = ends.length; i < ii; ++i) {
      offset = this.drawFlatCoordinates_(
        flatCoordinates,
        offset,
        /** @type {number} */ (ends[i]),
        stride,
      );
    }
    this.hitDetectionInstructions.push(strokeInstruction);
    this.endGeometry(feature);
  }

  /**
   * @return {import("../canvas").SerializableInstructions} the serializable instructions.
   */
  finish(): import("../canvas").SerializableInstructions {
    const state = this.state;
    if (
      state.lastStroke != undefined &&
      state.lastStroke != this.coordinates.length
    ) {
      this.instructions.push(strokeInstruction);
    }
    this.reverseHitDetectionInstructions();
    this.state = null;
    return super.finish();
  }

  /**
   * @param {import("../canvas").FillStrokeState} state State.
   */
  applyStroke(state: import("../canvas").FillStrokeState) {
    if (
      state.lastStroke != undefined &&
      state.lastStroke != this.coordinates.length
    ) {
      this.instructions.push(strokeInstruction);
      state.lastStroke = this.coordinates.length;
    }
    state.lastStroke = 0;
    super.applyStroke(state);
    this.instructions.push(beginPathInstruction);
  }
}

export default CanvasLineStringBuilder;
