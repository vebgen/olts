import { Color } from '@olts/core/color';
import { ColorLike, PatternDescriptor } from '@olts/core/color-like';
import { ImageState } from '@olts/core/image-state';

import { IconImage, get as getIconImage } from './icon-image';


type FillColor = Color | ColorLike | PatternDescriptor | null;


/**
 * Options for the fill style.
 */
export interface Options {
    /**
     * A color, gradient or pattern.
     *
     * @see {@link Color} and {@link ColorLike} for possible formats.
     *
     * For polygon fills (not for {@link RegularShape} fills),
     * a pattern can also be provided as {@link PatternDescriptor}.
     *
     * If null, the Canvas/renderer default black will be used.
     *
     * @default null
     */
    color?: FillColor;
}


/**
 * Set fill style for vector features.
 *
 * @api
 */
export class Fill {

    /**
     *
     */
    private patternImage_: IconImage | null = null;

    /**
     *
     */
    private color_: FillColor;

    /**
     * @param options Options.
     */
    constructor(options?: Options) {
        options = options || {};
        this.color_ = null;
        if (options.color !== undefined) {
            this.setColor(options.color);
        }
    }

    /**
     * Clones the style.
     *
     * The color is not cloned if it is a {@link ColorLike}.
     *
     * @return The cloned style.
     * @api
     */
    clone(): Fill {
        const color = this.getColor();
        return new Fill({
            color: (
                Array.isArray(color) ? color.slice() : color
            ) as Color || undefined,
        });
    }

    /**
     * Get the fill color.
     *
     * @return Color.
     * @api
     */
    getColor(): FillColor {
        return this.color_;
    }

    /**
     * Set the color.
     *
     * @param color Color.
     * @api
     */
    setColor(color: FillColor) {
        if (color !== null && typeof color === 'object' && 'src' in color) {
            const patternImage = getIconImage(
                null,
                color.src,
                'anonymous',
                undefined,
                color.offset ? null : color.color ? color.color : null,
                !(color.offset && color.size),
            );
            patternImage.ready().then(() => {
                this.patternImage_ = null;
            });
            if (patternImage.getImageState() === ImageState.IDLE) {
                patternImage.load();
            }
            if (patternImage.getImageState() === ImageState.LOADING) {
                this.patternImage_ = patternImage;
            }
        }
        this.color_ = color;
    }

    /**
     * @return The fill style is loading an image pattern.
     */
    loading(): boolean {
        return !!this.patternImage_;
    }

    /**
     * @return `false` or a promise that resolves when the style is ready
     *   to use.
     */
    ready(): Promise<void> {
        return (
            this.patternImage_ ? this.patternImage_.ready() : Promise.resolve()
        );
    }
}


export default Fill;
