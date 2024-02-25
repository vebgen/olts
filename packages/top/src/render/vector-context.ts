/**
 * @module ol/render/VectorContext
 */

/**
 * @classdesc
 * Context for drawing geometries.  A vector context is available on render
 * events and does not need to be constructed directly.
 * @api
 */
class VectorContext {
  /**
   * Render a geometry with a custom renderer.
   *
   * @param {import("../geom/SimpleGeometry").default} geometry Geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   * @param {Function} renderer Renderer.
   * @param {Function} hitDetectionRenderer Renderer.
   */
  drawCustom(geometry: import("../geom/SimpleGeometry").default, feature: import("../Feature").FeatureLike, renderer: Function, hitDetectionRenderer: Function) {}

  /**
   * Render a geometry.
   *
   * @param {import("../geom/Geometry").default} geometry The geometry to render.
   */
  drawGeometry(geometry: import("../geom/Geometry").default) {}

  /**
   * Set the rendering style.
   *
   * @param {import("../style/Style").default} style The rendering style.
   */
  setStyle(style: import("../style/Style").default) {}

  /**
   * @param {import("../geom/Circle").default} circleGeometry Circle geometry.
   * @param {import("../Feature").default} feature Feature.
   */
  drawCircle(circleGeometry: import("../geom/Circle").default, feature: import("../Feature").default) {}

  /**
   * @param {import("../Feature").default} feature Feature.
   * @param {import("../style/Style").default} style Style.
   */
  drawFeature(feature: import("../Feature").default, style: import("../style/Style").default) {}

  /**
   * @param {import("../geom/GeometryCollection").default} geometryCollectionGeometry Geometry collection.
   * @param {import("../Feature").default} feature Feature.
   */
  drawGeometryCollection(geometryCollectionGeometry: import("../geom/GeometryCollection").default, feature: import("../Feature").default) {}

  /**
   * @param {import("../geom/LineString").default|import("./Feature").default} lineStringGeometry Line string geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawLineString(lineStringGeometry: import("../geom/LineString").default | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../geom/MultiLineString").default|import("./Feature").default} multiLineStringGeometry MultiLineString geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawMultiLineString(multiLineStringGeometry: import("../geom/MultiLineString").default | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../geom/MultiPoint").default|import("./Feature").default} multiPointGeometry MultiPoint geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawMultiPoint(multiPointGeometry: import("../geom/MultiPoint").default | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../geom/MultiPolygon").default} multiPolygonGeometry MultiPolygon geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawMultiPolygon(multiPolygonGeometry: import("../geom/MultiPolygon").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../geom/Point").default|import("./Feature").default} pointGeometry Point geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawPoint(pointGeometry: import("../geom/Point").default | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../geom/Polygon").default|import("./Feature").default} polygonGeometry Polygon geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawPolygon(polygonGeometry: import("../geom/Polygon").default | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../geom/SimpleGeometry").default|import("./Feature").default} geometry Geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawText(geometry: import("../geom/SimpleGeometry").default | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {import("../style/Fill").default} fillStyle Fill style.
   * @param {import("../style/Stroke").default} strokeStyle Stroke style.
   */
  setFillStrokeStyle(fillStyle: import("../style/Fill").default, strokeStyle: import("../style/Stroke").default) {}

  /**
   * @param {import("../style/Image").default} imageStyle Image style.
   * @param {import("../render/canvas").DeclutterImageWithText} [declutterImageWithText] Shared data for combined decluttering with a text style.
   */
  setImageStyle(imageStyle: import("../style/Image").default, declutterImageWithText: import("../render/canvas").DeclutterImageWithText) {}

  /**
   * @param {import("../style/Text").default} textStyle Text style.
   * @param {import("../render/canvas").DeclutterImageWithText} [declutterImageWithText] Shared data for combined decluttering with an image style.
   */
  setTextStyle(textStyle: import("../style/Text").default, declutterImageWithText: import("../render/canvas").DeclutterImageWithText) {}
}

export default VectorContext;
