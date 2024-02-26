import { Icon } from '@olts/style';
import { ascending } from '@olts/core/array';
import { clamp } from '@olts/core/math';
import { createCanvasContext2D } from '@olts/core/dom';
import {
    getTransformFromProjections,
    getUserProjection,
    toUserExtent,
} from '@olts/core/proj';
import { Pixel } from '@olts/core/coordinate';
import { Projection } from '@olts/core/proj';
import { StyleFunction } from '@olts/style';
import { Extent, intersects } from '@olts/core/extent';
import { Transform } from '@olts/core/transform';
import { Size } from '@olts/core/size';

import { FeatureLike } from '../../feature';
import CanvasImmediateRenderer from './immediate';


export const HIT_DETECT_RESOLUTION = 0.5;


/**
 * @param size Canvas size in css pixels.
 * @param transforms Transforms for rendering features to all worlds of the
 *      viewport, from coordinates to css pixels.
 * @param features Features to consider for hit detection.
 * @param styleFunction Layer style function.
 * @param extent Extent in render projection.
 * @param resolution Resolution.
 * @param rotation Rotation.
 * @param squaredTolerance Squared tolerance.
 * @param projection Render projection.
 * @return Hit detection image data.
 */
export function createHitDetectionImageData(
    size: Size,
    transforms: Transform[],
    features: FeatureLike[],
    styleFunction: StyleFunction | undefined,
    extent: Extent,
    resolution: number,
    rotation: number,
    squaredTolerance?: number,
    projection?: Projection,
): ImageData {
    const userExtent = projection ? toUserExtent(extent, projection) : extent;
    const width = size[0] * HIT_DETECT_RESOLUTION;
    const height = size[1] * HIT_DETECT_RESOLUTION;
    const context = createCanvasContext2D(width, height);
    context.imageSmoothingEnabled = false;
    const canvas = context.canvas;
    const renderer = new CanvasImmediateRenderer(
        context,
        HIT_DETECT_RESOLUTION,
        extent,
        null,
        rotation,
        squaredTolerance,
        projection
            ? getTransformFromProjections(getUserProjection(), projection)
            : null,
    );
    const featureCount = features.length;
    // Stretch hit detection index to use the whole available color range
    const indexFactor = Math.floor((256 * 256 * 256 - 1) / featureCount);
    const featuresByZIndex = {};
    for (let i = 1; i <= featureCount; ++i) {
        const feature = features[i - 1];
        const featureStyleFunction = feature.getStyleFunction() || styleFunction;
        if (!featureStyleFunction) {
            continue;
        }
        let styles = featureStyleFunction(feature, resolution);
        if (!styles) {
            continue;
        }
        if (!Array.isArray(styles)) {
            styles = [styles];
        }
        const index = i * indexFactor;
        const color = index.toString(16).padStart(7, '#00000');
        for (let j = 0, jj = styles.length; j < jj; ++j) {
            const originalStyle = styles[j];
            const geometry = originalStyle.getGeometryFunction()(feature);
            if (!geometry || !intersects(userExtent, geometry.getExtent())) {
                continue;
            }
            const style = originalStyle.clone();
            const fill = style.getFill();
            if (fill) {
                fill.setColor(color);
            }
            const stroke = style.getStroke();
            if (stroke) {
                stroke.setColor(color);
                stroke.setLineDash(null);
            }
            style.setText(undefined);
            const image = originalStyle.getImage();
            if (image) {
                const imgSize = image.getImageSize();
                if (!imgSize) {
                    continue;
                }

                const imgContext = createCanvasContext2D(
                    imgSize[0],
                    imgSize[1],
                    undefined,
                    { alpha: false },
                );
                const img = imgContext.canvas;
                imgContext.fillStyle = color;
                imgContext.fillRect(0, 0, img.width, img.height);
                style.setImage(
                    new Icon({
                        img: img,
                        anchor: image.getAnchor(),
                        anchorXUnits: 'pixels',
                        anchorYUnits: 'pixels',
                        offset: image.getOrigin(),
                        opacity: 1,
                        size: image.getSize(),
                        scale: image.getScale(),
                        rotation: image.getRotation(),
                        rotateWithView: image.getRotateWithView(),
                    }),
                );
            }
            const zIndex = style.getZIndex() || 0;
            let byGeometryType = featuresByZIndex[zIndex];
            if (!byGeometryType) {
                byGeometryType = {};
                featuresByZIndex[zIndex] = byGeometryType;
                byGeometryType['Polygon'] = [];
                byGeometryType['Circle'] = [];
                byGeometryType['LineString'] = [];
                byGeometryType['Point'] = [];
            }
            const type = geometry.getType();
            if (type === 'GeometryCollection') {
                const geometries =
          /** @type {GeometryCollection} */ (
                        geometry
                    ).getGeometriesArrayRecursive();
                for (let i = 0, ii = geometries.length; i < ii; ++i) {
                    const geometry = geometries[i];
                    byGeometryType[geometry.getType().replace('Multi', '')].push(
                        geometry,
                        style,
                    );
                }
            } else {
                byGeometryType[type.replace('Multi', '')].push(geometry, style);
            }
        }
    }

    const zIndexKeys = Object.keys(featuresByZIndex).map(Number).sort(ascending);
    for (let i = 0, ii = zIndexKeys.length; i < ii; ++i) {
        const byGeometryType = featuresByZIndex[zIndexKeys[i]];
        for (const type in byGeometryType) {
            const geomAndStyle = byGeometryType[type];
            for (let j = 0, jj = geomAndStyle.length; j < jj; j += 2) {
                renderer.setStyle(geomAndStyle[j + 1]);
                for (let k = 0, kk = transforms.length; k < kk; ++k) {
                    renderer.setTransform(transforms[k]);
                    renderer.drawGeometry(geomAndStyle[j]);
                }
            }
        }
    }
    return context.getImageData(0, 0, canvas.width, canvas.height);
}


/**
 * @param pixel Pixel coordinate on the hit detection canvas in css pixels.
 * @param features Features. Has to match the `features` array that was passed
 *      to `createHitDetectionImageData()`.
 * @param imageData Hit detection image data generated by
 *      `createHitDetectionImageData()`.
 * @return Features.
 */
export function hitDetect<F extends FeatureLike>(
    pixel: Pixel, features: Array<F>, imageData: ImageData
): Array<F> {
    const resultFeatures: Array<F> = [];
    if (imageData) {
        const x = Math.floor(Math.round(pixel[0]) * HIT_DETECT_RESOLUTION);
        const y = Math.floor(Math.round(pixel[1]) * HIT_DETECT_RESOLUTION);
        // The pixel coordinate is clamped down to the hit-detect canvas' size
        // to account for browsers returning coordinates slightly larger than
        // the actual canvas size due to a non-integer pixel ratio.
        const index =
            (clamp(x, 0, imageData.width - 1) +
                clamp(y, 0, imageData.height - 1) * imageData.width) *
            4;
        const r = imageData.data[index];
        const g = imageData.data[index + 1];
        const b = imageData.data[index + 2];
        const i = b + 256 * (g + 256 * r);
        const indexFactor = Math.floor((256 * 256 * 256 - 1) / features.length);
        if (i && i % indexFactor === 0) {
            resultFeatures.push(features[i / indexFactor - 1]);
        }
    }
    return resultFeatures;
}
