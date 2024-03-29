
import CanvasBuilderGroup from '../../render/canvas/BuilderGroup';
import CanvasLayerRenderer, {canvasPool} from './Layer';
import ExecutorGroup from '../../render/canvas/ExecutorGroup';
import RenderEventType from '../../render/EventType';
import type { ViewHint } from '../../view';
import {
  HIT_DETECT_RESOLUTION,
  createHitDetectionImageData,
  hitDetect,
} from '../../render/canvas/hitdetect';
import {
  apply,
  makeInverse,
  makeScale,
  toString as transformToString,
} from '../../transform';
import {
  buffer,
  containsExtent,
  createEmpty,
  getWidth,
  intersects as intersectsExtent,
  wrapX as wrapExtentX,
} from '@olts/core/extent';
import {createCanvasContext2D, releaseCanvas} from '@olts/core/dom';
import {
  defaultOrder as defaultRenderOrder,
  getTolerance as getRenderTolerance,
  getSquaredTolerance as getSquaredRenderTolerance,
  renderFeature,
} from '../vector';
import {equals} from '@olts/core/array';
import {
  fromUserExtent,
  getTransformFromProjections,
  getUserProjection,
  toUserExtent,
  toUserResolution,
} from '../../proj';
import {getUid} from '@olts/core/util';
import {wrapX as wrapCoordinateX} from '../../coordinate';

/**
 * Canvas renderer for vector layers.
 * @api
 */
export class CanvasVectorLayerRenderer extends CanvasLayerRenderer {
  /**
   * @param {import("../../layer/BaseVector").default} vectorLayer Vector layer.
   */
  constructor(vectorLayer) {
    super(vectorLayer);

    /** @private */
    this.boundHandleStyleImageChange_ = this.handleStyleImageChange_.bind(this);

    /**
     * @type {boolean}
     */
    this.animatingOrInteracting_;

    /**
     * @type {ImageData|null}
     */
    this.hitDetectionImageData_ = null;

    /**
     * @type {Array<import("../../Feature").default>}
     */
    this.renderedFeatures_ = null;

    /**
     * @private
     * @type {number}
     */
    this.renderedRevision_ = -1;

    /**
     * @private
     * @type {number}
     */
    this.renderedResolution_ = NaN;

    /**
     * @private
     * @type {Extent}
     */
    this.renderedExtent_ = createEmpty();

    /**
     * @private
     * @type {Extent}
     */
    this.wrappedRenderedExtent_ = createEmpty();

    /**
     * @private
     * @type {number}
     */
    this.renderedRotation_;

    /**
     * @private
     * @type {import("../../coordinate").Coordinate}
     */
    this.renderedCenter_ = null;

    /**
     * @private
     * @type {import("../../proj/Projection").default}
     */
    this.renderedProjection_ = null;

    /**
     * @private
     * @type {number}
     */
    this.renderedPixelRatio_ = 1;

    /**
     * @private
     * @type {function(import("../../Feature").default, import("../../Feature").default): number|null}
     */
    this.renderedRenderOrder_ = null;

    /**
     * @private
     * @type {import("../../render/canvas/ExecutorGroup").default}
     */
    this.replayGroup_ = null;

    /**
     * A new replay group had to be created by `prepareFrame()`
     * @type {boolean}
     */
    this.replayGroupChanged = true;

    /**
     * @type {import("../../render/canvas/ExecutorGroup").default}
     */
    this.declutterExecutorGroup = null;

    /**
     * Clipping to be performed by `renderFrame()`
     * @type {boolean}
     */
    this.clipping = true;

    /**
     * @private
     * @type {CanvasRenderingContext2D}
     */
    this.compositionContext_ = null;

    /**
     * @private
     * @type {number}
     */
    this.opacity_ = 1;
  }

  /**
   * @param {ExecutorGroup} executorGroup Executor group.
   * @param {import("../../Map").FrameState} frameState Frame state.
   * @param {import("rbush").default} [declutterTree] Declutter tree.
   */
  renderWorlds(executorGroup, frameState, declutterTree) {
    const extent = frameState.extent;
    const viewState = frameState.viewState;
    const center = viewState.center;
    const resolution = viewState.resolution;
    const projection = viewState.projection;
    const rotation = viewState.rotation;
    const projectionExtent = projection.getExtent();
    const vectorSource = this.getLayer().getSource();
    const pixelRatio = frameState.pixelRatio;
    const viewHints = frameState.viewHints;
    const snapToPixel = !(
      viewHints[ViewHint.ANIMATING] || viewHints[ViewHint.INTERACTING]
    );
    const context = this.compositionContext_;
    const width = Math.round(frameState.size[0] * pixelRatio);
    const height = Math.round(frameState.size[1] * pixelRatio);

    const multiWorld = vectorSource.getWrapX() && projection.canWrapX();
    const worldWidth = multiWorld ? getWidth(projectionExtent) : null;
    const endWorld = multiWorld
      ? Math.ceil((extent[2] - projectionExtent[2]) / worldWidth) + 1
      : 1;
    let world = multiWorld
      ? Math.floor((extent[0] - projectionExtent[0]) / worldWidth)
      : 0;
    do {
      const transform = this.getRenderTransform(
        center,
        resolution,
        rotation,
        pixelRatio,
        width,
        height,
        world * worldWidth,
      );
      executorGroup.execute(
        context,
        1,
        transform,
        rotation,
        snapToPixel,
        undefined,
        declutterTree,
      );
    } while (++world < endWorld);
  }

  setupCompositionContext_() {
    if (this.opacity_ !== 1) {
      const compositionContext = createCanvasContext2D(
        this.context.canvas.width,
        this.context.canvas.height,
        canvasPool,
      );
      this.compositionContext_ = compositionContext;
    } else {
      this.compositionContext_ = this.context;
    }
  }

  releaseCompositionContext_() {
    if (this.opacity_ !== 1) {
      const alpha = this.context.globalAlpha;
      this.context.globalAlpha = this.opacity_;
      this.context.drawImage(this.compositionContext_.canvas, 0, 0);
      this.context.globalAlpha = alpha;
      releaseCanvas(this.compositionContext_);
      canvasPool.push(this.compositionContext_.canvas);
      this.compositionContext_ = null;
    }
  }

  /**
   * Render declutter items for this layer
   * @param {import("../../Map").FrameState} frameState Frame state.
   */
  renderDeclutter(frameState) {
    if (this.declutterExecutorGroup) {
      this.setupCompositionContext_();
      this.renderWorlds(
        this.declutterExecutorGroup,
        frameState,
        frameState.declutterTree,
      );
      this.releaseCompositionContext_();
    }
  }

  /**
   * Render the layer.
   * @param {import("../../Map").FrameState} frameState Frame state.
   * @param {HTMLElement|null} target Target that may be used to render content to.
   * @return {HTMLElement|null} The rendered element.
   */
  renderFrame(frameState, target) {
    const pixelRatio = frameState.pixelRatio;
    const layerState = frameState.layerStatesArray[frameState.layerIndex];

    // set forward and inverse pixel transforms
    makeScale(this.pixelTransform, 1 / pixelRatio, 1 / pixelRatio);
    makeInverse(this.inversePixelTransform, this.pixelTransform);

    const canvasTransform = transformToString(this.pixelTransform);

    this.useContainer(target, canvasTransform, this.getBackground(frameState));
    const context = this.context;
    const canvas = context.canvas;

    const replayGroup = this.replayGroup_;
    const declutterExecutorGroup = this.declutterExecutorGroup;
    let render =
      (replayGroup && !replayGroup.isEmpty()) ||
      (declutterExecutorGroup && !declutterExecutorGroup.isEmpty());
    if (!render) {
      const hasRenderListeners =
        this.getLayer().hasListener(RenderEventType.PRERENDER) ||
        this.getLayer().hasListener(RenderEventType.POSTRENDER);
      if (!hasRenderListeners) {
        return null;
      }
    }

    // resize and clear
    const width = Math.round(frameState.size[0] * pixelRatio);
    const height = Math.round(frameState.size[1] * pixelRatio);
    if (canvas.width != width || canvas.height != height) {
      canvas.width = width;
      canvas.height = height;
      if (canvas.style.transform !== canvasTransform) {
        canvas.style.transform = canvasTransform;
      }
    } else if (!this.containerReused) {
      context.clearRect(0, 0, width, height);
    }

    this.preRender(context, frameState);

    const viewState = frameState.viewState;
    const projection = viewState.projection;

    this.opacity_ = layerState.opacity;
    this.setupCompositionContext_();

    // clipped rendering if layer extent is set
    let clipped = false;
    if (render && layerState.extent && this.clipping) {
      const layerExtent = fromUserExtent(layerState.extent, projection);
      render = intersectsExtent(layerExtent, frameState.extent);
      clipped = render && !containsExtent(layerExtent, frameState.extent);
      if (clipped) {
        this.clipUnrotated(this.compositionContext_, frameState, layerExtent);
      }
    }

    if (render) {
      this.renderWorlds(replayGroup, frameState);
    }

    if (clipped) {
      this.compositionContext_.restore();
    }

    this.releaseCompositionContext_();

    this.postRender(context, frameState);

    if (this.renderedRotation_ !== viewState.rotation) {
      this.renderedRotation_ = viewState.rotation;
      this.hitDetectionImageData_ = null;
    }
    return this.container;
  }

  /**
   * Asynchronous layer level hit detection.
   * @param {import("../../pixel").Pixel} pixel Pixel.
   * @return {Promise<Array<import("../../Feature").default>>} Promise
   * that resolves with an array of features.
   */
  getFeatures(pixel) {
    return new Promise((resolve) => {
      if (!this.hitDetectionImageData_ && !this.animatingOrInteracting_) {
        const size = [this.context.canvas.width, this.context.canvas.height];
        apply(this.pixelTransform, size);
        const center = this.renderedCenter_;
        const resolution = this.renderedResolution_;
        const rotation = this.renderedRotation_;
        const projection = this.renderedProjection_;
        const extent = this.wrappedRenderedExtent_;
        const layer = this.getLayer();
        const transforms = [];
        const width = size[0] * HIT_DETECT_RESOLUTION;
        const height = size[1] * HIT_DETECT_RESOLUTION;
        transforms.push(
          this.getRenderTransform(
            center,
            resolution,
            rotation,
            HIT_DETECT_RESOLUTION,
            width,
            height,
            0,
          ).slice(),
        );
        const source = layer.getSource();
        const projectionExtent = projection.getExtent();
        if (
          source.getWrapX() &&
          projection.canWrapX() &&
          !containsExtent(projectionExtent, extent)
        ) {
          let startX = extent[0];
          const worldWidth = getWidth(projectionExtent);
          let world = 0;
          let offsetX;
          while (startX < projectionExtent[0]) {
            --world;
            offsetX = worldWidth * world;
            transforms.push(
              this.getRenderTransform(
                center,
                resolution,
                rotation,
                HIT_DETECT_RESOLUTION,
                width,
                height,
                offsetX,
              ).slice(),
            );
            startX += worldWidth;
          }
          world = 0;
          startX = extent[2];
          while (startX > projectionExtent[2]) {
            ++world;
            offsetX = worldWidth * world;
            transforms.push(
              this.getRenderTransform(
                center,
                resolution,
                rotation,
                HIT_DETECT_RESOLUTION,
                width,
                height,
                offsetX,
              ).slice(),
            );
            startX -= worldWidth;
          }
        }
        const userProjection = getUserProjection();
        this.hitDetectionImageData_ = createHitDetectionImageData(
          size,
          transforms,
          this.renderedFeatures_,
          layer.getStyleFunction(),
          extent,
          resolution,
          rotation,
          getSquaredRenderTolerance(resolution, this.renderedPixelRatio_),
          userProjection ? projection : null,
        );
      }
      resolve(
        hitDetect(pixel, this.renderedFeatures_, this.hitDetectionImageData_),
      );
    });
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
    if (!this.replayGroup_) {
      return undefined;
    }
    const resolution = frameState.viewState.resolution;
    const rotation = frameState.viewState.rotation;
    const layer = this.getLayer();

    /** @type {!Record<string, import("../Map").HitMatch<T>|true>} */
    const features = {};

    /**
     * @param {import("../../Feature").FeatureLike} feature Feature.
     * @param {SimpleGeometry} geometry Geometry.
     * @param distanceSq The squared distance to the click position
     * @return {T|undefined} Callback result.
     */
    const featureCallback = function (feature, geometry, distanceSq) {
      const key = getUid(feature);
      const match = features[key];
      if (!match) {
        if (distanceSq === 0) {
          features[key] = true;
          return callback(feature, layer, geometry);
        }
        matches.push(
          (features[key] = {
            feature: feature,
            layer: layer,
            geometry: geometry,
            distanceSq: distanceSq,
            callback: callback,
          }),
        );
      } else if (match !== true && distanceSq < match.distanceSq) {
        if (distanceSq === 0) {
          features[key] = true;
          matches.splice(matches.lastIndexOf(match), 1);
          return callback(feature, layer, geometry);
        }
        match.geometry = geometry;
        match.distanceSq = distanceSq;
      }
      return undefined;
    };

    let result;
    const executorGroups = [this.replayGroup_];
    if (this.declutterExecutorGroup) {
      executorGroups.push(this.declutterExecutorGroup);
    }
    executorGroups.some((executorGroup) => {
      return (result = executorGroup.forEachFeatureAtCoordinate(
        coordinate,
        resolution,
        rotation,
        hitTolerance,
        featureCallback,
        executorGroup === this.declutterExecutorGroup &&
          frameState.declutterTree
          ? frameState.declutterTree.all().map((item) => item.value)
          : null,
      ));
    });

    return result;
  }

  /**
   * Perform action necessary to get the layer rendered after new fonts have loaded
   */
  handleFontsChanged() {
    const layer = this.getLayer();
    if (layer.getVisible() && this.replayGroup_) {
      layer.changed();
    }
  }

  /**
   * Handle changes in image style state.
   * @param {import("../../events/Event").default} event Image style change event.
   * @private
   */
  handleStyleImageChange_(event) {
    this.renderIfReadyAndVisible();
  }

  /**
   * Determine whether render should be called.
   * @param {import("../../Map").FrameState} frameState Frame state.
   * @return {boolean} Layer is ready to be rendered.
   */
  prepareFrame(frameState) {
    const vectorLayer = this.getLayer();
    const vectorSource = vectorLayer.getSource();
    if (!vectorSource) {
      return false;
    }

    const animating = frameState.viewHints[ViewHint.ANIMATING];
    const interacting = frameState.viewHints[ViewHint.INTERACTING];
    const updateWhileAnimating = vectorLayer.getUpdateWhileAnimating();
    const updateWhileInteracting = vectorLayer.getUpdateWhileInteracting();

    if (
      (this.ready && !updateWhileAnimating && animating) ||
      (!updateWhileInteracting && interacting)
    ) {
      this.animatingOrInteracting_ = true;
      return true;
    }
    this.animatingOrInteracting_ = false;

    const frameStateExtent = frameState.extent;
    const viewState = frameState.viewState;
    const projection = viewState.projection;
    const resolution = viewState.resolution;
    const pixelRatio = frameState.pixelRatio;
    const vectorLayerRevision = vectorLayer.getRevision();
    const vectorLayerRenderBuffer = vectorLayer.getRenderBuffer();
    let vectorLayerRenderOrder = vectorLayer.getRenderOrder();

    if (vectorLayerRenderOrder === undefined) {
      vectorLayerRenderOrder = defaultRenderOrder;
    }

    const center = viewState.center.slice();
    const extent = buffer(
      frameStateExtent,
      vectorLayerRenderBuffer * resolution,
    );
    const renderedExtent = extent.slice();
    const loadExtents = [extent.slice()];
    const projectionExtent = projection.getExtent();

    if (
      vectorSource.getWrapX() &&
      projection.canWrapX() &&
      !containsExtent(projectionExtent, frameState.extent)
    ) {
      // For the replay group, we need an extent that intersects the real world
      // (-180° to +180°). To support geometries in a coordinate range from -540°
      // to +540°, we add at least 1 world width on each side of the projection
      // extent. If the viewport is wider than the world, we need to add half of
      // the viewport width to make sure we cover the whole viewport.
      const worldWidth = getWidth(projectionExtent);
      const gutter = Math.max(getWidth(extent) / 2, worldWidth);
      extent[0] = projectionExtent[0] - gutter;
      extent[2] = projectionExtent[2] + gutter;
      wrapCoordinateX(center, projection);
      const loadExtent = wrapExtentX(loadExtents[0], projection);
      // If the extent crosses the date line, we load data for both edges of the worlds
      if (
        loadExtent[0] < projectionExtent[0] &&
        loadExtent[2] < projectionExtent[2]
      ) {
        loadExtents.push([
          loadExtent[0] + worldWidth,
          loadExtent[1],
          loadExtent[2] + worldWidth,
          loadExtent[3],
        ]);
      } else if (
        loadExtent[0] > projectionExtent[0] &&
        loadExtent[2] > projectionExtent[2]
      ) {
        loadExtents.push([
          loadExtent[0] - worldWidth,
          loadExtent[1],
          loadExtent[2] - worldWidth,
          loadExtent[3],
        ]);
      }
    }

    if (
      this.ready &&
      this.renderedResolution_ == resolution &&
      this.renderedRevision_ == vectorLayerRevision &&
      this.renderedRenderOrder_ == vectorLayerRenderOrder &&
      containsExtent(this.wrappedRenderedExtent_, extent)
    ) {
      if (!equals(this.renderedExtent_, renderedExtent)) {
        this.hitDetectionImageData_ = null;
        this.renderedExtent_ = renderedExtent;
      }
      this.renderedCenter_ = center;
      this.replayGroupChanged = false;
      return true;
    }

    this.replayGroup_ = null;

    const replayGroup = new CanvasBuilderGroup(
      getRenderTolerance(resolution, pixelRatio),
      extent,
      resolution,
      pixelRatio,
    );

    let declutterBuilderGroup;
    if (this.getLayer().getDeclutter()) {
      declutterBuilderGroup = new CanvasBuilderGroup(
        getRenderTolerance(resolution, pixelRatio),
        extent,
        resolution,
        pixelRatio,
      );
    }

    const userProjection = getUserProjection();
    let userTransform;
    if (userProjection) {
      for (let i = 0, ii = loadExtents.length; i < ii; ++i) {
        const extent = loadExtents[i];
        const userExtent = toUserExtent(extent, projection);
        vectorSource.loadFeatures(
          userExtent,
          toUserResolution(resolution, projection),
          userProjection,
        );
      }
      userTransform = getTransformFromProjections(userProjection, projection);
    } else {
      for (let i = 0, ii = loadExtents.length; i < ii; ++i) {
        vectorSource.loadFeatures(loadExtents[i], resolution, projection);
      }
    }

    const squaredTolerance = getSquaredRenderTolerance(resolution, pixelRatio);
    let ready = true;
    const render =
      /**
       * @param {import("../../Feature").default} feature Feature.
       */
      (feature) => {
        let styles;
        const styleFunction =
          feature.getStyleFunction() || vectorLayer.getStyleFunction();
        if (styleFunction) {
          styles = styleFunction(feature, resolution);
        }
        if (styles) {
          const dirty = this.renderFeature(
            feature,
            squaredTolerance,
            styles,
            replayGroup,
            userTransform,
            declutterBuilderGroup,
          );
          ready = ready && !dirty;
        }
      };

    const userExtent = toUserExtent(extent, projection);
    /** @type {Array<import("../../Feature").default>} */
    const features = vectorSource.getFeaturesInExtent(userExtent);
    if (vectorLayerRenderOrder) {
      features.sort(vectorLayerRenderOrder);
    }
    for (let i = 0, ii = features.length; i < ii; ++i) {
      render(features[i]);
    }
    this.renderedFeatures_ = features;
    this.ready = ready;

    const replayGroupInstructions = replayGroup.finish();
    const executorGroup = new ExecutorGroup(
      extent,
      resolution,
      pixelRatio,
      vectorSource.getOverlaps(),
      replayGroupInstructions,
      vectorLayer.getRenderBuffer(),
    );

    if (declutterBuilderGroup) {
      this.declutterExecutorGroup = new ExecutorGroup(
        extent,
        resolution,
        pixelRatio,
        vectorSource.getOverlaps(),
        declutterBuilderGroup.finish(),
        vectorLayer.getRenderBuffer(),
      );
    }

    this.renderedResolution_ = resolution;
    this.renderedRevision_ = vectorLayerRevision;
    this.renderedRenderOrder_ = vectorLayerRenderOrder;
    this.renderedExtent_ = renderedExtent;
    this.wrappedRenderedExtent_ = extent;
    this.renderedCenter_ = center;
    this.renderedProjection_ = projection;
    this.renderedPixelRatio_ = pixelRatio;
    this.replayGroup_ = executorGroup;
    this.hitDetectionImageData_ = null;

    this.replayGroupChanged = true;
    return true;
  }

  /**
   * @param {import("../../Feature").default} feature Feature.
   * @param squaredTolerance Squared render tolerance.
   * @param {import("../../style/Style").default|Array<import("../../style/Style").default>} styles The style or array of styles.
   * @param {import("../../render/canvas/BuilderGroup").default} builderGroup Builder group.
   * @param {import("../../proj").TransformFunction} [transform] Transform from user to view projection.
   * @param {import("../../render/canvas/BuilderGroup").default} [declutterBuilderGroup] Builder for decluttering.
   * @return {boolean} `true` if an image is loading.
   */
  renderFeature(
    feature,
    squaredTolerance,
    styles,
    builderGroup,
    transform,
    declutterBuilderGroup,
  ) {
    if (!styles) {
      return false;
    }
    let loading = false;
    if (Array.isArray(styles)) {
      for (let i = 0, ii = styles.length; i < ii; ++i) {
        loading =
          renderFeature(
            builderGroup,
            feature,
            styles[i],
            squaredTolerance,
            this.boundHandleStyleImageChange_,
            transform,
            declutterBuilderGroup,
          ) || loading;
      }
    } else {
      loading = renderFeature(
        builderGroup,
        feature,
        styles,
        squaredTolerance,
        this.boundHandleStyleImageChange_,
        transform,
        declutterBuilderGroup,
      );
    }
    return loading;
  }
}

export default CanvasVectorLayerRenderer;
