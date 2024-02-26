
/**
 * Context for drawing geometries.  A vector context is available on render
 * events and does not need to be constructed directly.
 * @api
 */
export class VectorContext {
  /**
   * Render a geometry with a custom renderer.
   *
   * @param {SimpleGeometry} geometry Geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   * @param {Function} renderer Renderer.
   * @param {Function} hitDetectionRenderer Renderer.
   */
  drawCustom(geometry: SimpleGeometry, feature: import("../Feature").FeatureLike, renderer: Function, hitDetectionRenderer: Function) {}

  /**
   * Render a geometry.
   *
   * @param {Geometry} geometry The geometry to render.
   */
  drawGeometry(geometry: Geometry) {}

  /**
   * Set the rendering style.
   *
   * @param {import("../style/Style").default} style The rendering style.
   */
  setStyle(style: import("../style/Style").default) {}

  /**
   * @param {Circle} circleGeometry Circle geometry.
   * @param {import("../Feature").default} feature Feature.
   */
  drawCircle(circleGeometry: Circle, feature: import("../Feature").default) {}

  /**
   * @param {import("../Feature").default} feature Feature.
   * @param {import("../style/Style").default} style Style.
   */
  drawFeature(feature: import("../Feature").default, style: import("../style/Style").default) {}

  /**
   * @param {GeometryCollection} geometryCollectionGeometry Geometry collection.
   * @param {import("../Feature").default} feature Feature.
   */
  drawGeometryCollection(geometryCollectionGeometry: GeometryCollection, feature: import("../Feature").default) {}

  /**
   * @param {LineString|import("./Feature").default} lineStringGeometry Line string geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawLineString(lineStringGeometry: LineString | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {MultiLineString|import("./Feature").default} multiLineStringGeometry MultiLineString geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawMultiLineString(multiLineStringGeometry: MultiLineString | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {MultiPoint|import("./Feature").default} multiPointGeometry MultiPoint geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawMultiPoint(multiPointGeometry: MultiPoint | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {MultiPolygon} multiPolygonGeometry MultiPolygon geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawMultiPolygon(multiPolygonGeometry: MultiPolygon, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {Point|import("./Feature").default} pointGeometry Point geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawPoint(pointGeometry: Point | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {Polygon|import("./Feature").default} polygonGeometry Polygon geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawPolygon(polygonGeometry: Polygon | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

  /**
   * @param {SimpleGeometry|import("./Feature").default} geometry Geometry.
   * @param {import("../Feature").FeatureLike} feature Feature.
   */
  drawText(geometry: SimpleGeometry | import("./Feature").default, feature: import("../Feature").FeatureLike) {}

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
