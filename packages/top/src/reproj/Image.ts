
import {ERROR_THRESHOLD} from './common';

import type { EventType } from '@olts/events';
import ImageState from '../ImageState';
import ImageWrapper from '../Image';
import Triangulation from './Triangulation';
import {
  calculateSourceResolution,
  render as renderReprojected,
} from '../reproj';
import {fromResolutionLike} from '../resolution';
import {
  getCenter,
  getHeight,
  getIntersection,
  getWidth,
  isEmpty,
} from '@olts/core/extent';
import {listen, unlistenByKey} from '../events';

/**
 * @typedef {function(Extent, number, number) : import("../Image").default} FunctionType
 */

/**
 * Class encapsulating single reprojected image.
 * See {@link module:ol/source/Image~ImageSource}.
 */
export class ReprojImage extends ImageWrapper {
  /**
   * @param {import("../proj/Projection").default} sourceProj Source projection (of the data).
   * @param {import("../proj/Projection").default} targetProj Target projection.
   * @param {Extent} targetExtent Target extent.
   * @param {number} targetResolution Target resolution.
   * @param {number} pixelRatio Pixel ratio.
   * @param {FunctionType} getImageFunction
   *     Function returning source images (extent, resolution, pixelRatio).
   * @param {boolean} interpolate Use linear interpolation when resampling.
   */
  constructor(
    sourceProj,
    targetProj,
    targetExtent,
    targetResolution,
    pixelRatio,
    getImageFunction,
    interpolate,
  ) {
    let maxSourceExtent = sourceProj.getExtent();
    if (maxSourceExtent && sourceProj.canWrapX()) {
      maxSourceExtent = maxSourceExtent.slice();
      maxSourceExtent[0] = -Infinity;
      maxSourceExtent[2] = Infinity;
    }
    let maxTargetExtent = targetProj.getExtent();
    if (maxTargetExtent && targetProj.canWrapX()) {
      maxTargetExtent = maxTargetExtent.slice();
      maxTargetExtent[0] = -Infinity;
      maxTargetExtent[2] = Infinity;
    }

    const limitedTargetExtent = maxTargetExtent
      ? getIntersection(targetExtent, maxTargetExtent)
      : targetExtent;

    const targetCenter = getCenter(limitedTargetExtent);
    const sourceResolution = calculateSourceResolution(
      sourceProj,
      targetProj,
      targetCenter,
      targetResolution,
    );

    const errorThresholdInPixels = ERROR_THRESHOLD;

    const triangulation = new Triangulation(
      sourceProj,
      targetProj,
      limitedTargetExtent,
      maxSourceExtent,
      sourceResolution * errorThresholdInPixels,
      targetResolution,
    );

    const sourceExtent = triangulation.calculateSourceExtent();
    const sourceImage = isEmpty(sourceExtent)
      ? null
      : getImageFunction(sourceExtent, sourceResolution, pixelRatio);
    const state = sourceImage ? ImageState.IDLE : ImageState.EMPTY;
    const sourcePixelRatio = sourceImage ? sourceImage.getPixelRatio() : 1;

    super(targetExtent, targetResolution, sourcePixelRatio, state);

    /**
     * @private
     * @type {import("../proj/Projection").default}
     */
    this.targetProj_ = targetProj;

    /**
     * @private
     * @type {Extent}
     */
    this.maxSourceExtent_ = maxSourceExtent;

    /**
     * @private
     * @type {!import("./Triangulation").default}
     */
    this.triangulation_ = triangulation;

    /**
     * @private
     * @type {number}
     */
    this.targetResolution_ = targetResolution;

    /**
     * @private
     * @type {Extent}
     */
    this.targetExtent_ = targetExtent;

    /**
     * @private
     * @type {import("../Image").default}
     */
    this.sourceImage_ = sourceImage;

    /**
     * @private
     * @type {number}
     */
    this.sourcePixelRatio_ = sourcePixelRatio;

    /**
     * @private
     * @type {boolean}
     */
    this.interpolate_ = interpolate;

    /**
     * @private
     * @type {HTMLCanvasElement}
     */
    this.canvas_ = null;

    /**
     * @private
     * @type {?import("../events").EventsKey}
     */
    this.sourceListenerKey_ = null;
  }

  /**
   * Clean up.
   */
  disposeInternal() {
    if (this.state == ImageState.LOADING) {
      this.unlistenSource_();
    }
    super.disposeInternal();
  }

  /**
   * @return {HTMLCanvasElement} Image.
   */
  getImage() {
    return this.canvas_;
  }

  /**
   * @return {import("../proj/Projection").default} Projection.
   */
  getProjection() {
    return this.targetProj_;
  }

  /**
   * @private
   */
  reproject_() {
    const sourceState = this.sourceImage_.getState();
    if (sourceState == ImageState.LOADED) {
      const width = getWidth(this.targetExtent_) / this.targetResolution_;
      const height = getHeight(this.targetExtent_) / this.targetResolution_;
      this.canvas_ = renderReprojected(
        width,
        height,
        this.sourcePixelRatio_,
        fromResolutionLike(this.sourceImage_.getResolution()),
        this.maxSourceExtent_,
        this.targetResolution_,
        this.targetExtent_,
        this.triangulation_,
        [
          {
            extent: this.sourceImage_.getExtent(),
            image: this.sourceImage_.getImage(),
          },
        ],
        0,
        undefined,
        this.interpolate_,
        true,
      );
    }
    this.state = sourceState;
    this.changed();
  }

  /**
   * Load not yet loaded URI.
   */
  load() {
    if (this.state == ImageState.IDLE) {
      this.state = ImageState.LOADING;
      this.changed();

      const sourceState = this.sourceImage_.getState();
      if (sourceState == ImageState.LOADED || sourceState == ImageState.ERROR) {
        this.reproject_();
      } else {
        this.sourceListenerKey_ = listen(
          this.sourceImage_,
          EventType.CHANGE,
          function (e) {
            const sourceState = this.sourceImage_.getState();
            if (
              sourceState == ImageState.LOADED ||
              sourceState == ImageState.ERROR
            ) {
              this.unlistenSource_();
              this.reproject_();
            }
          },
          this,
        );
        this.sourceImage_.load();
      }
    }
  }

  /**
   * @private
   */
  unlistenSource_() {
    unlistenByKey(
      /** @type {!import("../events").EventsKey} */ (
        this.sourceListenerKey_
      ),
    );
    this.sourceListenerKey_ = null;
  }
}

export default ReprojImage;
