import { Size } from '@olts/core/size';

import { Fill } from './fill';
import { RegularShape } from './regular-shape';
import { Stroke } from './stroke';


/**
 * Options for a circle style.
 */
export interface Options {
    /**
     * Fill style.
     */
    fill?: Fill;

    /**
     * Circle radius.
     */
    radius: number;

    /**
     * Stroke style.
     */
    stroke?: Stroke;

    /**
     * displacement
     */
    displacement?: number[];

    /**
     * Scale. A two dimensional scale will produce an ellipse.
     *
     * Unless two dimensional scaling is required a better result may be
     * obtained with an appropriate setting for `radius`.
     */
    scale?: number | Size;

    /**
     * Rotation in radians.
     *
     * It is positive rotation clockwise, meaningful only when used in
     * conjunction with a two dimensional scale.
     */
    rotation?: number;

    /**
     * Whether to rotate the shape with the view.
     *
     * Meaningful only when used in conjunction with a two dimensional scale.
     */
    rotateWithView?: boolean;

    /**
     * Declutter mode.
     */
    declutterMode?: "declutter" | "obstacle" | "none" | undefined;
}


/**
 * Set circle style for vector features.
 *
 * @api
 */
class CircleStyle extends RegularShape {
    /**
     * @param options Options.
     */
    constructor(options?: Options) {
        options = options ? options : { radius: 5 };

        super({
            points: Infinity,
            fill: options.fill,
            radius: options.radius,
            stroke: options.stroke,
            scale: options.scale !== undefined
                ? options.scale
                : 1,
            rotation: options.rotation !== undefined
                ? options.rotation
                : 0,
            rotateWithView:
                options.rotateWithView !== undefined
                    ? options.rotateWithView
                    : false,
            displacement:
                options.displacement !== undefined
                    ? options.displacement
                    : [0, 0],
            declutterMode: options.declutterMode,
        });
    }

    /**
     * Clones the style.
     *
     * @return The cloned style.
     * @api
     */
    override clone(): CircleStyle {
        const scale = this.getScale();
        const fill = this.getFill();
        const stroke = this.getStroke();
        const style = new CircleStyle({
            fill: fill ? fill.clone() : undefined,
            stroke: stroke ? stroke.clone() : undefined,
            radius: this.getRadius(),
            scale: Array.isArray(scale)
                ? scale.slice() as [number, number]
                : scale,
            rotation: this.getRotation(),
            rotateWithView: this.getRotateWithView(),
            displacement: this.getDisplacement().slice(),
            declutterMode: this.getDeclutterMode(),
        });
        style.setOpacity(this.getOpacity());
        return style;
    }

    /**
     * Set the circle radius.
     *
     * @param radius Circle radius.
     * @api
     */
    setRadius(radius: number) {
        this.radius_ = radius;
        this.render();
    }
}

export default CircleStyle;
