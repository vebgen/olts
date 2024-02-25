//FIXME Move this function to the canvas module

import { WORKER_OFFSCREEN_CANVAS } from "@olts/core/has";


/**
 * Create an html canvas element and returns its 2d context.
 *
 * @param width Canvas width.
 * @param height Canvas height.
 * @param canvasPool Canvas pool to take existing canvas from.
 * @param settings CanvasRenderingContext2DSettings
 * @return The context.
 */
export function createCanvasContext2D(
    width: number,
    height: number,
    canvasPool?: HTMLCanvasElement[],
    settings?: CanvasRenderingContext2DSettings
): CanvasRenderingContext2D {
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (canvasPool && canvasPool.length) {
        canvas = canvasPool.shift() as HTMLCanvasElement;
    } else if (WORKER_OFFSCREEN_CANVAS) {
        canvas = new OffscreenCanvas(width || 300, height || 300);
    } else {
        canvas = document.createElement('canvas');
    }
    if (width) {
        canvas.width = width;
    }
    if (height) {
        canvas.height = height;
    }

    //FIXME Allow OffscreenCanvasRenderingContext2D as return type
    return canvas.getContext('2d', settings) as CanvasRenderingContext2D;
}


let sharedCanvasContext: CanvasRenderingContext2D;


/**
 * @return Shared canvas context.
 */
export function getSharedCanvasContext2D(): CanvasRenderingContext2D {
    if (!sharedCanvasContext) {
        sharedCanvasContext = createCanvasContext2D(1, 1);
    }
    return sharedCanvasContext;
}
