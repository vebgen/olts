
import BaseVector from '../../layer/BaseVector';
import MixedGeometryBatch from '../../render/webgl/MixedGeometryBatch';
import VectorEventType from '../../source/VectorEventType';
import VectorStyleRenderer from '../../render/webgl/VectorStyleRenderer';
import type { ViewHint } from '../../view';
import WebGLLayerRenderer from './Layer';
import WebGLRenderTarget from '../../webgl/RenderTarget';
import {DefaultUniform} from '../../webgl/Helper';
import {
  apply as applyTransform,
  create as createTransform,
  makeInverse as makeInverseTransform,
  multiply as multiplyTransform,
  setFromArray as setFromTransform,
  translate as translateTransform,
} from '../../transform';
import {assert} from '@olts/core/asserts';
import {buffer, createEmpty, equals} from '@olts/core/extent';
import {colorDecodeId} from '../../render/webgl/utils';
import {
  create as createMat4,
  fromTransform as mat4FromTransform,
} from '../../vec/mat4.js';
import {
  getTransformFromProjections,
  getUserProjection,
  toUserExtent,
  toUserResolution,
} from '../../proj';
import {getWorldParameters} from './worldUtil';
import {listen, unlistenByKey} from '../../events';

export const Uniforms = {
  ...DefaultUniform,
  RENDER_EXTENT: 'u_renderExtent', // intersection of layer, source, and view extent
  PATTERN_ORIGIN: 'u_patternOrigin',
  GLOBAL_ALPHA: 'u_globalAlpha',
};

/**
 * @typedef {import('../../render/webgl/VectorStyleRenderer').VectorStyle} VectorStyle
 */

/**
 * @typedef {Object} Options
 * @property [className='ol-layer'] A CSS class name to set to the canvas element.
 * @property {VectorStyle|VectorStyle[]} style Vector style as literal style or shaders; can also accept an array of styles
 * @property {boolean} [disableHitDetection=false] Setting this to true will provide a slight performance boost, but will
 * prevent all hit detection on the layer.
 * @property {Array<import("./Layer").PostProcessesOptions>} [postProcesses] Post-processes definitions
 */

/**
 * Experimental WebGL vector renderer. Supports polygons, lines and points:
 *  * Polygons are broken down into triangles
 *  * Lines are rendered as strips of quads
 *  * Points are rendered as quads
 *
 * You need to provide vertex and fragment shaders as well as custom attributes for each type of geometry. All shaders
 * can access the uniforms in the {@link module:ol/webgl/Helper~DefaultUniform} enum.
 * The vertex shaders can access the following attributes depending on the geometry type:
 *  * For polygons: {@link module:ol/render/webgl/PolygonBatchRenderer~Attributes}
 *  * For line strings: {@link module:ol/render/webgl/LineStringBatchRenderer~Attributes}
 *  * For points: {@link module:ol/render/webgl/PointBatchRenderer~Attributes}
 *
 * Please note that the fragment shaders output should have premultiplied alpha, otherwise visual anomalies may occur.
 *
 * Note: this uses {@link module:ol/webgl/Helper~WebGLHelper} internally.
 */
export class WebGLVectorLayerRenderer extends WebGLLayerRenderer {
  /**
   * @param {import("../../layer/Layer").default} layer Layer.
   * @param {Options} options Options.
   */
  constructor(layer, options) {
    const uniforms = {
      [Uniforms.RENDER_EXTENT]: [0, 0, 0, 0],
      [Uniforms.PATTERN_ORIGIN]: [0, 0],
      [Uniforms.GLOBAL_ALPHA]: 1,
    };

    super(layer, {
      uniforms: uniforms,
      postProcesses: options.postProcesses,
    });

    /**
     * @type {boolean}
     * @private
     */
    this.hitDetectionEnabled_ = !options.disableHitDetection;

    /**
     * @type {WebGLRenderTarget}
     * @private
     */
    this.hitRenderTarget_;

    this.sourceRevision_ = -1;

    this.previousExtent_ = createEmpty();

    /**
     * This transform is updated on every frame and is the composition of:
     * - invert of the world->screen transform that was used when rebuilding buffers (see `this.renderTransform_`)
     * - current world->screen transform
     * @type {import("../../transform").Transform}
     * @private
     */
    this.currentTransform_ = createTransform();

    this.tmpCoords_ = [0, 0];
    this.tmpTransform_ = createTransform();
    this.tmpMat4_ = createMat4();

    /**
     * @type {import("../../transform").Transform}
     * @private
     */
    this.currentFrameStateTransform_ = createTransform();

    /**
     * @type {VectorStyle[]}
     * @private
     */
    this.styles_ = [];

    /**
     * @type {VectorStyleRenderer[]}
     * @private
     */
    this.styleRenderers_ = [];

    /**
     * @type {Array<import('../../render/webgl/VectorStyleRenderer').WebGLBuffers>}
     * @private
     */
    this.buffers_ = [];

    this.applyOptions_(options);

    /**
     * @private
     */
    this.batch_ = new MixedGeometryBatch();

    /**
     * @private
     * @type {boolean}
     */
    this.initialFeaturesAdded_ = false;

    /**
     * @private
     * @type {Array<import("../../events").EventsKey|null>}
     */
    this.sourceListenKeys_ = null;
  }

  /**
   * @private
   * @param {import("../../Map").FrameState} frameState Frame state.
   */
  addInitialFeatures_(frameState) {
    const source = this.getLayer().getSource();
    const userProjection = getUserProjection();
    let projectionTransform;
    if (userProjection) {
      projectionTransform = getTransformFromProjections(
        userProjection,
        frameState.viewState.projection,
      );
    }
    this.batch_.addFeatures(source.getFeatures(), projectionTransform);
    this.sourceListenKeys_ = [
      listen(
        source,
        VectorEventType.ADDFEATURE,
        this.handleSourceFeatureAdded_.bind(this, projectionTransform),
        this,
      ),
      listen(
        source,
        VectorEventType.CHANGEFEATURE,
        this.handleSourceFeatureChanged_,
        this,
      ),
      listen(
        source,
        VectorEventType.REMOVEFEATURE,
        this.handleSourceFeatureDelete_,
        this,
      ),
      listen(
        source,
        VectorEventType.CLEAR,
        this.handleSourceFeatureClear_,
        this,
      ),
    ];
  }

  /**
   * @param {Options} options Options.
   * @private
   */
  applyOptions_(options) {
    this.styles_ = Array.isArray(options.style)
      ? options.style
      : [options.style];
  }

  /**
   * @private
   */
  createRenderers_() {
    this.buffers_ = [];
    this.styleRenderers_ = this.styles_.map(
      (style) =>
        new VectorStyleRenderer(style, this.helper, this.hitDetectionEnabled_),
    );
  }

  reset(options) {
    this.applyOptions_(options);
    if (this.helper) {
      this.createRenderers_();
    }
    super.reset(options);
  }

  afterHelperCreated() {
    this.createRenderers_();
    if (this.hitDetectionEnabled_) {
      this.hitRenderTarget_ = new WebGLRenderTarget(this.helper);
    }
  }

  /**
   * @param {import("../../proj").TransformFunction} projectionTransform Transform function.
   * @param {import("../../source/Vector").VectorSourceEvent} event Event.
   * @private
   */
  handleSourceFeatureAdded_(projectionTransform, event) {
    const feature = event.feature;
    this.batch_.addFeature(feature, projectionTransform);
  }

  /**
   * @param {import("../../source/Vector").VectorSourceEvent} event Event.
   * @private
   */
  handleSourceFeatureChanged_(event) {
    const feature = event.feature;
    this.batch_.changeFeature(feature);
  }

  /**
   * @param {import("../../source/Vector").VectorSourceEvent} event Event.
   * @private
   */
  handleSourceFeatureDelete_(event) {
    const feature = event.feature;
    this.batch_.removeFeature(feature);
  }

  /**
   * @private
   */
  handleSourceFeatureClear_() {
    this.batch_.clear();
  }

  /**
   * @param {import("../../transform").Transform} batchInvertTransform Inverse of the transformation in which geometries are expressed
   * @private
   */
  applyUniforms_(batchInvertTransform) {
    // world to screen matrix
    setFromTransform(this.tmpTransform_, this.currentFrameStateTransform_);
    multiplyTransform(this.tmpTransform_, batchInvertTransform);
    this.helper.setUniformMatrixValue(
      Uniforms.PROJECTION_MATRIX,
      mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
    );

    // screen to world matrix
    makeInverseTransform(this.tmpTransform_, this.tmpTransform_);
    this.helper.setUniformMatrixValue(
      Uniforms.SCREEN_TO_WORLD_MATRIX,
      mat4FromTransform(this.tmpMat4_, this.tmpTransform_),
    );

    // pattern origin should always be [0, 0] in world coordinates
    this.tmpCoords_[0] = 0;
    this.tmpCoords_[1] = 0;
    makeInverseTransform(this.tmpTransform_, batchInvertTransform);
    applyTransform(this.tmpTransform_, this.tmpCoords_);
    this.helper.setUniformFloatVec2(Uniforms.PATTERN_ORIGIN, this.tmpCoords_);
  }

  /**
   * Render the layer.
   * @param {import("../../Map").FrameState} frameState Frame state.
   * @return {HTMLElement} The rendered element.
   */
  renderFrame(frameState) {
    const gl = this.helper.getGL();
    this.preRender(gl, frameState);

    const [startWorld, endWorld, worldWidth] = getWorldParameters(
      frameState,
      this.getLayer(),
    );

    // draw the normal canvas
    this.helper.prepareDraw(frameState);
    this.renderWorlds(frameState, false, startWorld, endWorld, worldWidth);
    this.helper.finalizeDraw(frameState);

    const canvas = this.helper.getCanvas();
    const layerState = frameState.layerStatesArray[frameState.layerIndex];
    const opacity = layerState.opacity;
    if (opacity !== parseFloat(canvas.style.opacity)) {
      canvas.style.opacity = String(opacity);
    }

    if (this.hitDetectionEnabled_) {
      this.renderWorlds(frameState, true, startWorld, endWorld, worldWidth);
      this.hitRenderTarget_.clearCachedData();
    }

    this.postRender(gl, frameState);

    return canvas;
  }

  /**
   * Determine whether renderFrame should be called.
   * @param {import("../../Map").FrameState} frameState Frame state.
   * @return {boolean} Layer is ready to be rendered.
   */
  prepareFrameInternal(frameState) {
    if (!this.initialFeaturesAdded_) {
      this.addInitialFeatures_(frameState);
      this.initialFeaturesAdded_ = true;
    }

    const layer = this.getLayer();
    const vectorSource = layer.getSource();
    const viewState = frameState.viewState;
    const viewNotMoving =
      !frameState.viewHints[ViewHint.ANIMATING] &&
      !frameState.viewHints[ViewHint.INTERACTING];
    const extentChanged = !equals(this.previousExtent_, frameState.extent);
    const sourceChanged = this.sourceRevision_ < vectorSource.getRevision();

    if (sourceChanged) {
      this.sourceRevision_ = vectorSource.getRevision();
    }

    if (viewNotMoving && (extentChanged || sourceChanged)) {
      const projection = viewState.projection;
      const resolution = viewState.resolution;

      const renderBuffer =
        layer instanceof BaseVector ? layer.getRenderBuffer() : 0;
      const extent = buffer(frameState.extent, renderBuffer * resolution);

      const userProjection = getUserProjection();
      if (userProjection) {
        vectorSource.loadFeatures(
          toUserExtent(extent, userProjection),
          toUserResolution(resolution, projection),
          userProjection,
        );
      } else {
        vectorSource.loadFeatures(extent, resolution, projection);
      }

      this.ready = false;

      const transform = this.helper.makeProjectionTransform(
        frameState,
        createTransform(),
      );

      const generatePromises = this.styleRenderers_.map((renderer, i) =>
        renderer.generateBuffers(this.batch_, transform).then((buffers) => {
          this.buffers_[i] = buffers;
        }),
      );
      Promise.all(generatePromises).then(() => {
        this.ready = true;
        this.getLayer().changed();
      });

      this.previousExtent_ = frameState.extent.slice();
    }

    return true;
  }

  /**
   * Render the world, either to the main framebuffer or to the hit framebuffer
   * @param {import("../../Map").FrameState} frameState current frame state
   * @param {boolean} forHitDetection whether the rendering is for hit detection
   * @param startWorld the world to render in the first iteration
   * @param endWorld the last world to render
   * @param worldWidth the width of the worlds being rendered
   */
  renderWorlds(frameState, forHitDetection, startWorld, endWorld, worldWidth) {
    let world = startWorld;

    if (forHitDetection) {
      this.hitRenderTarget_.setSize([
        Math.floor(frameState.size[0] / 2),
        Math.floor(frameState.size[1] / 2),
      ]);
      this.helper.prepareDrawToRenderTarget(
        frameState,
        this.hitRenderTarget_,
        true,
      );
    }

    this.currentFrameStateTransform_ = this.helper.makeProjectionTransform(
      frameState,
      this.currentFrameStateTransform_,
    );

    do {
      for (let i = 0, ii = this.styleRenderers_.length; i < ii; i++) {
        const renderer = this.styleRenderers_[i];
        const buffers = this.buffers_[i];
        if (!buffers) {
          continue;
        }
        renderer.render(buffers, frameState, () => {
          this.applyUniforms_(buffers.invertVerticesTransform);
          this.helper.applyHitDetectionUniform(forHitDetection);
        });
      }
      translateTransform(this.currentFrameStateTransform_, worldWidth, 0);
    } while (++world < endWorld);
  }

  /**
   * @param {Coordinate} coordinate Coordinate.
   * @param {import("../../Map").FrameState} frameState Frame state.
   * @param hitTolerance Hit tolerance in pixels.
   * @param {import("../vector").FeatureCallback<T>} callback Feature callback.
   * @param {Array<import("../Map").HitMatch<T>>} matches The hit detected matches with tolerance.
   * @return {T|undefined} Callback result.
   * @template T
   */
  forEachFeatureAtCoordinate(
    coordinate,
    frameState,
    hitTolerance,
    callback,
    matches,
  ) {
    assert(
      this.hitDetectionEnabled_,
      '`forEachFeatureAtCoordinate` cannot be used on a WebGL layer if the hit detection logic has been disabled using the `disableHitDetection: true` option.',
    );
    if (!this.styleRenderers_.length || !this.hitDetectionEnabled_) {
      return undefined;
    }

    const pixel = applyTransform(
      frameState.coordinateToPixelTransform,
      coordinate.slice(),
    );

    const data = this.hitRenderTarget_.readPixel(pixel[0] / 2, pixel[1] / 2);
    const color = [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
    const ref = colorDecodeId(color);
    const feature = this.batch_.getFeatureFromRef(ref);
    if (feature) {
      return callback(feature, this.getLayer(), null);
    }
    return undefined;
  }

  /**
   * Clean up.
   */
  disposeInternal() {
    if (this.sourceListenKeys_) {
      this.sourceListenKeys_.forEach(function (key) {
        unlistenByKey(key);
      });
      this.sourceListenKeys_ = null;
    }
    super.disposeInternal();
  }
}

export default WebGLVectorLayerRenderer;
