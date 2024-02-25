/**
 * @module ol/render/canvas
 */
import { BaseObject } from '@olts/events';
import { WORKER_OFFSCREEN_CANVAS } from '@olts/core/has';
import { clear } from '@olts/core/js-obj';
import { createCanvasContext2D } from '@olts/core/dom';
import { getFontParameters } from '@olts/core/css';
import { Fill, Stroke, TextJustify, TextPlacement } from '@olts/style';
import { Size } from '@olts/core/size';
import { Transform } from '@olts/core/transform';


export type BuilderType =
    | 'Circle'
    | 'Image'
    | 'LineString'
    | 'Polygon'
    | 'Text'
    | 'Default';


/**
 *
 */
export interface FillState {
    /**
     * Fill Style.
     */
    fillStyle: string;
}


/**
 *
 */
export interface Label {
    /**
     * Width.
     */
    width: number;

    /**
     * Height.
     */
    height: number;

    /**
     * Context Instructions.
     */
    contextInstructions: Array<string | number>;
}


/**
 *
 */
export interface FillStrokeState {
    /**
     * Current FillStyle.
     */
    currentFillStyle?: string;

    /**
     * Current StrokeStyle.
     */
    currentStrokeStyle?: string;

    /**
     * Current LineCap.
     */
    currentLineCap?: CanvasLineCap;

    /**
     * Current LineDash.
     */
    currentLineDash: number[];

    /**
     * Current LineDashOffset.
     */
    currentLineDashOffset?: number;

    /**
     * Current LineJoin.
     */
    currentLineJoin?: CanvasLineJoin;

    /**
     * Current LineWidth.
     */
    currentLineWidth?: number;

    /**
     * Current MiterLimit.
     */
    currentMiterLimit?: number;

    /**
     * Last stroke.
     */
    lastStroke?: number;

    /**
     * Fill style.
     */
    fillStyle?: string;

    /**
     * Stroke style.
     */
    strokeStyle?: string;

    /**
     * Line Cap.
     */
    lineCap?: CanvasLineCap;

    /**
     * Line Dash.
     */
    lineDash: number[];

    /**
     * Line Dash Offset.
     */
    lineDashOffset?: number;

    /**
     * Line Join.
     */
    lineJoin?: CanvasLineJoin;

    /**
     * Line Width.
     */
    lineWidth?: number;

    /**
     * Miter Limit.
     */
    miterLimit?: number;

    /**
     * Fill pattern scale.
     */
    fillPatternScale?: number;
}


/**
 *
 */
export interface StrokeState {
    /**
     * Line Cap.
     */
    lineCap: CanvasLineCap;

    /**
     * Line Dash.
     */
    lineDash: number[];

    /**
     * Line Dash Offset.
     */
    lineDashOffset: number;

    /**
     * Line Join.
     */
    lineJoin: CanvasLineJoin;

    /**
     * Line Width.
     */
    lineWidth: number;

    /**
     * Miter Limit.
     */
    miterLimit: number;

    /**
     * Stroke Style.
     */
    strokeStyle: string;
}


/**
 *
 */
export interface TextState {
    /**
     * Font.
     */
    font: string;

    /**
     * TextAlign.
     */
    textAlign?: CanvasTextAlign;

    /**
     * Repeat.
     */
    repeat?: number;

    /**
     * Justify.
     */
    justify?: TextJustify;

    /**
     * TextBaseline.
     */
    textBaseline: CanvasTextBaseline;

    /**
     * Placement.
     */
    placement?: TextPlacement;

    /**
     * MaxAngle.
     */
    maxAngle?: number;

    /**
     * Overflow.
     */
    overflow?: boolean;

    /**
     * BackgroundFill.
     */
    backgroundFill?: Fill;

    /**
     * BackgroundStroke.
     */
    backgroundStroke?: Stroke;

    /**
     * Scale.
     */
    scale?: Size;

    /**
     * Padding.
     */
    padding?: number[];
}


/**
 *
 */
export interface SerializableInstructions {
    /**
     * The rendering instructions.
     */
    instructions: any[];

    /**
     * The rendering hit detection instructions.
     */
    hitDetectionInstructions: any[];

    /**
     * The array of all coordinates.
     */
    coordinates: number[];

    /**
     * The text states (de-cluttering).
     */
    textStates?: Record<string, TextState>;

    /**
     * The fill states (de-cluttering).
     */
    fillStates?: Record<string, FillState>;

    /**
     * The stroke states (de-cluttering).
     */
    strokeStates?: Record<string, StrokeState>;
}


/**
 *
 */
export type DeclutterImageWithText = Record<number, ReplayImageOrLabelArgs>;


/**
 *
 */
export const checkedFonts: BaseObject = new BaseObject();


/**
 *
 */
let measureContext: CanvasRenderingContext2D | null = null;


/**
 *
 */
let measureFont: string | undefined = undefined;


/**
 *
 */
export const textHeights: Record<string, number> = {};


/**
 * Clears the label cache when a font becomes available.
 *
 * @param fontSpec CSS font spec.
 */
export const registerFont = (function () {
    const retries = 100;
    const size = '32px ';
    const referenceFonts = ['monospace', 'serif'];
    const len = referenceFonts.length;
    const text = 'wmytzilWMYTZIL@#/&?$%10\uF013';
    let interval: string | number | undefined, referenceWidth;

    /**
     * @param fontStyle Css font-style
     * @param fontWeight Css font-weight
     * @param fontFamily Css font-family
     * @return Font with style and weight is available
     */
    function isAvailable(
        fontStyle: string, fontWeight: string, fontFamily: any
    ): boolean {
        let available = true;
        for (let i = 0; i < len; ++i) {
            const referenceFont = referenceFonts[i];
            referenceWidth = measureTextWidth(
                fontStyle + ' ' + fontWeight + ' ' + size + referenceFont,
                text,
            );
            if (fontFamily != referenceFont) {
                const width = measureTextWidth(
                    fontStyle +
                    ' ' +
                    fontWeight +
                    ' ' +
                    size +
                    fontFamily +
                    ',' +
                    referenceFont,
                    text,
                );
                // If width and referenceWidth are the same, then the fallback
                // was used instead of the font we wanted, so the font is not
                // available.
                available = available && width != referenceWidth;
            }
        }
        if (available) {
            return true;
        }
        return false;
    }

    function check(this: any) {
        let done = true;
        const fonts = checkedFonts.getKeys();
        for (let i = 0, ii = fonts.length; i < ii; ++i) {
            const font = fonts[i];
            if (checkedFonts.get(font) < retries) {
                if (isAvailable.apply(this, font.split('\n') as any)) {
                    clear(textHeights);
                    // Make sure that loaded fonts are picked up by Safari
                    measureContext = null;
                    measureFont = undefined;
                    checkedFonts.set(font, retries);
                } else {
                    checkedFonts.set(font, checkedFonts.get(font) + 1, true);
                    done = false;
                }
            }
        }
        if (done) {
            clearInterval(interval);
            interval = undefined;
        }
    }

    return function (fontSpec: string) {
        const font = getFontParameters(fontSpec);
        if (!font) {
            return;
        }
        const families = font.families;
        for (let i = 0, ii = families.length; i < ii; ++i) {
            const family = families[i];
            const key = font.style + '\n' + font.weight + '\n' + family;
            if (checkedFonts.get(key) === undefined) {
                checkedFonts.set(key, retries, true);
                if (!isAvailable(font.style, font.weight, family)) {
                    checkedFonts.set(key, 0, true);
                    if (interval === undefined) {
                        interval = setInterval(check, 32) as unknown as number;
                    }
                }
            }
        }
    };
})();


/**
 * @param font Font to use for measuring.
 * @return Measurement.
 */
export const measureTextHeight = (function () {
    /**
     * @type {HTMLDivElement}
     */
    let measureElement: HTMLDivElement;
    return function (fontSpec: string) {
        let height = textHeights[fontSpec];
        if (height == undefined) {
            if (WORKER_OFFSCREEN_CANVAS) {
                const font = getFontParameters(fontSpec);
                const metrics = measureText(fontSpec, 'Žg');
                const lineHeight = font ? (
                    isNaN(Number(font.lineHeight))
                        ? 1.2
                        : Number(font.lineHeight)
                ) : 1.2;
                height =
                    lineHeight *
                    (
                        metrics.actualBoundingBoxAscent +
                        metrics.actualBoundingBoxDescent)
                    ;
            } else {
                if (!measureElement) {
                    measureElement = document.createElement('div');
                    measureElement.innerHTML = 'M';
                    measureElement.style.minHeight = '0';
                    measureElement.style.maxHeight = 'none';
                    measureElement.style.height = 'auto';
                    measureElement.style.padding = '0';
                    measureElement.style.border = 'none';
                    measureElement.style.position = 'absolute';
                    measureElement.style.display = 'block';
                    measureElement.style.left = '-99999px';
                }
                measureElement.style.font = fontSpec;
                document.body.appendChild(measureElement);
                height = measureElement.offsetHeight;
                document.body.removeChild(measureElement);
            }
            textHeights[fontSpec] = height;
        }
        return height;
    };
})();


/**
 * @param font Font.
 * @param text Text.
 * @return Text metrics.
 */
function measureText(font: string, text: string): TextMetrics {
    if (!measureContext) {
        measureContext = createCanvasContext2D(1, 1);
    }
    if (font != measureFont) {
        measureContext.font = font;
        measureFont = measureContext.font;
    }
    return measureContext.measureText(text);
}


/**
 * @param font Font.
 * @param text Text.
 * @return Width.
 */
export function measureTextWidth(font: string, text: string): number {
    return measureText(font, text).width;
}


/**
 * Measure text width using a cache.
 *
 * @param font The font.
 * @param text The text to measure.
 * @param cache A lookup of cached widths by text.
 * @return The text width.
 */
export function measureAndCacheTextWidth(
    font: string, text: string, cache: Record<string, number>
): number {
    if (text in cache) {
        return cache[text];
    }
    const width = text
        .split('\n')
        .reduce(
            (prev, curr) => Math.max(prev, measureTextWidth(font, curr)),
            0
        );
    cache[text] = width;
    return width;
}


/**
 * @param baseStyle Base style.
 * @param chunks Text chunks to measure.
 * @return Text metrics.
 */
export function getTextDimensions(
    baseStyle: TextState,
    chunks: string[]
): {
    width: number;
    height: number;
    widths: number[];
    heights: number[];
    lineWidths: number[];
} {
    const widths = [];
    const heights = [];
    const lineWidths = [];
    let width = 0;
    let lineWidth = 0;
    let height = 0;
    let lineHeight = 0;
    for (let i = 0, ii = chunks.length; i <= ii; i += 2) {
        const text = chunks[i];
        if (text === '\n' || i === ii) {
            width = Math.max(width, lineWidth);
            lineWidths.push(lineWidth);
            lineWidth = 0;
            height += lineHeight;
            continue;
        }
        const font = chunks[i + 1] || baseStyle.font;
        const currentWidth = measureTextWidth(font, text);
        widths.push(currentWidth);
        lineWidth += currentWidth;
        const currentHeight = measureTextHeight(font);
        heights.push(currentHeight);
        lineHeight = Math.max(lineHeight, currentHeight);
    }
    return { width, height, widths, heights, lineWidths };
}


/**
 * @param context Context.
 * @param rotation Rotation.
 * @param offsetX X offset.
 * @param offsetY Y offset.
 */
export function rotateAtOffset(
    context: CanvasRenderingContext2D,
    rotation: number,
    offsetX: number,
    offsetY: number
) {
    if (rotation !== 0) {
        context.translate(offsetX, offsetY);
        context.rotate(rotation);
        context.translate(-offsetX, -offsetY);
    }
}


type LabelOrImage =
    | Label
    | HTMLCanvasElement
    | HTMLImageElement
    | HTMLVideoElement;


/**
 * @param context Context.
 * @param transform Transform.
 * @param opacity Opacity.
 * @param labelOrImage Label.
 * @param originX Origin X.
 * @param originY Origin Y.
 * @param w Width.
 * @param h Height.
 * @param x X.
 * @param y Y.
 * @param scale Scale.
 */
export function drawImageOrLabel(
    context: CanvasRenderingContext2D,
    transform: Transform | null,
    opacity: number,
    labelOrImage: LabelOrImage,
    originX: number,
    originY: number,
    w: number,
    h: number,
    x: number,
    y: number,
    scale: Size,
) {
    context.save();

    if (opacity !== 1) {
        context.globalAlpha *= opacity;
    }
    if (transform) {
        context.transform.apply(context, transform);
    }

    if ((labelOrImage as any).contextInstructions) {
        // label
        context.translate(x, y);
        context.scale(scale[0], scale[1]);
        executeLabelInstructions(labelOrImage as Label, context);
    } else if (scale[0] < 0 || scale[1] < 0) {
        // flipped image
        context.translate(x, y);
        context.scale(scale[0], scale[1]);
        context.drawImage(
            labelOrImage as CanvasImageSource,
            originX,
            originY,
            w,
            h,
            0,
            0,
            w,
            h,
        );
    } else {
        // if image not flipped translate and scale can be avoided
        context.drawImage(
            labelOrImage as CanvasImageSource,
            originX,
            originY,
            w,
            h,
            x,
            y,
            w * scale[0],
            h * scale[1],
        );
    }

    context.restore();
}

/**
 * @param label Label.
 * @param context Context.
 */
function executeLabelInstructions(
    label: Label, context: CanvasRenderingContext2D
) {
    const contextInstructions = label.contextInstructions;
    for (let i = 0, ii = contextInstructions.length; i < ii; i += 2) {
        if (Array.isArray(contextInstructions[i + 1])) {
            (context as any)[contextInstructions[i]].apply(
                context,
                contextInstructions[i + 1],
            );
        } else {
            (context as any)[
                contextInstructions[i]
            ] = contextInstructions[i + 1];
        }
    }
}
