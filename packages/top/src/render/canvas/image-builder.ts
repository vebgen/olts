
import { Extent } from '@olts/core/extent';
import CanvasBuilder from './Builder';
import CanvasInstruction from './Instruction';

export class CanvasImageBuilder extends CanvasBuilder {
    /**
     * @param tolerance Tolerance.
     * @param {Extent} maxExtent Maximum extent.
     * @param resolution Resolution.
     * @param pixelRatio Pixel ratio.
     */
    constructor(tolerance: number, maxExtent: Extent, resolution: number, pixelRatio: number) {
        super(tolerance, maxExtent, resolution, pixelRatio);

        /**
         * @private
         * @type {import('../../DataTile').ImageLike}
         */
        this.hitDetectionImage_ = null;

        /**
         * @private
         * @type {import('../../DataTile').ImageLike}
         */
        this.image_ = null;

        /**
         * @private
         * @type {number|undefined}
         */
        this.imagePixelRatio_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.anchorX_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.anchorY_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.height_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.opacity_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.originX_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.originY_ = undefined;

        /**
         * @private
         * @type {boolean|undefined}
         */
        this.rotateWithView_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.rotation_ = undefined;

        /**
         * @private
         * @type {Size|undefined}
         */
        this.scale_ = undefined;

        /**
         * @private
         * @type {number|undefined}
         */
        this.width_ = undefined;

        /**
         * @private
         * @type {"declutter"|"obstacle"|"none"|undefined}
         */
        this.declutterMode_ = undefined;

        /**
         * Data shared with a text builder for combined decluttering.
         * @private
         * @type {import("../canvas").DeclutterImageWithText}
         */
        this.declutterImageWithText_ = undefined;
    }

    /**
     * @param {Point|import("../Feature").default} pointGeometry Point geometry.
     * @param {FeatureLike} feature Feature.
     */
    drawPoint(pointGeometry: Point | import("../Feature").default, feature: FeatureLike) {
        if (!this.image_) {
            return;
        }
        this.beginGeometry(pointGeometry, feature);
        const flatCoordinates = pointGeometry.getFlatCoordinates();
        const stride = pointGeometry.getStride();
        const myBegin = this.coordinates.length;
        const myEnd = this.appendFlatPointCoordinates(flatCoordinates, stride);
        this.instructions.push([
            CanvasInstruction.DRAW_IMAGE,
            myBegin,
            myEnd,
            this.image_,
            // Remaining arguments to DRAW_IMAGE are in alphabetical order
            this.anchorX_ * this.imagePixelRatio_,
            this.anchorY_ * this.imagePixelRatio_,
            Math.ceil(this.height_ * this.imagePixelRatio_),
            this.opacity_,
            this.originX_ * this.imagePixelRatio_,
            this.originY_ * this.imagePixelRatio_,
            this.rotateWithView_,
            this.rotation_,
            [
                (this.scale_[0] * this.pixelRatio) / this.imagePixelRatio_,
                (this.scale_[1] * this.pixelRatio) / this.imagePixelRatio_,
            ],
            Math.ceil(this.width_ * this.imagePixelRatio_),
            this.declutterMode_,
            this.declutterImageWithText_,
        ]);
        this.hitDetectionInstructions.push([
            CanvasInstruction.DRAW_IMAGE,
            myBegin,
            myEnd,
            this.hitDetectionImage_,
            // Remaining arguments to DRAW_IMAGE are in alphabetical order
            this.anchorX_,
            this.anchorY_,
            this.height_,
            1,
            this.originX_,
            this.originY_,
            this.rotateWithView_,
            this.rotation_,
            this.scale_,
            this.width_,
            this.declutterMode_,
            this.declutterImageWithText_,
        ]);
        this.endGeometry(feature);
    }

    /**
     * @param {MultiPoint|import("../Feature").default} multiPointGeometry MultiPoint geometry.
     * @param {FeatureLike} feature Feature.
     */
    drawMultiPoint(multiPointGeometry: MultiPoint | import("../Feature").default, feature: FeatureLike) {
        if (!this.image_) {
            return;
        }
        this.beginGeometry(multiPointGeometry, feature);
        const flatCoordinates = multiPointGeometry.getFlatCoordinates();
        const stride = multiPointGeometry.getStride();
        const myBegin = this.coordinates.length;
        const myEnd = this.appendFlatPointCoordinates(flatCoordinates, stride);
        this.instructions.push([
            CanvasInstruction.DRAW_IMAGE,
            myBegin,
            myEnd,
            this.image_,
            // Remaining arguments to DRAW_IMAGE are in alphabetical order
            this.anchorX_ * this.imagePixelRatio_,
            this.anchorY_ * this.imagePixelRatio_,
            Math.ceil(this.height_ * this.imagePixelRatio_),
            this.opacity_,
            this.originX_ * this.imagePixelRatio_,
            this.originY_ * this.imagePixelRatio_,
            this.rotateWithView_,
            this.rotation_,
            [
                (this.scale_[0] * this.pixelRatio) / this.imagePixelRatio_,
                (this.scale_[1] * this.pixelRatio) / this.imagePixelRatio_,
            ],
            Math.ceil(this.width_ * this.imagePixelRatio_),
            this.declutterMode_,
            this.declutterImageWithText_,
        ]);
        this.hitDetectionInstructions.push([
            CanvasInstruction.DRAW_IMAGE,
            myBegin,
            myEnd,
            this.hitDetectionImage_,
            // Remaining arguments to DRAW_IMAGE are in alphabetical order
            this.anchorX_,
            this.anchorY_,
            this.height_,
            1,
            this.originX_,
            this.originY_,
            this.rotateWithView_,
            this.rotation_,
            this.scale_,
            this.width_,
            this.declutterMode_,
            this.declutterImageWithText_,
        ]);
        this.endGeometry(feature);
    }

    /**
     * @return {import("../canvas").SerializableInstructions} the serializable instructions.
     */
    finish(): import("../canvas").SerializableInstructions {
        this.reverseHitDetectionInstructions();
        // FIXME this doesn't really protect us against further calls to draw*Geometry
        this.anchorX_ = undefined;
        this.anchorY_ = undefined;
        this.hitDetectionImage_ = null;
        this.image_ = null;
        this.imagePixelRatio_ = undefined;
        this.height_ = undefined;
        this.scale_ = undefined;
        this.opacity_ = undefined;
        this.originX_ = undefined;
        this.originY_ = undefined;
        this.rotateWithView_ = undefined;
        this.rotation_ = undefined;
        this.width_ = undefined;
        return super.finish();
    }

    /**
     * @param {import("../../style/Image").default} imageStyle Image style.
     * @param {Object} [sharedData] Shared data.
     */
    setImageStyle(imageStyle: import("../../style/Image").default, sharedData: object) {
        const anchor = imageStyle.getAnchor();
        const size = imageStyle.getSize();
        const origin = imageStyle.getOrigin();
        this.imagePixelRatio_ = imageStyle.getPixelRatio(this.pixelRatio);
        this.anchorX_ = anchor[0];
        this.anchorY_ = anchor[1];
        this.hitDetectionImage_ = imageStyle.getHitDetectionImage();
        this.image_ = imageStyle.getImage(this.pixelRatio);
        this.height_ = size[1];
        this.opacity_ = imageStyle.getOpacity();
        this.originX_ = origin[0];
        this.originY_ = origin[1];
        this.rotateWithView_ = imageStyle.getRotateWithView();
        this.rotation_ = imageStyle.getRotation();
        this.scale_ = imageStyle.getScaleArray();
        this.width_ = size[0];
        this.declutterMode_ = imageStyle.getDeclutterMode();
        this.declutterImageWithText_ = sharedData;
    }
}

export default CanvasImageBuilder;
