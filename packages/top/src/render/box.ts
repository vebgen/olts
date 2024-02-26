

import { Pixel } from '@olts/core/coordinate';
import { Polygon } from '@olts/geometry';


export class RenderBox extends Disposable {
    private geometry_: Polygon | null = null;
    private element_: HTMLDivElement;
    private map_: Map | null = null;
    private startPixel_: Pixel | null = null;
    private endPixel_: Pixel | null = null;

    /**
     * @param {string} className CSS class name.
     */
    constructor(className: string) {
        super();
        this.element_ = document.createElement('div');
        this.element_.style.position = 'absolute';
        this.element_.style.pointerEvents = 'auto';
        this.element_.className = 'ol-box ' + className;
    }

    /**
     * Clean up.
     */
    disposeInternal() {
        this.setMap(null);
    }

    /**
     * @private
     */
    render_() {
        const startPixel = this.startPixel_;
        const endPixel = this.endPixel_;
        const px = 'px';
        const style = this.element_.style;
        style.left = Math.min(startPixel[0], endPixel[0]) + px;
        style.top = Math.min(startPixel[1], endPixel[1]) + px;
        style.width = Math.abs(endPixel[0] - startPixel[0]) + px;
        style.height = Math.abs(endPixel[1] - startPixel[1]) + px;
    }

    /**
     * @param map Map.
     */
    setMap(map: Map | null) {
        if (this.map_) {
            this.map_.getOverlayContainer().removeChild(this.element_);
            const style = this.element_.style;
            style.left = 'inherit';
            style.top = 'inherit';
            style.width = 'inherit';
            style.height = 'inherit';
        }
        this.map_ = map;
        if (this.map_) {
            this.map_.getOverlayContainer().appendChild(this.element_);
        }
    }

    /**
     * @param startPixel Start pixel.
     * @param endPixel End pixel.
     */
    setPixels(startPixel: Pixel, endPixel: Pixel) {
        this.startPixel_ = startPixel;
        this.endPixel_ = endPixel;
        this.createOrUpdateGeometry();
        this.render_();
    }

    /**
     * Creates or updates the cached geometry.
     */
    createOrUpdateGeometry() {
        const startPixel = this.startPixel_;
        const endPixel = this.endPixel_;
        const pixels = [
            startPixel,
            [startPixel[0], endPixel[1]],
            endPixel,
            [endPixel[0], startPixel[1]],
        ];
        const coordinates = pixels.map(
            this.map_.getCoordinateFromPixelInternal,
            this.map_,
        );
        // close the polygon
        coordinates[4] = coordinates[0].slice();
        if (!this.geometry_) {
            this.geometry_ = new Polygon([coordinates]);
        } else {
            this.geometry_.setCoordinates([coordinates]);
        }
    }

    /**
     * @return Geometry.
     */
    getGeometry(): Polygon {
        return this.geometry_;
    }
}

export default RenderBox;
